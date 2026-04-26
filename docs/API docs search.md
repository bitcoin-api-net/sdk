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
- [x] Cost-control: точный кэш в Redis по `sha256(normalized_query)` (TTL 24h), top-3 чанков, `max_output_tokens: 600`, `temperature: 0.3`, prompt caching через `cachedContent`, smart routing коротких запросов в Orama. Семантический кэш через RediSearch — пост-MVP.
- [x] Триггер пересборки индекса: **только на деплой web**. При деплое api — автоматически триггерить деплой web после успешного api (chained pipeline), чтобы подтянулась свежая схема.
- [x] Хост MCP: **отдельная апка `apps/mcp`** (Fastify), одна машина с api, общий `shared` (DB/Redis/providers). Внешний URL — `mcp.bitcoinapi.dev` (отдельный поддомен) или `/mcp` через reverse proxy на api-домене (решается на уровне Cloudflare/nginx, на код не влияет). Свой systemd-сервис, свой деплой.

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
4. Добавить в `apps/api/package.json` поле `"exports"` с точкой `"./app.interface"` (а также `"./src/*"` если потребуется), чтобы `apps/web-client` и `apps/mcp` могли импортировать singleton из workspace-пакета `api`.
   4.1. Гарантировать, что модули роутов и провайдеров НЕ открывают соединения (Redis/DB) на import — иначе `getOpenApiSchema()` из web-client билда дёрнет инфраструктуру. Все singletons — lazy.

#### AI привила

- .cursor/rules/shared/development/backend/architecture/architecture.mdc
- .cursor/rules/shared/development/backend/backend.mdc

### Фаза 2. Content Collections в web-client

5. Установить `@astrojs/mdx` в `apps/web-client`. Туда же добавить workspace-зависимости `"shared": "*"` и `"api": "*"` (нужны для loader в п.9 и для `bin/index-docs.ts` в Фазе 5).
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

### Фаза 5. Подготовка инфраструктуры эмбеддингов (shared)

Принцип: provider знает только про Gemini API (embed текста), repository знает про БД и сам внутри использует provider. Дельта-индексация по `sha256(text)` живёт внутри репозитория — provider остаётся "тупым" обёрткой над `@google/genai`.

27. Установить `@google/genai` в `shared/package.json` (используется и web-client скриптом, и api в Фазе 6).
28. Добавить `GEMINI_API_KEY` в корневой `.env` и в `shared/src/env.ts`-style использование (через `required(env.GEMINI_API_KEY)`).
29. В Prisma schema (в `prisma/models/`) добавить файл `docChunk.prisma`: enum `DocChunkKind { doc, recipe, api }` и model `DocChunk { id String @id @default(uuid(7)), kind DocChunkKind, url String, anchor String?, title String, section String?, text String, operationId String?, endpoints String[], contentHash String, embedding Unsupported("vector(768)"), @@unique([url, anchor]) }`.
    - `operationId` — заполняется только для `kind=api` (один эндпоинт = один operationId), индексируется для быстрых lookup в MCP-тулзе `api_endpoint`.
    - `endpoints` — заполняется только для `kind=recipe` (рецепт может ссылаться на N эндпоинтов).
    - Для `kind=doc` оба поля пустые.
30. Создать миграцию через `prisma migrate dev --create-only --name doc_chunk` (HNSW и `Unsupported("vector")` Prisma не сгенерит сам). В созданном `migration.sql` ВРУЧНУЮ:
    - в начале: `CREATE EXTENSION IF NOT EXISTS vector;`
    - затем DDL таблицы `DocChunk` (как сгенерил Prisma);
    - в конце: `CREATE INDEX doc_chunk_embedding_hnsw_idx ON "DocChunk" USING hnsw (embedding vector_cosine_ops);`
    - применить через `prisma migrate dev`.
31. Создать `shared/src/providers/googleAi.provider.ts` (по rule `providers.mdc`):
    - класс `GoogleAiProvider`, в конструкторе инициализирует singleton `GoogleGenAI` через `required(env.GEMINI_API_KEY)`;
    - метод `embed(text: string, taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'): Promise<number[]>` — вызывает `text-embedding-004`, 768 dim, возвращает массив чисел;
    - в конце экспортирует singleton `export const googleAiProvider = new GoogleAiProvider()`.
32. Создать `shared/src/repositories/docs.repository.ts` (наследует `BaseRepository<PrismaClient['docChunk']>`):
    - метод `vectorizeDoc(doc: DocInput): Promise<{created: number, updated: number, skipped: number}>`:
      - `DocInput = { kind, url, title, section?, text, endpoints }` — целый документ как одна сырая строка `text`;
      - внутри сам режет `text` на чанки по headings + лимит токенов (хелпер в `shared/src/repositories/docs.repository/chunker.ts`);
      - для каждого чанка генерирует `anchor` (из heading slug) и считает `sha256(chunkText)`;
      - читает существующие `{url, anchor, contentHash}` для этого `url` из `DocChunk`;
      - для новых/изменившихся чанков — зовёт `googleAiProvider.embed(chunkText, 'RETRIEVAL_DOCUMENT')`;
      - `upsert` по `(url, anchor)` с записью embedding через raw SQL (`$executeRaw` с `::vector`);
      - в конце метода удаляет осиротевшие anchors ВНУТРИ ЭТОГО `url`: `DELETE FROM "DocChunk" WHERE url = $1 AND anchor NOT IN ($2...)` (если heading переименовали — старая запись пропадёт);
      - НЕ удаляет осиротевшие чанки внутри других url-ов (это делает отдельный метод).
    - метод `deleteOrphansExcept(keepUrls: string[]): Promise<number>` — удаляет все `DocChunk`, у которых `url NOT IN (...)`. Зовётся скриптом один раз в конце, когда известен полный список актуальных url.
    - метод `searchByVector(embedding: number[], k: number = 3): Promise<DocChunk[]>` — raw SQL `ORDER BY embedding <=> $1::vector LIMIT $2` (нужен в Фазе 6).
    - типы (`DocInput`, `CreatableDocChunk`, `UpdatableDocChunk`) и chunker положить в `shared/src/repositories/docs.repository/`.
