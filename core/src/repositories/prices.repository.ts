import { Exchange } from 'core/src/types.js';

import { Symbol } from 'core/src/types.js';
import { Decimal } from 'lib/src/decimal.js';
import { redis } from 'lib/src/redis.js';
import { AppError } from 'lib/src/errors.js';

export type LastPrice = {
  price: Decimal;
  time: Date;
  exchange: Exchange;
  symbol: Symbol;
};

class PricesRepository {
  readonly storageBaseKey = 'core:prices';

  getSymbolExchangeStorageKey(symbol: Symbol, exchange: Exchange) {
    return `${this.storageBaseKey}:${symbol}:${exchange}` as const;
  }

  async saveLastPrice(data: LastPrice) {
    const { symbol, exchange } = data;
    const redisKey = this.getSymbolExchangeStorageKey(symbol, exchange);
    await redis.client.hSet(redisKey, 'price', JSON.stringify(data));
  }

  async getLastPrice(symbol: Symbol, exchange: Exchange) {
    const redisKey = this.getSymbolExchangeStorageKey(symbol, exchange);
    const data = await redis.client.hGet(redisKey, 'price');
    if (!data) throw new AppError('No price found. Pleas check if price monitoring is running.');
    const parsedData = JSON.parse(data);
    const lastPrice: LastPrice = {
      price: new Decimal(parsedData.price),
      time: new Date(parsedData.time),
      exchange: parsedData.exchange,
      symbol: parsedData.symbol,
    };
    return lastPrice;
  }
}

export const pricesRepository = new PricesRepository();

// For local testing
// import { Exchanges } from '#src/constants.js';
// import { Symbols } from 'core/src/constants.js';
// await redis.connect();
// await pricesRepository.saveLastPrice(Symbols.btcusdt, Exchanges.binance, {
//   price: new Decimal(100000),
//   time: new Date(),
// });
// await redis.disconnect();
// process.exit(0);
