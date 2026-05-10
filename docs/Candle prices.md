# План: сохранение Binance kline (свечей) в Redis

## Context

В проекте уже есть фоновый воркер `apps/exchanges/src/last-price.app.ts`, который слушает Binance trade-stream через `BinanceProvider`, складывает последнюю цену в Redis (`prices:btcusdt:binance`) и публикует pub/sub. Нужно переименовать его в `price.app.ts` и в нём же начать сохранять **kline (candlestick)** — поток `<symbol>@kline_<interval>` — чтобы потом отдавать историю свечей через REST/WS API без обращения к Binance в рантайме.

Цели:
- Переименованный воркер дополнительно подписывается на kline-стрим Binance, складывает свечи в Redis.
- При старте — однократно подтягивает историю через REST `GET /api/v3/klines`, чтобы Redis сразу был прогрет.
- Старая инфраструктура (Repository + Broker + Provider) переиспользуется.
- Параллельно добавляем REST/WS-эндпоинт `GET /v1/prices/klines`, чтобы сразу отдавать историю свечей наружу.

Дефолты (при необходимости подкорректировать перед стартом):
- Интервалы: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `6h`, `12h`, `1d`.
- Глубина хранения: 1000 последних закрытых свечей на интервал.
- Символ: `btcusdt` (единственный в `Symbols`).

---

## Архитектурные решения

### 1. Структура хранения в Redis

Две части на каждый `(symbol, exchange, interval)`:

**a) Закрытые свечи** — Sorted Set с `score = openTime (ms)`, `member = JSON(kline)`:
```
key:    klines:btcusdt:binance:1m
member: {"openTime":...,"open":"...","high":"...","low":"...","close":"...","volume":"...","closeTime":...,"trades":...}
score:  openTime
```
Запрос диапазона: `ZRANGEBYSCORE klines:btcusdt:binance:1m <fromMs> <toMs>`.
Авто-обрезка после каждой записи: `ZREMRANGEBYRANK key 0 -1001` (хранить максимум 1000).

**b) Текущая (незакрытая) свеча** — отдельный `HSET`-ключ:
```
key:   klines:btcusdt:binance:1m:current
field: kline -> JSON(...)
```
Перезаписывается на каждом тике. Нужна, потому что закрытая свеча приходит только когда `k.x === true` — а до этого момента у API-консьюмеров нет «свежей» свечи.

Когда WS присылает `k.x === true` (свеча закрылась) — переносим: добавляем в Sorted Set, обновляем «current» новой формирующейся свечой следующего минутного интервала.

### 2. Расширение `BinanceProvider`

Файл: `apps/exchanges/src/providers/binance.provider.ts`

- Добавить `Streams.kline = 'kline'` в enum.
- Добавить тип `KlineStreamMessage` (формат Binance, поле `k` содержит OHLCV).
- Добавить `KlineStreamMessageFormatted` (`Decimal` для цен/объёмов, `Date` для времён, `boolean` для `isClosed`).
- Добавить метод `subscribeKlineStream(symbol, interval, callbacks)` — стрим `<symbol>@kline_<interval>`, единичная подписка на интервал.
- Добавить метод `fetchHistoricalKlines(symbol, interval, limit)` — REST `GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=1000` для бэкфилла.

Тип интервала: ввести `KlineIntervals` enum в `shared/src/constants.ts` (`'1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '6h' | '12h' | '1d'`), и `KlineInterval = keyof typeof KlineIntervals` в `shared/src/types.ts`.

### 3. Расширение PricesRepository

Файл: `shared/src/repositories/prices.repository.ts`

```ts
class PricesRepository {
  // ... существующие методы для last price ...

  readonly klinesStorageBaseKey = 'klines';
  readonly maxKlinesPerInterval = 1000;

  getKlineStorageKey(symbol, exchange, interval): string  // klines:btcusdt:binance:1m
  getCurrentKlineKey(symbol, exchange, interval): string  // klines:btcusdt:binance:1m:current

  async saveClosedKline({ symbol, exchange, interval, kline }): Promise<void>
    // ZADD + ZREMRANGEBYRANK для обрезки

  async saveCurrentKline({ symbol, exchange, interval, kline }): Promise<void>
    // HSET .. current

  async getKlineRange(symbol, exchange, interval, fromMs, toMs): Promise<Kline[]>
    // ZRANGEBYSCORE

  async getLatestKlines(symbol, exchange, interval, count): Promise<Kline[]>
    // ZRANGE -count -1

  async getCurrentKline(symbol, exchange, interval): Promise<Kline | undefined>

  async bulkSaveClosedKlines({ symbol, exchange, interval, klines }): Promise<void>
    // multi/pipeline для бэкфилла
}
```

