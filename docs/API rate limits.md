# API rate limits

## Архитектура (короткое summary)

Два независимых механизма в одном Redis-инстансе:

```
REST request ──► resolveLimit(apiKey?, ip, routeId) ──► fixed-window counter (Redis INCR+EXPIRE) ──► allow / 429
                       │
                       ├── in-memory LRU (per-process)  ◄── pub/sub invalidation на purchase
                       └── Postgres (ApiKey, Boost) — fallback при miss

WS connect ──► IP gate (counter, fixed) ──► auth (apiKey) ──► concurrent gauge per (apiKey, routeId) ──► accept / close(1008)
                                                                       │
                                                                       └── INCR при connect, DECR при close + TTL safety net
```

Ключевые решения:

- **REST**: `@fastify/rate-limit` (Redis store встроен — передаётся через опцию `redis: <ioredis instance>`). Либа использует **fixed window** внутри, sliding не поддерживается. Динамический `max` через callback резолвит лимит из in-memory LRU → Postgres. Изоляция счётчиков **per route** — через встроенный `groupId` (передаём `routeId` = `routeOptions.schema.operationId`).
- **WS**: кастомный плагин (готового под concurrent connections нет). Два слоя: rate (новые коннекты/мин) + gauge (одновременные).
- **Окно**: **только per-minute** для всех роутов. Без дневных/часовых квот — простота.
- **Тарифов нет**. Только дефолты в коде + sparse-таблица купленных бустов на конкретные роуты. Юзер платит точечно за то, что ему нужно.
- **Гранулярность — per route**. Лимиты, счётчики и бусты — на уровне отдельного эндпоинта. В качестве `routeId` используем `routeOptions.schema.operationId` (уже проставлен на каждом роуте, напр. `getCurrentPrice`, `askAiDocs`, `signUp`). **Endpoint groups** — только UI-категории для группировки роутов в pricing-странице и доках.
- **Конфиг лимитов** в БД: `ApiKey` (сами ключи: `token` + метаданные) + `Boost` (sparse — одна запись на каждый купленный per-route буст; ссылается на ключ через `apiKey` плейн-токен). Связь по `apiKey`, без FK на уровне Prisma. **Дефолты — прямо в schema роута**, в OpenAPI extensions `x-default-rate-limit` (число, REST) и `x-default-ws-connections-limit` (число, WS). Анонимы и аутентифицированные без буста используют один и тот же дефолт.
- **Резолв лимита**: in-memory LRU (per-process, TTL ~60s) → Postgres при miss → дефолт из `schema['x-default-rate-limit']` при отсутствии буста. Инвалидация через Redis pub/sub при покупке буста.
- **Дефолт = anonymous = authenticated-without-boost**. Один и тот же лимит и для анонимов (по IP), и для запросов с ключом без буста. Буст применяется только к конкретному `(apiKey, operationId)` и поднимает лимит сверх дефолта.
- **Headers ответа**: `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`, `retry-after` при 429 — выдаются `@fastify/rate-limit` автоматически.

## Какие алгоритмы рассматривали

Кратко по тем, что разбирали, и почему остановились на fixed window.

