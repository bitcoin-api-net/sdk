import type { Exchange, Symbol } from 'shared/src/types.js';
import { Decimal } from 'shared/src/decimal.js';
import { redis } from 'shared/src/redis.js';
import { AppError } from 'shared/src/errors.js';

export type LastPrice = {
  price: Decimal;
  time: Date;
  exchange: Exchange;
  symbol: Symbol;
};

class PricesRepository {
  readonly storageBaseKey = 'prices';

  getSymbolExchangeStorageKey(symbol: Symbol, exchange: Exchange) {
    return `${this.storageBaseKey}:${symbol}:${exchange}` as const;
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
}

export const pricesRepository = new PricesRepository();
