import { sendJSON } from '#src/shared/websocket.js';
import Ajv, { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv/dist/ajv.js';
import { FastifyInstance } from 'fastify';
import { pricesBroker } from 'shared/src/brokers/prices.broker.js';
import { Symbols } from 'shared/src/constants.js';
import { Exchanges } from 'shared/src/constants.js';
import { pricesRepository } from 'shared/src/repositories/prices.repository.js';
import type { Symbol } from 'shared/src/types.js';

const validator = new Ajv.default();

export type RequestData = {
  symbol: Symbol;
};

export type ResponseData = {
  price: string;
  time: string;
};

const querySchema: JSONSchemaType<RequestData> = {
  type: 'object',
  properties: {
    symbol: { type: 'string', enum: Object.values(Symbols) },
  },
  required: ['symbol'],
};

const responseSchema: JSONSchemaType<ResponseData> = {
  type: 'object',
  properties: {
    price: { type: 'string' },
    time: { type: 'string' },
  },
  required: ['price', 'time'],
};

const validateResponse = validator.compile(responseSchema);

export default async function (fastify: FastifyInstance) {
  fastify.route<{ Querystring: RequestData; Reply: ResponseData }>({
    method: 'GET',
    url: '/current',
    schema: {
      operationId: 'getCurrentPrice',
      summary: 'Get current price',
      description: `Returns the latest price for a given trading pair from the configured exchange. For websocket use: wscat -c ${process.env.WS_API_BROWSER_URL}/v1/prices/current?symbol=btcusdt`,
      tags: ['prices'],
      querystring: querySchema,
      response: {
        200: responseSchema,
      },
      'x-default-rate-limit': 20,
      'x-default-ws-connections-limit': 1,
    },
    handler: async (req, reply) => {
      const { symbol } = req.query;
      const price = await pricesRepository.getLastPrice(symbol, Exchanges.binance);
      return reply.status(200).send({
        price: price.price.toString(),
        time: price.time.toISOString(),
      });
    },
    wsHandler: async (socket, req) => {
      const { symbol } = req.query;
      const price = await pricesRepository.getLastPrice(symbol, Exchanges.binance);
      const resp = { price: price.price.toString(), time: price.time.toISOString() };
      sendJSON(socket, resp, validateResponse);
      const listener = await pricesBroker.subscribeToLastPrice(symbol, Exchanges.binance, (message) => {
        sendJSON(socket, { price: message.price.toString(), time: message.time.toISOString() }, validateResponse);
      });
      socket.on('close', () => {
        pricesBroker.unsubscribeFromLastPrice(symbol, Exchanges.binance, listener);
      });
    },
  });
}
