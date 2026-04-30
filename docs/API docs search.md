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
                                                                      └─► MCP server (POST/GET /mcp в той же apps/api) ◄── IDE-агенты
```

Ключевые решения:

- Astro **Content Collections** (Loader API) + кастомный loader для OpenAPI.
- `recipes` — отдельная коллекция со схемой `endpoints[]`, двусторонняя связь резолвится на билде.
- Orama для traditional search (ноль инфры, статика).
- pgvector в Postgres (Prisma уже есть). Fastify endpoint для AI search со стримингом.
- MCP — Streamable HTTP роут `/mcp` внутри `apps/api` (тот же процесс). Тулзы: `docs_search`, `docs_fetch`, `recipe_search`, `api_endpoint`.

## Открытые вопросы (заполнить перед стартом)

- [x] Языки: **EN only** (multi-lang возможно через ~год, не закладываем сейчас)
- [x] LLM провайдер: **Google Gemini** (SDK `@google/genai`, env `GEMINI_API_KEY`)
- [x] Чат-модель: **`gemini-2.5-flash-lite`** (fallback `gemini-2.5-flash` если качество не устроит)
- [x] Embeddings: **`text-embedding-004`**, **768 dim**
- [x] AI ответ: streaming SSE (по умолчанию: да)
- [x] Cost-control: точный кэш в Redis по `sha256(normalized_query)` (TTL 24h), top-3 чанков, `max_output_tokens: 600`, `temperature: 0.3`, prompt caching через `cachedContent`, smart routing коротких запросов в Orama. Семантический кэш через RediSearch — пост-MVP.
- [x] Триггер пересборки индекса: **только на деплой web**. При деплое api — автоматически триггерить деплой web после успешного api (chained pipeline), чтобы подтянулась свежая схема.
- [x] Хост MCP: **внутри `apps/api`** (роут `POST/GET/DELETE /mcp` без префикса `/api`). Решено в ходе реализации Фазы 8: отдельная апка дублировала бы usecases/repos/plugins/error-handler/CORS/logging без выгоды — деплой одной машиной, общая память (OpenAPI схема и весь shared слой используются напрямую без IPC/файлов). Внешний URL — `https://api.bitcoinapi.dev/mcp`. Отдельный поддомен/деплой не нужны.

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

36. Расширить `shared/src/providers/google-ai.provider.ts` методом `streamCompletion({system, user, contextChunks}): AsyncIterable<string>` — тонкая обёртка над `generateContentStream` из `@google/genai` (модель `gemini-2.5-flash-lite`, `temperature: 0.3`, `maxOutputTokens: 600`, system prompt передаётся через `systemInstruction`). Prompt caching через `cachedContent` намеренно не подключаем — это отдельный платный API (`caches.create`), для MVP `systemInstruction` дешевле и проще. Контекстные чанки склеиваются в один user prompt вида `Context:\n[1] <title>\n<text>\n---\nQuestion: <query>`.
37. Создать репозиторий `apps/api/src/repositories/search.repository.ts` (Redis): методы `cacheQuery(query, {answer, sources})` (ключ `ai:cache:<sha256(normalized_query)>`, TTL 24h) и `findQuery(query): {answer, sources} | null`. Нормализация: `trim().toLowerCase().replace(/\s+/g, ' ')`. Только точный hit. Семантический кэш через RediSearch — пост-MVP.
38. Создать usecase `apps/api/src/usecases/docs/ask-ai.usecase.ts`:
    - system prompt объявлен в файле константой: «отвечай только на основе контекста; НЕ выдумывай ссылки и источники — sources собирает код; отказывайся от вне-доменных вопросов; используй Markdown»;
    - smart-routing — отдаём в LLM только если длина запроса > 15 chars И (содержит `?` ИЛИ начинается с одного из `how|what|why|when|where|which|who|can|does|do|is|are` (case-insensitive)). Иначе шлём один token-event с подсказкой использовать traditional и `done`;
    - `searchRepository.findQuery(query)` — если есть, отдать `sources` + кэшированный `answer` одним токеном + `done`;
    - `googleAiProvider.embed(query, 'RETRIEVAL_QUERY')`;
    - параллельно `docChunkRepository.searchByVector(embedding, 3)`, `recipeChunkRepository.searchByVector(embedding, 3)`, `apiChunkRepository.searchByVector(embedding, 3)`, мерж и сортировка по rank-based score (`1/(rank+1)`), top-3. Реальный cosine distance из SQL — улучшение на потом;
    - первым event-ом шлём `{type: 'sources', data: chunks.map(c => ({kind, title, section?, url, anchor?}))}` (kind: `doc|recipe|api` по источнику, для `api` собираем `url` как `/docs/api/<operationId>`);
    - `googleAiProvider.streamCompletion(...)` → стримим `{type: 'token', data: '...'}`;
    - в конце `{type: 'done'}` и `searchRepository.cacheQuery(query, {answer, sources})`.
