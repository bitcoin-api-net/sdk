import { boostRepository } from '#src/repositories/boost.repository.js';
import { SKIP_PREFIXES } from './shared/constants.js';
import { RedisStore } from './shared/store.js';
import { buildRateLimitKey, getOperationId, getSchemaLimit } from './shared/utils.js';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from 'shared/src/errors.js';
import { redis } from 'shared/src/redis.js';

const GAUGE_PREFIX = 'rl:ws:gauge:';
const GAUGE_TTL_SECONDS = 5 * 60;

function rateLimitError(): AppError {
  return new AppError('Rate limit exceeded', { code: 'RATE_LIMIT_EXCEEDED', httpCode: 429 });
}

class WsRateRedisStore extends RedisStore {
  readonly prefix = 'rl:ws:rate:';
  child() {
    return new WsRateRedisStore({ timeWindow: this.timeWindow });
  }
}

export default fp(async function rateLimitWsPlugin(fastify: FastifyInstance) {
  const checkConnectRate = fastify.createRateLimit({
    store: WsRateRedisStore,
    timeWindow: '1 minute',
    skipOnError: true,
    keyGenerator: (req) => buildRateLimitKey(req, getOperationId(req)),
    max: async (req) => {
      const defaultLimit = getSchemaLimit(req, 'x-default-rate-limit');
      if (!req.userId) return defaultLimit;
      return boostRepository.resolveRateLimit(req.userId, getOperationId(req), defaultLimit);
    },
  });

  fastify.addHook('onRoute', (routeOptions) => {
    const userWsHandler = routeOptions.wsHandler;
    if (!userWsHandler) return;
    if (SKIP_PREFIXES.some((p) => routeOptions.url.startsWith(p))) return;

    routeOptions.preHandler = [
      ...(Array.isArray(routeOptions.preHandler)
        ? routeOptions.preHandler
        : routeOptions.preHandler
          ? [routeOptions.preHandler]
          : []),
      async (req) => {
        const result = await checkConnectRate(req);
        if (!result.isAllowed && result.isExceeded) throw rateLimitError();
      },
    ];

    routeOptions.wsHandler = async function wsHandlerWithGauge(socket, req) {
      const operationId = getOperationId(req);
      const limit = getSchemaLimit(req, 'x-default-ws-connections-limit');
      const gaugeKey = `${GAUGE_PREFIX}${buildRateLimitKey(req, operationId)}`;

      const [current] = await redis.client.multi().incr(gaugeKey).expire(gaugeKey, GAUGE_TTL_SECONDS, 'NX').exec();
      if (Number(current) > limit) {
        await redis.client.decr(gaugeKey);
        socket.close(1008, 'rate limit');
        return;
      }

      socket.on('close', () => {
        redis.client.decr(gaugeKey).catch((err) => fastify.log.warn({ err, gaugeKey }, 'ws gauge decr failed'));
      });

      await userWsHandler.call(this, socket, req);
    };
  });
});
