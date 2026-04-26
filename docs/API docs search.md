Окей, давай разложу. У тебя задача — один источник истины → 4 потребителя: статические страницы, обычный поиск, AI-поиск с цитатами, MCP для IDE.

## Архитектура которую советую

### 1. Два источника, один индекс

Не пытайся слить markdown и OpenAPI в один формат — это разные домены. Сделай их двумя _входами_ в один **build-time реестр**:

- **Narrative docs** (quickstart, концепты, гайды) → Astro **Content Collections** в MDX/Markdown с фронтматтером (`title`, `description`, `section`, `tags`, `order`).
- **API reference** → `openapi.json` от Fastify Swagger. В Astro 5 у Content Collections есть [Loader API](https://docs.astro.build/en/reference/content-loader-reference/) — можно написать кастомный loader, который скачивает/читает `openapi.json` и превращает каждый endpoint в entry коллекции (`api` collection). Тогда endpoint'ы — такие же entries, как и markdown-страницы.

Результат: одна абстракция `DocEntry { id, url, title, section, body, headings[], chunks[] }` на оба источника.

### 2. Рендер веб-страниц

Один dynamic route, например `src/pages/docs/[...slug].astro`, который читает обе коллекции (`docs` + `api`) и рендерит. Никакого ручного `quickstart.astro` — всё из коллекций.

### 3. Обычный поиск (тот «Search AI» инпут, traditional mode)

Берёшь [**Pagefind**](https://pagefind.app/) — стандарт для статических Astro-сайтов. Запускаешь после `astro build`, он сканит готовый HTML и генерит статический индекс (~kB на страницу). Поиск работает в браузере, без бэка. Идеально для traditional mode.

### 4. AI-поиск с ссылками (RAG)

Тут нужен бэк. Шаги:

1. На том же build-шаге, где собираешь реестр, **порежь контент на чанки** (~300–800 токенов, по заголовкам). Сохрани как `docs-chunks.jsonl`: `{id, url, anchor, title, section, text}`.
2. Прогон через embedding модель → векторы.
3. Хранилище:
   - **pgvector** в Postgres (у тебя уже Prisma) — проще, всё в одной БД.
   - либо **Redis Vector** (у тебя Redis в стеке) — быстрее, но лишний движок.
4. Fastify endpoint `POST /docs/ai-search`: embed query → top-k чанков → LLM с system-промптом «отвечай только по контексту, всегда указывай ссылки `url#anchor`». Возвращаешь и ответ, и список источников — фронт рендерит карточки-ссылки.

Пересборка индекса — в CI после деплоя доков. Чанки в git не нужны, артефакт CI.

### 5. MCP для IDE

MCP — это _ещё один потребитель тех же чанков_. Не надо отдельной базы. Поднимаешь маленький MCP-сервер (Node, [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)) с 2–3 тулзами:

- `docs_search(query, k?)` → дёргает твой же `/docs/ai-search` или напрямую vector store, возвращает чанки с url+anchor.
- `docs_fetch(url)` → возвращает чистый markdown страницы (берёшь из реестра).
- опционально `api_endpoint(method, path)` → OpenAPI-фрагмент.

Хостишь как **remote MCP over HTTP/SSE** на отдельном домене (например `mcp.bitcoinapi.dev`). Тогда «Setup MCP» — это просто инструкция: добавить URL в `~/.cursor/mcp.json`. Не надо ничего ставить локально.

## Картинка пайплайна

```
content/docs/*.mdx ─────┐
                        ├──► build registry ──┬──► Astro pages (статика)
fastify openapi.json ───┘   (DocEntry[])      ├──► Pagefind index (traditional search)
                                              ├──► chunks + embeddings → pgvector
                                              │       ▲
                                              │       │
                                              │   Fastify /docs/ai-search ◄── AI mode на сайте
                                              │       ▲
                                              │       │
                                              └──► MCP server (docs_search/fetch) ◄── IDE-агенты
```

## Почему так

- **Один build-step** → один реестр → невозможно рассинхронить веб/AI/MCP.
- Astro Content Loader API специально под это — OpenAPI становится «виртуальной коллекцией».
- Pagefind = ноль инфры на traditional search.
- Чанки + embeddings — общий ресурс для AI-режима сайта **и** MCP, не дублируешь.
- MCP по HTTP — пользователь добавляет URL, не качает npm-пакет.

## Пара вопросов прежде чем углубляться

1. Доки многоязычные планируются или only EN?
2. AI-режим — хочешь стримить ответ (SSE) или достаточно одного response с цитатами?
3. Какой LLM провайдер — OpenAI/Anthropic/локальный? Это влияет на выбор embeddings (для локального RAG обычно `text-embedding-3-small` или `bge-small`).
4. Как часто меняется OpenAPI? Если часто — индекс пересобираем по вебхуку из API, если редко — на каждом деплое веба.
