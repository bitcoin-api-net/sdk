# API rate limits

## Архитектура (короткое summary)

Два независимых механизма в одном Redis-инстансе:

```
REST request ──► onRequest: Authorization: Bearer <token> → userId (401 если ключ невалиден) ──► resolveLimit(userId?, ip, routeId) ──► fixed-window counter per (userId|ip, routeId) ──► allow / 429
                                                │                                           │
                                                │                                           ├── Redis cache (TTL 60s)  ◄── invalidate (DEL) на purchase / key rotate
                                                │                                           └── Postgres (ApiKey, Boost) — fallback при miss
                                                │
                                                └── token → {userId, isActive} in Redis cache (TTL 60s)

WS connect ──► auth (apiKey → userId) ──► connect-rate counter per (userId | ip, routeId) ──► concurrent gauge per (userId | ip, routeId) ──► accept / close(1008)
                                                                                                              │
                                                                                                              └── INCR при connect, DECR при close + TTL safety net
```

Ключевые решения:

- **REST**: `@fastify/rate-limit` с **кастомным store** поверх существующего `node-redis` клиента (`shared/src/redis.ts`). Встроенный Redis-store либы требует `ioredis` — мы его не тянем, чтобы не держать два Redis-клиента. Store реализует интерфейс либы (`incr` / `child`) через `MULTI: INCR + PEXPIRE NX + PTTL`. Алгоритм — **fixed window** (как и встроенный store). Динамический `max` через callback резолвит лимит из Redis-кеша → Postgres. Изоляция счётчиков **per route** — `routeId` (= `routeOptions.schema.operationId`) склеивается прямо в `keyGenerator` (опция `groupId` либы — статический string, поэтому динамику делаем через ключ). Префикс ключей в Redis — `rl:rest:` (для симметрии с `rl:ws:gauge:`).
- **WS**: кастомный плагин (готового под concurrent connections нет). Два слоя: rate (новые коннекты/мин) + gauge (одновременные).
- **Окно**: **только per-minute** для всех роутов. Без дневных/часовых квот — простота.
- **Тарифов нет**. Только дефолты в коде + sparse-таблица купленных бустов на конкретные роуты. Юзер платит точечно за то, что ему нужно.
- **Гранулярность — per route**. Лимиты, счётчики и бусты — на уровне отдельного эндпоинта. В качестве `routeId` используем `routeOptions.schema.operationId` (уже проставлен на каждом роуте, напр. `getCurrentPrice`, `askAiDocs`, `signUp`). **Endpoint groups** — только UI-категории для группировки роутов в pricing-странице и доках.
- **Область применения лимита — per user, не per key**. Буст покупает юзер, применяется ко **всем** его API ключам разом. Счётчик 429 тоже **per user**: независимо от того, сколько у юзера ключей, суммарный rate к роуту ограничен одним лимитом. Это честная модель для биллинга (юзер платит — юзер и получает квоту, не умножая её на число ключей) и проще в UX (один консистентный `x-ratelimit-*` хедер на юзера).
- **Конфиг лимитов** в БД: `ApiKey` (сами ключи: `token` + метаданные) + `Boost` (sparse — одна запись на каждый купленный per-route буст; принадлежит юзеру через `userId` + FK; в одной записи — и `rateLimit`, и опциональный `maxConcurrent` для WS). **Дефолты — прямо в schema роута**, в OpenAPI extensions `x-default-rate-limit` (число, REST) и `x-default-ws-connections-limit` (число, WS). Анонимы и аутентифицированные без буста используют один и тот же дефолт.
- **Резолв лимита**: `token → userId` через Redis-кеш (TTL ~60s) → `(userId, routeId) → boost` через Redis-кеш → Postgres при miss → дефолт из `schema['x-default-rate-limit']` при отсутствии буста. Инвалидация — прямой `DEL` ключей в Redis при покупке буста / ротации/удалении ключа (Redis shared между инстансами, поэтому pub/sub не нужен).
- **Дефолт = anonymous = authenticated-without-boost**. Один и тот же лимит и для анонимов (по IP), и для запросов с ключом без буста. Буст полностью замещает дефолт для конкретного `(userId, operationId)` (контракт: tier'ы в Stripe всегда > дефолта).
- **Невалидный/неактивный ключ → 401**. Если в `Authorization: Bearer <token>` прислали неизвестный токен или ключ с `isActive=false` — сразу 401 Unauthorized до `@fastify/rate-limit`. Это чётче для DX: клиент не получает молчаливый fallback на дефолт по IP.
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
- [x] **Анонимный доступ**: все эндпоинты public, ключ опционален. **Дефолтный лимит — единый** для анонимов и аутентифицированных без буста. Хранится прямо в schema роута: `x-default-rate-limit` (число, req/min для REST), `x-default-ws-connections-limit` (число, concurrent для WS). Буст применяется поверх — на **юзера** (все его активные ключи автоматически подхватывают буст).
- [x] **Область применения буста/лимита**: **per user**. Буст — свойство юзера на конкретный `operationId`, а не конкретного ключа. Счётчик 429 тоже per user: все запросы юзера по роуту бьются об один счётчик независимо от числа ключей. Анонимы считаются по IP.
- [x] **Тарифы**: **нет тарифов**. Дефолты + точечные бусты per (userId, operationId).
- [x] **Гранулярность**: **per route**. Endpoint groups оставлены только как UI-категории (для группировки роутов в pricing-странице и доках). Лимиты, счётчики и Stripe Prices — per route.
- [x] **Идентификатор роута**: используем существующий `routeOptions.schema.operationId`. Дефолтный лимит лежит рядом в schema через OpenAPI extension `x-default-rate-limit` (REST) / `x-default-ws-connections-limit` (WS). Эти extensions автоматически попадают в OpenAPI JSON → фронт читает их оттуда. Центральной карты `RATE_LIMIT_DEFAULTS` НЕ заводим — single source of truth = schema роута.
- [x] **Алгоритм счётчика**: **fixed window** (см. секцию выше).
- [x] **Окна**: **только per-minute** для всех роутов. Без дневных квот.
- [x] **WS лимиты**: симметрично REST — per `(userId | ip, operationId)`. Дефолты лежат в schema роута: `x-default-rate-limit` (новые connect'ы в минуту) + `x-default-ws-connections-limit` (одновременные коннекты, gauge). Бусты работают на оба лимита — rate и concurrent (см. «Биллинг (Stripe)»).
- [x] **Биллинг бустов**: **Stripe Subscription с несколькими items** — одна подписка на юзера, item per (routeId, tier). См. секцию «Биллинг (Stripe)».
- [x] **Behind proxy**: API стоит за **nginx** (Cloudflare — возможно позже, пока не ставим). В Fastify включаем `trustProxy: true`, IP берём из `req.ip` (Fastify сам парсит `X-Forwarded-For` при `trustProxy`). На будущее, если добавится Cloudflare — переключимся на header `CF-Connecting-IP` через кастомный `keyGenerator`. IP используется только как fallback-ключ для анонимов; для аутентифицированных запросов ключ — `userId`.
- [x] **Горизонт. масштабирование**: **минимум 2 инстанса, в перспективе до 4**. Вывод: счётчики **обязательно в Redis** (иначе per-instance лимиты = эффективный лимит × N). Конфиг-кеш (резолв лимита per (userId, routeId) + резолв token→userId) — **тоже в Redis**, общий между инстансами. Это даёт мгновенную инвалидацию через прямой `DEL` без pub/sub. Доп. сетевая задержка незначительна (Redis на том же сервере, latency < 1ms), а простота важнее.
- [x] **Зависимости**: ОК. Добавляем только `@fastify/rate-limit`. `ioredis` НЕ добавляем — пишем кастомный store поверх существующего `node-redis` клиента. `lru-cache` тоже не нужен — конфиг-кеш в Redis.
- [x] **Redis-клиент**: **только существующий `node-redis`** из `shared/src/redis.ts`. Используется для счётчиков rate-limit (через кастомный store), конфиг-кеша (token→userId, (userId,routeId)→boost), `pricesBroker`, MCP-кэша. Один клиент, один пул коннектов.

## Принципы

1. **Конфиг ≠ состояние**. Лимиты (config) и счётчики (state) живут раздельно — разные ключи, разные TTL, разная инвалидация.
2. **Hot path не ходит в Postgres**. Резолв лимита — Redis-кеш (TTL 60s); Redis также держит счётчик. Postgres трогаем только при cache miss и при пересчёте после покупки буста.
3. **Per route, не группа**. Лимиты, счётчики и бусты — на уровне отдельного роута. `routeId` = `routeOptions.schema.operationId` (уже есть у каждого роута, отдельное поле в `config` не вводим). Группы — только UI-категории для биллинга/доков, в коде runtime их нет.
4. **Per user, не per key**. Буст принадлежит юзеру. Счётчик 429 ключуется по `userId` (или IP у анонимов), а не по плейн-токену ключа. Ключи — это способ идентификации запроса, а не единица квоты/биллинга.
5. **Дефолты в schema роута, бусты в БД**. Дефолт каждого роута — число в `schema['x-default-rate-limit']` (или `x-default-ws-connections-limit` для WS). Все нормальные пользователи живут на этих дефолтах — их в БД нет вовсе. БД растёт только по числу реально купленных бустов (sparse). Дефолт уезжает в OpenAPI как есть → фронт рисует таблицу прямо из OpenAPI без отдельного endpoint'а.
6. **Fail open** при недоступности Redis. Считаем «пропустить» лучше, чем «положить API». `@fastify/rate-limit` это умеет через `skipOnError: true`.
7. **Стандартные заголовки**. `x-ratelimit-*` + `retry-after` (управляются либой).

## Модель данных (Prisma)

Две новые модели + правка `User`. Файлы — в `prisma/models/`.

`windowSec` в моделях НЕ хранится — все лимиты per-minute, окно фиксировано в коде.

### `prisma/models/api-key.prisma`

```prisma
model ApiKey {
  id        String   @id @default(uuid(7))
  userId    String   @map("user_id")
  token     String   @unique                          // плейн-токен (напр. bcn_xxxxxxxxxxxx). По нему лукап на hot path. Показывается юзеру в UI.
  name      String
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("api_keys")
}
```

Храним **только плейн-токен**, без хеша. Сравнение на hot path — прямое равенство по уникальному индексу `token`. Юзеру показываем токен в UI целиком в любой момент (можно скопировать заново).

Compromise: при компрометации БД утекают рабочие токены. Осознанный trade-off — по токену из этого API можно только **читать публичные данные**, никаких разрушительных операций. В обмен — простота (нет sha256 на каждом запросе, нет двух полей, нет проблемы «юзер потерял токен») и удобство DX.

### `prisma/models/boost.prisma`

```prisma
model Boost {
  id                       String    @id @default(uuid(7))
  userId                   String    @map("user_id")
  routeId                  String    @map("route_id")            // = operationId роута, напр. "getCurrentPrice", "streamCurrentPrice"
  rateLimit                Int       @map("rate_limit")           // req/min (REST) или connect/min (WS)
  maxConcurrent            Int?      @map("max_concurrent")       // WS concurrent gauge. undefined = concurrent остаётся на дефолте
  expiresAt                DateTime? @map("expires_at")           // undefined = бессрочно (активная подписка)
  paymentSubscriptionItemId String?   @unique @map("payment_subscription_item_id")
  paymentPlanId             String?   @map("payment_plan_id")
  createdAt                DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, routeId])
  @@index([userId])
  @@map("boosts")
}
```

`maxConcurrent` используется только WS-плагином. Для REST-роутов поле всегда `undefined`. Одна запись на `(userId, routeId)` несёт оба буста разом — см. Stripe-секцию про Price metadata.

**Связь с `User` через FK**:

- `userId` — FK на `User`, `onDelete: Cascade` (удалили юзера — ушли все его бусты).
- Ключи (`ApiKey`) в этой связи не участвуют: ротация/удаление ключа не трогает бусты юзера.

Sparse-таблица: одна запись = один купленный буст на пару `(userId, routeId)`. Если буста нет — берётся дефолт из схемы роута. Дефолтов в БД не дублируем.

### Правка `prisma/models/user.prisma`

Добавить relations: `apiKeys ApiKey[]` и `boosts Boost[]`.

## Дефолты (в schema каждого роута)

Дефолтный лимит лежит **прямо в `schema` роута** через OpenAPI extension. Без центральной карты — single source of truth.

- **REST**: `schema['x-default-rate-limit']: number` — запросов в минуту.
- **WS**: `schema['x-default-ws-connections-limit']: number` — одновременных коннектов (concurrent gauge).

Один и тот же дефолт действует и для анонимов (по IP), и для запросов с ключом без буста. Буст применяется только к конкретному `(userId, operationId)` и **полностью замещает** дефолты (итог = `boost.rateLimit` для rate; `boost.maxConcurrent` для concurrent gauge, если задано). Для WS-роутов `boost.maxConcurrent` опционален (`undefined` = concurrent остаётся на дефолте, даже если rate-буст куплен) — одна запись `Boost` покрывает оба лимита, см. Stripe-секцию про то, как Price диктует оба поля. Контракт: tier'ы в Stripe всегда настроены так, что `boost.rateLimit > default` и `boost.maxConcurrent > default` — это валидируется при создании Price'ов. На стороне API дополнительной защиты `max(...)` нет — значения из `Boost` берутся как есть. Все активные ключи юзера автоматически подхватывают буст — лимит и счётчик общие.

В MVP `rateLimit` интерпретируется как **req/min** (окно фиксировано в коде — 60s). Поле специально не привязано к длительности на уровне имени, чтобы при появлении per-second/per-hour бустов не мигрировать колонку.

Пример REST-роута:

```ts
fastify.route({
  method: 'GET',
  url: '/v1/prices/current',
  schema: {
    operationId: 'getCurrentPrice',
    'x-default-rate-limit': 60,
    response: {
      /* ... */
    },
  },
  handler: getCurrentPriceHandler,
});
```

Пример WS-роута:

```ts
fastify.route({
  method: 'GET',
  url: '/v1/prices/stream',
  schema: {
    operationId: 'streamCurrentPrice',
    'x-default-rate-limit': 30, // новых connect'ов в минуту
    'x-default-ws-connections-limit': 5, // одновременных коннектов
  },
  wsHandler: streamCurrentPriceHandler,
});
```

OpenAPI extensions (`x-*`) автоматически копируются `@fastify/swagger` в итоговый OpenAPI JSON → фронт берёт их оттуда без отдельного endpoint'а.

### Текущие роуты — placeholder лимитов

Цифры утверждаем перед стартом, проставляются в schema каждого роута:

| operationId       | x-default-rate-limit (req/min) | x-default-ws-connections-limit | примечание           |
| ----------------- | ------------------------------ | ------------------------------ | -------------------- |
| `ping`            | 120                            | —                              | системный            |
| `getCurrentPrice` | 60                             | 5                              | REST + WS            |
| `askAiDocs`       | 5                              | —                              | дорогой LLM-эндпоинт |
| `signUp`          | 10                             | —                              |                      |
| `login`           | 10                             | —                              |                      |
| `logout`          | 30                             | —                              |                      |
| `getMe`           | 60                             | —                              |                      |
| `forgotPassword`  | 3                              | —                              | защита от спама      |
| `resetPassword`   | 3                              | —                              |                      |
| `verifyEmail`     | 5                              | —                              |                      |
| `googleLogin`     | 10                             | —                              |                      |
| `googleCallback`  | 10                             | —                              |                      |

Все эндпоинты public — ключ не required нигде. Если когда-то понадобится сделать роут closed (`getMe` и т.п. — спорно), решение будет приниматься отдельно через auth-плагин, не через рейт-лимиты.

### Валидация на старте

В `onReady` хук пройтись по всем роутам и проверить:

1. `schema.operationId` задан и уникален.
2. `schema['x-default-rate-limit']` задан, число > 0.
3. Для WS-роутов (роуты с `wsHandler`) дополнительно: `schema['x-default-ws-connections-limit']` задан, число > 0.

Если что-то нарушено — **fail fast**, сервер не стартует. Это явная договорённость: без лимита роут не регистрируется.

## Резолв лимита (алгоритм)

На `onRequest` auth-хук:

1. Нет `Authorization` заголовка (или не bearer) → аноним, `req.userId` остаётся `undefined`. Идём дальше.
2. `Authorization: Bearer <token>` есть:
   - `GET rl:cache:key:<token>` в Redis → `{userId, isActive}` либо `{notFound: true}` (TTL 60s). При miss — `apiKeyRepository.findByToken(token)`, кладём в Redis через `SET ... EX 60`.
   - Ключ не найден или `isActive=false` → **401 Unauthorized** сразу (до `@fastify/rate-limit`).
   - Иначе: `req.userId = userId`, `req.apiKeyId = apiKey.id`, `req.apiKey = token` (последнее — только для логов/отладки).

Резолвер лимита принимает `(userId?, routeId, defaultRateLimit, defaultMaxConcurrent?)`. `defaultRateLimit` — число из `schema['x-default-rate-limit']`; `defaultMaxConcurrent` передаётся только WS-плагином из `schema['x-default-ws-connections-limit']`.

1. Если `userId` есть:
   1. `GET rl:cache:boost:<userId>:<routeId>` → попадание → проверяем `expiresAt` (если задан и < now — игнорим, считаем что буста нет) → готово.
   2. Иначе: `findUnique(Boost where userId_routeId)` (используем существующий `@@unique([userId, routeId])`). Если запись есть и `expiresAt` либо `null`, либо > now → берём `{rateLimit: boost.rateLimit, maxConcurrent: boost.maxConcurrent ?? defaultMaxConcurrent}`; иначе берём дефолты.
   3. Кладём результат в Redis (`SET ... EX 60`) — кешируем и дефолт, чтобы не дёргать БД на каждый запрос. В кеш кладём `{rateLimit, maxConcurrent, expiresAt}` целиком, чтобы проверка expiry на следующих запросах была мгновенной без БД.
2. Если `userId` нет — лимиты `= defaultRateLimit` / `defaultMaxConcurrent`, счётчик и gauge ведутся по IP.

## Счётчики (Redis)

### REST (через `@fastify/rate-limit` + кастомный store)

`@fastify/rate-limit` поддерживает кастомный `store` — реализуем тонкий адаптер поверх существующего `node-redis` клиента. Store делает `INCR <key>` + `EXPIRE 60` при первом инкременте (классический fixed window). Это десятки строк кода, зато не тянем второй Redis-клиент.

- Префикс ключей: `rl:rest:` (добавляется внутри store).
- Ключ от `keyGenerator` склеивает `operationId` и subject: `<operationId>:<u:userId | ip:ip>`. Изоляция счётчиков per route — через сам ключ (опция `groupId` либы — статический string, не подходит для глобальной регистрации).
- Префиксы `u:` / `ip:` нужны, чтобы юзер и аноним с тем же значением (теоретический случай) не сошлись в один ключ.
- Итоговый Redis-ключ: `rl:rest:<operationId>:<u|ip>:<value>`.
- Окно фиксировано — 60 секунд (`timeWindow: '1 minute'`).
- Хук плагина — `preHandler`, чтобы наш `onRequest` auth-хук (см. `apiKeyAuthPlugin`) гарантированно отработал раньше и проставил `req.userId`.
- При ошибках Redis store возвращает ошибку → `@fastify/rate-limit` с `skipOnError: true` пропускает запрос (fail open). Сам store настроен на быстрый fail: не копит запросы в очереди, при недоступности Redis сразу бросает.

### Concurrent gauge для WS

Нужна своя реализация (либа этого не умеет):

- INCR при connect: `rl:ws:gauge:{u:userId | ip:ip}:{routeId}` → если `> max` → close.
- DECR при close.
- Safety net: `EXPIRE` ключа на N минут (N сильно больше реалистичной длительности коннекта). Если процесс упал и не сделал DECR — TTL подчистит. Periodic reconciliation — пост-MVP.

## Конфиг-кеш и инвалидация

Кеш живёт в Redis (один общий экземпляр между всеми инстансами API). Ключи:

- **`rl:cache:key:<token>`** → JSON `{userId, isActive}` либо `{notFound: true}` для несуществующих токенов. TTL 60s **одинаковый** для валидных и невалидных. Negative-cache защищает БД от флуда мусорными токенами; реактивация ключа всё равно дёргает явный invalidate.
- **`rl:cache:boost:<userId>:<routeId>`** → JSON `{rateLimit, maxConcurrent, expiresAt}` (`maxConcurrent` — `undefined`, если в бусте оно не задано или записи нет — подставится дефолт из schema роута). TTL 60s. Кешируем и дефолт (когда буста нет), чтобы не дёргать БД на каждый запрос.

Инвалидация — точечная, всегда знаем конкретный ключ:

- **API key change** (rotate / delete / setActive): `DEL rl:cache:key:<token>`.
- **Boost change** (Stripe webhook): для каждого затронутого `SubscriptionItem` достаём `routeId` из `price.metadata` и делаем `DEL rl:cache:boost:<userId>:<routeId>`. На `subscription.deleted` проходимся по всем `items` из payload'а и `DEL` каждый ключ (одним `MULTI`).

Никакого индекса «какие routeId закешированы для юзера» не держим — webhook сам приносит конкретные `routeId` в payload, ничего догадываться не нужно.

При cache miss — Postgres + `SET rl:cache:boost:<userId>:<routeId> <json> EX 60`. У анонима нет `userId` — резолв мгновенный (вернуть `defaultLimit`), без кеша.

> Pub/sub-канал инвалидации не нужен: Redis сам по себе shared между инстансами, прямой `DEL` мгновенно виден всем.

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

- **Product** на каждый платный роут (имя = `operationId`, напр. `getCurrentPrice`, `askAiDocs`, ...). Итого ~по числу роутов в API.
- **Price** на каждый уровень буста внутри Product. Три tier'а, recurring monthly:
  - **tier 1 — $1/мес**
  - **tier 2 — $3/мес**
  - **tier 3 — $6/мес**
- **Metadata на Price** — единственный источник правды для маппинга:
  - `routeId: "getCurrentPrice"` (= `operationId`)
  - `rateLimit: 300` (число req/min, заданное для этого tier'а на этом роуте)
  - `wsConnectionsLimit: 20` (опционально, только для WS-роутов — concurrent gauge на этом tier'е; для REST поле не ставится)
  - `tier: "2"`

API не знает заранее цифры — он читает их из Stripe metadata при обработке webhook'а.

**Никаких минимальных платежей и bundle'ов**: юзер может купить один tier-1 буст за $1/мес, и это нормально. Stripe $0.50-floor нас не цепляет, потому что минимальный tier у нас $1.

**Создание Products/Prices — руками в Stripe Dashboard для MVP**. Когда роутов станет много — переедем на idempotent sync-скрипт, который читает OpenAPI и `upsert`-ит Products/Prices через Stripe API (см. «Чего НЕ делаем в MVP»).

### Поток покупки/апгрейда

1. Юзер выбирает буст для конкретного роута в UI (или Stripe Customer Portal).
2. Frontend → Stripe Checkout / Portal → создаёт/обновляет `SubscriptionItem`.
3. Stripe шлёт webhook `customer.subscription.created` / `customer.subscription.updated`.
4. Webhook handler:
   - валидирует подпись, читает `subscription.customer` → `User.stripeCustomerId` → `User`;
   - читает все `items` подписки;
   - для каждого item: достаёт `price.metadata.routeId`, `price.metadata.rateLimit` и опциональный `price.metadata.wsConnectionsLimit`;
   - upsert в `Boost` с `(userId, routeId)`: `rateLimit`, `maxConcurrent = wsConnectionsLimit ?? undefined`, `paymentSubscriptionItemId`, `paymentPlanId`, `expiresAt = current_period_end`;
   - `rateLimitConfigService.invalidateBoost(userId, routeId)` для каждого затронутого `routeId`.
5. На `customer.subscription.deleted` или удалении item — удаляем соответствующий `Boost` + `invalidateBoost(userId, routeId)` для каждого `routeId` из payload'а (одним `MULTI`).

### Привязка Subscription → User

Подписка биллится **на юзера**, бусты применяются **на уровне юзера** (ко всем его активным ключам одновременно). Никакой `apiKeyId` в Stripe metadata не нужен — юзер резолвится через `subscription.customer` → `User.stripeCustomerId`. Это снимает вопрос «к какому ключу привязать буст», упрощает UI (нет шага «выберите ключ»), и rotate/delete ключа не ломает биллинг.

### Failed payment / past_due

Stripe сам ведёт dunning. Поведение:

- `past_due` — буст продолжает действовать до `current_period_end` (Stripe Smart Retries пытается списать).
- `unpaid` / `canceled` — webhook `customer.subscription.updated` с новым статусом → удаляем `Boost` → юзер падает на дефолты.

### Proration

Апгрейд tier-1 → tier-3 в середине периода — Stripe сам считает пропорцию (`proration_behavior: 'create_prorations'`). Нам важно только: на webhook `subscription.updated` обновить `rateLimit`/`maxConcurrent` и `invalidateBoost(userId, routeId)` для затронутого `routeId`. Лимит меняется мгновенно — `DEL` чистит Redis-кеш, следующий запрос идёт в БД и видит новый буст.

## План реализации

### Фаза 1. Модели и миграция

- Создать `prisma/models/api-key.prisma`, `boost.prisma`.
- Дополнить `prisma/models/user.prisma` relation-полями `apiKeys ApiKey[]` и `boosts Boost[]`.
- `prisma migrate dev --name api_keys_and_rate_limits`.
- Сидер не нужен — никаких справочных данных в БД нет, дефолты в коде.

#### AI правила

- .cursor/rules/shared/development/backend/database/create-model.mdc
- .cursor/rules/shared/development/backend/database/prisma.mdc
- .cursor/rules/shared/development/backend/database/repositories.mdc

### Фаза 2. Репозитории

Кеш-логика (Redis TTL 60s + инвалидация) — **деталь репозитория**, не отдельный сервис. Снаружи у репозитория простой контракт: «дай по токену юзера», «дай буст по (userId, routeId)», «инвалидируй». Что внутри — Redis, Postgres, negative-cache, сериализация — наружу не торчит. Никаких `*-cache.service.ts` и `rate-limit-config.service.ts` в плагине/юзкейсах нет — все работают напрямую с репозиториями.

Структура — по правилу `repositories.mdc`: shared-репозиторий = чистый Postgres (через Prisma), application-репозиторий в `apps/api` наследуется от shared и добавляет кеш.

- `shared/src/repositories/api-key.repository.ts` (чистый Postgres):

  - `findByToken(token)` (hot path, возвращает `{id, userId, isActive, ...} | undefined`),
  - `findById(id)`,
  - `listByUserId(userId)`,
  - `create({userId, name})` (генерит токен, пишет в `ApiKey`, возвращает целиком),
  - `setActive(id, isActive)`,
  - `delete(id)`.

- `shared/src/repositories/boost.repository.ts` (чистый Postgres):

  - `findByUserAndRoute(userId, routeId)` через `findUnique` по `@@unique([userId, routeId])` — без фильтра по `expiresAt` (отсев expired делает наследник в `apps/api`),
  - `upsert({userId, routeId, rateLimit, maxConcurrent, expiresAt, paymentSubscriptionItemId, paymentPlanId})`,
  - `deleteByPaymentSubscriptionItemId(itemId)`,
  - `listByUserId(userId)`.

- `apps/api/src/repositories/api-key.repository.ts` extends shared:

  - Переопределяет `findByToken(token)`: сначала `GET rl:cache:key:<token>` в Redis → JSON.parse → если `{notFound: true}` или `{isActive: false}` — вернуть `undefined`; иначе вернуть закешированное `{id, userId, isActive}`. При miss — зовёт `super.findByToken(token)`, результат сериализует (`{id, userId, isActive}` либо `{notFound: true}` для null) и пишет `SET rl:cache:key:<token> <json> EX 60`.
  - Переопределяет `setActive(id, isActive)` и `delete(id)`: вызывает `super.*`, затем `DEL rl:cache:key:<token>` (token достаём из БД до операции либо хранит вызов токен снаружи — деталь реализации).
  - На любую ошибку Redis — логирует и пробрасывает наверх. `@fastify/rate-limit` с `skipOnError: true` сам решит fail open.

- `apps/api/src/repositories/boost.repository.ts` extends shared:

  - Добавляет `resolveLimits(userId: string, routeId: string, defaults: { rateLimit: number; maxConcurrent?: number }): Promise<{ rateLimit: number; maxConcurrent?: number }>` — единственный публичный метод hot path:
    - `GET rl:cache:boost:<userId>:<routeId>` → JSON `{rateLimit, maxConcurrent, expiresAt}` → если валидно (`expiresAt === null || expiresAt > now`) — вернуть `{rateLimit, maxConcurrent: maxConcurrent ?? defaults.maxConcurrent}`;
    - miss/expired → `super.findByUserAndRoute(userId, routeId)`: если есть и не expired → сериализуем `{rateLimit: boost.rateLimit, maxConcurrent: boost.maxConcurrent, expiresAt: boost.expiresAt}`; иначе `{rateLimit: defaults.rateLimit, maxConcurrent: undefined, expiresAt: null}`;
    - `SET rl:cache:boost:<userId>:<routeId> <json> EX 60`, вернуть резолвленные лимиты (подставив дефолт concurrent, если в бусте `maxConcurrent === undefined`).
  - Вспомогательный thin-wrapper `resolveRateLimit(userId, routeId, defaultRateLimit)` для REST-плагина — зовёт `resolveLimits` и возвращает только `rateLimit`.
  - Переопределяет `upsert(...)` и `deleteByPaymentSubscriptionItemId(...)`: после `super.*` делает `DEL rl:cache:boost:<userId>:<routeId>`.
  - `defaults` приходят снаружи (из `schema['x-default-rate-limit']` и `schema['x-default-ws-connections-limit']` роута) — никакой центральной карты дефолтов в репозитории нет.

#### AI правила

- .cursor/rules/shared/development/backend/database/repositories.mdc
- .cursor/rules/shared/development/backend/architecture/architecture.mdc
- .cursor/rules/shared/development/backend/errors.mdc
- .cursor/rules/shared/development/backend/logging.mdc

### Фаза 3. Плагин Fastify для REST

Auth по API-ключу и rate-limit намеренно разнесены в **два разных плагина**, чтобы не смешивать ответственности:

- `apiKeyAuthPlugin` — только парсинг `Authorization: Bearer` и заполнение `req.userId` / `req.apiKeyId`.
- `rateLimitPlugin` — только лимиты, читает уже готовые поля из `req`.

Плюс `trustProxy: true` в Fastify (API стоит за nginx, см. «Открытые вопросы»), `req.ip` будет парситься из `X-Forwarded-For`.

Структура файлов:

```
apps/api/src/plugins/
├── api-key-auth.ts
└── rate-limit/
    ├── rate-limit.rest.ts      — Фаза 3 (этот раздел)
    ├── rate-limit.ws.ts        — Фаза 4
    └── shared/
        ├── store.ts            — abstract RedisStore (общий для REST и WS)
        └── utils.ts            — getOperationId, getSchemaLimit, buildRateLimitKey
```

- Установить `@fastify/rate-limit` (`ioredis` НЕ ставим). Реализовать абстрактный store в `apps/api/src/plugins/rate-limit/shared/store.ts` поверх существующего `node-redis` клиента из `shared/src/redis.ts`. Store соответствует интерфейсу `@fastify/rate-limit` (`incr(key, cb)` + `child(routeOptions)`). Внутри `incr`: `MULTI` → `INCR <prefix><key>` + `PEXPIRE <prefix><key> <timeWindow> NX` + `PTTL <prefix><key>`. Префикс — абстрактное readonly-поле, наследники задают его константой (`'rl:rest:'` / `'rl:ws:rate:'`). `child()` возвращает новый экземпляр того же класса с тем же `timeWindow` (per-route состояние нам не нужно — `routeId` уже зашит в ключ от `keyGenerator`). На любую ошибку Redis — пробрасываем наверх (плагин с `skipOnError: true` сам решит fail open).
- `apps/api/src/plugins/rate-limit/shared/utils.ts` — три function declaration'а, переиспользуемые в обоих плагинах:
  - `getOperationId(req)` — читает `req.routeOptions.schema.operationId`, бросает если пусто;
  - `getSchemaLimit(req, field)` — читает любой `x-*` numeric field из `routeOptions.schema`, бросает если не задано или `<= 0`. Обслуживает и `x-default-rate-limit`, и `x-default-ws-connections-limit`;
  - `buildRateLimitKey(req, operationId)` — собирает `<operationId>:<u:userId | ip:ip>`.
- `apps/api/src/plugins/api-key-auth.ts` (через `fp(...)`):
  - `onRequest` хук парсит `Authorization: Bearer <token>`:
    - нет заголовка или схема не `Bearer` → аноним, идём дальше;
    - схема `Bearer` с токеном → `apiKeyRepository.findByToken(token)` (репозиторий сам ходит в кеш). Если `undefined` или `isActive=false` → бросаем **401** (`UnauthorizedError`);
    - иначе: `req.userId = userId`, `req.apiKeyId = apiKey.id`. Плейн-токен в `req` НЕ кладём (в логи он тоже не уходит, см. фазу «Наблюдаемость»).
  - тут же `declare module 'fastify'` расширяет `FastifyRequest` полями `userId?: string`, `apiKeyId?: string`.
- `apps/api/src/plugins/rate-limit/rate-limit.rest.ts` (через `fp(...)`) — регистрирует `@fastify/rate-limit` глобально:
  - локальный класс `RestRedisStore extends RedisStore` с `prefix = 'rl:rest:'`;
  - `store: RestRedisStore`;
  - `hook: 'preHandler'` — чтобы `apiKeyAuthPlugin`'овский `onRequest` отработал раньше и заполнил `req.userId`;
  - `timeWindow: '1 minute'`;
  - `skipOnError: true` (fail open при недоступности Redis);
  - `keyGenerator: (req) => buildRateLimitKey(req, getOperationId(req))` — `routeId` зашит прямо в ключ (опция `groupId` у либы — статический string, не подходит для глобальной регистрации с динамическим routeId);
  - `max: async (req) => req.userId ? boostRepository.resolveRateLimit(req.userId, operationId, defaultLimit) : defaultLimit`, где `defaultLimit = getSchemaLimit(req, 'x-default-rate-limit')`;
  - `errorResponseBuilder` возвращает `{ code: 'RATE_LIMIT_EXCEEDED', message }` — формат `AppError`-style для consistency.
- Порядок регистрации в `app.ts`: `jwtAuthPlugin` → `apiKeyAuthPlugin` → `rateLimitPlugin`. `trustProxy: true` в опциях `Fastify({...})`.

> До Фазы 5 ни один роут ещё не помечен `x-default-rate-limit`, поэтому `max`-callback бросит при любом запросе (намеренный fail-fast — соответствует контракту «без лимита роут не регистрируется»). Фаза 5 проставляет поля и валидирует их на `onReady`.

#### AI правила

- .cursor/rules/shared/development/backend/api/api.mdc
- .cursor/rules/shared/development/backend/envs.mdc
- .cursor/rules/shared/development/backend/errors.mdc
- .cursor/rules/shared/development/backend/logging.mdc
- .cursor/rules/shared/development/backend/database/repositories.mdc

### Фаза 4. Плагин для WS

- `apps/api/src/plugins/rate-limit/rate-limit.ws.ts` (через `fp(...)`):
  - локальный класс `WsRateRedisStore extends RedisStore` (из `shared/store.ts`) с `prefix = 'rl:ws:rate:'`;
  - `apiKeyAuthPlugin` уже проставит `req.userId` / `req.apiKeyId` на `onRequest` (или вернёт 401 для невалидного ключа) — WS-плагин просто читает готовые поля;
  - **rate-counter** (новые connections per minute, per `(userId | ip, operationId)`) — переиспользуем `@fastify/rate-limit` через `fastify.createRateLimit({...})` (либа экспортирует такой API в v10+, это чистая функция-проверка без авто-ответа 429, идеально для WS preHandler). Опции — те же, что у REST-плагина: `store: WsRateRedisStore`, `timeWindow: '1 minute'`, `skipOnError: true`, тот же `keyGenerator` и `max`-callback, что резолвит лимит через `boostRepository.resolveLimits(req.userId, operationId, { rateLimit: connectRateDefault, maxConcurrent: concurrentDefault })` для аутентифицированных (берём `.rateLimit` из результата) или `connectRateDefault` (= `getSchemaLimit(req, 'x-default-rate-limit')`) для анонимов. Тот же вызов `resolveLimits` ещё раз **не делаем** — preHandler и wsHandler-обёртка должны разделить один запрос к кешу (храним результат в `req` через симпл-поле типа `req.wsLimits`);
  - **gauge** (concurrent connections, per `(userId | ip, operationId)`) — ручной INCR/DECR с TTL safety-net. Ключ `rl:ws:gauge:<operationId>:<u:userId | ip:ip>`. Лимит для аутентифицированных резолвится через `boostRepository.resolveLimits(req.userId, operationId, { rateLimit: connectRateDefault, maxConcurrent: concurrentDefault })` и читается из поля `maxConcurrent` результата (для анонимов — `concurrentDefault = getSchemaLimit(req, 'x-default-ws-connections-limit')`). TTL — 5 минут (safety net на случай зависшего DECR);
  - per-route навеска через `fastify.addHook('onRoute', ...)`: для роутов с `wsHandler` отключаем глобальный REST-rate-limit (`routeOptions.config.rateLimit = false`, чтобы счётчик connection'а не учитывался дважды), добавляем preHandler с rate-check и оборачиваем `wsHandler`:
    - **preHandler** вызывает `checkConnectRate(req)`. Если `!isAllowed && isExceeded` → throw `AppError({ code: 'RATE_LIMIT_EXCEEDED', httpCode: 429 })` ДО апгрейда (стандартный `errorHandlerPlugin` ответит 429);
    - **wsHandler-обёртка** (после успешного апгрейда): `MULTI: INCR rl:ws:gauge:<key> + EXPIRE NX <ttl>`. Если `current > limit` → `DECR` (откат) + `socket.close(1008, 'rate limit')` и выходим. Иначе — подписываемся на `socket.on('close', ...)` для `DECR` и вызываем оригинальный `wsHandler`.
- Регистрация в `app.ts` сразу после `fastifyWebsocket`: `fastifyWebsocket` → `rateLimitWsPlugin`. `rateLimitWsPlugin` (REST) обязан быть зарегистрирован раньше — `createRateLimit` появляется на инстансе только после регистрации `@fastify/rate-limit`.

> `maxConcurrent` в `Boost` опциональный: если в Price'е tier'а не задано `wsConnectionsLimit` (например, REST-роуты), буст бустит только `rateLimit`, а concurrent остаётся на дефолте.

#### AI правила

- .cursor/rules/shared/development/backend/api/api.mdc
- .cursor/rules/shared/development/backend/errors.mdc
- .cursor/rules/shared/development/backend/logging.mdc
- .cursor/rules/shared/development/backend/database/repositories.mdc

### Фаза 5. Маркировка роутов и валидация

- `apps/api/src/plugins/rate-limit/shared/types.ts` — отдельный side-effect-only модуль, расширяющий `FastifySchema` через `declare module 'fastify'` полями:
  - `'x-default-rate-limit'?: number` — req/min для REST и connect/min для WS.
  - `'x-default-ws-connections-limit'?: number` — concurrent connections (только WS).
- Пройти по всем существующим роутам и проставить эти поля в `schema` (значения — из таблицы выше или согласованные).
- `apps/api/src/plugins/rate-limit/rate-limit.validation.ts` (через `fp(...)`) — копит роуты через `fastify.addHook('onRoute', ...)` и в `onReady`-хуке для каждого роута проверяет:
  - `schema.operationId` задан и уникален во всём приложении;
  - `schema['x-default-rate-limit']` задан, число > 0;
  - если у роута есть `wsHandler` (тот же критерий, что в `rate-limit.ws.ts`), дополнительно: `schema['x-default-ws-connections-limit']` задан, число > 0.
    При нарушении — `throw` (fail fast, сервер не поднимается). Без отдельной центральной карты — schema роута сама себе источник правды.
- Регистрация в `app.ts` — после `rateLimitWsPlugin` и **до** autoload-а роутов: `fastifyWebsocket` → `rateLimitWsPlugin` → `rateLimitValidationPlugin` → `autoload(routes)`. Так `onRoute`-хук валидатора ловит все последующие регистрации.
- `@fastify/swagger` копирует `x-*` extensions в OpenAPI как есть → фронт читает `paths.<path>.<method>['x-default-rate-limit']` напрямую из `/openapi.json`. Отдельный endpoint типа `/v1/meta/rate-limits` не нужен.

#### AI правила

- .cursor/rules/shared/development/backend/api/api.mdc
- .cursor/rules/shared/development/backend/api/create-endpoint.mdc

### Фаза 6. Use-cases для управления (ключи + бусты)

Все юзкейсы работают только с репозиториями — инвалидация кеша происходит **внутри** репозиторных методов (`setActive`, `delete`, `upsert`, `deleteByPaymentSubscriptionItemId`). Снаружи о Redis никто не знает.

- `apps/api/src/usecases/api-keys/create-api-key.usecase.ts` — генерит токен (cryptographically random, напр. `nanoid(40)` с префиксом `bcn_`), сохраняет через `apiKeyRepository.create(...)`, возвращает целиком.
- `apps/api/src/usecases/api-keys/rotate-api-key.usecase.ts` — `apiKeyRepository.delete(oldId)` + `apiKeyRepository.create(...)` с тем же `userId`/`name`. `Boost` **не трогаем** (они привязаны к `userId`). Инвалидация кеша старого токена — внутри `delete`.
- `apps/api/src/usecases/api-keys/delete-api-key.usecase.ts` — `apiKeyRepository.delete(id)`. `Boost` юзера не трогаем — они применятся к его остальным ключам.
- `apps/api/src/usecases/boosts/apply-boost.usecase.ts` — `boostRepository.upsert(...)` per `(userId, routeId)`. Инвалидация кеша — внутри `upsert`. Вызывается из webhook-handler'а Stripe.
- Соответствующие REST роуты:
  - `POST /v1/me/api-keys`, `POST /v1/me/api-keys/:id/rotate`, `DELETE /v1/me/api-keys/:id`, `GET /v1/me/api-keys` — управление ключами.
  - `GET /v1/me/boosts` — список активных бустов юзера (бусты теперь принадлежат юзеру, не ключу).

#### AI правила

- .cursor/rules/shared/development/backend/architecture/usecases.mdc
- .cursor/rules/shared/development/backend/api/api.mdc
- .cursor/rules/shared/development/backend/api/create-endpoint.mdc
- .cursor/rules/shared/development/backend/database/repositories.mdc
- .cursor/rules/shared/development/backend/errors.mdc

### Фаза 7. Stripe billing

- Установить `stripe` (Node SDK) — спросить про депу. Singleton клиента в `shared/src/stripe.ts`.
- **Products/Prices создаются вручную в Stripe Dashboard** для MVP. Конвенция:
  - Один Product на каждый платный роут (имя = `operationId`).
  - Три Price'а на Product, recurring monthly, по tier'ам:
    - tier 1 — **$1/мес**
    - tier 2 — **$3/мес**
    - tier 3 — **$6/мес**
  - **Metadata на Price** (обязательно, читается webhook'ом):
    - `routeId: "<operationId>"`
    - `rateLimit: <число req/min>`
    - `wsConnectionsLimit: <число>` — опционально, только для WS-роутов (concurrent gauge)
    - `tier: "1" | "2" | "3"`
  - Никаких минимальных платежей и bundle'ов. Юзер платит только за то, что купил.
  - Когда роутов станет много — переедем на idempotent sync-скрипт (см. «Чего НЕ делаем в MVP»).
- `apps/api/src/usecases/billing/create-checkout-session.usecase.ts` — создаёт Checkout Session для апгрейда подписки на конкретные items.
- `apps/api/src/usecases/billing/create-portal-session.usecase.ts` — Stripe Customer Portal для управления подпиской.
- `apps/api/src/routes/v1/billing/webhook.ts` — endpoint `POST /v1/billing/webhook`:
  - валидирует подпись через `stripe.webhooks.constructEvent`;
  - обрабатывает `customer.subscription.{created,updated,deleted}`;
  - резолвит `User` через `subscription.customer` → `User.stripeCustomerId`;
  - для каждого `SubscriptionItem` — `boostRepository.upsert(...)` или `boostRepository.deleteByPaymentSubscriptionItemId(...)` (инвалидация кеша происходит внутри репозитория).
- Добавить в `User` поле `stripeCustomerId String? @unique`. Создаётся лениво при первой покупке.

#### AI правила

- .cursor/rules/shared/development/backend/architecture/usecases.mdc
- .cursor/rules/shared/development/backend/architecture/providers.mdc
- .cursor/rules/shared/development/backend/api/api.mdc
- .cursor/rules/shared/development/backend/api/create-endpoint.mdc
- .cursor/rules/shared/development/backend/database/repositories.mdc
- .cursor/rules/shared/development/backend/database/create-model.mdc
- .cursor/rules/shared/development/backend/envs.mdc
- .cursor/rules/shared/development/backend/errors.mdc

### Фаза 8. Документация и DX

- `apps/web-client/src/content/docs/rate-limits.mdx` — описание дефолтных лимитов (таблица по роутам, сгруппированная UI-категориями), как читать `x-ratelimit-*` headers, как покупать буст на конкретный роут, как ротировать ключи. Явно указать: **лимит считается на аккаунт** — все ключи юзера делят один и тот же счётчик и один и тот же активный буст.
- Пример рецепта `apps/web-client/src/content/recipes/handle-rate-limit.mdx` — экспоненциальный backoff на основе `retry-after`.

### Фаза 9. Наблюдаемость

- Логи warn при 429 (с `userId` / `apiKeyId` / `ip` / `routeId`) — через `errorResponseBuilder` + `request.log.warn`. Плейн-токен в логи **не пишем** (хоть он и хранится в БД — в логах он лишний шум и лишняя поверхность утечки). Логируем `userId` (связь с бустом при дебаге) и `apiKeyId` (какой именно ключ юзера сейчас упирается в лимит).
- Metrics (если будет prometheus exporter — пост-MVP).

#### AI правила

- .cursor/rules/shared/development/backend/logging.mdc

## Чего НЕ делаем в MVP

- Тарифы / планы (только дефолты + точечные бусты).
- Bundle'ы и минимальные платежи в Stripe — каждый буст продаётся отдельно от $1/мес.
- Sliding window / token bucket / leaky bucket (только fixed window).
- Дневные/часовые квоты (только per-minute).
- Свой Lua-скрипт (используем простой `INCR` + `EXPIRE` в кастомном store).
- Второй Redis-клиент (`ioredis`) — обходимся существующим `node-redis` через кастомный store.
- In-process LRU для конфиг-кеша (`lru-cache` или самописный `Map`) — конфиг живёт в общем Redis. Дополнительный round-trip Redis ≪ 1ms (тот же сервер), а простота инвалидации (один `DEL` вместо pub/sub) перевешивает.
- Pub/sub-канал для инвалидации кеша — не нужен, т.к. кеш shared в Redis и `DEL` мгновенно виден всем инстансам.
- Колонка `lastUsedAt` у `ApiKey` — не делаем, чтобы hot path не ходил в Postgres.
- Periodic reconciliation gauge для WS (полагаемся на TTL safety-net).
- Idempotent Stripe-sync скрипт — Products/Prices создаём руками в Dashboard.
- Свой UI для подписок (используем Stripe Customer Portal в MVP).
- Pricing Tables / своя `/pricing` страница (пост-MVP).
- Trial periods и промокоды (пост-MVP).
- Prometheus metrics.
