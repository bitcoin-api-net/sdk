# MCP — план интеграции

Реализация пункта **T1.2** из [Integrations (Not ready).md](./Integrations%20%28Not%20ready%29.md): допилить MCP server, привести его страницу в раздел Integrations доков, добавить дополнительные способы установки и засветить сервер в публичных MCP-каталогах.

## Цель

1. Сделать MCP **видимым** в доках: страница `/docs/integrations/mcp` в сайдбаре, по той же структуре что `OpenAPI` и `Postman`.
2. Добавить **npx-обёртку** `@bitcoinapi/mcp` как fallback для тулов без Streamable HTTP (Windsurf, Codex CLI, старые версии Claude Desktop).
3. Расширить **one-click install**: явные кнопки + deeplink для Claude Desktop (когда появится) и Smithery-install URL.
4. **Засветить** сервер в публичных каталогах (mcpservers.org, modelcontextprotocol/registry, Smithery, Pulse MCP, Glama, awesome-mcp-servers).

Тулзы MCP **не трогаем** — текущего набора из 6 хватает (см. [Integrations (Not ready).md:27](./Integrations%20%28Not%20ready%29.md#L27): отдельные тулзы под каждый endpoint раздуют контекст).

Объём задачи — ~1.5 дня (страница + npx + регистрация в каталогах). Без OAuth (T4.1) и без новых тулзов.

## Текущее состояние (что уже есть)

- MCP server работает на `POST/GET/DELETE /mcp` ([apps/api/src/plugins/mcp.ts](../../../apps/api/src/plugins/mcp.ts)) через `StreamableHTTPServerTransport` (stateless per-request).
- 6 тулзов в [apps/api/src/mcp/](../../../apps/api/src/mcp/): `get_docs_list`, `get_doc`, `get_api_endpoints_list`, `api_endpoint`, `get_recepies_for_endpoint`, `get_recipe`.
- Готовая страница [apps/web-client/src/content/docs/setup-mcp.mdx](../../../apps/web-client/src/content/docs/setup-mcp.mdx) — content-collection MDX по URL `/docs/setup-mcp`. Содержит:
    - один-клик кнопки для Cursor и VS Code / VS Code Insiders (Cursor deeplink + `vscode:mcp/install` через vscode.dev redirect);
    - manual setup для 7 тулов: Cursor, VS Code, Claude Code, Claude Desktop, Windsurf, Zed, Codex CLI, Gemini CLI;
    - описание 6 тулзов с примером prompt-а.
- Sidebar доков уже понимает раздел `INTEGRATIONS` ([apps/web-client/src/layouts/DocsLayout.astro:22-32](../../../apps/web-client/src/layouts/DocsLayout.astro#L22)) — сейчас там `OpenAPI` и `Postman`. **Setup MCP в сайдбаре отсутствует** — это и есть основной баг к закрытию.
- Шаблоны страниц-интеграций (breadcrumbs, `docs-cta-btn`, `instruction-item`, `Copy URL` со скриптом) — в [apps/web-client/src/pages/docs/integrations/openapi.astro](../../../apps/web-client/src/pages/docs/integrations/openapi.astro) и [postman.astro](../../../apps/web-client/src/pages/docs/integrations/postman.astro).
- Workspaces в `package.json` уже включают `apps/*` и `shared` — для нового npm-пакета добавим директорию `packages/mcp-cli/` и расширим `workspaces`.

## План работ

### 1. Перенести страницу в `/docs/integrations/mcp`

Сейчас страница лежит как MDX content-entry. Другие интеграции — `.astro` в `src/pages/docs/integrations/`. Приводим к единому виду.

**Файл:** `apps/web-client/src/pages/docs/integrations/mcp.astro` (новый, по структуре [postman.astro](../../../apps/web-client/src/pages/docs/integrations/postman.astro)).

Frontmatter:

```ts
const mcpUrl = 'https://api.bitcoinapi.dev/mcp';
const cursorInstallUrl =
  'cursor://anysphere.cursor-deeplink/mcp/install?name=bitcoin-api-docs&config=eyJ1cmwiOiJodHRwczovL2FwaS5iaXRjb2luYXBpLmRldi9tY3AifQ%3D%3D';
const vscodeInstallUrl =
  'https://vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522bitcoin-api-docs%2522%252C%2522type%2522%253A%2522http%2522%252C%2522url%2522%253A%2522https%253A%252F%252Fapi.bitcoinapi.dev%252Fmcp%2522%257D';
const vscodeInsidersInstallUrl =
  'https://insiders.vscode.dev/redirect?url=vscode-insiders%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522bitcoin-api-docs%2522%252C%2522type%2522%253A%2522http%2522%252C%2522url%2522%253A%2522https%253A%252F%252Fapi.bitcoinapi.dev%252Fmcp%2522%257D';
```

Секции страницы (порядок зафиксирован: deep link → manual → npx fallback → tools):

**Breadcrumbs + title + lead.** Копия паттерна из [postman.astro:8-20](../../../apps/web-client/src/pages/docs/integrations/postman.astro#L8). Lead: `"Connect Bitcoin API docs, recipes and OpenAPI schema to your AI coding agent over MCP. Public, read-only, no API key."`

**Section 1 — Server details.** Карточка с тремя строками: `Name`, `URL`, `Transport` — копия блока «Server details» из текущего setup-mcp.mdx, но через `instruction-item` или маленький `<dl>`. Кнопка `Copy URL` рядом с URL (паттерн `data-url` из [postman.astro](../../../apps/web-client/src/pages/docs/integrations/postman.astro)).

**Section 2 — One-click install.** `cta-group` с тремя/четырьмя кнопками подряд:

- Cursor (`docs-cta-btn--primary`, с курсор-лого SVG);
- VS Code (`docs-cta-btn--outline`);
- VS Code Insiders (`docs-cta-btn--outline`);
- Smithery (после публикации в Smithery, см. §5) — кнопка вида `Install via Smithery`.

Подсказка мелким: `"Click a button — your editor will pop up a confirmation dialog. No JSON, no restarts."`

**Section 3 — Manual setup (per-tool).** Перенос блока «Manual setup» из текущего MDX. Сейчас он на 7 тулов; формат остаётся (codeblocks с JSON/TOML), но обёрнут в `instruction-item` для единообразия с openapi/postman страницами. Порядок: Cursor → VS Code → Claude Code → Claude Desktop → Windsurf → Zed → Codex CLI → Gemini CLI.

**Section 4 — npx fallback.** Новая секция для §3 ниже. Текст: `"If your tool doesn't speak Streamable HTTP yet, use the npx wrapper — it bridges stdio MCP to our HTTP endpoint."`. Codeblock:

```jsonc
{
  "mcpServers": {
    "bitcoin-api-docs": {
      "command": "npx",
      "args": ["-y", "@bitcoinapi/mcp"]
    }
  }
}
```

Под кодом — `"Equivalent to `npx -y mcp-remote https://api.bitcoinapi.dev/mcp`, but auto-pinned to a known-good `mcp-remote` version and easier to remember."`

**Section 5 — Available tools.** Описание 6 тулзов — слово-в-слово из текущего setup-mcp.mdx (`get_docs_list`, `get_doc`, `get_api_endpoints_list`, `api_endpoint`, `get_recepies_for_endpoint`, `get_recipe`).

**Section 6 — Try it / Troubleshooting.** Перенос из текущего MDX, без изменений.

**Стили + script.** Переиспользуем `<style>` и `<script>` копированием из [postman.astro:173-300](../../../apps/web-client/src/pages/docs/integrations/postman.astro#L173). `Copy URL` script — тот же паттерн (`copy-mcp-url` id).

### 2. Удалить старую MDX-страницу + редирект

**Файл:** [apps/web-client/src/content/docs/setup-mcp.mdx](../../../apps/web-client/src/content/docs/setup-mcp.mdx) — удалить.

**Файл:** `apps/web-client/src/pages/docs/setup-mcp.astro` (новый, redirect-only):

```astro
---
return Astro.redirect('/docs/integrations/mcp', 301);
---
```

Так старые внешние ссылки (и шаги в README/блогах) не сломаются.

### 3. npm-пакет `@bitcoinapi/mcp` (npx-обёртка)

**Цель:** тонкая stdio→HTTP обёртка. Юзеры с тулами без поддержки Streamable HTTP пишут `npx -y @bitcoinapi/mcp` вместо запоминания URL и `mcp-remote`.

**Файлы (новая директория `packages/mcp-cli/`):**

```
packages/mcp-cli/
  package.json
  README.md
  bin/bitcoinapi-mcp.mjs
```

`package.json`:

```jsonc
{
  "name": "@bitcoinapi/mcp",
  "version": "0.1.0",
  "description": "Bitcoin API MCP server — stdio wrapper around https://api.bitcoinapi.dev/mcp",
  "bin": { "bitcoinapi-mcp": "bin/bitcoinapi-mcp.mjs" },
  "files": ["bin", "README.md"],
  "dependencies": { "mcp-remote": "^0.1" },
  "keywords": ["mcp", "model-context-protocol", "bitcoin", "bitcoin-api", "crypto"],
  "license": "MIT",
  "repository": "https://github.com/<org>/bitcoin_api"
}
```

`bin/bitcoinapi-mcp.mjs`:

```js
#!/usr/bin/env node
import { spawn } from 'node:child_process';
const url = process.env.BITCOINAPI_MCP_URL || 'https://api.bitcoinapi.dev/mcp';
spawn('npx', ['-y', 'mcp-remote', url], { stdio: 'inherit' }).on('exit', (c) => process.exit(c ?? 0));
```

— минимальный мост, без собственной реализации stdio-протокола. Если в будущем `mcp-remote` начнёт глючить — заменим на свой transport через `@modelcontextprotocol/sdk`.

**Workspaces.** В корневом [package.json](../../../package.json) добавить `packages/*` к `workspaces`.

**Публикация.** Разовая ручная: `cd packages/mcp-cli && npm publish --access public`. CI-автопаблиш не делаем до первого фидбэка — версия 0.x, можно ронять руками.

### 4. Сайдбар: пункт `MCP` в `INTEGRATIONS`

**Файл:** [apps/web-client/src/layouts/DocsLayout.astro:22-32](../../../apps/web-client/src/layouts/DocsLayout.astro#L22).

В группу `INTEGRATIONS` добавить третьим пунктом (после `Postman`):

```ts
{
  title: 'MCP',
  href: '/docs/integrations/mcp',
},
```

Это закрывает основной баг из тикета: страница появляется в `body > div.docs-layout > aside.docs-layout__sidebar > nav`.

### 5. Засветить сервер в каталогах MCP

Все каталоги — публичные, free, разовая ручная регистрация. Сделать одним подходом, в указанном порядке (по приоритету видимости для нашей ЦА — vibe coders):

| # | Каталог | Как засветиться | Что получаем |
|---|---|---|---|
| 1 | [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) | PR в README в раздел «Community Servers» с одной строкой ссылки на наш репо/доки | Официальный реестр от Anthropic, максимальная видимость |
| 2 | [Smithery](https://smithery.ai/) | Submit формой / GitHub-приложение. Smithery даёт **install-кнопку** и серверу — стабильный URL `smithery.ai/server/@bitcoinapi/mcp` | Дополнительная кнопка one-click в section 2 страницы |
| 3 | [mcpservers.org](https://mcpservers.org/) | Submit-форма / PR в их GitHub-репо | Каталог, упомянутый в тикете |
| 4 | [Pulse MCP](https://www.pulsemcp.com/) | Submit-форма | SEO + дискавери у AI-агентов которые скрейпят Pulse |
| 5 | [Glama MCP](https://glama.ai/mcp/servers) | Submit-форма | Ещё один индексатор |
| 6 | [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | PR в README, секция по категории (вероятно «Finance / Data») | GitHub stars + ссылка в одном из самых популярных awesome-листов |

**Что нужно подготовить один раз** (чтобы заливать одинаково везде):

- Короткое имя: `bitcoin-api-docs`.
- 1-строчное описание: `"Search Bitcoin API docs, recipes and OpenAPI schema from your AI agent."`
- URL HTTP-эндпоинта: `https://api.bitcoinapi.dev/mcp`.
- URL установочной страницы: `https://bitcoinapi.dev/docs/integrations/mcp`.
- Логотип 512×512 PNG (тот же что фавикон сайта).
- Список тулзов с короткими описаниями — уже есть в section 5 страницы.
- Categories/teги: `finance`, `crypto`, `bitcoin`, `documentation`, `openapi`.

Чек-лист регистрации хранить в новом файле `docs/v1/Integrations/MCP-registries.md` (один пункт = один каталог, чекбоксы), чтобы не забыть пройти все шесть.

## Verification

1. `bun run dev` в `apps/web-client` → открыть `http://localhost:4321/docs/integrations/mcp`.
2. Sidebar показывает `INTEGRATIONS → OpenAPI / Postman / MCP`, текущий пункт подсвечен.
3. `http://localhost:4321/docs/setup-mcp` → 301-редирект на `/docs/integrations/mcp`.
4. Кнопка `Add to Cursor` → открывается Cursor с диалогом «Install bitcoin-api-docs?» (deeplink жив).
5. Кнопка `Install in VS Code` → редирект через vscode.dev, открывает VS Code с диалогом установки.
6. `Copy URL` → в буфере `https://api.bitcoinapi.dev/mcp`, кнопка на 2с показывает `Copied!`.
7. После публикации `@bitcoinapi/mcp@0.1.0`: `npx -y @bitcoinapi/mcp` в терминале выводит JSON-RPC handshake (стартует mcp-remote, проксирует к HTTP). Прерывание Ctrl+C закрывает чисто.
8. Конфиг из section 4 (`command: "npx"`, `args: ["-y", "@bitcoinapi/mcp"]`) — добавляем в свежий Windsurf / Codex CLI, проверяем что тулзы доступны и `get_docs_list` отвечает.
9. PR-ы в каталоги (§5) — открыты и слинкованы в `MCP-registries.md`.

## Что НЕ делать в этом раунде

- **Отдельные MCP-тулзы под каждый API endpoint.** См. T1.2 в roadmap: раздувает system prompt LLM, агент и так делает HTTP-запросы поверх OpenAPI.
- **OAuth / per-user аутентификация** на MCP. Эндпоинт публичный, read-only — auth не нужен до тех пор, пока не добавим тулзы с write/persona.
- **Свой stdio transport.** Пока `mcp-remote` работает — нет смысла переизобретать. Возвращаемся к этому только если поедет.
- **Полная переработка тулз** (`get_recepies_for_endpoint` → `get_recipes_for_endpoint` и т.п.). Опечатку в имени не правим в этом раунде, чтобы не ломать у людей уже подключённые конфиги. Депрекейт через alias — отдельный тикет.
