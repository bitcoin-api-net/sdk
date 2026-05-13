# MCP — интеграция (реализовано)

Реализация пункта **T1.2** из [Integrations (Not ready).md](./Integrations%20%28Not%20ready%29.md): MCP server работает, его страница теперь в сайдбаре доков, `mcp-remote` поднят в видимое место, остался один внешний шаг — заявка в официальный реестр MCP.

## Архитектура

- **MCP server**: `POST/GET/DELETE /mcp` на API, Streamable HTTP, stateless ([apps/api/src/plugins/mcp.ts](../../../apps/api/src/plugins/mcp.ts)).
- **Production endpoint**: `https://api.bitcoinapi.dev/mcp`.
- **Tools** (6, см. [apps/api/src/mcp/](../../../apps/api/src/mcp/)):
    - `get_docs_list` — листинг чанков документации;
    - `get_doc(url)` — содержимое страницы;
    - `get_api_endpoints_list` — листинг эндпоинтов API;
    - `api_endpoint(operationId)` — OpenAPI-операция;
    - `get_recepies_for_endpoint(operationId)` — рецепты для эндпоинта (опечатка `recepies` сохранена осознанно, см. «Что НЕ делать»);
    - `get_recipe(url)` — содержимое рецепта.
- **Auth**: нет, эндпоинт публичный и read-only.

## Что сделано

### 1. Страница `/docs/integrations/mcp` в сайдбаре

**Файл:** [apps/web-client/src/content/docs/integrations/mcp.mdx](../../../apps/web-client/src/content/docs/integrations/mcp.mdx) — был `setup-mcp.mdx` в корне коллекции `docs`, перенесён в подпапку `integrations/`, slug сменился на `integrations/mcp` → роутится через [apps/web-client/src/pages/docs/[...slug].astro](../../../apps/web-client/src/pages/docs/[...slug].astro). URL: `/docs/integrations/mcp`.

**Файл:** [apps/web-client/src/layouts/DocsLayout.astro](../../../apps/web-client/src/layouts/DocsLayout.astro) — в `docSections.INTEGRATIONS` третьим пунктом (после `OpenAPI` и `Postman`):

```ts
{
  title: 'MCP',
  href: '/docs/integrations/mcp',
},
```

Также обновлена ссылка в `docs-sidebar-card` (правый сайдбар-CTA, тот же файл).

Старый URL `/docs/setup-mcp` теперь возвращает 404 — редирект не ставили: страница не успела разойтись по внешним ссылкам.

### 2. Структура страницы `mcp.mdx`

Порядок секций:

1. Lead-абзац + «public, read-only and free».
2. **Server details** — Name / URL / Transport.
3. **One-click install** — `<p>` с тремя кнопками (Cursor, VS Code, VS Code Insiders).
4. **Manual setup** — общий JSON-конфиг для тулов, поддерживающих Streamable HTTP.
5. **Tools without Streamable HTTP** ⭐ (новое) — `mcp-remote` stdio-bridge как универсальный fallback. См. §3 ниже.
6. Per-tool секции (8 шт.): Cursor, VS Code (GitHub Copilot), Claude Code, Claude Desktop, Windsurf, Zed, Codex CLI, Gemini CLI.
7. Available tools — описание шести MCP tools.
8. Try it / Troubleshooting.

### 3. Секция «Tools without Streamable HTTP»

Поднята из per-tool разбивки на уровень рядом с общим Manual setup, чтобы юзер с несписочным клиентом (Continue, Cline, …) сразу видел универсальное решение. Сниппет:

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

Тот же блок ещё дублируется в секциях Windsurf и Codex CLI (per-tool инструкции остаются полными, чтобы можно было копипастить целиком, не прыгая).

### 4. Дублирование one-click кнопок в per-tool секции

- В `### Cursor` под заголовком — `<p>` c кнопкой `Add to Cursor` (Cursor deeplink + лого с `cursor.com/deeplink/mcp-install-dark.svg`).
- В `### VS Code (GitHub Copilot)` под заголовком — `<p>` с двумя кнопками: VS Code stable (`vscode.dev/redirect`) + VS Code Insiders (`insiders.vscode.dev/redirect`).
- Лид-тексты этих секций изменены с `Add to …` / `Either click the button above` на `Or add manually to …` — кнопка стала primary действием, JSON-конфиг — fallback.
- Остальные тулы (Claude Code, Claude Desktop, Windsurf, Zed, Codex CLI, Gemini CLI) кнопок не имеют — там CLI-команда или ручной конфиг.

Кнопки физически продублированы (а не вынесены) — верхний блок `## One-click install` сохранён как сводный, нижние — контекстные.

## Что осталось вручную (внешнее)

PR в [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — одна строка в README, раздел «Community Servers». Поля заявки:

- **Имя**: `bitcoin-api-docs`.
- **Одна строка**: `"Search Bitcoin API docs, recipes and OpenAPI schema from your AI agent."`
- **Endpoint**: `https://api.bitcoinapi.dev/mcp`.
- **Install page**: `https://bitcoinapi.dev/docs/integrations/mcp`.
- **Лого**: тот же что фавикон, 512×512 PNG.
- **Tags**: `finance`, `crypto`, `bitcoin`, `documentation`, `openapi`.

## Verification (прошло)

- `npm run dev` в `apps/web-client` → sidebar (desktop + mobile) показывает `INTEGRATIONS → OpenAPI / Postman / MCP`; на `/docs/integrations/mcp` пункт MCP с `aria-current="page"`.
- HTTP-коды: `/docs/integrations/mcp` 200, `/docs/integrations/openapi` 200, `/docs/integrations/postman` 200, `/docs/setup-mcp` 404 (старый URL удалён).
- На странице секция «Tools without Streamable HTTP» лежит между «Manual setup» и блоком Cursor.
- В DOM страницы каждый deeplink (Cursor, VS Code, VS Code Insiders) встречается ровно по 2 раза: в верхнем сводном блоке + в своей per-tool секции.

## Что НЕ делать (решения зафиксированы)

- **Отдельные MCP-тулзы под каждый API endpoint.** Раздувает system prompt LLM, см. roadmap T1.2. Агент и так делает HTTP-запросы поверх OpenAPI.
- **npm-пакет `@bitcoinapi/mcp`.** Документации `npx -y mcp-remote https://api.bitcoinapi.dev/mcp` достаточно — обёртка не даёт ничего сверху, кроме маркетингового бренда.
- **Редирект `/docs/setup-mcp` → `/docs/integrations/mcp`.** Страница новая, внешних ссылок ещё нет. Если позже появятся жалобы — добавим однострочный `.astro` с `Astro.redirect(...)`.
- **Конвертация MDX → `.astro`** под стиль `openapi.astro` / `postman.astro` (breadcrumbs, CTA-кнопки в едином дизайне). Текущий MDX функционален; визуальное единообразие — отдельный round полировки, не часть T1.2.
- **OAuth / per-user auth** на MCP. Эндпоинт публичный и read-only — auth не нужен.
- **Smithery / mcpservers.org / Pulse MCP / Glama / awesome-mcp-servers.** Догоним по запросу, если официальный реестр не даст трафика.
- **Переименование `get_recepies_for_endpoint` → `get_recipes_for_endpoint`.** Сломает уже подключённые у юзеров конфиги. Депрекейт через alias — отдельный тикет.
