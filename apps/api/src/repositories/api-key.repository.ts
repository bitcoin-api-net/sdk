import { ApiKey } from 'shared/generated/prisma/client.js';
import { ApiKeyRepository as SharedApiKeyRepository, apiKeyRepository as sharedApiKeyRepository } from 'shared/src/repositories/api-key.repository.js';
import type { ApiKeyAuthInfo } from 'shared/src/repositories/api-key.repository/types.js';
import { logger } from 'shared/src/logging.js';
import { redis } from 'shared/src/redis.js';

const CACHE_PREFIX = 'rl:cache:key:';
const CACHE_TTL_SECONDS = 60;

type CacheEntry = ApiKeyAuthInfo | { notFound: true };

const isNotFound = (entry: CacheEntry): entry is { notFound: true } => 'notFound' in entry;

export class ApiKeyRepository extends SharedApiKeyRepository {
  override async findByToken(token: string): Promise<ApiKeyAuthInfo | undefined> {
    const cached = await this.readCache(token);
    if (cached) {
      if (isNotFound(cached) || !cached.isActive) return undefined;
      return cached;
    }

    const apiKey = await super.findByToken(token);
    await this.writeCache(token, apiKey);
    if (!apiKey || !apiKey.isActive) return undefined;
    return apiKey;
  }

  override async setActive(id: string, isActive: boolean): Promise<ApiKey> {
    const apiKey = await super.setActive(id, isActive);
    await this.invalidateToken(apiKey.token);
    return apiKey;
  }

  override async deleteById(id: string): Promise<ApiKey> {
    const apiKey = await super.deleteById(id);
    await this.invalidateToken(apiKey.token);
    return apiKey;
  }

  private cacheKey(token: string): string {
    return `${CACHE_PREFIX}${token}`;
  }

  private async readCache(token: string): Promise<CacheEntry | undefined> {
    const raw = await redis.client.get(this.cacheKey(token));
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as CacheEntry;
    } catch (error) {
      logger.warn({ err: error }, 'api-key cache parse failed');
      return undefined;
    }
  }

  private async writeCache(token: string, apiKey: ApiKeyAuthInfo | undefined): Promise<void> {
    const entry: CacheEntry = apiKey ?? { notFound: true };
    await redis.client.set(this.cacheKey(token), JSON.stringify(entry), {
      expiration: { type: 'EX', value: CACHE_TTL_SECONDS },
    });
  }

  private async invalidateToken(token: string): Promise<void> {
    await redis.client.del(this.cacheKey(token));
  }
}

export const apiKeyRepository = new ApiKeyRepository(sharedApiKeyRepository.model);
