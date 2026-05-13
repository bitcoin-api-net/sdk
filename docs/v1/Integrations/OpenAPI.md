# OpenAPI — план интеграции

Реализация пункта **T1.1** из [Integrations (Not ready).md](./Integrations%20%28Not%20ready%29.md): публичная OpenAPI спека на сайте + раздел Integrations в сайдбаре доков.

## Цель

1. Открыть OpenAPI-схему публично, чтобы внешние тулы (Postman/Insomnia/Bruno/Scalar/Cursor/Windsurf/n8n) могли импортировать API одним кликом.
2. Дать пользователям страницу документации (`/docs/integrations/openapi`) с пояснением, как подключиться, и кнопкой быстрого импорта.
3. Расширить боковую навигацию доков новым разделом **Integrations**.

Объём задачи — ~0.3 дня.

## Текущее состояние (что уже есть)

- OpenAPI 3.x автогенерится Fastify через `@fastify/swagger` ([apps/api/src/app.ts:62-79](../../../apps/api/src/app.ts#L62)).
- Схема пишется на диск после `app.ready()` ([apps/api/src/app.ts:98](../../../apps/api/src/app.ts#L98)) в [apps/api/files/openapi.json](../../../apps/api/files/openapi.json).
- Swagger UI работает на `/api/documentation` ([apps/api/src/app.ts:80-82](../../../apps/api/src/app.ts#L80)), `/api/documentation/json` отдаёт JSON, но эти пути «технические» — они лишены брендинга сайта и неудобны для быстрого копирования URL схемы в сторонние инструменты.
- Боковой нав доков собирается из массива `docSections` ([apps/web-client/src/layouts/DocsLayout.astro:7-30](../../../apps/web-client/src/layouts/DocsLayout.astro#L7)).
- Готовый паттерн карточки-CTA в правом сайдбаре: `docs-sidebar-card` ([apps/web-client/src/layouts/DocsLayout.astro:226-246](../../../apps/web-client/src/layouts/DocsLayout.astro#L226)).

## План работ

### 1. API: публичный эндпоинт `GET /openapi.json`

**Файл:** `apps/api/src/routes/openapi.ts`.

- Метод `GET /openapi.json` (фактический путь `GET /api/openapi.json`).
- Возвращает `openApiRepository.getSchema()`.
- Заголовки: `Content-Type: application/json`, `Cache-Control: public, max-age=300`.
- Не должен сам появляться в схеме (`hide: true`), чтобы не «загрязнять» спеку рекурсией.

**Точка проверки:** `curl http://localhost:3000/api/openapi.json | jq .info.title` → `"Bitcoin API"`.

### 2. Сайт: новый раздел `Integrations` в сайдбаре доков

**Файл:** [apps/web-client/src/layouts/DocsLayout.astro](../../../apps/web-client/src/layouts/DocsLayout.astro).

В массив `docSections` добавить новую секцию:

```ts
{
  heading: 'INTEGRATIONS',
  groups: [
    {
      title: 'Integrations',
      links: [
        { label: 'OpenAPI', href: '/docs/integrations/openapi' },
      ],
    },
  ],
},
