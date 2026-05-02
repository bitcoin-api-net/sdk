import { RedisRateLimitStore } from '#src/plugins/rate-limit.store.js';
import { boostRepository } from '#src/repositories/boost.repository.js';
import fastifyRateLimit from '@fastify/rate-limit';
import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

function getOperationId(req: FastifyRequest): string {
  const operationId = req.routeOptions.schema?.operationId;
  if (!operationId) throw new Error(`route ${req.routeOptions.url} is missing schema.operationId`);
  return operationId;
}

function getDefaultRateLimit(req: FastifyRequest): number {
  const schema = req.routeOptions.schema as { 'x-default-rate-limit'?: number } | undefined;
  const value = schema?.['x-default-rate-limit'];
  if (typeof value !== 'number' || value <= 0) {
    throw new Error(`route ${req.routeOptions.url} is missing schema['x-default-rate-limit']`);
  }
  return value;
}

export default fp(async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyRateLimit, {
    global: true,
    hook: 'preHandler',
    timeWindow: '1 minute',
    skipOnError: true,
    store: RedisRateLimitStore,
    keyGenerator: (req) => {
      const operationId = getOperationId(req);
      const userId = req.userId ? `u:${req.userId}` : `ip:${req.ip}`;
      return `${operationId}:${userId}`;
    },
    max: async (req) => {
      const defaultLimit = getDefaultRateLimit(req);
      if (!req.userId) return defaultLimit;
      return boostRepository.resolveRateLimit(req.userId, getOperationId(req), defaultLimit);
    },
    errorResponseBuilder: (_req, context) => ({
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded, retry in ${context.after}`,
    }),
  });
});
