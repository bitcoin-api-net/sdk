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
  limit?: number;
  from?: string;
  to?: string;
};

export type ResponseData = {
  klines: KlineDTO[];
};

const querySchema: JSONSchemaType<RequestData> = {
  type: 'object',
  properties: {
    symbol: { type: 'string', enum: Object.values(Symbols), nullable: true, default: Symbols.btcusdt },
    interval: { type: 'string', enum: Object.values(KlineIntervals) },
    limit: { type: 'integer', minimum: 1, maximum: 1000, nullable: true },
    from: { type: 'string', format: 'date-time', nullable: true },
    to: { type: 'string', format: 'date-time', nullable: true },
  },
  required: ['interval'],
};

const klineSchema: JSONSchemaType<KlineDTO> = {
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

const responseSchema: JSONSchemaType<ResponseData> = {
  type: 'object',
  properties: {
    klines: {
      type: 'array',
      items: klineSchema,
    },
  },
  required: ['klines'],
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

async function getKlines(query: RequestData): Promise<KlineDTO[]> {
  const { symbol = Symbols.btcusdt, interval, limit = 100, from, to } = query;
  const exchange = Exchanges.binance;

  let closedKlines: Kline[];
  if (from || to) {
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();
    closedKlines = await pricesRepository.getKlineRange(symbol, exchange, interval, fromDate, toDate);
  } else {
    closedKlines = await pricesRepository.getLatestKlines(symbol, exchange, interval, limit);
  }

  const klinesDTO = closedKlines.map((k) => mapKline(k, true));

  const currentKline = await pricesRepository.getCurrentKline(symbol, exchange, interval);
  if (currentKline) {
    klinesDTO.push(mapKline(currentKline, false));
  }

  return klinesDTO;
}

export async function registerKlinesRoute(fastify: FastifyInstance, url: string, operationId: string, summary: string) {
  fastify.route<{ Querystring: RequestData; Reply: ResponseData }>({
    method: 'GET',
    url,
    schema: {
      operationId,
      summary,
      description: `Returns historical klines and the current open kline for a given trading pair and interval. For websocket use: wscat -c ${process.env.WS_API_BROWSER_URL}/v1/prices${url}?interval=1m`,
      tags: ['prices'],
      querystring: querySchema,
      response: {
        200: responseSchema,
      },
      'x-default-rate-limit': 20,
      'x-default-ws-connections-limit': 1,
    },
    handler: async (req, reply) => {
      const klines = await getKlines(req.query);
      return reply.status(200).send({ klines });
    },
    wsHandler: async (socket, req) => {
      const { symbol = Symbols.btcusdt, interval } = req.query;
      const exchange = Exchanges.binance;

      // Send initial snapshot
      const klines = await getKlines(req.query);
      sendJSON(socket, { klines }, validateResponse);

      // Subscribe to closed klines (full list update)
      const closedListener = await pricesBroker.subscribeToClosedKlines(symbol, exchange, interval, async () => {
        const updatedKlines = await getKlines(req.query);
        sendJSON(socket, { klines: updatedKlines }, validateResponse);
      });

      socket.on('close', () => {
        pricesBroker.unsubscribeFromClosedKlines(symbol, exchange, interval, closedListener);
      });
    },
  });
}

export default async function (fastify: FastifyInstance) {
  await registerKlinesRoute(fastify, '/klines', 'getKlines', 'Get historical and current klines (candles)');
}
