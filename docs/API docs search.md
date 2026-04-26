# Документация: web + traditional search + AI search + MCP

## Архитектура (короткое summary)

Один build-time реестр из трёх источников → 4 потребителя.

```
src/content/docs/*.mdx       (narrative)  ─┐
src/content/recipes/*.mdx    (рецепты)    ─┼─► registry (DocEntry[]) ─┬─► Astro static pages
api openapi.json (loader)    (api ref)    ─┘                          ├─► Pagefind index           (traditional search, статика)
                                                                      ├─► chunks → embeddings → pgvector
                                                                      │                  ▲
                                                                      │       Fastify POST /docs/ai-search (SSE)  ◄── AI mode на сайте
                                                                      │                  ▲
                                                                      └─► MCP server (HTTP/SSE)                   ◄── IDE-агенты
```

Ключевые решения:

- Astro **Content Collections** (Astro 5 Loader API) + кастомный loader для OpenAPI.
- `recipes` — отдельная коллекция со схемой `endpoints[]`, двусторонняя связь резолвится на билде.
- Pagefind для traditional search (ноль инфры).
- pgvector в Postgres (Prisma уже есть). Fastify endpoint для AI search со стримингом.
- MCP — отдельный HTTP/SSE сервер на `mcp.bitcoinapi.dev`, тулзы: `docs_search`, `docs_fetch`, `recipe_search`, `api_endpoint`.

## Открытые вопросы (заполнить перед стартом)

- [x] Языки: **EN only** (multi-lang возможно через ~год, не закладываем сейчас)
- [x] LLM провайдер: **Google Gemini** (SDK `@google/genai`, env `GEMINI_API_KEY`)
- [x] Чат-модель: **`gemini-2.5-flash-lite`** (fallback `gemini-2.5-flash` если качество не устроит)
- [x] Embeddings: **`text-embedding-004`**, **768 dim**
- [x] AI ответ: streaming SSE (по умолчанию: да)
- [x] Cost-control: семантический кэш в Redis (TTL 24h), top-3 чанков, `max_output_tokens: 600`, `temperature: 0.3`, prompt caching через `cachedContent`, smart routing коротких запросов в Pagefind
- [x] Триггер пересборки индекса: **только на деплой web**. При деплое api — автоматически триггерить деплой web после успешного api (chained pipeline), чтобы подтянулась свежая схема.
- [ ] Хост MCP: отдельный поддомен `mcp.bitcoinapi.dev` / на api домене `/mcp`

## План реализации

### Фаза 1. OpenAPI экспорт из Fastify

1. В `apps/api` добавить bin-скрипт `bin/dump-openapi.ts`: запустить app, прочитать `app.swagger()`, записать в `apps/api/openapi.json`.
2. В `apps/api/package.json` добавить script `"docs:openapi": "tsx bin/dump-openapi.ts"`.
3. Проверить, что у всех роутов есть `operationId`, `summary`, `description`, теги в schema; проставить отсутствующие.
4. Добавить `apps/api/openapi.json` в `.gitignore` (артефакт билда).

### Фаза 2. Content Collections в web-client

5. Установить `@astrojs/mdx` в `apps/web-client`.
6. Подключить интеграцию mdx в `astro.config.mjs`.
7. Создать `apps/web-client/src/content.config.ts` с zod-схемой коллекции `docs` (поля: `title`, `description`, `section`, `order`, `tags`).
8. Добавить в `content.config.ts` коллекцию `recipes` (`title`, `description`, `endpoints[]`, `language`, `difficulty?`, `tags?`, `runUrl?`).
9. Создать кастомный loader `apps/web-client/src/content/loaders/openapi.ts` (Astro 5 Loader API), который читает `apps/api/openapi.json` и эмитит entry per operation.
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

### Фаза 4. Traditional search (Pagefind)

22. Установить `pagefind` в `apps/web-client` (devDependency).
23. В `package.json` добавить script `"postbuild": "pagefind --site dist"`.
24. В `DocPageLayout.astro` добавить `data-pagefind-body` на main контейнер контента и `data-pagefind-meta` для title/section.
25. Создать Vue-компонент `SearchTraditional.vue` который импортирует `/pagefind/pagefind.js`, делает поиск по input, рендерит результаты с подсветкой.
26. Подключить компонент в `#docs-search-wrap` в режиме traditional.

### Фаза 5. Build chunks + embeddings

27. Создать `apps/web-client/scripts/build-chunks.ts`: использовать `getCollection` через Astro Content API (или прямой парс mdx) → разбить на чанки по headings + max токенов → выдать `apps/web-client/dist/docs-chunks.jsonl` со схемой `{id, kind, url, anchor, title, section, text, endpoints?}`.
28. Добавить script `"docs:chunks": "tsx scripts/build-chunks.ts"` (запускается после `astro build`).
29. В Prisma schema добавить enum `DocChunkKind { doc, recipe, api }` и model `DocChunk { id, kind, url, anchor, title, section, text, endpoints String[], embedding Unsupported("vector(768)") }`.
30. Создать миграцию для расширения `CREATE EXTENSION IF NOT EXISTS vector` и таблицы.
31. Добавить HNSW индекс на `embedding` в миграции.
32. Создать `apps/api/bin/embed-and-upload.ts`: читает `docs-chunks.jsonl` → батчами эмбеддит через `@google/genai` (`text-embedding-004`, `taskType: 'RETRIEVAL_DOCUMENT'`, `outputDimensionality: 768`) → upsert в `DocChunk` (truncate перед заливкой).
33. Добавить script в api package.json: `"docs:index": "tsx bin/embed-and-upload.ts"`.

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

### Фаза 8. MCP сервер

48. Создать `apps/mcp/` со своим `package.json`, зависимостями `@modelcontextprotocol/sdk`, fastify (или express).
49. Реализовать тулзу `docs_search(query, k?)` — проксирует в Fastify `/docs/ai-search` (или прямо в репозиторий через shared package).
50. Реализовать тулзу `docs_fetch(url)` — возвращает чистый markdown страницы (читает из реестра/CDN).
51. Реализовать тулзу `recipe_search(endpointId?, query?, language?)` — фильтрует `DocChunk WHERE kind='recipe'` + опц. similarity.
52. Реализовать тулзу `api_endpoint(method, path)` — отдаёт OpenAPI-фрагмент из `openapi.json`.
53. Подключить HTTP/SSE transport из `@modelcontextprotocol/sdk`.
54. Создать страницу `apps/web-client/src/content/docs/setup-mcp.mdx` с копи-пейст конфигом для `~/.cursor/mcp.json`.
55. Заменить ссылку `Setup MCP` в sidebar-card на `/docs/setup-mcp`.

### Фаза 9. CI / деплой

56. В корневой `Makefile` добавить таргет `docs-build`: `api dump-openapi` → `web build` → `web docs:chunks` → `api docs:index`.
57. В CI пайплайне поставить `docs-build` после деплоя api и web.
58. В CI пайплайне api после успешного деплоя триггерить деплой web (через `repository_dispatch` / deploy hook / следующий job в том же workflow) — чтобы свежий `openapi.json` сразу попал в индекс и страницы.
59. Деплой `apps/mcp` на отдельный поддомен (devops: nginx + systemd unit, по аналогии с api).

### Фаза 10. Полировка

60. Добавить в `DocPageLayout` блок «Was this helpful?» (минимум — лог в БД для последующего использования).
61. Логировать AI запросы и оценки в `DocAiQuery` модель для будущего fine-tuning промпта.
62. Добавить sitemap.xml для `/docs/**`.
63. Прогнать lighthouse, починить найденное.
