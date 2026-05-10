import { Decimal } from 'shared/src/decimal.js';
import { AppError } from 'shared/src/errors.js';
import { redis } from 'shared/src/redis.js';
import type { Exchange, Kline, KlineInterval, Symbol } from 'shared/src/types.js';

export type LastPrice = {
  price: Decimal;
  time: Date;
  exchange: Exchange;
  symbol: Symbol;
};

class PricesRepository {
  readonly storageBaseKey = 'prices';
  readonly klinesStorageBaseKey = 'klines';
  readonly maxKlinesPerInterval = 1000;

  getSymbolExchangeStorageKey(symbol: Symbol, exchange: Exchange) {
    return `${this.storageBaseKey}:${symbol}:${exchange}` as const;
  }

  getKlineStorageKey(symbol: Symbol, exchange: Exchange, interval: KlineInterval) {
    return `${this.klinesStorageBaseKey}:${symbol}:${exchange}:${interval}` as const;
  }

  getCurrentKlineKey(symbol: Symbol, exchange: Exchange, interval: KlineInterval) {
    return `${this.klinesStorageBaseKey}:${symbol}:${exchange}:${interval}:current` as const;
  }

  async saveLastPrice(data: LastPrice) {
    const { symbol, exchange } = data;
    const redisKey = this.getSymbolExchangeStorageKey(symbol, exchange);
    await redis.client.hSet(redisKey, 'price', JSON.stringify(data));
  }

  async getLastPrice(symbol: Symbol, exchange: Exchange): Promise<LastPrice> {
    const redisKey = this.getSymbolExchangeStorageKey(symbol, exchange);
    const data = await redis.client.hGet(redisKey, 'price');
    if (!data) throw new AppError('No price found. Please check if price monitoring is running.');
    const parsedData = JSON.parse(data);
    return {
      price: new Decimal(parsedData.price),
      time: new Date(parsedData.time),
      exchange: parsedData.exchange,
      symbol: parsedData.symbol,
    };
  }

  async saveClosedKline(data: { symbol: Symbol; exchange: Exchange; interval: KlineInterval; kline: Kline }) {
    const { symbol, exchange, interval, kline } = data;
    const redisKey = this.getKlineStorageKey(symbol, exchange, interval);
    const score = kline.openTime.getTime();
    const member = JSON.stringify(kline);

    await redis.client
      .multi()
      .zAdd(redisKey, { score, value: member })
      .zRemRangeByRank(redisKey, 0, -(this.maxKlinesPerInterval + 1))
      .exec();
  }

  async saveCurrentKline(data: { symbol: Symbol; exchange: Exchange; interval: KlineInterval; kline: Kline }) {
    const { symbol, exchange, interval, kline } = data;
    const redisKey = this.getCurrentKlineKey(symbol, exchange, interval);
    await redis.client.hSet(redisKey, 'kline', JSON.stringify(kline));
  }

  async getKlineRange(
    symbol: Symbol,
    exchange: Exchange,
    interval: KlineInterval,
    from: Date,
    to: Date
  ): Promise<Kline[]> {
    const redisKey = this.getKlineStorageKey(symbol, exchange, interval);
    const data = await redis.client.zRangeByScore(redisKey, from.getTime(), to.getTime());
    return data.map((item) => this.parseKline(item));
  }

  async getLatestKlines(symbol: Symbol, exchange: Exchange, interval: KlineInterval, count: number): Promise<Kline[]> {
    const redisKey = this.getKlineStorageKey(symbol, exchange, interval);
    const data = await redis.client.zRange(redisKey, -count, -1);
    return data.map((item) => this.parseKline(item));
  }

  async getCurrentKline(symbol: Symbol, exchange: Exchange, interval: KlineInterval): Promise<Kline | undefined> {
    const redisKey = this.getCurrentKlineKey(symbol, exchange, interval);
    const data = await redis.client.hGet(redisKey, 'kline');
    if (!data) return undefined;
    return this.parseKline(data);
  }

  async bulkSaveClosedKlines(data: { symbol: Symbol; exchange: Exchange; interval: KlineInterval; klines: Kline[] }) {
    const { symbol, exchange, interval, klines } = data;
    const redisKey = this.getKlineStorageKey(symbol, exchange, interval);
    const pipeline = redis.client.multi();

    for (const kline of klines) {
      const score = kline.openTime.getTime();
      const member = JSON.stringify(kline);
      pipeline.zAdd(redisKey, { score, value: member });
    }

    pipeline.zRemRangeByRank(redisKey, 0, -(this.maxKlinesPerInterval + 1));
    await pipeline.exec();
  }

  private parseKline(data: string): Kline {
    const parsed = JSON.parse(data);
    return {
      openTime: new Date(parsed.openTime),
      closeTime: new Date(parsed.closeTime),
      open: new Decimal(parsed.open),
      high: new Decimal(parsed.high),
      low: new Decimal(parsed.low),
      close: new Decimal(parsed.close),
      volume: new Decimal(parsed.volume),
      trades: parsed.trades,
    };
  }
}

export const pricesRepository = new PricesRepository();
