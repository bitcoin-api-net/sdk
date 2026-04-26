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

- [ ] Языки: EN only / multi-lang
- [ ] LLM провайдер для AI search (OpenAI / Anthropic / другой)
- [ ] Модель эмбеддингов (по умолчанию: `text-embedding-3-small`, 1536 dim)
- [ ] AI ответ: streaming SSE (по умолчанию: да)
- [ ] Триггер пересборки индекса: только на деплой web / вебхук от api при изменении openapi
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
29. В Prisma schema добавить enum `DocChunkKind { doc, recipe, api }` и model `DocChunk { id, kind, url, anchor, title, section, text, endpoints String[], embedding Unsupported("vector(1536)") }`.
30. Создать миграцию для расширения `CREATE EXTENSION IF NOT EXISTS vector` и таблицы.
31. Добавить HNSW индекс на `embedding` в миграции.
32. Создать `apps/api/bin/embed-and-upload.ts`: читает `docs-chunks.jsonl` → батчами эмбеддит через провайдер → upsert в `DocChunk` (truncate перед заливкой).
33. Добавить script в api package.json: `"docs:index": "tsx bin/embed-and-upload.ts"`.

### Фаза 6. Fastify AI search

34. Создать провайдер `apps/api/src/providers/llm/embeddingsProvider.ts` (метод `embed(text): number[]`).
35. Создать провайдер `apps/api/src/providers/llm/chatProvider.ts` (метод `streamCompletion(messages): AsyncIterable`).
36. Создать репозиторий `apps/api/src/providers/database/docChunksRepository.ts` с методом `searchByVector(embedding, k): DocChunk[]` (raw SQL `ORDER BY embedding <=> $1 LIMIT $2`).
37. Создать usecase `apps/api/src/usecases/docs/aiSearchUsecase.ts`: embed(query) → top-k → формирует контекст с цитатами → стримит ответ LLM.
38. Создать схемы запроса/ответа в `apps/api/src/routes/docs/aiSearch.schemas.ts`.
39. Создать route `POST /docs/ai-search` (SSE) в `apps/api/src/routes/docs/aiSearch.ts`, подключить usecase.
40. Добавить rate-limit на endpoint (per IP / per API key).

### Фаза 7. AI mode на сайте

41. Создать Vue-компонент `SearchAI.vue`: textarea + submit, потребляет SSE с `/docs/ai-search`, рендерит markdown ответа + карточки источников (`title`, `section`, `url#anchor`).
42. Создать переключатель режимов traditional/AI в `#docs-search-wrap` (хранение выбора в localStorage).
43. Прокинуть открытие модалки/dropdown с двумя режимами.

### Фаза 8. MCP сервер

44. Создать `apps/mcp/` со своим `package.json`, зависимостями `@modelcontextprotocol/sdk`, fastify (или express).
45. Реализовать тулзу `docs_search(query, k?)` — проксирует в Fastify `/docs/ai-search` (или прямо в репозиторий через shared package).
46. Реализовать тулзу `docs_fetch(url)` — возвращает чистый markdown страницы (читает из реестра/CDN).
47. Реализовать тулзу `recipe_search(endpointId?, query?, language?)` — фильтрует `DocChunk WHERE kind='recipe'` + опц. similarity.
48. Реализовать тулзу `api_endpoint(method, path)` — отдаёт OpenAPI-фрагмент из `openapi.json`.
49. Подключить HTTP/SSE transport из `@modelcontextprotocol/sdk`.
50. Создать страницу `apps/web-client/src/content/docs/setup-mcp.mdx` с копи-пейст конфигом для `~/.cursor/mcp.json`.
51. Заменить ссылку `Setup MCP` в sidebar-card на `/docs/setup-mcp`.

### Фаза 9. CI / деплой

52. В корневой `Makefile` добавить таргет `docs-build`: `api dump-openapi` → `web build` → `web docs:chunks` → `api docs:index`.
53. В CI пайплайне поставить `docs-build` после деплоя api и web.
54. Настроить вебхук `api → web` на пересборку индекса при изменении openapi (опционально).
55. Деплой `apps/mcp` на отдельный поддомен (devops: nginx + systemd unit, по аналогии с api).

### Фаза 10. Полировка

56. Добавить в `DocPageLayout` блок «Was this helpful?» (минимум — лог в БД для последующего использования).
57. Логировать AI запросы и оценки в `DocAiQuery` модель для будущего fine-tuning промпта.
58. Добавить sitemap.xml для `/docs/**`.
59. Прогнать lighthouse, починить найденное.
