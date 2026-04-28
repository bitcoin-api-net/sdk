# Документация: web + traditional search + AI search + MCP

## Архитектура (короткое summary)

Один build-time реестр из трёх источников → 4 потребителя.

```
src/content/docs/*.mdx       (narrative)  ─┐
src/content/recipes/*.mdx    (рецепты)    ─┼─► registry (DocEntry[]) ─┬─► Astro static pages
apps/api/files/openapi.json  (api ref)    ─┘                          ├─► Orama index              (traditional search, статика)
                                                                      ├─► chunks → embeddings → pgvector
                                                                      │                  ▲
                                                                      │       Fastify POST /docs/ai-search (SSE)  ◄── AI mode на сайте
                                                                      │                  ▲
                                                                      └─► MCP server (HTTP/SSE)                   ◄── IDE-агенты
```

Ключевые решения:

- Astro **Content Collections** (Loader API) + кастомный loader для OpenAPI.
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
- [x] Cost-control: точный кэш в Redis по `sha256(normalized_query)` (TTL 24h), top-3 чанков, `max_output_tokens: 600`, `temperature: 0.3`, prompt caching через `cachedContent`, smart routing коротких запросов в Orama. Семантический кэш через RediSearch — пост-MVP.
- [x] Триггер пересборки индекса: **только на деплой web**. При деплое api — автоматически триггерить деплой web после успешного api (chained pipeline), чтобы подтянулась свежая схема.
- [x] Хост MCP: **отдельная апка `apps/mcp`** (Fastify), одна машина с api, общий `shared` (DB/Redis/providers). Внешний URL — `mcp.bitcoinapi.dev` (отдельный поддомен) или `/mcp` через reverse proxy на api-домене (решается на уровне Cloudflare/nginx, на код не влияет). Свой systemd-сервис, свой деплой.

## План реализации

### Фаза 1. OpenAPI как файл-артефакт api

Принцип: api — единственный источник OpenAPI-схемы. Web-client и MCP читают её из готового JSON-файла, а не импортируют код api. Так нет cross-app импортов и web-client билд не зависит от модулей api.

1. Проверить, что у всех роутов есть `operationId`, `summary`, `description`, `tags` в `schema`; проставить отсутствующие.
2. Зарегистрировать `@fastify/swagger` в `app.ts` (если ещё не зарегистрирован) с `openapi.info` (title, description, version) и общим списком `tags`. Никакого отдельного `app.interface.ts` не создаём.
3. В `app.ts` сразу после `app.ready()` и ДО `app.listen(...)` делать `const schema = app.swagger()` и синхронно писать его в `apps/api/files/openapi.json` (`fs.writeFileSync(path, JSON.stringify(schema, null, 2))`). Файл перезаписывается на каждый запуск api (dev и prod).
4. Создать папку `apps/api/files/` и закоммитить начальный `openapi.json` (последний снапшот). Файл коммитим в git — он простой источник правды для web-client билда без поднятого api. На деплое api пересоздаст его автоматически.
5. В `apps/web-client/src/content/loaders/openapi.ts` (Фаза 2) loader читает `apps/api/files/openapi.json` через `fs` (путь резолвить от `import.meta.url` поднимаясь до корня монорепо). Никаких импортов из пакета `api`.
6. Никаких `exports` в `apps/api/package.json` для cross-app импортов не нужно. Удалить ранее добавленный `app.interface.ts` и поле `"exports"`.
7. Деплой web-client должен идти ПОСЛЕ деплоя api (chained pipeline, см. Фазу 9), чтобы web подтянул свежий `openapi.json` из репозитория после того, как api его обновил и закоммитил/запушил его. На сервере проще: `make pb-api` запускает api → api перезаписывает файл локально → `make pb-web` сразу после читает этот файл из той же рабочей директории.

#### AI правила

- .cursor/rules/shared/development/backend/architecture/architecture.mdc
- .cursor/rules/shared/development/backend/backend.mdc

### Фаза 2. Content Collections в web-client