| Алгоритм               | Суть                                                                     | Точность                                                      | Когда брать                                                  |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------ |
| **Fixed window**       | INCR счётчика в окне «по часам» (00:00, 00:01...). EXPIRE на длину окна. | Edge spike на стыке (можно почти 2x за 1 секунду на границе). | Quota use case, когда простота > точность.                   |
| Sliding window counter | Две корзины (текущая + предыдущая) + взвешенная сумма.                   | ~95%. Edge spike сглаживается.                                | Quota с защитой от спайков.                                  |
| Token bucket           | Ведро токенов, refill rate R, capacity B. Burst-friendly.                | Точно по среднему rate, разрешает burst до B.                 | Steady rate + bursts (WS messages, защита upstream'а с QPS). |
| Leaky bucket (queue)   | Очередь запросов с фиксированным output rate, overflow → drop.           | Smooth output rate.                                           | Network shaping. Для HTTP API почти не используется.         |
| Leaky bucket (meter)   | Математически = token bucket (вода вытекает с rate R).                   | То же что token bucket.                                       | То же.                                                       |
| Sliding window log     | Хранит timestamps всех запросов.                                         | 100%.                                                         | Дорого по памяти, редко оправдано.                           |

**Почему fixed window**:

1. **Простота**. INCR + EXPIRE — всё. Без Lua, без двух корзин, без weighted sums. Меньше кода → меньше багов → быстрее запуск.
2. **`@fastify/rate-limit` поддерживает только его**. Алгоритм hardcoded в либу, поменять можно лишь через кастомный `store` (= переписать всю логику счётчика). Брать готовую либу с её алгоритмом — экономия 150-200 строк кода и тестов.
3. **Edge spike нам не критичен**. У нас нет жёсткого upstream QPS, который надо защищать с точностью до запроса. Quota «N/min» работает достаточно хорошо: если юзер выжрал 2x на стыке — следующая минута начнётся с обнулённого окна, а суммарно за час лимит соблюдён.
4. **Vision проекта — простота и low burn rate**. Sliding window в Lua требует поддержки Lua-скрипта, тестов на корректность взвешенной суммы, обработки `NOSCRIPT` после рестартов Redis. Не нужно для MVP.
5. **Token bucket / leaky** — про burst и steady rate, а у нас quota-style модель. Не подходят семантически.

Если когда-то понадобится sliding (реальные жалобы на edge spike, защита нового upstream'а) — заменим `store` в `@fastify/rate-limit` на свой Lua-вариант. Интерфейс плагина не поменяется, роуты не тронем.

## Открытые вопросы (заполнить перед стартом)

- [x] **API ключи**: модель `ApiKey` создаётся в рамках этой задачи (см. «Модель данных»).
- [x] **Анонимный доступ**: все эндпоинты public, ключ опционален. **Дефолтный лимит — единый** для анонимов и аутентифицированных без буста. Хранится прямо в schema роута: `x-default-rate-limit` (число, req/min для REST), `x-default-ws-connections-limit` (число, concurrent для WS). Буст применяется поверх — только к конкретному ключу.
- [x] **Тарифы**: **нет тарифов**. Дефолты + точечные бусты per (apiKey, operationId).
- [x] **Гранулярность**: **per route**. Endpoint groups оставлены только как UI-категории (для группировки роутов в pricing-странице и доках). Лимиты, счётчики и Stripe Prices — per route.
- [x] **Идентификатор роута**: используем существующий `routeOptions.schema.operationId`. Дефолтный лимит лежит рядом в schema через OpenAPI extension `x-default-rate-limit` (REST) / `x-default-ws-connections-limit` (WS). Эти extensions автоматически попадают в OpenAPI JSON → фронт читает их оттуда. Центральной карты `RATE_LIMIT_DEFAULTS` НЕ заводим — single source of truth = schema роута.
- [x] **Алгоритм счётчика**: **fixed window** (см. секцию выше).
- [x] **Окна**: **только per-minute** для всех роутов. Без дневных квот.
- [x] **WS лимиты**: симметрично REST — per `(apiKey, operationId)`. Дефолты лежат в schema роута: `x-default-rate-limit` (новые connect'ы в минуту) + `x-default-ws-connections-limit` (одновременные коннекты, gauge). Бусты в MVP — только на rate, не на concurrent.
- [x] **Биллинг бустов**: **Stripe Subscription с несколькими items** — одна подписка на юзера, item per (routeId, tier). См. секцию «Биллинг (Stripe)».
- [x] **Behind proxy**: API стоит за **nginx** (Cloudflare — возможно позже, пока не ставим). В Fastify включаем `trustProxy: true`, IP берём из `req.ip` (Fastify сам парсит `X-Forwarded-For` при `trustProxy`). На будущее, если добавится Cloudflare — переключимся на header `CF-Connecting-IP` через кастомный `keyGenerator`. IP используется только как fallback-ключ для анонимов; для аутентифицированных запросов ключ — `apiKey` (плейн-токен).
- [x] **Горизонт. масштабирование**: **минимум 2 инстанса, в перспективе до 4**. Вывод: счётчики **обязательно в Redis** (иначе per-instance лимиты = эффективный лимит × N). Для конфиг-кеша (резолв лимита per (apiKey, routeId)) — in-memory LRU per инстанс + Redis pub/sub для инвалидации после покупки/отмены буста. TTL кеша короткий (30–60 сек) как safety net на случай пропущенного pub/sub-сообщения.
- [x] **Зависимости**: ОК. Добавляем `@fastify/rate-limit` + `ioredis` + `lru-cache`.
- [x] **Redis-клиент**: вариант (а) — **добавляем `ioredis` только для rate-limit**, изолированно. `shared/src/redis.ts` (node-redis) остаётся как есть для `pricesBroker`, MCP-кэша и прочего. Новый `ioredis`-клиент живёт рядом, используется только плагином rate-limit и pub/sub-инвалидацией конфиг-кеша.

## Принципы

1. **Конфиг ≠ состояние**. Лимиты (config) и счётчики (state) живут раздельно — разные ключи, разные TTL, разная инвалидация.
2. **Hot path не ходит в Postgres**. Резолв лимита — in-memory LRU; Redis — только для счётчика. Postgres трогаем только при cache miss и при пересчёте после покупки буста.
3. **Per route, не группа**. Лимиты, счётчики и бусты — на уровне отдельного роута. `routeId` = `routeOptions.schema.operationId` (уже есть у каждого роута, отдельное поле в `config` не вводим). Группы — только UI-категории для биллинга/доков, в коде runtime их нет.
4. **Дефолты в schema роута, бусты в БД**. Дефолт каждого роута — число в `schema['x-default-rate-limit']` (или `x-default-ws-connections-limit` для WS). Все нормальные пользователи живут на этих дефолтах — их в БД нет вовсе. БД растёт только по числу реально купленных бустов (sparse). Дефолт уезжает в OpenAPI как есть → фронт рисует таблицу прямо из OpenAPI без отдельного endpoint'а.
5. **Fail open** при недоступности Redis. Считаем «пропустить» лучше, чем «положить API». `@fastify/rate-limit` это умеет через `skipOnError: true`.
6. **Стандартные заголовки**. `x-ratelimit-*` + `retry-after` (управляются либой).

## Модель данных (Prisma)

Две новые модели + правка `User`. Файлы — в `prisma/models/`.

`windowSec` в моделях НЕ хранится — все лимиты per-minute, окно фиксировано в коде.

### `prisma/models/api-key.prisma`

```prisma
model ApiKey {
  id         String   @id @default(uuid(7))
  userId     String   @map("user_id")
  token      String   @unique                          // плейн-токен (напр. bcn_xxxxxxxxxxxx). По нему лукап на hot path и матчинг Boost'ов. Показывается юзеру в UI.
  name       String
  isActive   Boolean  @default(true) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")
  lastUsedAt DateTime? @map("last_used_at")

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("api_keys")
}
```

Храним **только плейн-токен**, без хеша. Сравнение на hot path — прямое равенство по уникальному индексу `token`. Юзеру показываем токен в UI целиком в любой момент (можно скопировать заново).

Compromise: при компрометации БД утекают рабочие токены. Осознанный trade-off — по токену из этого API можно только **читать публичные данные**, никаких разрушительных операций. В обмен — простота (нет sha256 на каждом запросе, нет двух полей, нет проблемы «юзер потерял токен») и удобство DX.

### `prisma/models/boost.prisma`

```
model Boost {
  id                       String   @id @default(uuid(7))
  apiKey                   String   @map("api_key")             // плейн-токен (= ApiKey.token), по нему резолвится лимит
  routeId                  String   @map("route_id")            // = operationId роута, напр. "getCurrentPrice", "askAiDocs"
  maxPerMinute             Int      @map("max_per_minute")
  expiresAt                DateTime? @map("expires_at")         // undefined = бессрочно (активная подписка)
  stripeSubscriptionItemId String?  @unique @map("stripe_subscription_item_id")
  stripePriceId            String?  @map("stripe_price_id")
  createdAt                DateTime @default(now()) @map("created_at")

  @@unique([apiKey, routeId])
  @@index([apiKey])
  @@map("boosts")
}
```

**Связь без FK, по `apiKey`**:

- `apiKey` (плейн-токен) — копия `ApiKey.token`. Единственная точка связи с `ApiKey` и main индекс для hot-path лукапа в `findActive(...)`.

На уровне Prisma/Postgres FK не декларируется — мэтчинг по равенству строк в коде. Плюсы: проще схема, удаление ключа не каскадит. Минусы: нет referential integrity, возможны orphan-бусты (юзер удалил ключ — `Boost` остался). Чистка orphan'ов — отдельной cron-задачей пост-MVP.

Sparse-таблица: одна запись = один купленный буст. Если буста нет — берётся дефолт из кода. Дефолтов в БД не дублируем.

### Правка `prisma/models/user.prisma`

Добавить relation: `apiKeys ApiKey[]`.

## Дефолты (в schema каждого роута)

Дефолтный лимит лежит **прямо в `schema` роута** через OpenAPI extension. Без центральной карты — single source of truth.

- **REST**: `schema['x-default-rate-limit']: number` — запросов в минуту.
- **WS**: `schema['x-default-ws-connections-limit']: number` — одновременных коннектов (concurrent gauge).

Один и тот же дефолт действует и для анонимов (по IP), и для запросов с ключом без буста. Буст применяется только к конкретному `(apiKey, operationId)` и поднимает лимит **сверх** дефолта (т.е. итог = `max(default, boost.maxPerMinute)`; на практике `boost > default`).

Пример REST-роута:

```ts
fastify.get(
  '/v1/prices/current',
  {
    schema: {
      operationId: 'getCurrentPrice',
      'x-default-rate-limit': 60,
      response: {
        /* ... */
      },
    },
  },
  getCurrentPriceHandler
);
```

Пример WS-роута:

```ts
fastify.get(
  '/v1/prices/stream',
  {
    websocket: true,
    schema: {
      operationId: 'streamCurrentPrice',
      'x-default-rate-limit': 30, // новых connect'ов в минуту
      'x-default-ws-connections-limit': 5, // одновременных коннектов
    },
  },
  streamCurrentPriceHandler
);
```

OpenAPI extensions (`x-*`) автоматически копируются `@fastify/swagger` в итоговый OpenAPI JSON → фронт берёт их оттуда без отдельного endpoint'а.

### Текущие роуты — placeholder лимитов

Цифры утверждаем перед стартом, проставляются в schema каждого роута:

| operationId       | x-default-rate-limit (req/min) | примечание           |
| ----------------- | ------------------------------ | -------------------- |
| `ping`            | 120                            | системный            |
| `getCurrentPrice` | 60                             |                      |
| `askAiDocs`       | 5                              | дорогой LLM-эндпоинт |
| `signUp`          | 10                             |                      |
| `login`           | 10                             |                      |
| `logout`          | 30                             |                      |
| `getMe`           | 60                             |                      |
| `forgotPassword`  | 3                              | защита от спама      |
| `resetPassword`   | 3                              |                      |
| `verifyEmail`     | 5                              |                      |
| `googleLogin`     | 10                             |                      |
| `googleCallback`  | 10                             |                      |

Все эндпоинты public — ключ не required нигде. Если когда-то понадобится сделать роут closed (`getMe` и т.п. — спорно), решение будет приниматься отдельно через auth-плагин, не через рейт-лимиты.

### Валидация на старте

В `onReady` хук пройтись по всем роутам и проверить:

1. `schema.operationId` задан и уникален.
2. `schema['x-default-rate-limit']` задан, число > 0.
3. Для WS-роутов (`websocket: true`) дополнительно: `schema['x-default-ws-connections-limit']` задан, число > 0.

Если что-то нарушено — **fail fast**, сервер не стартует. Это явная договорённость: без лимита роут не регистрируется.

## Резолв лимита (алгоритм)

На onRequest auth-хук: header `X-Api-Key` → `apiKeyRepository.findByToken(token)` → если найден и `isActive` → кладём `req.apiKey = token` и `req.apiKeyId = apiKey.id`.

Резолвер принимает `(token?, routeId, defaultLimit)`, где `defaultLimit` — это число из `schema['x-default-rate-limit']` запрошенного роута.

1. Если `token` есть:
   1. `inMemoryCache.get(token, routeId)` → попадание → готово.
   2. Иначе: `findFirst(Boost where apiKey = token, routeId, (expiresAt IS NULL OR > now))` → если есть, берём `boost.maxPerMinute`; иначе берём `defaultLimit`.
   3. Кладём результат в `inMemoryCache` с TTL 60s.
2. Если `token` нет — лимит `= defaultLimit` (тот же), счётчик ведётся по IP.

## Счётчики (Redis)

### REST (через `@fastify/rate-limit`)

Redis-стор встроен в плагин (опция `redis: <ioredis instance>`). Либа сама делает `INCR <prefix>:<key>` + `EXPIRE 60` при первом инкременте. Ключ формируется через `keyGenerator: (req) => req.apiKey ?? req.ip`. Изоляция счётчиков per route — через встроенный `groupId` (передаём `routeId`, под капотом склеивается с key).

Окно фиксировано — 60 секунд (`timeWindow: '1 minute'`).

### Concurrent gauge для WS

Нужна своя реализация (либа этого не умеет):

- INCR при connect: `rl:ws:gauge:{token}:{routeId}` → если `> max` → close.
- DECR при close.
- Safety net: `EXPIRE` ключа на N минут (N сильно больше реалистичной длительности коннекта). Если процесс упал и не сделал DECR — TTL подчистит. Periodic reconciliation — пост-MVP.

## Конфиг-кеш и инвалидация

- **Per-process LRU** (опц. `lru-cache`, спросить — добавлять ли депу) с TTL 60s. Ключ — `${token}|${routeId}` → `{maxPerMinute}`.
- **Pub/sub канал** `rl:invalidate`. При покупке буста / истечении срока буста / удалении ключа — публикуем `{token}`. Все инстансы api подписаны и чистят соответствующие записи в LRU.
- При cache miss — Postgres + положить в LRU. При отсутствии буста — кешируется дефолт (тоже на 60s, чтоб не дёргать БД на каждый запрос). У анонима нет token — кеш дефолтов через map в коде, без LRU.

## Маппинг route → routeId

- `routeId` = `routeOptions.schema.operationId`. Отдельное поле в `config` НЕ заводим.
- В `@fastify/rate-limit`: `groupId: (req) => req.routeOptions.schema?.operationId ?? 'default'` — либа изолирует счётчики per route. `max`-callback читает тот же `operationId` для резолва лимита.
- Конвенция именования `operationId` — camelCase (как уже сложилось в роутах: `getCurrentPrice`, `askAiDocs`, `signUp`, …). Не меняем при рефакторинге URL — это стабильный ID и контракт с Stripe Prices через metadata.
- Существующие `operationId` (на момент составления плана):
  - `ping` — `GET /ping`
  - `getCurrentPrice` — `GET /v1/prices/current`
  - `askAiDocs` — `POST /v1/docs/ask-ai`
  - `signUp` — `POST /v1/auth/sign-up`
  - `login` — `POST /v1/auth/login`
  - `logout` — `POST /v1/auth/logout`
  - `getMe` — `GET /v1/auth/me`
  - `forgotPassword` — `POST /v1/auth/forgot-password`
  - `resetPassword` — `POST /v1/auth/reset-password`
  - `verifyEmail` — `POST /v1/auth/verify-email`
  - `googleLogin` — `GET /v1/auth/google/login`
  - `googleCallback` — `GET /v1/auth/google/callback`

## Биллинг (Stripe)

**Модель**: одна `Subscription` на юзера, в ней — несколько `SubscriptionItem`. Каждый item = буст на конкретный **роут** на конкретном уровне.

```
Customer (user)
└── Subscription (one per user)
    ├── item: prices.read.list   tier-2  → Price_xxx
    ├── item: docs.ai.ask        tier-3  → Price_yyy
    └── item: mcp.read           tier-1  → Price_zzz
```

### Структура в Stripe

- **Product** на каждый платный роут (`prices.read.list`, `docs.ai.ask`, `mcp.read`, ...). Итого ~по числу роутов в API.
- **Price** на каждый уровень буста внутри Product (3 уровня = 3 Price). Recurring monthly.
- **Metadata на Price** — единственный источник правды для маппинга:
  - `routeId: "getCurrentPrice"` (= `operationId`)
  - `maxPerMinute: 300`
  - `tier: "2"`
- В UI (своя pricing-страница позже) роуты группируем визуально (по тегу `tags` в OpenAPI или явному полю в фронт-конфиге) — в Stripe и БД группировки нет.

API не знает заранее цифры — он читает их из Stripe metadata при обработке webhook'а.

> **Замечание**: продуктов будет много (по числу роутов). Создавать руками в Dashboard — терпимо для MVP, но лучше написать idempotent сидер-скрипт `scripts/stripe-sync-products.ts`, который читает OpenAPI JSON (`x-default-rate-limit` каждого роута) + конфиг tier'ов и `upsert`-ит Products/Prices через Stripe API.

### Поток покупки/апгрейда

1. Юзер выбирает буст для конкретного роута в UI (или Stripe Customer Portal).
2. Frontend → Stripe Checkout / Portal → создаёт/обновляет `SubscriptionItem`.
3. Stripe шлёт webhook `customer.subscription.created` / `customer.subscription.updated`.
4. Webhook handler:
   - читает все `items` подписки;
   - для каждого item: достаёт `price.metadata.routeId` и `price.metadata.maxPerMinute`;
   - резолвим `ApiKey` по `metadata.apiKeyId` (id из `ApiKey`), берём из него `token`;
   - upsert в `Boost` с `(apiKey = token, routeId)`, заполняем `stripeSubscriptionItemId`, `stripePriceId`, `expiresAt = current_period_end`;
   - `rateLimitConfigService.invalidate(token)`.
5. На `customer.subscription.deleted` или удалении item — удаляем соответствующий `Boost` + invalidate.

### Привязка Subscription → ApiKey

Подписка биллится **на юзера**, бусты применяются **к API ключам**. Юзер выбирает в UI, к какому ключу применить буст; в `SubscriptionItem.metadata.apiKeyId` кладём `ApiKey.id` (а не плейн-токен — id стабильнее и безопаснее держать в Stripe metadata, токен может ротироваться). Webhook резолвит ключ по id, читает `token`, пишет его в `Boost.apiKey`.

Альтернатива (проще): один пользователь = один активный ключ, бусты автоматом на него. Решение зависит от того, разрешаем ли мы несколько ключей per user (открытый вопрос — в схеме уже `apiKeys ApiKey[]`, т.е. несколько разрешено).

### Failed payment / past_due

Stripe сам ведёт dunning. Поведение:

- `past_due` — буст продолжает действовать до `current_period_end` (Stripe Smart Retries пытается списать).
- `unpaid` / `canceled` — webhook `customer.subscription.updated` с новым статусом → удаляем `Boost` → юзер падает на дефолты.

### Proration

Апгрейд tier-1 → tier-3 в середине периода — Stripe сам считает пропорцию (`proration_behavior: 'create_prorations'`). Нам важно только: на webhook `subscription.updated` обновить `maxPerMinute` и invalidate. Лимит меняется почти мгновенно (LRU TTL 60s + pub/sub invalidate → следующий запрос увидит новый лимит).

### UI

- **MVP**: Stripe Customer Portal — даёт apgrade/cancel/payment method из коробки. Свой UI не пишем.
- **Позже**: своя страница `/pricing` с Stripe Pricing Tables (embed) или ручной checkout.

### Открытые вопросы по биллингу

- [ ] Минимальный месячный платёж (Stripe не любит <$0.50). Возможно, ввести bundle / floor $5/мес.
- [ ] Trial period для бустов? (`trial_period_days` на Price.)
- [ ] Сколько API ключей разрешаем per user и куда привязываем буст (см. выше).

## План реализации

### Фаза 1. Модели и миграция

1. Создать `prisma/models/api-key.prisma`, `boost.prisma`.
2. Дополнить `prisma/models/user.prisma` relation-полем `apiKeys`.
3. `prisma migrate dev --name api_keys_and_rate_limits`.
4. Сидер не нужен — никаких справочных данных в БД нет, дефолты в коде.

#### AI правила

- .cursor/rules/shared/development/backend/database/create-model.mdc
- .cursor/rules/shared/development/backend/database/repositories.mdc

### Фаза 2. Репозитории

5. `shared/src/repositories/api-key.repository.ts` — `findByToken(token)` (hot path), `findById(id)`, `create({userId, name})` (генерит токен, пишет в `ApiKey`, возвращает целиком), `touchLastUsed(id)`, `setActive(id, isActive)`, `delete(id)`.
6. `shared/src/repositories/boost.repository.ts` — `findActive(token, routeId)` (фильтрует по `expiresAt`), `upsert({apiKey, routeId, maxPerMinute, expiresAt, stripeSubscriptionItemId, stripePriceId})`, `deleteByStripeItemId(itemId)`, `listByApiKey(token)`.

#### AI правила

- .cursor/rules/shared/development/backend/database/repositories.mdc

### Фаза 3. Конфиг-кеш и резолвер лимитов

7. Решить с `lru-cache` как dep (workspace rule «Ask before add any new dependencies»). Альтернатива — самописный `Map` с TTL.
8. `apps/api/src/services/rate-limit-config.service.ts`:

   - `resolve(token | undefined, routeId, defaultLimit): Promise<number>` — без `token` сразу вернуть `defaultLimit`. С `token`: LRU → `boostRepository.findActive(token, routeId)` → если есть, вернуть `boost.maxPerMinute`, иначе `defaultLimit`. Положить результат в LRU с TTL 60s.
   - `invalidate(token)` — публикует `rl:invalidate` через `redis.client.publish`.
   - в конструкторе подписывается на `rl:invalidate` через `redis.subscriber` и чистит LRU.

   Резолвер не лезет ни в какую центральную карту дефолтов — `defaultLimit` ему передаётся снаружи (берётся из `schema['x-default-rate-limit']` в плагине).

### Фаза 4. Плагин Fastify для REST

10. Установить `@fastify/rate-limit` и `ioredis` (спросить). Создать отдельный singleton ioredis-клиента в `shared/src/redis-ioredis.ts` рядом с существующим `redis.ts` — только для rate-limit. Параметры из той же `REDIS_URL`. Кастомизировать `connectTimeout` и `maxRetriesPerRequest` (см. рекомендации в README либы).
11. `apps/api/src/plugins/rate-limit.ts` (через `fp(...)`):
    - регистрирует `@fastify/rate-limit` глобально с:
      - `redis: ioredisClient` (встроенный store);
      - `timeWindow: '1 minute'`;
      - `skipOnError: true` (fail open);
      - `keyGenerator: (req) => req.apiKey ?? req.ip` (или CF-IP, см. открытый вопрос);
      - `groupId: (req) => req.routeOptions.schema.operationId` — счётчик per-route, встроенная фича либы (валидация на старте гарантирует, что `operationId` всегда есть);
      - `max: async (req) => await rateLimitConfigService.resolve(req.apiKey, req.routeOptions.schema.operationId, req.routeOptions.schema['x-default-rate-limit'])`;
      - `errorResponseBuilder` — формат `AppError`-style для consistency;
    - регистрируется ПОСЛЕ `jwtAuthPlugin`;
    - перед регистрацией хук `onRequest`, который: парсит `X-Api-Key` header → `apiKeyRepository.findByToken(token)` → если найден и `isActive` → кладёт `req.apiKey = token` и `req.apiKeyId = apiKey.id`.
12. Расширить `FastifyRequest` полями `apiKey?: string`, `apiKeyId?: string` через `declare module 'fastify'`.

### Фаза 5. Плагин для WS

13. `apps/api/src/plugins/rate-limit-ws.ts`:
    - оборачивает upgrade через `addHook('preHandler', ...)` — Fastify даёт хук до апгрейда коннекта;
    - извлекает apiKey/IP по тем же правилам, что REST, берёт `operationId` и оба лимита из `routeOptions.schema`:
      - `connectRateDefault = schema['x-default-rate-limit']`
      - `concurrentDefault = schema['x-default-ws-connections-limit']`
    - **rate-counter** (новые connections per minute, per `(apiKey | ip, operationId)`) — через тот же `@fastify/rate-limit` (явный вызов `fastify.rateLimit({ max, timeWindow, groupId })` в preHandler с `groupId = operationId`). Лимит резолвится через `rateLimitConfigService.resolve(token, operationId, connectRateDefault)` точно как для REST;
    - **gauge** (concurrent connections, per `(apiKey | ip, operationId)`) — ручной INCR/DECR с TTL safety-net. Ключ `rl:ws:gauge:{token|ip}:{operationId}`. Лимит = `concurrentDefault`. Бусты на concurrent в MVP **не делаем** (`Boost.maxPerMinute` относится только к rate);
    - на отказ — отвечает 429 ДО апгрейда, или принимает апгрейд и сразу `socket.close(1008, 'rate limit')`;
    - на successful connect — `INCR` gauge, `socket.on('close', ...)` — `DECR`.

> Если бусты на concurrent понадобятся — добавим `maxConcurrent Int?` в `Boost` отдельной миграцией. В MVP бустим только connect-rate.

### Фаза 6. Маркировка роутов и валидация

14. Расширить тип `FastifySchema` (через `declare module 'fastify'`) полями:
    - `'x-default-rate-limit'?: number` — req/min для REST и connect/min для WS.
    - `'x-default-ws-connections-limit'?: number` — concurrent connections (только WS).
15. Пройти по всем существующим роутам и проставить эти поля в `schema` (значения — из таблицы выше или согласованные).
16. На старте сервера — валидация в `onReady`-хуке. Для каждого зарегистрированного роута проверить:
    - `schema.operationId` задан и уникален во всём приложении;
    - `schema['x-default-rate-limit']` задан, число > 0;
    - если `routeOptions.websocket === true`, дополнительно: `schema['x-default-ws-connections-limit']` задан, число > 0.
      При нарушении — `throw` (fail fast, сервер не поднимается). Без отдельной центральной карты — schema роута сама себе источник правды.
17. `@fastify/swagger` копирует `x-*` extensions в OpenAPI как есть → фронт читает `paths.<path>.<method>['x-default-rate-limit']` напрямую из `/openapi.json`. Отдельный endpoint типа `/v1/meta/rate-limits` не нужен.

### Фаза 7. Use-cases для управления (ключи + бусты)

17. `apps/api/src/usecases/api-keys/create-api-key.usecase.ts` — генерит токен (cryptographically random, напр. `nanoid(40)` с префиксом `bcn_`), сохраняет в `ApiKey`, возвращает целиком.
18. `apps/api/src/usecases/api-keys/rotate-api-key.usecase.ts` — перегенерит токен, обновляет `ApiKey`. Связанные `Boost` обновляем в той же транзакции — пишем новый `apiKey` (новый плейн-токен). После — `invalidate(oldToken)`.
19. `apps/api/src/usecases/api-keys/delete-api-key.usecase.ts` — удаляет `ApiKey` + `invalidate(token)`. Связанные `Boost` остаются orphan'ами (см. замечание про FK), чистка отдельной задачей.
20. `apps/api/src/usecases/boosts/apply-boost.usecase.ts` — резолвит `ApiKey` по id (из Stripe metadata), апсёрт в `Boost` per `(apiKey, routeId)` + `invalidate(token)`. Вызывается из webhook-handler'а Stripe.
21. Соответствующие REST роуты: `POST /v1/me/api-keys`, `POST /v1/me/api-keys/:id/rotate`, `DELETE /v1/me/api-keys/:id`, `GET /v1/me/api-keys/:id/boosts`.

#### AI правила

- .cursor/rules/shared/development/backend/architecture/usecases.mdc
- .cursor/rules/shared/development/backend/api/create-endpoint.mdc

### Фаза 8. Stripe billing

A. Установить `stripe` (Node SDK) — спросить про депу. Singleton клиента в `shared/src/stripe.ts`.
B. Скрипт-сидер `scripts/stripe-sync-products.ts` — idempotent: запускает API локально, дёргает `/openapi.json`, для каждого роута читает `operationId` и `x-default-rate-limit`, плюс отдельный конфиг tier'ов (`{ tier: 1, multiplier: 3, priceUsd: 5 }` и т.д.) и через Stripe API делает `upsert` Products/Prices с metadata (`routeId`, `maxPerMinute`, `tier`). Запускается вручную при изменении дефолтов.
C. `apps/api/src/usecases/billing/create-checkout-session.usecase.ts` — создаёт Checkout Session для апгрейда подписки на конкретные items.
D. `apps/api/src/usecases/billing/create-portal-session.usecase.ts` — Stripe Customer Portal для управления подпиской.
E. `apps/api/src/routes/v1/billing/webhook.ts` — endpoint `POST /v1/billing/webhook`:

- валидирует подпись через `stripe.webhooks.constructEvent`;
- обрабатывает `customer.subscription.{created,updated,deleted}`;
- резолвит `ApiKey` по `SubscriptionItem.metadata.apiKeyId`;
- для каждого `SubscriptionItem` upsert/delete в `Boost` через репозиторий (key = `(apiKey, routeId)`, `apiKey` берём из `ApiKey.token`);
- `rateLimitConfigService.invalidate(token)`.
  F. Добавить в `User` поле `stripeCustomerId String? @unique`. Создаётся лениво при первой покупке.
  G. На webhook — мапим `subscription.customer` → `User.stripeCustomerId` → `User`, конкретный ключ — через `SubscriptionItem.metadata.apiKeyId`. Проверяем что `ApiKey.userId` совпадает с `User.id` (защита от подделки metadata).

#### AI правила

- .cursor/rules/shared/development/backend/architecture/usecases.mdc
- .cursor/rules/shared/development/backend/api/create-endpoint.mdc
- .cursor/rules/shared/development/backend/database/repositories.mdc

### Фаза 9. Документация и DX

21. `apps/web-client/src/content/docs/rate-limits.mdx` — описание дефолтных лимитов (таблица по роутам, сгруппированная UI-категориями), как читать `x-ratelimit-*` headers, как покупать буст на конкретный роут, как ротировать ключи.
22. Пример рецепта `apps/web-client/src/content/recipes/handle-rate-limit.mdx` — экспоненциальный backoff на основе `retry-after`.

### Фаза 10. Наблюдаемость

23. Логи warn при 429 (с `apiKeyId`/`ip`/`routeId`) — через `errorResponseBuilder` + `request.log.warn`. Плейн-токен в логи **не пишем** (хоть он и хранится в БД — в логах он лишний шум и лишняя поверхность утечки). Логируем только `apiKeyId` (uuid из `ApiKey`).
24. Metrics (если будет prometheus exporter — пост-MVP).

## Чего НЕ делаем в MVP

- Тарифы / планы (только дефолты + точечные бусты).
- Sliding window / token bucket / leaky bucket (только fixed window).
- Дневные/часовые квоты (только per-minute).
- Свой Lua-скрипт (используем встроенный `INCR` в `@fastify/rate-limit`).
- Periodic reconciliation gauge для WS (полагаемся на TTL safety-net).
- Свой UI для подписок (используем Stripe Customer Portal в MVP).
- Pricing Tables / своя `/pricing` страница (пост-MVP).
- Trial periods и промокоды (пост-MVP).
- Prometheus metrics.
