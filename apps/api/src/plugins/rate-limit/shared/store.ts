import type { FastifyRateLimitStore } from '@fastify/rate-limit';
import { redis } from 'shared/src/redis.js';

export abstract class RedisStore implements FastifyRateLimitStore {
  abstract readonly prefix: string;
  protected readonly timeWindow: number;

  constructor(options: { timeWindow?: number } = {}) {
    this.timeWindow = options.timeWindow ?? 60_000;
  }

  incr(key: string, callback: (error: Error | null, result?: { current: number; ttl: number }) => void): void {
    const fullKey = `${this.prefix}${key}`;
    redis.client
      .multi()
      .incr(fullKey)
      .pExpire(fullKey, this.timeWindow, 'NX')
      .pTTL(fullKey)
      .exec()
      .then(([current, , ttl]) => {
        const ttlMs = Number(ttl);
        callback(null, {
          current: Number(current),
          ttl: ttlMs > 0 ? ttlMs : this.timeWindow,
        });
      })
      .catch((error: Error) => callback(error));
  }

  abstract child(): FastifyRateLimitStore;
}