Тип `Kline` — общий, рядом в файле:
```ts
type Kline = {
  openTime: Date;
  closeTime: Date;
  open: Decimal;
  high: Decimal;
  low: Decimal;
  close: Decimal;
  volume: Decimal;
  trades: number;
};
```

### 4. Расширение PricesBroker

Файл: `shared/src/brokers/prices.broker.ts`

Добавить методы для публикации и подписки на kline. Pub/sub-канал `klines:btcusdt:binance:1m` (и `:current` для тикающей свечи). Понадобится для будущего WS-эндпоинта; сейчас просто на каждое сообщение публикуем — в API-приложении пока нет потребителя.

### 5. Worker app

Файл: `apps/exchanges/src/price.app.ts` (переименованный `last-price.app.ts`)

Алгоритм:
1. Переименовать файл `last-price.app.ts` -> `price.app.ts`.
2. Оставить текущую логику мониторинга последней цены.
3. Добавить логику для klines. Для каждого интервала из `INTERVALS = ['1m', '5m', '15m', '30m', '1h', '4h', '6h', '12h', '1d']`:
   a. Backfill: `binanceProvider.fetchHistoricalKlines(btcusdt, interval, 1000)` → `pricesRepository.bulkSaveClosedKlines(...)`.
   b. Subscribe: `binanceProvider.subscribeKlineStream(btcusdt, interval, callbacks)`.
4. В `onMessage` (для klines):
   - Если `kline.isClosed`: `saveClosedKline()` + `broadcastKline()` + `saveCurrentKline()` (как новая «текущая» — но Binance шлёт следующий тик сразу же, так что можно опустить).
   - Если не закрыта: `saveCurrentKline()` + `broadcastCurrentKline()`.
5. `SIGINT` → `redis.disconnectAll()`.

Скрипт в `apps/exchanges/package.json`: переименовать `"last-price-monitoring:dev"` в `"price-monitoring:dev": "tsx watch src/price.app.ts"`.

### 6. API-эндпоинты `GET /v1/prices/klines` и `GET /v1/prices/candles`

Файлы: 
- `apps/api/src/routes/v1/prices/klines.ts` (новый, рядом с `current.ts`). Содержит логику, схемы и регистрирует эндпоинт с `url: '/klines'`.
- `apps/api/src/routes/v1/prices/candles.ts` (импортирует всё необходимое из `klines.ts` и регистрирует эндпоинт с `url: '/candles'`).

По аналогии с `current.ts` — один route с REST handler + WS handler:

**Query params (`RequestData`):**
- `symbol: Symbol` — обязателен, enum из `Symbols`.
- `interval: KlineInterval` — обязателен, enum из `KlineIntervals`.
- `limit?: number` — опционален, дефолт 100, максимум = `maxKlinesPerInterval` (1000). Используется, если не задан диапазон.
- `from?: string` ISO — опционален.
- `to?: string` ISO — опционален.

Поведение: если переданы `from`/`to` — `pricesRepository.getKlineRange(...)`, иначе — `pricesRepository.getLatestKlines(symbol, exchange, interval, limit)`. Параметр `exchange` фиксируем `Exchanges.binance` (как в `current.ts`).

**Response (`ResponseData`):**
```ts
type Kline = {
  openTime: string;   // ISO
  closeTime: string;  // ISO
  open: string;       // Decimal как string
  high: string;
  low: string;
  close: string;
  volume: string;
  trades: number;
  isClosed: boolean;  // true для закрытых, false для открытой (текущей)
};

type ResponseData = Kline[];
```

`Decimal` сериализуем в string, `Date` — в ISO. Если открытая свеча отсутствует (сразу после старта воркера), массив будет содержать только закрытые.

**WS handler:** при подключении отправляет начальный снапшот (список свечей `Kline[]`), затем подписывается через `pricesBroker.subscribeToKlines(symbol, exchange, interval, cb)` и шлёт обновленный список свечей только в момент закрытия текущей свечи. На `socket.on('close')` — `unsubscribeFromKlines`. Тип сообщения в WS всегда массив `Kline[]`, чтобы не смешивать типы данных. От REST вебсокет отличается только тем, что клиенту не нужно делать новый запрос при открытии новой свечи.

### 7. API-эндпоинты текущей (открытой) свечи `GET /v1/prices/klines/current` и `GET /v1/prices/candles/current`

Файлы: 
- `apps/api/src/routes/v1/prices/klines/current.ts`
- `apps/api/src/routes/v1/prices/candles/current.ts` (экспортирует логику из klines/current.ts)

