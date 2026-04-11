import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance } from 'fastify';
import type { Symbol } from 'shared/src/types.js';
import { Symbols } from 'shared/src/constants.js';
import { Exchanges } from 'shared/src/constants.js';
import { pricesRepository } from 'shared/src/repositories/prices.repository.js';

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

export default async function (fastify: FastifyInstance) {
  fastify.route<{ Querystring: RequestData; Reply: ResponseData }>({
    method: 'GET',
    url: '/current',
    schema: {
      querystring: querySchema,
      response: {
        200: responseSchema,
      },
    },
    handler: async (req, reply) => {
      const { symbol } = req.query;
      const price = await pricesRepository.getLastPrice(symbol, Exchanges.binance);
      return reply.status(200).send({
        price: price.price.toString(),
        time: price.time.toISOString(),
      });
    },
  });
}
