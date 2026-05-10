import { Decimal } from 'shared/src/decimal.js';
import { redis } from 'shared/src/redis.js';
import type { Exchange, Kline, KlineInterval, Symbol } from 'shared/src/types.js';

export type LastPrice = {
  price: Decimal;
  time: Date;
  exchange: Exchange;
  symbol: Symbol;
};

class PricesBroker {
  readonly channelBaseKey = 'prices';
  readonly klinesChannelBaseKey = 'klines';

  getSymbolExchangeChannelKey(symbol: Symbol, exchange: Exchange) {
    return `${this.channelBaseKey}:${symbol}:${exchange}` as const;
  }

  getKlineChannelKey(symbol: Symbol, exchange: Exchange, interval: KlineInterval) {
    return `${this.klinesChannelBaseKey}:${symbol}:${exchange}:${interval}` as const;
  }

  getCurrentKlineChannelKey(symbol: Symbol, exchange: Exchange, interval: KlineInterval) {
    return `${this.klinesChannelBaseKey}:${symbol}:${exchange}:${interval}:current` as const;
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

  async broadcastClosedKline(data: { symbol: Symbol; exchange: Exchange; interval: KlineInterval; kline: Kline }) {
    const { symbol, exchange, interval, kline } = data;
    const key = this.getKlineChannelKey(symbol, exchange, interval);
    await redis.client.publish(key, JSON.stringify(kline));
  }

  async subscribeToClosedKlines(
    symbol: Symbol,
    exchange: Exchange,
    interval: KlineInterval,
    callback: (message: Kline) => void
  ) {
    const key = this.getKlineChannelKey(symbol, exchange, interval);
    const listener = (message: string) => {
      callback(this.parseKline(message));
    };
    await redis.subscriber.subscribe(key, listener);
    return listener;
  }

  async unsubscribeFromClosedKlines(
    symbol: Symbol,
    exchange: Exchange,
    interval: KlineInterval,
    listener: (message: string) => void
  ) {
    const key = this.getKlineChannelKey(symbol, exchange, interval);
    await redis.subscriber.unsubscribe(key, listener);
  }

  async broadcastCurrentKline(data: { symbol: Symbol; exchange: Exchange; interval: KlineInterval; kline: Kline }) {
    const { symbol, exchange, interval, kline } = data;
    const key = this.getCurrentKlineChannelKey(symbol, exchange, interval);
    await redis.client.publish(key, JSON.stringify(kline));
  }

  async subscribeToCurrentKline(
    symbol: Symbol,
    exchange: Exchange,
    interval: KlineInterval,
    callback: (message: Kline) => void
  ) {
    const key = this.getCurrentKlineChannelKey(symbol, exchange, interval);
    const listener = (message: string) => {
      callback(this.parseKline(message));
    };
    await redis.subscriber.subscribe(key, listener);
    return listener;
  }

  async unsubscribeFromCurrentKline(
    symbol: Symbol,
    exchange: Exchange,
    interval: KlineInterval,
    listener: (message: string) => void
  ) {
    const key = this.getCurrentKlineChannelKey(symbol, exchange, interval);
    await redis.subscriber.unsubscribe(key, listener);
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

export const pricesBroker = new PricesBroker();