39. Установить `@fastify/sse` и зарегистрировать через тонкий плагин `apps/api/src/plugins/sse.ts` (через `fp(...)`, как остальные плагины). Внутри — unwrap CJS-default плагина (`@fastify/sse` объявляет ESM `export default` в d.ts, но шипит CJS `module.exports = fp(...)`; под `nodenext` дефолтный импорт даёт namespace, нужно достать `.default`). Используем route-level `sse: { heartbeat: false }` — стрим короткий, heartbeat не нужен.
40. Создать route `POST /api/v1/docs/ask-ai` в `apps/api/src/routes/v1/docs/ask-ai.ts`. Хендлер в одну строку: `await reply.sse.send(toSseMessages(askAiUseCase.execute({...})))`. Маппер `toSseMessages` превращает `AskAiEvent` (`{type, data}`) в нативные SSE-сообщения `{event, data}`. Wire-format на проводе:

    ```
    event: sources
    data: [...]

    event: token
    data: "hello"

    event: done
    data: {}
    ```

    Inline-схема `bodySchema = {query: string, 1..1000}` прямо в файле — autoload подхватывает все `*.ts` как роуты, отдельный `*.schemas.ts` рядом ломал бы регистрацию.

41. Централизованная обработка ошибок в `apps/api/src/plugins/error-handler.ts` (через `fp(...)`). Расширяет `setErrorHandler`: если `reply.sse` существует И `reply.raw.headersSent` — пишем `event: error\ndata: {code, message}\n\n` напрямую в raw поток и зовём `reply.sse.close()`. Иначе обычный JSON 500. Это позволяет SSE-роутам не писать try/catch вообще.
42. Rate-limit (Redis counter, 30/day по IP анонимам, 200/day с валидным JWT) — отложен в отдельную задачу. Не реализован в этой фазе.

#### AI правила

- .cursor/rules/shared/development/backend/backend.mdc
- .cursor/rules/shared/development/backend/architecture/architecture.mdc
- .cursor/rules/shared/development/backend/architecture/providers.mdc
- .cursor/rules/shared/development/backend/architecture/usecases.mdc
- .cursor/rules/shared/development/backend/api/api.mdc
- .cursor/rules/shared/development/backend/api/create-endpoint.mdc

### Фаза 7. AI mode на сайте

43. Создать Vue-компонент `apps/web-client/src/components/docs/SearchAI.vue`: input + submit-кнопка. Парсит SSE через `fetch().body.getReader()` (POST + SSE, нативный `EventSource` не подходит). Шапка `Accept: text/event-stream` обязательна (`@fastify/sse` иначе фолбэчит на обычный JSON-handler).
    - На event `sources` (приходит первым) рендерит карточки источников (`kind`-бейдж, `title`, `section`) в нижней части дропдауна.
    - На events `token` стримит markdown в верхнюю часть. Markdown рендерится через `marked` v18 (`gfm: true, breaks: true`), подсветка кода — через `marked-highlight` + `highlight.js/lib/core` с зарегистрированными языками `bash` (+ `shell`/`sh`), `javascript` (+ `js`), `json`. Тема `highlight.js/styles/github-dark.css` импортируется в компоненте (глобальные стили `.hljs-*` работают сквозь scoped CSS).
    - Пока `loading && !answer` — показываем «Thinking…» с анимацией трёх точек. Как только пришёл первый токен — Thinking сменяется ответом + мигающим курсором. На `done` курсор пропадает.
    - На event `error` — показываем ошибку в шапке дропдауна.
    - Дропдаун открывается СРАЗУ после submit (`open=true` перед `await fetch`), не ждёт первого токена.
    - Дропдаун телепортируется через `<Teleport to="#docs-search-wrap">` чтобы по ширине совпадать со всем поисковым баром (включая тоггл), а не только со слотом input-а. `teleportReady` через `onMounted` — чтобы не пытаться телепортить до маунта.
    - `onBlur` НЕ закрывает дропдаун пока `loading` (стрим идёт), и НЕ закрывает если фокус ушёл внутрь `#docs-search-wrap` (через `event.relatedTarget` + `wrap.contains(...)`).
    - Input БЕЗ `disabled` во время loading — иначе браузер автоматически снимает фокус, что триггерит `blur` и закрывает дропдаун. Повторный submit и так блокируется в `ask()`.
