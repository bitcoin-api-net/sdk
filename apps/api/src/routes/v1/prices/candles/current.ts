import { FastifyInstance } from 'fastify';
import { registerCurrentKlineRoute } from '../klines/current.js';

export default async function (fastify: FastifyInstance) {
  await registerCurrentKlineRoute(fastify, '/current', 'getCurrentCandle', 'Get current open candle (kline)');
}