5. Установить `@astrojs/mdx` в `apps/web-client`. Туда же добавить workspace-зависимость `"shared": "*"` (нужна для `bin/index-docs.ts` в Фазе 5). Зависимость на пакет `api` НЕ нужна — OpenAPI-схема читается из файла.
6. Подключить интеграцию mdx в `astro.config.mjs`.
7. Создать `apps/web-client/src/content.config.ts` с zod-схемой коллекции `docs` (поля: `title`, `description`, `section`, `order`, `tags`).
8. Добавить в `content.config.ts` коллекцию `recipes` (`title`, `description`, `endpoints[]`, `language`, `difficulty?`, `tags?`, `runUrl?`).
9. Создать кастомный loader `apps/web-client/src/content/loaders/openapi.ts` (Astro Loader API): читает `apps/api/files/openapi.json` через `fs.readFileSync` (путь — относительно корня монорепо, резолвить от `import.meta.url`), парсит JSON и эмитит entry per operation.
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

### Фаза 5. Подготовка инфраструктуры эмбеддингов (shared)

Принцип: три источника контента (`docs`, `recipes`, `api`) — три разные сущности с разными полями и схемами в Astro, поэтому в БД тоже три отдельные модели и три репозитория. Никаких union/discriminator-полей. Общее у них только: `embedding vector(768)`, `contentHash`, чанкинг по headings и метод `searchByVector`. Это общее живёт в одном месте — базовом классе репозитория.

Provider знает только про Gemini API (embed текста). Каждый репозиторий знает про свою таблицу и сам внутри использует provider. Дельта-индексация по `sha256(text)` — внутри репозитория.

27. Установить `@google/genai` в `shared/package.json` (используется и web-client скриптом, и api в Фазе 6).
28. Добавить `GEMINI_API_KEY` в корневой `.env` и в `shared/src/env.ts`-style использование (через `required(env.GEMINI_API_KEY)`).
29. В Prisma schema добавить три файла моделей. У всех трёх — общий набор служебных полей: `id String @id @default(uuid(7))`, `contentHash String`, `embedding Unsupported("vector(768)")`, `createdAt`, `updatedAt`. Дальше — специфика:
    29.1. `prisma/models/docChunk.prisma` — model `DocChunk { url String, anchor String, title String, section String?, text String, @@unique([url, anchor]) }`. Источник: `src/content/docs/*.mdx` (narrative).
    29.2. `prisma/models/recipeChunk.prisma` — model `RecipeChunk { url String, anchor String, title String, description String?, language String, difficulty String?, tags String[], runUrl String?, endpoints String[], text String, @@unique([url, anchor]) }`. Источник: `src/content/recipes/*.mdx`. `endpoints` — массив `operationId`-ов, на которые ссылается рецепт (для MCP-тулзы `recipe_search` и cross-link `recipesForEndpoint`).
    29.3. `prisma/models/apiChunk.prisma` — model `ApiChunk { operationId String @unique, method String, path String, summary String?, description String?, tags String[], requestSchema Json?, responseSchemas Json, parameters Json, text String }`. Источник: `apps/api/files/openapi.json` через loader. Один эндпоинт = один чанк (нарезка не нужна — OpenAPI operation уже атомарна). `text` — собранный для embed-а человеческий текст из summary+description+tags+method+path.
30. Создать миграцию через `prisma migrate dev --create-only --name doc_chunks` (HNSW и `Unsupported("vector")` Prisma сам не сгенерит). В созданном `migration.sql` ВРУЧНУЮ:
    - в начале: `CREATE EXTENSION IF NOT EXISTS vector;`
    - затем DDL трёх таблиц `DocChunk`, `RecipeChunk`, `ApiChunk` (как сгенерил Prisma);
    - в конце по одному HNSW-индексу на каждую таблицу:
      - `CREATE INDEX doc_chunk_embedding_hnsw_idx ON "DocChunk" USING hnsw (embedding vector_cosine_ops);`
      - `CREATE INDEX recipe_chunk_embedding_hnsw_idx ON "RecipeChunk" USING hnsw (embedding vector_cosine_ops);`
      - `CREATE INDEX api_chunk_embedding_hnsw_idx ON "ApiChunk" USING hnsw (embedding vector_cosine_ops);`
    - применить через `prisma migrate dev`.
