import { Decimal } from 'shared/src/decimal.js';
import type { Kline, KlineInterval, Symbol } from 'shared/src/types.js';

const WSS_URL = 'wss://stream.binance.com:9443';
const REST_URL = 'https://api.binance.com';

export enum Streams {
  trade = 'trade',
  kline = 'kline',
}

export type TradeStreamMessage = {
  e: 'trade'; // Event type
  E: number; // Event time
  s: string; // Symbol
  t: number; // Trade ID
  p: string; // Price
  q: string; // Quantity
  T: number; // Trade time
  m: boolean; // Is the buyer the market maker?
  M: boolean; // Ignore
};

export type TradeStreamMessageFormatted = {
  price: Decimal;
  quantity: Decimal;
  time: Date;
};

export type KlineStreamMessage = {
  e: 'kline';
  E: number;
  s: string;
  k: {
    t: number; // Kline start time
    T: number; // Kline close time
    s: string; // Symbol
    i: string; // Interval
    f: number; // First trade ID
    L: number; // Last trade ID
    o: string; // Open price
    c: string; // Close price
    h: string; // High price
    l: string; // Low price
    v: string; // Base asset volume
    n: number; // Number of trades
    x: boolean; // Is this kline closed?
    q: string; // Quote asset volume
    V: string; // Taker buy base asset volume
    Q: string; // Taker buy quote asset volume
    B: string; // Ignore
  };
};

export type KlineStreamMessageFormatted = {
  kline: Kline;
  isClosed: boolean;
};

/**
 * https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams#error-messages
 */
export type StreamErrorMessage = {
  code: number;
  msg: string;
};

export type StreamCloseEvent = {
  code: number;
  reason: string;
};

export type Stream = keyof typeof Streams;
/**
 * https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams#subscribe-to-a-stream
 */
export class BinanceProvider {
  constructor() {}

  /**
   * https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams#trade-streams
   */
  async subscribeTradeStream(
    symbol: Symbol,
    callbacks: {
      onMessage: (message: TradeStreamMessageFormatted) => void;
      onError: (error: StreamErrorMessage) => void;
      onClose: (event: StreamCloseEvent) => void;
    }
  ) {
    const streamName = this.getStreamName(symbol, Streams.trade);
    const url = this.getRawStreamUrl(streamName);
    const socket = new WebSocket(url);

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as TradeStreamMessage;
      callbacks.onMessage({
        price: new Decimal(message.p),
        quantity: new Decimal(message.q),
        time: new Date(message.T),
      });
    });

    socket.addEventListener('error', (event) => {
      callbacks.onError(event as unknown as StreamErrorMessage);
    });

    socket.addEventListener('close', (event) => {
      callbacks.onClose(event as unknown as StreamCloseEvent);
    });
  }

  /**
   * https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams#kline-candlestick-streams
   */
  async subscribeKlineStream(
    symbol: Symbol,
    interval: KlineInterval,
    callbacks: {
      onMessage: (message: KlineStreamMessageFormatted) => void;
      onError: (error: StreamErrorMessage) => void;
      onClose: (event: StreamCloseEvent) => void;
    }
  ) {
    const streamName = `${symbol}@${Streams.kline}_${interval}`;
    const url = this.getRawStreamUrl(streamName);
    const socket = new WebSocket(url);

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as KlineStreamMessage;
      const k = message.k;
      callbacks.onMessage({
        kline: {
          openTime: new Date(k.t),
          closeTime: new Date(k.T),
          open: new Decimal(k.o),
          high: new Decimal(k.h),
          low: new Decimal(k.l),
          close: new Decimal(k.c),
          volume: new Decimal(k.v),
          trades: k.n,
        },
        isClosed: k.x,
      });
    });

    socket.addEventListener('error', (event) => {
      callbacks.onError(event as unknown as StreamErrorMessage);
    });

    socket.addEventListener('close', (event) => {
      callbacks.onClose(event as unknown as StreamCloseEvent);
    });
  }

  /**
   * https://developers.binance.com/docs/binance-spot-api-docs/rest-api/public-api-endpoints#kline-candlestick-data
   */
  async fetchHistoricalKlines(symbol: Symbol, interval: KlineInterval, limit = 1000): Promise<Kline[]> {
    const url = `${REST_URL}/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch historical klines: ${response.statusText}`);
    }
    const data = (await response.json()) as any[];
    return data.map((k) => ({
      openTime: new Date(k[0]),
      closeTime: new Date(k[6]),
      open: new Decimal(k[1]),
      high: new Decimal(k[2]),
      low: new Decimal(k[3]),
      close: new Decimal(k[4]),
      volume: new Decimal(k[5]),
      trades: k[8],
    }));
  }

  private getStreamName(symbol: Symbol, stream: Stream) {
    return `${symbol}@${stream}`;
  }

  private getRawStreamUrl(streamName: string) {
    return `${WSS_URL}/ws/${streamName}`;
  }
}

export const binanceProvider = new BinanceProvider();

// For local testing
// import { Symbols } from 'shared/src/constants.js';
// await binanceProvider.subscribeTradeStream(Symbols.btcusdt, {
//   onMessage: (message) => {
//     console.log(message);
//   },
//   onError: (error) => {
//     console.error(error);
//   },
//   onClose: (event) => {
//     console.log(event);
//   },
// });
