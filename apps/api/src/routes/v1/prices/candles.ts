import { registerKlinesRoute } from './klines.js';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  await registerKlinesRoute(fastify, '/candles', 'getCandles', 'Get historical and current candles (klines)');
}
