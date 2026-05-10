import { sendJSON } from '#src/shared/websocket.js';
import Ajv, { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv/dist/ajv.js';
import { FastifyInstance } from 'fastify';
import { pricesBroker } from 'shared/src/brokers/prices.broker.js';
import { Exchanges, KlineIntervals, Symbols } from 'shared/src/constants.js';
import { pricesRepository } from 'shared/src/repositories/prices.repository.js';
import type { Kline, KlineDTO, KlineInterval, Symbol } from 'shared/src/types.js';

const validator = new Ajv.default();

export type RequestData = {
  symbol?: Symbol;
  interval: KlineInterval;
};

export type ResponseData = KlineDTO;

const querySchema: JSONSchemaType<RequestData> = {
  type: 'object',
  properties: {
    symbol: { type: 'string', enum: Object.values(Symbols), nullable: true, default: Symbols.btcusdt },
    interval: { type: 'string', enum: Object.values(KlineIntervals) },
  },
  required: ['interval'],
};

const responseSchema: JSONSchemaType<ResponseData> = {
  type: 'object',
  properties: {
    openTime: { type: 'string' },
    closeTime: { type: 'string' },
    open: { type: 'string' },
    high: { type: 'string' },
    low: { type: 'string' },
    close: { type: 'string' },
    volume: { type: 'string' },
    trades: { type: 'integer' },
    isClosed: { type: 'boolean' },
  },
  required: ['openTime', 'closeTime', 'open', 'high', 'low', 'close', 'volume', 'trades', 'isClosed'],
};

const validateResponse = validator.compile(responseSchema);

function mapKline(kline: Kline, isClosed: boolean): KlineDTO {
  return {
    openTime: kline.openTime.toISOString(),
    closeTime: kline.closeTime.toISOString(),
    open: kline.open.toString(),
    high: kline.high.toString(),
    low: kline.low.toString(),
    close: kline.close.toString(),
    volume: kline.volume.toString(),
    trades: kline.trades,
    isClosed,
  };
}

export async function registerCurrentKlineRoute(
  fastify: FastifyInstance,
  url: string,
  operationId: string,
  summary: string
) {
  fastify.route<{ Querystring: RequestData; Reply: ResponseData }>({
    method: 'GET',
    url,
    schema: {
      operationId,
      summary,
      description: `Returns the current open kline (candle) for a given trading pair and interval. For websocket use: wscat -c ${process.env.WS_API_BROWSER_URL}/v1/prices${url}?interval=1m`,
      tags: ['prices'],
      querystring: querySchema,
      response: {
        200: responseSchema,
      },
      'x-default-rate-limit': 20,
      'x-default-ws-connections-limit': 1,
    },
    handler: async (req, reply) => {
      const { symbol = Symbols.btcusdt, interval } = req.query;
      const exchange = Exchanges.binance;
      const kline = await pricesRepository.getCurrentKline(symbol, exchange, interval);
      if (!kline) {
        return reply.status(404).send({ message: 'Current kline not found' } as any);
      }
      return reply.status(200).send(mapKline(kline, false));
    },
    wsHandler: async (socket, req) => {
      const { symbol = Symbols.btcusdt, interval } = req.query;
      const exchange = Exchanges.binance;

      // Send initial state
      const kline = await pricesRepository.getCurrentKline(symbol, exchange, interval);
      if (kline) {
        sendJSON(socket, mapKline(kline, false), validateResponse);
      }

      // Subscribe to current kline updates
      const currentListener = await pricesBroker.subscribeToCurrentKline(symbol, exchange, interval, (message) => {
        sendJSON(socket, mapKline(message, false), validateResponse);
      });

      // Subscribe to closed kline (to send the final tick of the previous kline)
      const closedListener = await pricesBroker.subscribeToClosedKlines(symbol, exchange, interval, (message) => {
        sendJSON(socket, mapKline(message, true), validateResponse);
      });

      socket.on('close', () => {
        pricesBroker.unsubscribeFromCurrentKline(symbol, exchange, interval, currentListener);
        pricesBroker.unsubscribeFromClosedKlines(symbol, exchange, interval, closedListener);
      });
    },
  });
}

export default async function (fastify: FastifyInstance) {
  await registerCurrentKlineRoute(fastify, '/current', 'getCurrentKline', 'Get current open kline (candle)');
}