44. В `apps/web-client/src/components/docs/DocsHeader.astro`: добавить второй слот `<SearchAI client:load />` рядом со `<SearchTraditional client:load />` (видимость через `hidden`-атрибут), пометить `.docs-header__search` как `position: relative` (якорь для телепортированного дропдауна), переключатель режимов traditional/AI с сохранением в `localStorage` (ключ `docs-search-mode`, инициализация при загрузке скрипта).

### Фаза 8. MCP сервер (внутри `apps/api`)

> Принципиальное решение по итогам реализации: MCP живёт в **той же** апке, что и REST API. Отдельная апка `apps/mcp` была изначально в плане, прототип написан и удалён — практика показала, что это дублирует usecases (`docs-search`, `docs-fetch`, `recipe-search`, `api-endpoint`), repositories, plugins (logging/error-handler/CORS), `app.ts`, systemd-unit и деплой без выгоды. MCP-тулзы вызывают ровно тот же shared-слой что и REST + AI search; OpenAPI схема берётся напрямую из `app.swagger()` в той же памяти (без файла на диске для рантайма). Для внешнего трафика — общий домен `api.bitcoinapi.dev`, роут `/mcp` без префикса `/api`.

45. Установить в `apps/api` зависимости `@modelcontextprotocol/sdk@^1.21.0` и `zod@^3.24.1`.
46. Создать репозиторий `apps/api/src/repositories/openapi.repository.ts` (+ `openapi.repository/types.ts`) — **in-memory** хранилище OpenAPI схемы. API: `setSchema(schema: object)`, `getSchema()`, `findOperation(method, path) -> {method, path, operation} | null`, `writeToFile(): string`. Никакого `fs.readFileSync` в рантайме — источник правды для MCP это тот же объект, что вернул `app.swagger()`. `writeToFile()` инкапсулирует запись `apps/api/files/openapi.json` для билда web-client (Фаза 1) — путь резолвится от `import.meta.dirname`.
47. В `apps/api/src/app.ts` после `app.ready()`: `openApiRepository.setSchema(app.swagger())`, затем `openApiRepository.writeToFile()`. Один объект, два потребителя (MCP в памяти + web-client билд через файл) — никаких race conditions с диском.
48. Создать 4 usecase-а в `apps/api/src/usecases/docs/` (рядом с уже существующим `ask-ai.usecase.ts`):
    48.1. `docs-search.usecase.ts` — `DocsSearchUseCase`, инжектит `googleAiProvider`, `docChunkRepository`, `recipeChunkRepository`, `apiChunkRepository`. `execute({query, k?})`: `embed(query, 'RETRIEVAL_QUERY')` → параллельный `searchByVector` по трём репо (over-fetch `k * PER_SOURCE_MULTIPLIER`) → merge → rank-based similarity (`1/(rank+1)`) → top-`k`. Default `k=8`.
    48.2. `docs-fetch.usecase.ts` — `DocsFetchUseCase`, инжектит `docChunkRepository`. `execute({url})` → `findByUrl(url)` → склейка чанков в один markdown.
    48.3. `recipe-search.usecase.ts` — `RecipeSearchUseCase`, инжектит `googleAiProvider`, `recipeChunkRepository`. `execute({operationId?, query?, language?, k?})`: ветка с `operationId` → `findByEndpoint` (+опц. лексический re-rank по `query`); ветка с `query` → `searchByVector` (over-fetch `k * 3` чтобы оставить место для пост-фильтра); пост-фильтр по `language` (case-insensitive). `RecipeChunk` тип получаем через `Awaited<ReturnType<...>>` чтобы не тащить prisma client напрямую.
    48.4. `api-endpoint.usecase.ts` — `ApiEndpointUseCase`, инжектит `openApiRepository`. `execute({method, path})` → `openApiRepository.findOperation(...)` → `{method: method.toUpperCase(), path, operation}`.