31. Создать `shared/src/providers/googleAi.provider.ts` (по rule `providers.mdc`):
    - класс `GoogleAiProvider`, в конструкторе инициализирует singleton `GoogleGenAI` через `required(env.GEMINI_API_KEY)`;
    - метод `embed(text: string, taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'): Promise<number[]>` — вызывает `text-embedding-004`, 768 dim, возвращает массив чисел;
    - в конце экспортирует singleton `export const googleAiProvider = new GoogleAiProvider()`.
32. Создать общий хелпер чанкинга `shared/src/services/text-chunker.service.ts` — функция `chunkMarkdown(text: string): Array<{anchor: string, title: string, text: string}>` (нарезка по headings + лимит токенов, slug для anchor). Используется репозиториями `docs` и `recipes`.
33. Создать три репозитория, каждый наследует `BaseRepository<PrismaClient['<model>']>`. Типы (`Creatable*`, `Updatable*`, `*Input`) — в `shared/src/repositories/<name>.repository/types.ts`.
    33.1. `shared/src/repositories/doc-chunk.repository.ts`:
    - `vectorize(doc: DocInput): Promise<{created, updated, skipped}>` — `DocInput = {url, title, section?, text}`, внутри `chunkMarkdown` → для каждого чанка `sha256` → дельта vs БД → `embed(_, 'RETRIEVAL_DOCUMENT')` → `upsert` по `(url, anchor)` через raw SQL (`embedding ::vector`); в конце удаляет осиротевшие anchors внутри этого `url`.
    - `deleteOrphansExcept(keepUrls: string[]): Promise<number>` — удаляет страницы целиком, которых больше нет в коллекции.
    - `searchByVector(embedding: number[], k?: number): Promise<DocChunk[]>` — raw SQL `ORDER BY embedding <=> $1::vector LIMIT $2`.
    - `findByUrl(url: string): Promise<DocChunk[]>` — для MCP `docs_fetch`.
      33.2. `shared/src/repositories/recipe-chunk.repository.ts`:
    - `vectorize(recipe: RecipeInput): Promise<{created, updated, skipped}>` — `RecipeInput = {url, title, description?, language, difficulty?, tags, runUrl?, endpoints, text}`, чанкинг `chunkMarkdown(text)`, при upsert каждого чанка пишет ВСЕ поля рецепта (denormalized — да, но запросы к одному чанку отдают всё сразу без join);
    - `deleteOrphansExcept(keepUrls: string[])`, `searchByVector(...)` — те же сигнатуры что у `docChunk`;
    - `findByEndpoint(operationId: string): Promise<RecipeChunk[]>` — `WHERE $1 = ANY(endpoints)`, для MCP `recipe_search` без query и для cross-link `recipesForEndpoint`.
      33.3. `shared/src/repositories/apic-chunk.repository.ts`:
    - `vectorizeApi(api: ApiInput): Promise<{created, updated, skipped}>` — `ApiInput = {operationId, method, path, summary?, description?, tags, requestSchema, responseSchemas, parameters}`, без чанкинга (1:1), внутри сам собирает `text` для embed-а из summary+description+tags+method+path;
    - `deleteOrphansExcept(keepOperationIds: string[]): Promise<number>` — удаляет эндпоинты, исчезнувшие из OpenAPI;
    - `searchByVector(embedding: number[], k?: number): Promise<ApiChunk[]>`;
    - `findByOperationId(operationId: string): Promise<ApiChunk | null>` — для MCP `api_endpoint`.
