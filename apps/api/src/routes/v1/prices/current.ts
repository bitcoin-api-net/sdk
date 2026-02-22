import { JSONSchemaType } from 'lib/src/validation.js';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { Symbol } from 'core/src/types.js';
import { Symbols } from 'core/src/constants.js';
import { Exchanges } from 'core/src/constants.js';
import { pricesRepository } from 'core/src/repositories/prices.repository.js';
import { validator } from 'lib/src/validation.js';
import { sendJSON } from '#src/utils/websocket.js';

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

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Querystring: RequestData; Reply: ResponseData }>({
    method: 'GET',
    url: '/current',
    schema: {
      querystring: querySchema,
      response: {
        200: responseSchema,
      },
      description: `For websocket use: wscat -c ${process.env.WS_API_BROWSER_URL}/v1/prices/current/ws?symbol=btcusdt`,
    },
    handler: async (req, reply) => {
      const { symbol } = req.query;
      const price = await pricesRepository.getLastPrice(symbol, Exchanges.binance);
      return reply.status(200).send({ price: price.price.toString(), time: price.time.toISOString() });
    },
    wsHandler: async (socket, req) => {
      const { symbol } = req.query;
      const price = await pricesRepository.getLastPrice(symbol, Exchanges.binance);
      const resp = { price: price.price.toString(), time: price.time.toISOString() };
      sendJSON(socket, resp, validateResponse);
    },
  });
}