33. Принцип: запускаем индексацию ПОСЛЕ `astro build`, читаем уже валидированные коллекции из артефактов билда — без дублирования zod-схем и парсинга `.mdx`. Astro складывает данные коллекций в `dist/_astro/` / внутренний кеш; стабильный публичный путь — собрать их явно через small data-route.
    33.1. Создать data-роут `apps/web-client/src/pages/_docs-index.json.ts` (prerendered): `getCollection('docs')`, `getCollection('recipes')`, `getCollection('api')` → один JSON с массивом `{kind, url, anchor?, title, section?, body, operationId?, endpoints?}` для всех entries. Префикс `_` исключает его из навигации/sitemap.
    33.2. Создать `apps/web-client/bin/index-docs.ts`: - читает `dist/_docs-index.json` через `fs` (после `astro build`); - в цикле по entries зовёт `docsRepository.vectorizeDoc(doc)` — нарезка/hash/embed/upsert внутри репозитория; - после цикла зовёт `docsRepository.deleteOrphansExcept(allUrls)` для удаления удалённых страниц; - логирует aggregated stats (created/updated/skipped/deleted).
34. Добавить script `"docs:index": "tsx bin/index-docs.ts"` в `apps/web-client/package.json`. Запускать строго ПОСЛЕ `astro build`.
35. Дополнительные deps скрипту не нужны — парсинг `.mdx` делает Astro на этапе build.

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
    - `docsRepository.searchByVector(embedding, 3)` → `chunks`;
    - сразу шлём SSE-event `{type: 'sources', data: chunks.map(c => ({title, section, url, anchor}))}` — sources формируются ИЗ retrieval, а не из ответа модели;
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

45. Создать новую апку `apps/mcp` (Fastify), по структуре аналогично `apps/api`: `package.json` (deps: `fastify`, `@modelcontextprotocol/sdk`, `shared: "*"`, `api: "*"`), `tsconfig.json`, `src/app.ts` с функцией `main()`, `imports: { "#src/*": "./src/*" }`. Свой порт (например `MCP_PORT`).
46. В `apps/mcp/src/app.ts` функция `main()`: коннект к `redis`/`db` через `shared`, поднять Fastify, создать singleton `McpServer` из SDK и зарегистрировать на нём тулзы из `apps/mcp/src/mcp/tools/`. Singleton экспортировать из `apps/mcp/src/mcp/server.ts`.
47. Создать роут `apps/mcp/src/routes/mcp.ts` (Full declaration, по правилу `create-endpoint.mdc`): `POST /mcp` и `GET /mcp` на один handler. Внутри handler создать `StreamableHTTPServerTransport` в **stateless mode** (`sessionIdGenerator: undefined`), вызвать `mcpServer.connect(transport)` и `transport.handleRequest(req.raw, reply.raw, req.body)`. Транспорт создаётся per-request — это ок для read-only docs (никакой sticky-сессии не нужно). Body парсит сам Fastify (`Content-Type: application/json`), кастомный contentTypeParser не требуется.
48. Реализовать тулзу `docs_search(query, k?)` в `apps/mcp/src/mcp/tools/docsSearch.ts` — прямой `googleAiProvider.embed(query, 'RETRIEVAL_QUERY')` + `docsRepository.searchByVector(embedding, k ?? 5)`. Без LLM.
49. Реализовать тулзу `docs_fetch(url)` в `apps/mcp/src/mcp/tools/docsFetch.ts` — возвращает все чанки страницы (`DocChunk WHERE url = $1 ORDER BY anchor`), склеенные в один markdown.
50. Реализовать тулзу `recipe_search(operationId?, query?, language?)` в `apps/mcp/src/mcp/tools/recipeSearch.ts` — фильтр `DocChunk WHERE kind='recipe'` (`endpoints` содержит `operationId` если передан) + опц. cosine similarity при наличии `query`.
51. Реализовать тулзу `api_endpoint(method, path)` в `apps/mcp/src/mcp/tools/apiEndpoint.ts` — отдаёт OpenAPI-фрагмент из `applicationInterface.getOpenApiSchema()` (импорт singleton из workspace-пакета `api`).
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
    - `pb-web`: `git pull` → `npm run build` (web-client) → `npm run docs:index -w web-client` (read `dist/_docs-index.json` → chunk → embed → upsert) → деплой статики;
    - `pb-all`: `pb-api` → `pb-mcp` → `pb-web` (последний обязателен после api, чтобы подтянулась свежая OpenAPI-схема в индекс).
60. Chained CI. В пайплайне api после успешного деплоя автоматически триггерить пайплайн web (через workflow_dispatch или make-таргет на сервере) — индекс должен обновляться сразу за схемой.

#### AI правила

- .cursor/rules/shared/development/makefile.mdc
