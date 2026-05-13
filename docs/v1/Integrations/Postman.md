# Postman — план интеграции

Подзадача к пункту **T1.1** из [Integrations (Not ready).md](./Integrations%20%28Not%20ready%29.md): отдельная страница `/docs/integrations/postman` с one-click импортом API в Postman + fallback-ами.

## Цель

1. Сделать импорт Bitcoin API в Postman **в один клик** через Run-in-Postman кнопку.
2. Если deep link не сработал — дать прямой URL OpenAPI-схемы для ручного импорта.
3. Если и URL не подошёл (firewall, offline) — кнопка скачивания `openapi.json` файлом.
4. Расширить sidebar доков пунктом **Postman** в разделе Integrations.

Порядок секций на странице зафиксирован: **deep link → URL → file**. Каждая следующая секция — fallback к предыдущей.

Объём задачи — ~0.3 дня (страница + sidebar + правка cross-link на OpenAPI).

## Текущее состояние (что уже есть)

- Публичный эндпоинт `GET /api/openapi.json` с поддержкой `?download=true` ([apps/api/src/routes/openapi.ts:20-40](../../../apps/api/src/routes/openapi.ts#L20)) — отдаёт схему с правильным `Content-Disposition` для скачивания файла.
- Шаблон страницы интеграции — [apps/web-client/src/pages/docs/integrations/openapi.astro](../../../apps/web-client/src/pages/docs/integrations/openapi.astro). Содержит готовые к копированию паттерны:
    - breadcrumbs `Docs › Integrations › <name>` ([openapi.astro:8-14](../../../apps/web-client/src/pages/docs/integrations/openapi.astro#L8));
    - CTA-кнопки `docs-cta-btn--primary` / `docs-cta-btn--outline` в `.cta-group` ([openapi.astro:25-63](../../../apps/web-client/src/pages/docs/integrations/openapi.astro#L25));
    - `Copy URL` с feedback `Copied!` через `navigator.clipboard.writeText` ([openapi.astro:48-62, 149-171](../../../apps/web-client/src/pages/docs/integrations/openapi.astro#L48));
    - `instruction-item` блоки с левой полосой для шагов ([openapi.astro:131-146, 276-292](../../../apps/web-client/src/pages/docs/integrations/openapi.astro#L131)).
- Sidebar доков (`docSections`) уже понимает группы `{ title, href }` для top-level пунктов без вложенных ссылок ([DocsLayout.astro:22-29](../../../apps/web-client/src/layouts/DocsLayout.astro#L22)).
- Env-переменная `PUBLIC_API_URL` (fallback `http://localhost:3000/api`) — используется в [openapi.astro:3](../../../apps/web-client/src/pages/docs/integrations/openapi.astro#L3).

## Выбор механизма deep link

У Postman есть два варианта для one-click импорта:

| # | Механизм | Как работает | Минусы |
|---|---|---|---|
| A | **Run-in-Postman** через Postman Public Network | Публикуем OpenAPI в публичный воркспейс Postman, получаем `https://god.gw.postman.com/run-collection/<uid>`. Работает и в desktop, и в web. | Требует разовой ручной публикации спеки; обновления синхронизируем отдельно. |
| B | **`postman://` URL scheme** | Ссылка `postman://import?url=<encoded url>` открывает desktop-приложение и предлагает импорт. | Работает только при установленном desktop Postman; на вебе/мобиле — мёртвая ссылка. Формат полудокументирован. |

**Выбор: A.** Публикация в Postman Public Network надёжнее, покрывает оба клиента. Вариант B можно добавить позже как доп.кнопку, если будет спрос.

## План работ

### 1. Postman Public Workspace (выполнено)

Воркспейс и коллекция уже опубликованы:

- Workspace: <https://www.postman.com/bitcoin-api-net/bitcoin-api>
- Collection (share URL): <https://www.postman.com/bitcoin-api-net/bitcoin-api/collection/59qe4sl/bitcoin-api?action=share&creator=12471752>

URL стабильный и публичный — хардкодим как константу в `.astro`, без env (упрощаем поддержку, env-переменная избыточна).

### 2. Сайт: страница `/docs/integrations/postman`

**Файл:** `apps/web-client/src/pages/docs/integrations/postman.astro` (новый, по структуре [openapi.astro](../../../apps/web-client/src/pages/docs/integrations/openapi.astro)).

Frontmatter:

```ts
const publicApiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
const openApiUrl = `${publicApiUrl}/openapi.json`;
const runInPostmanUrl =
  'https://www.postman.com/bitcoin-api-net/bitcoin-api/collection/59qe4sl/bitcoin-api?action=share&creator=12471752';
```

Секции страницы (в заданном порядке):

**Breadcrumbs + title + lead.** Копия паттерна из [openapi.astro:8-20](../../../apps/web-client/src/pages/docs/integrations/openapi.astro#L8). Lead-текст: `"Import the Bitcoin API into Postman in one click — or fall back to URL or file import."`

**Section 1 — Open in Postman (deep link).**

- `h2#open-in-postman`, короткий пояснительный параграф.
- CTA: `<a href={runInPostmanUrl} target="_blank" class="docs-cta-btn docs-cta-btn--primary">` с Postman-лого (SVG) и текстом `Run in Postman`.
- Подсказка мелким шрифтом: `"Works with Postman desktop and web. If nothing happens, try the URL method below."`

**Section 2 — Import via URL (fallback #1).**

- `h2#import-url`, пояснение когда применять: `"If the button above didn't work — for example, you don't have a Postman account yet."`
- `cta-group` с кнопкой `Copy URL` (паттерн `data-url` + script из [openapi.astro:48-62, 149-171](../../../apps/web-client/src/pages/docs/integrations/openapi.astro#L48); id заменить на `copy-postman-url`).
- `instruction-item` с шагами: `File → Import → Link → paste URL → Continue`.

**Section 3 — Download schema file (fallback #2).**

- `h2#download-file`, пояснение: `"If your network blocks Postman from fetching external URLs."`
- CTA: `Download openapi.json` — копия из [openapi.astro:26-47](../../../apps/web-client/src/pages/docs/integrations/openapi.astro#L26) (`href={openApiUrl + '?download=true'}` + `download="openapi.json"`).
- `instruction-item` с шагами: `File → Import → drag-and-drop the file (or use the Files tab)`.

**Стили + script.** Переиспользуем `<style>`-блок из [openapi.astro:173-300](../../../apps/web-client/src/pages/docs/integrations/openapi.astro#L173) (можно убрать неиспользуемые `.feature-grid` / `.feature-card`).

### 3. Сайдбар: пункт `Postman` в `INTEGRATIONS`

**Файл:** [apps/web-client/src/layouts/DocsLayout.astro:22-29](../../../apps/web-client/src/layouts/DocsLayout.astro#L22).

Добавить второй элемент в группу `INTEGRATIONS`:

```ts
{
  title: 'Postman',
  href: '/docs/integrations/postman',
},
```

### 4. Cross-link: убрать дубликат на странице OpenAPI

**Файл:** [apps/web-client/src/pages/docs/integrations/openapi.astro:132-138](../../../apps/web-client/src/pages/docs/integrations/openapi.astro#L132).

В секции `How to use` блок про Postman заменить на `"See the dedicated Postman guide"` со ссылкой `/docs/integrations/postman`, чтобы не дублировать инструкции.

## Verification

1. `bun run dev` в `apps/web-client` → открыть `http://localhost:4321/docs/integrations/postman`.
2. Sidebar показывает `INTEGRATIONS → OpenAPI / Postman`, текущий пункт подсвечен.
3. `Run in Postman` → открывается Postman (desktop при установленном, иначе web) с пре-импортированной коллекцией.
4. `Copy URL` → в буфере `…/api/openapi.json`, кнопка на 2с показывает `Copied!`.
5. `Download openapi.json` → скачивается файл с правильным именем (бэк уже шлёт `Content-Disposition`).
6. Sanity-check: на странице OpenAPI больше нет дубликата инструкции для Postman, есть ссылка на dedicated guide.
