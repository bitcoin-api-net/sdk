# MCP — план интеграции

Реализация пункта **T1.2** из [Integrations (Not ready).md](./Integrations%20%28Not%20ready%29.md): MCP server уже работает и описан, но не виден из сайдбара доков и не засвечен в публичных каталогах. Закрываем эти три пробела.

## Цель

1. Сделать страницу `setup-mcp` **видимой** в сайдбаре доков (раздел Integrations).
2. Поднять видимость **npx-установки** через `mcp-remote` для тулов без Streamable HTTP.
3. **Засветить** сервер в официальном реестре MCP (Anthropic).

Тулзы MCP **не трогаем** — текущего набора из 6 хватает (см. [Integrations (Not ready).md:27](./Integrations%20%28Not%20ready%29.md#L27): отдельные тулзы под каждый endpoint раздуют context window).

Объём задачи — **~0.5 дня кода** + регистрация в каталогах async (модерация не зависит от нас).

## Текущее состояние (что уже есть)

- MCP server на `POST/GET/DELETE /mcp` ([apps/api/src/plugins/mcp.ts](../../../apps/api/src/plugins/mcp.ts)), Streamable HTTP, stateless.
- 6 тулзов в [apps/api/src/mcp/](../../../apps/api/src/mcp/): `get_docs_list`, `get_doc`, `get_api_endpoints_list`, `api_endpoint`, `get_recepies_for_endpoint`, `get_recipe`.
- Готовая страница [apps/web-client/src/content/docs/setup-mcp.mdx](../../../apps/web-client/src/content/docs/setup-mcp.mdx) → URL `/docs/setup-mcp`. Уже содержит:
    - one-click кнопки для Cursor + VS Code + VS Code Insiders;
    - manual setup для 8 тулов (включая Windsurf/Codex CLI через `mcp-remote`);
    - описание тулзов + Troubleshooting.
- Sidebar понимает раздел `INTEGRATIONS` ([apps/web-client/src/layouts/DocsLayout.astro:22-32](../../../apps/web-client/src/layouts/DocsLayout.astro#L22)); сейчас там `OpenAPI` + `Postman`. **MCP отсутствует** — основной баг.

## План работ

### 1. Сайдбар: пункт `MCP` в `INTEGRATIONS`

**Файл:** [apps/web-client/src/layouts/DocsLayout.astro:22-32](../../../apps/web-client/src/layouts/DocsLayout.astro#L22).

В группу `INTEGRATIONS` третьим пунктом (после Postman):

```ts
{
  title: 'MCP',
  href: '/docs/setup-mcp',
},
```

URL оставляем `/docs/setup-mcp` — переезд на `/docs/integrations/mcp` принесёт только редирект и риск сломать внешние ссылки, при том что юзер дойдёт из сайдбара одинаково.

### 2. Поднять видимость npx-fallback в setup-mcp.mdx

`mcp-remote` уже упоминается в [setup-mcp.mdx:124-138, 156-164](../../../apps/web-client/src/content/docs/setup-mcp.mdx#L124) — но спрятан в секциях Windsurf и Codex CLI. Это сбивает: у юзера какой-нибудь Continue/Cline, он не находит свой тул, бросает.

**Правка:** новая секция **сразу после «Manual setup»** перед per-tool разбивкой:

````md
### Tools without Streamable HTTP

If your MCP client doesn't support HTTP transport yet (Windsurf, Codex CLI,
older Claude Desktop builds, …), use the `mcp-remote` stdio bridge:

```json
{
  "mcpServers": {
    "bitcoin-api-docs": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://api.bitcoinapi.dev/mcp"]
    }
  }
}
```

This works in any client that supports stdio-based MCP servers.
````

Сейчас этот же сниппет повторяется в Windsurf и Codex CLI — оставляем дубликаты как есть (per-tool секции остаются полными, юзер не вынужден прыгать вверх).

### 3. Засветить сервер в официальном реестре MCP

Одна заявка — PR в [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) в README, раздел «Community Servers», одна строка. Это официальный реестр Anthropic, максимальная видимость; остальные каталоги (Smithery, mcpservers.org, Pulse, Glama, awesome-mcp-servers) — догоняем по сигналам.

**Что готовим:**

- Имя: `bitcoin-api-docs`.
- Одна строка: `"Search Bitcoin API docs, recipes and OpenAPI schema from your AI agent."`
- Endpoint: `https://api.bitcoinapi.dev/mcp`.
- Install page: `https://bitcoinapi.dev/docs/setup-mcp`.
- Лого: тот же что фавикон, 512×512 PNG.
- Tags: `finance`, `crypto`, `bitcoin`, `documentation`, `openapi`.

## Verification

1. `bun run dev` в `apps/web-client` → sidebar показывает `INTEGRATIONS → OpenAPI / Postman / MCP`, ссылка на `/docs/setup-mcp` подсвечена.
2. На странице `/docs/setup-mcp` появилась секция «Tools without Streamable HTTP» между «Manual setup» и блоком Cursor.
3. PR в `modelcontextprotocol/servers` открыт — линк сюда в коммите/задаче.

## Что НЕ делать в этом раунде

- **Отдельные MCP-тулзы под каждый API endpoint.** Раздувает system prompt LLM, см. roadmap T1.2.
- **npm-пакет `@bitcoinapi/mcp`.** Достаточно документации `npx -y mcp-remote …` — обёртка не даёт ничего сверху, кроме маркетингового бренда.
- **Перенос URL `/docs/setup-mcp` → `/docs/integrations/mcp`.** Косметика. Сайдбар уже решает задачу discovery.
- **Конвертация MDX → `.astro`** под стиль `openapi.astro` / `postman.astro`. Текущий MDX функционален; визуальное единообразие — не задача T1.2.
- **OAuth / per-user auth** на MCP. Эндпоинт публичный и read-only.
- **Smithery / mcpservers.org / Pulse MCP / Glama / awesome-mcp-servers.** Догоним по запросу, если официальный реестр не даст трафика.
- **Переименование `get_recepies_for_endpoint` → `get_recipes_for_endpoint`.** Сломает уже подключённые у юзеров конфиги; депрекейт через alias — отдельный тикет.
