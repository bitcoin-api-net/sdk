import type { FastifyRateLimitStore } from '@fastify/rate-limit';
import { redis } from 'shared/src/redis.js';

const KEY_PREFIX = 'rl:rest:';

export class RedisRateLimitStore implements FastifyRateLimitStore {
  private readonly timeWindow: number;

  constructor(options: { timeWindow?: number } = {}) {
    this.timeWindow = options.timeWindow ?? 60_000;
  }

  incr(
    key: string,
    callback: (error: Error | null, result?: { current: number; ttl: number }) => void,
  ): void {
    const fullKey = `${KEY_PREFIX}${key}`;
    redis.client
      .multi()
      .incr(fullKey)
      .pExpire(fullKey, this.timeWindow, 'NX')
      .pTTL(fullKey)
      .exec()
      .then((results) => {
        const current = Number(results[0]);
        const ttlRaw = Number(results[2]);
        const ttl = ttlRaw > 0 ? ttlRaw : this.timeWindow;
        callback(null, { current, ttl });
      })
      .catch((error: Error) => callback(error));
  }

  child(): FastifyRateLimitStore {
    return new RedisRateLimitStore({ timeWindow: this.timeWindow });
  }
}