34. Принцип индексации: запускаем ПОСЛЕ `astro build`, читаем уже валидированные коллекции из артефактов билда — без дублирования zod-схем и парсинга `.mdx`. Astro складывает данные коллекций в `dist/_astro/` / внутренний кеш; стабильный публичный путь — собрать их явно через small data-route.
    34.1. Создать data-роут `apps/web-client/src/pages/docs-index.json.ts` (prerendered): `getCollection('docs')`, `getCollection('recipes')`, `getCollection('api')` → JSON с тремя массивами `{ docs: DocInput[], recipes: RecipeInput[], api: ApiInput[] }`. Префикс `_` исключает его из навигации/sitemap.
    34.2. Создать `apps/web-client/bin/index-docs.ts`: - читает `dist/docs-index.json` через `fs` (после `astro build`); - три последовательных цикла: `docs.forEach(d => docChunkRepository.vectorize(d))`, `recipes.forEach(r => recipeChunkRepository.vectorize(r))`, `api.forEach(a => apiChunkRepository.vectorizeApi(a))`; - после циклов: `docChunkRepository.deleteOrphansExcept(docUrls)`, `recipeChunkRepository.deleteOrphansExcept(recipeUrls)`, `apiChunkRepository.deleteOrphansExcept(operationIds)`; - логирует aggregated stats per kind.
35. Добавить script `"docs:index": "tsx bin/index-docs.ts"` в `apps/web-client/package.json`. Запускать строго ПОСЛЕ `astro build`. Дополнительные deps скрипту не нужны — парсинг `.mdx` делает Astro.

#### AI правила

- .cursor/rules/shared/development/backend/backend.mdc
- .cursor/rules/shared/development/backend/architecture/architecture.mdc
- .cursor/rules/shared/development/backend/architecture/providers.mdc
- .cursor/rules/shared/development/backend/architecture/usecases.mdc
- .cursor/rules/shared/development/backend/database/create-model.mdc
- .cursor/rules/shared/development/backend/database/repositories.mdc

### Фаза 6. Fastify AI search

36. Расширить `shared/src/providers/googleAi.provider.ts` методом `streamCompletion({system, user, contextChunks}): AsyncIterable<string>` — тонкая обёртка над `generateContentStream` из `@google/genai` (модель `gemini-2.5-flash-lite`, `temperature: 0.3`, `maxOutputTokens: 600`, system prompt передаётся как `cachedContent` для prompt caching).
37. Создать репозиторий `apps/api/src/repositories/search.repository.ts` (Redis): методы `cacheQuery(query: string, value: {answer, sources})` (ключ `ai:cache:<sha256(normalized_query)>`, TTL 24h) и `findQuery(query: string): {answer, sources} | null`. Только точный hit по нормализованному ключу. Семантический кэш через RediSearch — пост-MVP (выкинут из scope этой фазы).
38. Создать usecase `apps/api/src/usecases/docs/aiSearch.usecase.ts`:
    - system prompt объявлен прямо в файле как константа: «отвечай только на основе контекста; НЕ выдумывай ссылки и источники — sources собирает код, ты возвращаешь ТОЛЬКО ответ; отказывайся от вне-доменных вопросов»;
    - smart-routing — отдаём в LLM только если выполнены ВСЕ условия: длина запроса > 15 chars И (содержит `?` ИЛИ начинается с одного из `how|what|why|when|where|which|who|can|does|do|is|are` (case-insensitive)). Иначе — пустой результат с подсказкой использовать traditional;
    - `searchRepository.findQuery(query)` — если есть, отдать кэш как один SSE-event и закрыть стрим;
    - `googleAiProvider.embed(query, 'RETRIEVAL_QUERY')`;
    - параллельно зовём `docChunkRepository.searchByVector(embedding, 3)`, `recipeChunkRepository.searchByVector(embedding, 3)`, `apiChunkRepository.searchByVector(embedding, 3)`, мержим и сортируем по similarity, берём top-3;
    - сразу шлём SSE-event `{type: 'sources', data: chunks.map(c => ({kind, title, section?, url, anchor?}))}` — sources формируются ИЗ retrieval, а не из ответа модели; `kind` (`doc|recipe|api`) проставляется на основе того, из какого репо пришёл чанк;
    - `googleAiProvider.streamCompletion({system, user: query, contextChunks: chunks})` → стримим `{type: 'token', data: '...'}`;
    - в конце `{type: 'done'}` и `searchRepository.cacheQuery(query, {answer, sources})`.
