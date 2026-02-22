import { JSONSchemaType } from 'lib/src/validation.js';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { Symbol } from 'core/src/types.js';
import { Symbols } from 'core/src/constants.js';
import { Exchanges } from 'core/src/constants.js';
import { pricesRepository } from 'core/src/repositories/prices.repository.js';

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

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.get<{
    Querystring: RequestData;
    Reply: ResponseData;
  }>(
    '/current',
    {
      schema: {
        querystring: querySchema,
        response: {
          200: responseSchema,
        },
      },
      config: { auth: 'optional' },
    },
    async (req, res) => {
      const { symbol } = req.query;
      const price = await pricesRepository.getLastPrice(symbol, Exchanges.binance);
      return res.status(200).send({ price: price.price.toString(), time: price.time.toISOString() });
    }
  );
}
