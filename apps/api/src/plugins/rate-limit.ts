import { FastifyInstance } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyUnderPressure from '@fastify/under-pressure';

export function registerRateLimitPlugin(fastify: FastifyInstance) {
  fastify.register(fastifyRateLimit, {
    max: 20000,
    timeWindow: '1 minute',
  });

  fastify.register(fastifyUnderPressure, {
    message: 'Sorry, the server is under heavy load. Please try again later.',
  });
}