39. Создать схемы запроса/ответа в `apps/api/src/routes/docs/aiSearch.schemas.ts` (Ajv `JSONSchemaType`): запрос `{query: string, sessionId?: string}` → SSE events:
    - `{type: 'sources', data: Array<{title, section?, url, anchor?}>}` — отправляется ПЕРВЫМ, до токенов;
    - `{type: 'token', data: string}` — поток текстовых токенов ответа;
    - `{type: 'done'}` — финальный маркер.
40. Создать route `POST /docs/ai-search` (SSE) в `apps/api/src/routes/docs/aiSearch.ts`, подключить usecase.
41. Добавить rate-limit (Redis counter). Так как `/docs` публичен и пользователи сайта обычно анонимы — все запросы лимитируем по IP (например, 30/day на IP). Если в куке валидный JWT — поднимаем до 200/day. Никаких API-key для AI search не требуем.

#### AI правила

- .cursor/rules/shared/development/backend/backend.mdc
- .cursor/rules/shared/development/backend/architecture/architecture.mdc
- .cursor/rules/shared/development/backend/architecture/providers.mdc
- .cursor/rules/shared/development/backend/architecture/usecases.mdc
- .cursor/rules/shared/development/backend/api/api.mdc
- .cursor/rules/shared/development/backend/api/create-endpoint.mdc

### Фаза 7. AI mode на сайте

42. Создать Vue-компонент `SearchAI.vue`: textarea + submit, потребляет SSE с `/docs/ai-search`. На event `sources` рендерит карточки источников (`title`, `section`, `url#anchor`) в шапке ответа. На events `token` стримит markdown в тело. На `done` снимает индикатор загрузки.
43. Создать переключатель режимов traditional/AI в `#docs-search-wrap` (хранение выбора в localStorage).
44. Прокинуть открытие модалки/dropdown с двумя режимами.

### Фаза 8. MCP сервер (отдельная апка `apps/mcp`)

45. Создать новую апку `apps/mcp` (Fastify), по структуре аналогично `apps/api`: `package.json` (deps: `fastify`, `@modelcontextprotocol/sdk`, `shared: "*"`), `tsconfig.json`, `src/app.ts` с функцией `main()`, `imports: { "#src/*": "./src/*" }`. Свой порт (например `MCP_PORT`).
46. В `apps/mcp/src/app.ts` функция `main()`: коннект к `redis`/`db` через `shared`, поднять Fastify, создать singleton `McpServer` из SDK и зарегистрировать на нём тулзы из `apps/mcp/src/mcp/tools/`. Singleton экспортировать из `apps/mcp/src/mcp/server.ts`.
47. Создать роут `apps/mcp/src/routes/mcp.ts` (Full declaration, по правилу `create-endpoint.mdc`): `POST /mcp` и `GET /mcp` на один handler. Внутри handler создать `StreamableHTTPServerTransport` в **stateless mode** (`sessionIdGenerator: undefined`), вызвать `mcpServer.connect(transport)` и `transport.handleRequest(req.raw, reply.raw, req.body)`. Транспорт создаётся per-request — это ок для read-only docs (никакой sticky-сессии не нужно). Body парсит сам Fastify (`Content-Type: application/json`), кастомный contentTypeParser не требуется.
48. Реализовать тулзу `docs_search(query, k?)` в `apps/mcp/src/mcp/tools/docsSearch.ts` — `googleAiProvider.embed(query, 'RETRIEVAL_QUERY')` + параллельный `searchByVector` по всем трём репо (`docChunk`, `recipeChunk`, `apiChunk`), мерж и сортировка по similarity, top-k. Без LLM.
49. Реализовать тулзу `docs_fetch(url)` в `apps/mcp/src/mcp/tools/docsFetch.ts` — `docChunkRepository.findByUrl(url)`, склеить чанки в один markdown.
50. Реализовать тулзу `recipe_search(operationId?, query?, language?)` в `apps/mcp/src/mcp/tools/recipeSearch.ts` — если есть `operationId`, `recipeChunkRepository.findByEndpoint(operationId)`; если есть `query`, доп. фильтр через `searchByVector` (или сортировка по cosine similarity); фильтр по `language` — обычный `WHERE`.
51. Реализовать тулзу `api_endpoint(method, path)` в `apps/mcp/src/mcp/tools/apiEndpoint.ts` — читает `apps/api/files/openapi.json` (один раз на старте mcp, кешируется в памяти; перечитывается при `SIGHUP` или per-request) и отдаёт OpenAPI-фрагмент по `method+path`. БД здесь не нужна — JSON-файл уже даёт точный lookup.
52. Добавить простой rate-limit для `/mcp` (Redis counter по IP/origin) и логирование вызовов тулз для аналитики.
53. Создать страницу `apps/web-client/src/content/docs/setup-mcp.mdx` с копи-пейст конфигом для `~/.cursor/mcp.json` (URL — `https://mcp.bitcoinapi.dev/mcp` или `https://api.bitcoinapi.dev/mcp` через reverse proxy, выбирается на этапе деплоя).
54. Заменить ссылку `Setup MCP` в sidebar-card на `/docs/setup-mcp`.

