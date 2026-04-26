# Документация: web + traditional search + AI search + MCP

## Архитектура (короткое summary)

Один build-time реестр из трёх источников → 4 потребителя.

```
src/content/docs/*.mdx       (narrative)  ─┐
src/content/recipes/*.mdx    (рецепты)    ─┼─► registry (DocEntry[]) ─┬─► Astro static pages
ApplicationInterface (loader) (api ref)   ─┘                          ├─► Orama index              (traditional search, статика)
                                                                      ├─► chunks → embeddings → pgvector
                                                                      │                  ▲
                                                                      │       Fastify POST /docs/ai-search (SSE)  ◄── AI mode на сайте
                                                                      │                  ▲
                                                                      └─► MCP server (HTTP/SSE)                   ◄── IDE-агенты
```

Ключевые решения:

- Astro **Content Collections** (Astro 5 Loader API) + кастомный loader для OpenAPI.
- `recipes` — отдельная коллекция со схемой `endpoints[]`, двусторонняя связь резолвится на билде.
- Orama для traditional search (ноль инфры, статика).
- pgvector в Postgres (Prisma уже есть). Fastify endpoint для AI search со стримингом.
- MCP — отдельный HTTP/SSE сервер на `mcp.bitcoinapi.dev`, тулзы: `docs_search`, `docs_fetch`, `recipe_search`, `api_endpoint`.

## Открытые вопросы (заполнить перед стартом)

- [x] Языки: **EN only** (multi-lang возможно через ~год, не закладываем сейчас)
- [x] LLM провайдер: **Google Gemini** (SDK `@google/genai`, env `GEMINI_API_KEY`)
- [x] Чат-модель: **`gemini-2.5-flash-lite`** (fallback `gemini-2.5-flash` если качество не устроит)
- [x] Embeddings: **`text-embedding-004`**, **768 dim**
- [x] AI ответ: streaming SSE (по умолчанию: да)
- [x] Cost-control: семантический кэш в Redis (TTL 24h), top-3 чанков, `max_output_tokens: 600`, `temperature: 0.3`, prompt caching через `cachedContent`, smart routing коротких запросов в Orama
- [x] Триггер пересборки индекса: **только на деплой web**. При деплое api — автоматически триггерить деплой web после успешного api (chained pipeline), чтобы подтянулась свежая схема.
- [x] Хост MCP: **`/mcp` на api домене**. Поддомены опциональны и добавятся по необходимости. Реализация — Fastify plugin внутри `apps/api`, один процесс, общий DB/Redis/auth.

## План реализации

### Фаза 0. Апгрейд Astro 5 → Astro 6

Обоснование: в шаге 9 используется кастомный Content Loader. В Astro 6 у Loader API сломанная совместимость (schema-функция убрана, типы инферятся через `satisfies Loader`, выпилен legacy `src/content/`), плюс зависимости (Zod 4, Vite 7, Shiki 4) и Node 22.12+. Логичнее обновиться до 6.1.x ДО того, как мы напишем loader, чтобы не переписывать его дважды.

0.1. Проверить `node -v` ≥ 22.12 на dev/CI; при необходимости поднять.
0.2. В `apps/web-client` обновить `astro` до `^6.1.6`, `@astrojs/vue` и `@astrojs/check` до версий, совместимых с Astro 6.
0.3. Обновить совместимые dev-зависимости: `vue-tsc`, `@tailwindcss/vite` (под Vite 7), `tailwindcss`. Проверить, что плагины Vite не сломались.
0.4. В `apps/web-client/src/content.config.ts` (если уже есть) и будущих лоадерах: schema объявлять статически, использовать `satisfies Loader`. Не использовать `schema: async () => ...`.
0.5. Удалить любые остатки legacy подхода `src/content/` и флаг `legacy.collections` (если когда-то был включён).
0.6. Прогнать миграции по Zod 4 в существующих схемах (если используем Zod где-то в web-client).
0.7. `npm build` + `npm typecheck` web-client должны проходить чисто на Astro 6 — после этого начинаем Фазу 1.

