import { boostRepository } from '#src/repositories/boost.repository.js';
import { RedisStore } from './shared/store.js';
import { buildRateLimitKey, getOperationId, getSchemaLimit } from './shared/utils.js';
import fastifyRateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

class RestRedisStore extends RedisStore {
  readonly prefix = 'rl:rest:';
  child() {
    return new RestRedisStore({ timeWindow: this.timeWindow });
  }
}

export default fp(async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyRateLimit, {
    global: true,
    hook: 'preHandler',
    timeWindow: '1 minute',
    skipOnError: true,
    store: RestRedisStore,
    keyGenerator: (req) => buildRateLimitKey(req, getOperationId(req)),
    max: async (req) => {
      const defaultLimit = getSchemaLimit(req, 'x-default-rate-limit');
      if (!req.userId) return defaultLimit;
      return boostRepository.resolveRateLimit(req.userId, getOperationId(req), defaultLimit);
    },
    errorResponseBuilder: (_req, ctx) => ({
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded, retry in ${ctx.after}`,
    }),
  });
});
