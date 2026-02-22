import { Symbol } from 'core/src/types.js';
import { Decimal } from 'decimal.js';

const WSS_URL = 'wss://stream.binance.com:9443';

export enum Streams {
  trade = 'trade',
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

  private getStreamName(symbol: Symbol, stream: Stream) {
    return `${symbol.toLowerCase()}@${stream}`;
  }

  private getRawStreamUrl(streamName: string) {
    return `${WSS_URL}/ws/${streamName}`;
  }
}

export const binanceProvider = new BinanceProvider();

// For local testing
import { Symbols } from 'core/src/constants.js';
await binanceProvider.subscribeTradeStream(Symbols.BTCUSDT, {
  onMessage: (message) => {
    console.log(message);
  },
  onError: (error) => {
    console.error(error);
  },
  onClose: (event) => {
    console.log(event);
  },
});