### Фаза 1. OpenAPI как метод ApplicationInterface

1. Создать `apps/api/src/app.interface.ts` с классом `ApplicationInterface` и сразу экспортировать готовый singleton-инстанс (`export const applicationInterface = new ApplicationInterface()`). `app.ts` не трогаем.
2. Единственный публичный метод — `getOpenApiSchema(): Promise<OpenAPIObject>`: внутри поднимает минимальный Fastify instance (swagger + autoload routes), делает `app.ready()` + `app.swagger()`, возвращает схему и закрывает app. Без `listen`, без коннектов к БД/Redis.
3. Проверить, что у всех роутов есть `operationId`, `summary`, `description`, теги в schema; проставить отсутствующие.
4. Экспортировать `ApplicationInterface` из `apps/api` (через `exports` в `apps/api/package.json`), чтобы `apps/web-client` мог импортировать singleton из workspace-пакета.

### Фаза 2. Content Collections в web-client

5. Установить `@astrojs/mdx` в `apps/web-client`.
6. Подключить интеграцию mdx в `astro.config.mjs`.
7. Создать `apps/web-client/src/content.config.ts` с zod-схемой коллекции `docs` (поля: `title`, `description`, `section`, `order`, `tags`).
8. Добавить в `content.config.ts` коллекцию `recipes` (`title`, `description`, `endpoints[]`, `language`, `difficulty?`, `tags?`, `runUrl?`).
9. Создать кастомный loader `apps/web-client/src/content/loaders/openapi.ts` (Astro 5 Loader API): импортирует `applicationInterface` из `apps/api`, делает `const schema = await applicationInterface.getOpenApiSchema()` и эмитит entry per operation. Никаких промежуточных файлов.
10. Добавить в `content.config.ts` коллекцию `api` с этим loader, schema: `operationId`, `method`, `path`, `summary`, `description`, `tags`, `requestSchema`, `responseSchemas`, `parameters`.
11. Создать `apps/web-client/src/content/docs/quickstart.mdx` — портировать содержимое из текущего `quickstart.astro` во frontmatter + markdown body.
12. Создать `apps/web-client/src/content/recipes/_example.mdx` (пример со всеми полями) для шаблона.

### Фаза 3. Рендер страниц из коллекций

13. Создать общий `DocPageLayout.astro` (наследует `DocsLayout`) с TOC из `getHeadings()`, breadcrumbs, prev/next.
14. Создать роут `apps/web-client/src/pages/docs/[...slug].astro` для коллекции `docs` (`getStaticPaths` из `getCollection('docs')`).
15. Создать роут `apps/web-client/src/pages/docs/recipes/[...slug].astro` для коллекции `recipes`, layout с code-first (большой code block, run button, список используемых эндпоинтов).
16. Создать роут `apps/web-client/src/pages/docs/api/[...slug].astro` для коллекции `api`, layout с request/response/params блоками.
17. Создать helper `apps/web-client/src/lib/docs-cross-links.ts`: `recipesForEndpoint(endpointId)` и `endpointsForRecipe(recipe)`.
18. На странице `api/[...slug]` отрендерить блок «Recipes using this endpoint» через хелпер.
19. На странице `recipes/[...slug]` отрендерить блок «Endpoints used» через хелпер.
20. Удалить `apps/web-client/src/pages/docs/quickstart.astro` (содержимое уже в коллекции).
21. Удалить `apps/web-client/src/pages/docs/price/current.astro` (если контент перенесён в `api` коллекцию).

### Фаза 4. Traditional search (Orama)

22. Установить `@oramacloud/client` и `@oramacloud/astro` (или `@orama/orama` и `@orama/plugin-astro` для локального билда) в `apps/web-client`.
23. Подключить интеграцию Orama в `astro.config.mjs` для генерации статического индекса при билде.
24. Настроить конфигурацию Orama для индексации контента (заголовки, текст, секции).
25. Создать Vue-компонент `SearchTraditional.vue` который импортирует Orama клиент, загружает сгенерированный индекс, делает поиск по input (с поддержкой опечаток) и рендерит результаты с подсветкой.
26. Подключить компонент в `#docs-search-wrap` в режиме traditional.

