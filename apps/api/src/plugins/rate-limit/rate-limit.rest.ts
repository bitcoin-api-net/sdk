import { boostRepository } from '#src/repositories/boost.repository.js';
import { SKIP_PREFIXES } from './shared/constants.js';
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

export default fp(async function rateLimitRestPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyRateLimit, { global: false });

  const rateLimitPreHandler = fastify.rateLimit({
    store: RestRedisStore,
    timeWindow: '1 minute',
    hook: 'preHandler',
    skipOnError: true,
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

  fastify.addHook('onRoute', (routeOptions) => {
    if (routeOptions.wsHandler) return;
    if (SKIP_PREFIXES.some((p) => routeOptions.url.startsWith(p))) return;

    routeOptions.preHandler = [
      ...(Array.isArray(routeOptions.preHandler)
        ? routeOptions.preHandler
        : routeOptions.preHandler
          ? [routeOptions.preHandler]
          : []),
      rateLimitPreHandler,
    ];
  });
});
