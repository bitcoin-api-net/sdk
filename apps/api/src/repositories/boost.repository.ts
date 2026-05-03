import { Boost } from 'shared/generated/prisma/client.js';
import { BoostRepository as SharedBoostRepository, boostRepository as sharedBoostRepository } from 'shared/src/repositories/boost.repository.js';
import type { BoostUpsertInput } from 'shared/src/repositories/boost.repository/types.js';
import { logger } from 'shared/src/logging.js';
import { redis } from 'shared/src/redis.js';

const CACHE_PREFIX = 'rl:cache:boost:';
const CACHE_TTL_SECONDS = 60;

type CachedRateLimit = { rateLimit: number; expiresAt: string | undefined };

const isExpired = (expiresAt: Date | string | undefined): boolean => {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
};

export class BoostRepository extends SharedBoostRepository {
  async resolveRateLimit(userId: string, routeId: string, defaultLimit: number): Promise<number> {
    const cacheKey = this.cacheKey(userId, routeId);
    const cached = await this.readCache(cacheKey);
    if (cached && !isExpired(cached.expiresAt)) {
      return cached.rateLimit;
    }

    const boost = await super.findByUserAndRoute(userId, routeId);
    const value: CachedRateLimit = boost && !isExpired(boost.expiresAt ?? undefined)
      ? { rateLimit: boost.rateLimit, expiresAt: boost.expiresAt?.toISOString() }
      : { rateLimit: defaultLimit, expiresAt: undefined };

    await this.writeCache(cacheKey, value);
    return value.rateLimit;
  }

  override async upsertBoost(input: BoostUpsertInput): Promise<Boost> {
    const boost = await super.upsertBoost(input);
    await this.invalidate(boost.userId, boost.routeId);
    return boost;
  }

  override async deleteByPaymentSubscriptionItemId(paymentSubscriptionItemId: string): Promise<Boost | undefined> {
    const boost = await super.deleteByPaymentSubscriptionItemId(paymentSubscriptionItemId);
    if (boost) await this.invalidate(boost.userId, boost.routeId);
    return boost;
  }

  private cacheKey(userId: string, routeId: string): string {
    return `${CACHE_PREFIX}${userId}:${routeId}`;
  }

  private async readCache(key: string): Promise<CachedRateLimit | undefined> {
    const raw = await redis.client.get(key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as CachedRateLimit;
    } catch (error) {
      logger.warn({ err: error }, 'boost cache parse failed');
      return undefined;
    }
  }

  private async writeCache(key: string, value: CachedRateLimit): Promise<void> {
    await redis.client.set(key, JSON.stringify(value), {
      expiration: { type: 'EX', value: CACHE_TTL_SECONDS },
    });
  }

  private async invalidate(userId: string, routeId: string): Promise<void> {
    await redis.client.del(this.cacheKey(userId, routeId));
  }
}

export const boostRepository = new BoostRepository(sharedBoostRepository.model);
