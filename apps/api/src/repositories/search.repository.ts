import { sha256 } from 'shared/src/crypto.js';
import { redis } from 'shared/src/redis.js';

export type AiSearchSource = {
  kind: 'doc' | 'recipe' | 'api';
  title: string;
  section?: string | null;
  url: string;
  anchor?: string | null;
};

export type AiSearchCacheValue = {
  answer: string;
  sources: AiSearchSource[];
};

const CACHE_PREFIX = 'ai:cache:';
const CACHE_TTL_SECONDS = 60 * 60 * 24;

export class SearchRepository {
  async cacheQuery(query: string, value: AiSearchCacheValue): Promise<void> {
    const key = this.keyOf(query);
    await redis.client.set(key, JSON.stringify(value), { expiration: { type: 'EX', value: CACHE_TTL_SECONDS } });
  }

  async findQuery(query: string): Promise<AiSearchCacheValue | null> {
    const key = this.keyOf(query);
    const raw = await redis.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AiSearchCacheValue;
    } catch {
      return null;
    }
  }

  private keyOf(query: string): string {
    const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ');
    return `${CACHE_PREFIX}${sha256(normalized)}`;
  }
}

export const searchRepository = new SearchRepository();