### Фаза 5. Индексация документации

Принцип: один скрипт делает весь пайплайн (read → chunk → embed → upsert) без промежуточного `.jsonl`. Живёт в `web-client`, т.к. это его контент. Prisma доступна транзитивно из `shared/package.json`. Дельта-индексация по `sha256` контента чанка — не пережигаем квоту Gemini на неизменившиеся доки.

27. В Prisma schema (в `shared/`) добавить enum `DocChunkKind { doc, recipe, api }` и model `DocChunk { id, kind, url, anchor, title, section, text, endpoints String[], contentHash String, embedding Unsupported("vector(768)") }`.
28. Создать миграцию: `CREATE EXTENSION IF NOT EXISTS vector` + таблица `DocChunk`.
29. Добавить HNSW индекс на `embedding` в миграции.
30. Создать `apps/web-client/bin/index-docs.ts`:
    - читает `.mdx` из `src/content/docs` и `src/content/recipes` напрямую через `fs` (виртуальный модуль `astro:content` в обычном tsx-скрипте недоступен);
    - валидирует frontmatter Zod-схемами, импортированными из `src/content.config.ts` (single source of truth);
    - тянет `api`-entries вызовом `applicationInterface.getOpenApiSchema()` (как в loader);
    - режет контент на чанки по headings + лимит токенов;
    - считает `sha256(text)` каждого чанка;
    - читает существующие `contentHash` из `DocChunk`, эмбеддит через `@google/genai` (`text-embedding-004`, `taskType: 'RETRIEVAL_DOCUMENT'`, `outputDimensionality: 768`) только новые/изменившиеся;
    - upsert в `DocChunk`, удаляет осиротевшие чанки (которых больше нет в исходниках).
31. Добавить script `"docs:index": "tsx bin/index-docs.ts"` в `apps/web-client/package.json` (запускать вручную / по CI после деплоя web, не на каждом билде).
32. Установить в `apps/web-client` нужные deps: `@google/genai`, `gray-matter` (для парсинга frontmatter из `.mdx`).
33. Прокинуть `GEMINI_API_KEY` и `DATABASE_URL` в `.env` web-client (только для скрипта, не для рантайма Astro).

### Фаза 6. Fastify AI search

34. Установить `@google/genai` в `apps/api`. Добавить `GEMINI_API_KEY` в `.env` и envs schema.
35. Создать общий клиент `apps/api/src/providers/llm/geminiClient.ts` (singleton `GoogleGenAI`).
36. Создать провайдер `apps/api/src/providers/llm/embeddingsProvider.ts`: метод `embed(text, taskType): number[]` (`text-embedding-004`, 768 dim, `taskType` = `RETRIEVAL_QUERY` для запроса, `RETRIEVAL_DOCUMENT` для индексации).
37. Создать провайдер `apps/api/src/providers/llm/chatProvider.ts`: метод `streamCompletion({system, user, contextChunks}): AsyncIterable<string>` (модель `gemini-2.5-flash-lite`, `temperature: 0.3`, `maxOutputTokens: 600`).
38. Создать system prompt в `apps/api/src/usecases/docs/aiSearch.prompt.ts`: «отвечай только на основе контекста, всегда указывай источники как `[title](url#anchor)`, отказывайся от вне-доменных вопросов». Подготовить как `cachedContent` для prompt caching.
39. Создать репозиторий `apps/api/src/providers/database/docChunksRepository.ts` с методом `searchByVector(embedding, k=3): DocChunk[]` (raw SQL `ORDER BY embedding <=> $1::vector LIMIT $2`).
40. Создать репозиторий `apps/api/src/providers/cache/aiSearchCacheRepository.ts` (Redis): ключ `ai:cache:<sha256(normalized_query)>`, TTL 24h, значение `{answer, sources}`. Опц. бонус — vector similarity по `RediSearch` для семантического hit.
41. Создать usecase `apps/api/src/usecases/docs/aiSearchUsecase.ts`: smart-routing (если запрос < 15 chars или нет вопросительных слов → вернуть пустой результат с подсказкой использовать traditional) → cache lookup → embed query → searchByVector(k=3) → streamCompletion → cache.set после полной генерации.
42. Создать схемы запроса/ответа в `apps/api/src/routes/docs/aiSearch.schemas.ts` (zod): `{query: string, sessionId?: string}` → SSE events `{type: 'token'|'sources'|'done', data}`.
43. Создать route `POST /docs/ai-search` (SSE) в `apps/api/src/routes/docs/aiSearch.ts`, подключить usecase.
44. Добавить rate-limit (per API key: 200/day для авторизованных, 20/day для анонимов по IP). Использовать Redis counters.

