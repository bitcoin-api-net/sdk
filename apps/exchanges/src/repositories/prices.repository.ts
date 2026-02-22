import { Exchange } from '#src/types.js';

import { Symbol } from 'core/src/types.js';
import { Decimal } from 'lib/src/decimal.js';
import { redis } from 'lib/src/redis.js';

class PricesRepository {
  readonly storageBaseKey = 'exchanges:prices';

  getSymbolExchangeStorageKey(symbol: Symbol, exchange: Exchange) {
    return `${this.storageBaseKey}:${symbol}:${exchange}` as const;
  }

  async saveLastPrice(symbol: Symbol, exchange: Exchange, data: { price: Decimal; time: Date }) {
    const redisKey = this.getSymbolExchangeStorageKey(symbol, exchange);
    await redis.client.hSet(redisKey, 'price', JSON.stringify(data));
  }

  async getLastPrice(symbol: Symbol, exchange: Exchange) {
    const redisKey = this.getSymbolExchangeStorageKey(symbol, exchange);
    const price = await redis.client.hGet(redisKey, 'price');
    return price ? JSON.parse(price) : null;
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