#### AI правила

- .cursor/rules/shared/development/backend/backend.mdc
- .cursor/rules/shared/development/backend/architecture/architecture.mdc
- .cursor/rules/shared/development/backend/architecture/providers.mdc
- .cursor/rules/shared/development/backend/architecture/usecases.mdc
- .cursor/rules/shared/development/backend/api/api.mdc
- .cursor/rules/shared/development/backend/api/create-endpoint.mdc

### Фаза 9. Деплой

55. ENV. Добавить `GEMINI_API_KEY` и (если выделили отдельный) `MCP_PORT` в:
    - корневой `.env` (dev);
    - `shared/src/env.ts` (через `required(env.GEMINI_API_KEY)`);
    - окружение CI / runtime (systemd `Environment=...` или `EnvironmentFile=`);
    - production `.env` на сервере.
56. Миграции. На деплое api прогнать `npx prisma migrate deploy` ДО рестарта сервиса (миграция `doc_chunk` создаст extension + таблицу + HNSW индекс).
57. Systemd. Создать unit-файлы:
    - `bitcoin-api.service` (если ещё нет) для `apps/api`;
    - `bitcoin-mcp.service` для `apps/mcp` (`ExecStart=node apps/mcp/src/app.js`, тот же `WorkingDirectory`, общий `EnvironmentFile`).
58. Cloudflare / reverse proxy. Завести DNS-запись `mcp.bitcoinapi.dev` → сервер, или прокинуть `/mcp` на api-домене в апку mcp на её порту. Допустить публичный доступ без Cloudflare Access (MCP должен быть открыт для IDE-агентов).
59. Makefile. Добавить таргеты:
    - `pb-api`: `git pull` → `npm run build` (api) → `npx prisma migrate deploy` → `systemctl restart bitcoin-api.service` → статус;
    - `pb-mcp`: `git pull` → `npm run build` (mcp) → `systemctl restart bitcoin-mcp.service` → статус;
    - `pb-web`: `git pull` → `npm run build` (web-client) → `npm run docs:index -w web-client` (read `dist/docs-index.json` → chunk → embed → upsert) → деплой статики;
    - `pb-all`: `pb-api` → `pb-mcp` → `pb-web` (последний обязателен после api, чтобы подтянулась свежая OpenAPI-схема в индекс).
60. Chained CI. В пайплайне api после успешного деплоя автоматически триггерить пайплайн web (через workflow_dispatch или make-таргет на сервере) — индекс должен обновляться сразу за схемой.

#### AI правила

- .cursor/rules/shared/development/makefile.mdc