### Фаза 7. AI mode на сайте

45. Создать Vue-компонент `SearchAI.vue`: textarea + submit, потребляет SSE с `/docs/ai-search`, рендерит markdown ответа + карточки источников (`title`, `section`, `url#anchor`).
46. Создать переключатель режимов traditional/AI в `#docs-search-wrap` (хранение выбора в localStorage).
47. Прокинуть открытие модалки/dropdown с двумя режимами.

### Фаза 8. MCP сервер (Fastify plugin внутри `apps/api`)

48. Установить `@modelcontextprotocol/sdk` в `apps/api`.
49. Создать Fastify plugin `apps/api/src/plugins/mcp.ts`: инициализирует `McpServer` из SDK, маунтит `StreamableHTTPServerTransport` на роуте `POST /mcp` (и `GET /mcp` для SSE/resumability).
50. В plugin регистрировать тулзы из отдельных файлов в `apps/api/src/mcp/tools/`.
51. Реализовать тулзу `docs_search(query, k?)` в `apps/api/src/mcp/tools/docsSearch.ts` — переиспользует `aiSearchUsecase` (без LLM-генерации, только retrieval) или прямой вызов `docChunksRepository.searchByVector`.
52. Реализовать тулзу `docs_fetch(url)` в `apps/api/src/mcp/tools/docsFetch.ts` — возвращает чистый markdown страницы (читает из `DocChunk` по url или из ассета `docs-pages.json`).
53. Реализовать тулзу `recipe_search(endpointId?, query?, language?)` в `apps/api/src/mcp/tools/recipeSearch.ts` — фильтрует `DocChunk WHERE kind='recipe'` + опц. cosine similarity.
54. Реализовать тулзу `api_endpoint(method, path)` в `apps/api/src/mcp/tools/apiEndpoint.ts` — отдаёт OpenAPI-фрагмент из `applicationInterface.getOpenApiSchema()` (кеш уже встроен в singleton).
55. Добавить простой rate-limit для `/mcp` (Redis counter по IP/origin) и логирование вызовов тулз в `DocAiQuery`-стиле для аналитики.
56. Создать страницу `apps/web-client/src/content/docs/setup-mcp.mdx` с копи-пейст конфигом для `~/.cursor/mcp.json` (URL: `https://api.bitcoinapi.dev/mcp`).
57. Заменить ссылку `Setup MCP` в sidebar-card на `/docs/setup-mcp`.

### Фаза 9. CI / деплой

58. В корневой `Makefile` добавить таргет `docs-build`: `web build` (loader сам подтянет схему из `ApplicationInterface`) → `web docs:index` (read → chunk → embed → upsert одним скриптом).
59. В CI пайплайне поставить `docs-build` после деплоя api и web.
60. В CI пайплайне api после успешного деплоя триггерить деплой web (через `repository_dispatch` / deploy hook / следующий job в том же workflow) — чтобы свежая схема (новые версии кода api) сразу попала в индекс и страницы.

### Фаза 10. Полировка

61. Добавить в `DocPageLayout` блок «Was this helpful?» (минимум — лог в БД для последующего использования).
62. Логировать AI запросы и оценки в `DocAiQuery` модель для будущего fine-tuning промпта.
63. Добавить sitemap.xml для `/docs/**`.
64. Прогнать lighthouse, починить найденное.
