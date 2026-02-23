import { Exchange } from 'core/src/types.js';
import { Symbol } from 'core/src/types.js';
import { Decimal } from 'lib/src/decimal.js';
import { redis, RedisClientType } from 'lib/src/redis.js';

export type LastPrice = {
  price: Decimal;
  time: Date;
  exchange: Exchange;
  symbol: Symbol;
};

class PricesBroker {
  readonly channelBaseKey = 'core:prices';
  subscriber?: RedisClientType;

  constructor() {}

  getSymbolExchangeChannelKey(symbol: Symbol, exchange: Exchange) {
    return `${this.channelBaseKey}:${symbol}:${exchange}` as const;
  }

  async broadcastLastPrice(data: LastPrice) {
    const { symbol, exchange } = data;
    const key = this.getSymbolExchangeChannelKey(symbol, exchange);
    await redis.client.publish(key, JSON.stringify(data));
  }

  async subscribeToLastPrice(symbol: Symbol, exchange: Exchange, callback: (message: LastPrice) => void) {
    const key = this.getSymbolExchangeChannelKey(symbol, exchange);
    const listener = (message: string) => {
      const parsedData = JSON.parse(message);
      const lastPrice: LastPrice = {
        price: new Decimal(parsedData.price),
        time: new Date(parsedData.time),
        exchange: parsedData.exchange,
        symbol: parsedData.symbol,
      };
      callback(lastPrice);
    };
    await redis.subscriber.subscribe(key, listener);
    return listener;
  }

  async unsubscribeFromLastPrice(symbol: Symbol, exchange: Exchange, listener: (message: string) => void) {
    const key = this.getSymbolExchangeChannelKey(symbol, exchange);
    await redis.subscriber.unsubscribe(key, listener);
  }
}

export const pricesBroker = new PricesBroker();

// For local testing
// import { Exchanges } from 'core/src/constants.js';
// import { Symbols } from 'core/src/constants.js';
// await redis.connect();
// await redis.connectSubscriber();
// await pricesBroker.broadcastLastPrice({
//   symbol: Symbols.btcusdt,
//   exchange: Exchanges.binance,
//   price: new Decimal(100000),
//   time: new Date(),
// });
// await pricesBroker.subscribeToLastPrice(Symbols.btcusdt, Exchanges.binance, (message) => {
//   console.log(message);
// });
// await redis.disconnect();
// process.exit(0);