49. Создать MCP server singleton в `apps/api/src/mcp/server.ts`:
    - `new McpServer({ name: 'bitcoin-api-docs', version: '0.0.1' })`;
    - вызвать `registerDocsSearchTool/registerDocsFetchTool/registerRecipeSearchTool/registerApiEndpointTool` в нужном порядке;
    - функция `wrapToolHandlersForLogging(server)` — оборачивает каждый зарегистрированный handler через приватный `_registeredTools` (у `McpServer` нет публичного pre/post-хука; альтернатива — низкоуровневый `Server` с ручным `setRequestHandler`, но это потеря всей валидации zod + структурирования). На выходе — `logger.info({tool, durationMs, ok: true|false}, 'mcp tool call')` для аналитики.
50. Создать 4 файла-обёртки в `apps/api/src/mcp/tools/` — каждый экспортирует `register*Tool(server)` с zod input schema и тонким хендлером, вызывающим соответствующий usecase. Возврат: `{content: [{type: 'text', text: JSON.stringify(...)}], structuredContent: {...}}`. Для `recipe_search` дополнительно валидация «хотя бы один из `operationId`/`query`» с `isError: true`.
51. Создать `apps/api/src/plugins/mcp.ts` (через `fp(...)`): регистрирует `POST/GET/DELETE /mcp` на один handler. В handler:
    - `new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })` — **stateless mode**, транспорт создаётся per-request (требование SDK ≥1.26: stateless transport нельзя переиспользовать);
    - `reply.raw.on('close', () => transport.close().catch(() => {}))` — cleanup при разрыве клиента;
    - `await mcpServer.connect(transport)`;
    - `await transport.handleRequest(req.raw, reply.raw, req.body)` — body парсится Fastify-ом из `application/json`, кастомный contentTypeParser не нужен;
    - `return reply` чтобы сказать Fastify «ответ ушёл напрямую через raw, ничего не отправляй сверху».
52. Создать страницу `apps/web-client/src/content/docs/setup-mcp.mdx` с копи-пейст конфигом для `~/.cursor/mcp.json` и Claude Code (`claude mcp add --transport http ...`). URL — `https://api.bitcoinapi.dev/mcp` (один домен с REST API, никаких отдельных поддоменов).
53. Заменить ссылку `Setup MCP` в sidebar-card `apps/web-client/src/layouts/DocsLayout.astro` на `/docs/setup-mcp`.

#### AI правила

- .cursor/rules/shared/development/backend/backend.mdc
- .cursor/rules/shared/development/backend/architecture/architecture.mdc
- .cursor/rules/shared/development/backend/architecture/providers.mdc
- .cursor/rules/shared/development/backend/architecture/usecases.mdc
- .cursor/rules/shared/development/backend/database/repositories.mdc
- .cursor/rules/shared/development/backend/api/api.mdc
- .cursor/rules/shared/development/backend/api/create-endpoint.mdc

### Фаза 9. Деплой

> MCP в одном процессе с api — отдельный systemd unit / поддомен / порт не нужны.

57. ENV. Добавить `GEMINI_API_KEY` в:
    - корневой `.env` (dev);
    - `shared/src/env.ts`-style использование (через `required(env.GEMINI_API_KEY)`);
    - окружение CI / runtime (systemd `Environment=...` или `EnvironmentFile=`);
    - production `.env` на сервере.
58. Миграции. На деплое api прогнать `npx prisma migrate deploy` ДО рестарта сервиса (миграция `doc_chunk` создаст extension + таблицу + HNSW индекс).
59. Systemd. Один unit-файл `bitcoin-api.service` для `apps/api` (включая MCP-роут — это один процесс).
60. Cloudflare / reverse proxy. MCP трафик идёт на тот же `api.bitcoinapi.dev`, путь `/mcp`. Никаких новых DNS-записей. Убедиться, что `/mcp` не попадает под Cloudflare Access (MCP должен быть открыт для IDE-агентов) — либо вынести `/mcp*` в обход политик, либо если Access не настроен — ничего не делать.
61. Makefile. Добавить таргеты:
    - `pb-api`: `git pull` → `npm run build` (api) → `npx prisma migrate deploy` → `systemctl restart bitcoin-api.service` → статус;
    - `pb-web`: `git pull` → `npm run build` (web-client) → `npm run docs:index -w web-client` (read `dist/docs-index.json` → chunk → embed → upsert) → деплой статики;
    - `pb-all`: `pb-api` → `pb-web` (последний обязателен после api, чтобы подтянулась свежая OpenAPI-схема в индекс).
62. Chained CI. В пайплайне api после успешного деплоя автоматически триггерить пайплайн web (через workflow_dispatch или make-таргет на сервере) — индекс должен обновляться сразу за схемой.

#### AI правила

- .cursor/rules/shared/development/makefile.mdc