По аналогии с `/v1/prices/current`, но возвращает только открытую свечу для заданного интервала.

**Query params (`RequestData`):**
- `symbol: Symbol` — обязателен.
- `interval: KlineInterval` — обязателен.

**Response (`ResponseData`):**
```ts
type ResponseData = Kline; // Возвращает одну свечу с isClosed: false (или true для финального тика в WS)
```

**WS handler:** при подключении шлет текущую свечу, затем подписывается на стрим и отправляет только обновления для текущей свечи (и финальный тик с `isClosed: true`, после чего начинает слать новую открытую свечу).

**Schema/operationId:**
- `operationId: 'getCurrentKline'` (для `klines/current.ts`) и `'getCurrentCandle'` (для `candles/current.ts`)
- `summary: 'Get current open kline (candle)'`
- `tags: ['prices']`
- `'x-default-rate-limit': 20`, `'x-default-ws-connections-limit': 1`.

Регистрация route — автоматическая, через `fastify-autoload` в `apps/api/src/routes`. Поэтому каждый файл должен экспортировать default-функцию, внутри которой вызывается `fastify.route` со своим `url`, чтобы избежать дублирования путей и конфликтов.

---

## Файлы для изменения / создания

**Изменить:**
- `shared/src/constants.ts` — добавить `KlineIntervals` enum.
- `shared/src/types.ts` — добавить `KlineInterval`, `Kline`, `KlineDTO`.
- `shared/src/repositories/prices.repository.ts` — добавить методы для работы с klines.
- `shared/src/brokers/prices.broker.ts` — добавить методы для работы с klines.
- `apps/exchanges/src/providers/binance.provider.ts` — добавить kline-стрим и REST-метод.
- `apps/exchanges/package.json` — переименовать скрипт запуска.
- `apps/exchanges/src/price.app.ts` — переименовать из `last-price.app.ts` и добавить подписки на свечи.

**Создать:**
- `apps/api/src/routes/v1/prices/klines.ts` — REST + WS эндпоинт `GET /v1/prices/klines`.

---

## Переиспользуемые сущности

- `redis` singleton — `shared/src/redis.ts:42`.
- `Decimal` — `shared/src/decimal.ts` (используется в `prices.repository`).
- `logger`, `logProcessErrors` — `shared/src/logging.ts`.
- Паттерн Provider/Repository/Broker — `prices.repository.ts:13`, `prices.broker.ts:12`, `binance.provider.ts:45`.
- Стратегия именования ключей — `{domain}:{symbol}:{exchange}` (расширяем до `:{interval}`).

---

## Verification

1. **Запуск воркера:**
   ```bash
   cd apps/exchanges && npm run last-kline-monitoring:dev
   ```
   Ожидаем в логах: `Backfilled 1000 klines for btcusdt:1m`, `Subscribed to kline stream btcusdt@kline_1m`, периодически `Processed N kline messages`.

2. **Проверка Redis:**
   ```bash
   redis-cli ZCARD klines:btcusdt:binance:1m            # ~1000
   redis-cli ZRANGE klines:btcusdt:binance:1m -1 -1     # последняя закрытая
   redis-cli HGET klines:btcusdt:binance:1m:current kline   # текущая
   ```

3. **Проверка обрезки:** дать воркеру поработать > 1000 минут (или временно понизить `maxKlinesPerInterval = 5`) — `ZCARD` не должен расти.

4. **Проверка бэкфилла + WS склейки:** убедиться, что `closeTime` последней backfill-свечи = `openTime` первой полученной по WS - 1ms (нет «дыр»).

5. **Pub/sub-проверка**:
   ```bash
   redis-cli SUBSCRIBE klines:btcusdt:binance:1m
   ```
   На каждом закрытии минутной свечи приходит JSON.

6. **Type-check:** `cd apps/exchanges && npm run type-check` (а также для `shared` и `apps/api`).

7. **REST-эндпоинт:**
   ```bash
   curl "http://localhost:<API_PORT>/v1/prices/klines?symbol=btcusdt&interval=1m&limit=5"
   ```
   В ответе — объект с массивом `klines` из свечей (сначала закрытые, последняя - открытая с `isClosed: false`).

8. **WS-эндпоинт:**
   ```bash
   wscat -c "$WS_API_BROWSER_URL/v1/prices/klines?symbol=btcusdt&interval=1m"
   ```
   Сразу приходит снапшот `klines` (массив `Kline[]`), далее при закрытии текущей свечи — обновленный список свечей (массив `Kline[]`).


