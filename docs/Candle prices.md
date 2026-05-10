# План: сохранение Binance kline (свечей) в Redis

## Context

В проекте реализован фоновый воркер `apps/exchanges/src/price.app.ts` (переименован из `last-price.app.ts`), который слушает Binance trade-stream и kline-stream через `BinanceProvider`, сохраняет данные в Redis и публикует их через Pub/Sub.

Цели:
- Воркер подписывается на kline-стримы Binance для всех поддерживаемых интервалов.
- При старте выполняется бэкфилл истории (1000 свечей) через REST API Binance.
- Данные доступны через REST/WS API эндпоинты `/v1/prices/klines` и `/v1/prices/candles`.

Дефолты:
- Интервалы: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `6h`, `12h`, `1d`.
- Глубина хранения: 1000 последних закрытых свечей на интервал.
- Символ по умолчанию: `btcusdt`.

---

## Архитектурные решения

### 1. Структура хранения в Redis

Две части на каждый `(symbol, exchange, interval)`:

**a) Закрытые свечи** — Sorted Set с `score = openTime (ms)`, `member = JSON(kline)`:
- Key: `klines:{symbol}:{exchange}:{interval}`
- Member: `{"openTime": ISO, "closeTime": ISO, "open": "...", "high": "...", "low": "...", "close": "...", "volume": "...", "trades": ...}`
- Score: `timestamp (ms)` для эффективной выборки по диапазону.
- Авто-обрезка: Хранится максимум 1000 последних свечей.

**b) Текущая (незакрытая) свеча** — отдельный `HSET`-ключ:
- Key: `klines:{symbol}:{exchange}:{interval}:current`
- Field: `kline -> JSON(...)`

### 2. BinanceProvider

- Реализован `subscribeKlineStream(symbol, interval, callbacks)` для WebSockets.
- Реализован `fetchHistoricalKlines(symbol, interval, limit)` для REST (бэкфилл).

### 3. PricesRepository

- `getKlineRange(symbol, exchange, interval, from: Date, to: Date)` — выборка по времени.
- `getLatestKlines(symbol, exchange, interval, count)` — выборка последних N свечей.
- `saveClosedKline`, `saveCurrentKline`, `bulkSaveClosedKlines` — методы записи.

### 4. API Эндпоинты

#### `GET /v1/prices/klines` (и алиас `/v1/prices/candles`)
**Query Params:**
- `symbol?: Symbol` (default: `btcusdt`)
- `interval: KlineInterval` (обязателен)
- `limit?: number` (default: 100, max: 1000)
- `from?: string` (ISO Date)
- `to?: string` (ISO Date)

**Response:** `{ klines: KlineDTO[] }` (массив включает закрытые свечи + текущую открытую).

**Websocket:** При подключении шлет снапшот, далее обновляет весь список при закрытии каждой свечи.

#### `GET /v1/prices/klines/current` (и алиас `/v1/prices/candles/current`)
**Response:** `KlineDTO` (текущая открытая свеча).

**Websocket:** Шлет обновления на каждом тике. При закрытии свечи шлет финальный тик (`isClosed: true`) и начинает новую.

---

## Verification

1. **Запуск воркера:**
   ```bash
   cd apps/exchanges && npm run price-monitoring:dev
   ```

2. **Проверка API (REST):**
   ```bash
   curl "http://localhost:8000/v1/prices/klines?interval=1m&limit=5"
   ```

3. **Проверка API (Websocket):**
   ```bash
   wscat -c "ws://localhost:8000/v1/prices/klines?interval=1m"
   ```
