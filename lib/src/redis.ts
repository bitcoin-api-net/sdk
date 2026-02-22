import { createClient } from 'redis';
import env, { required } from 'lib/src/env.js';
import { logger } from 'lib/src/logging/server.js';

const REDIS_URL = required(env.REDIS_URL);

export class Redis {
  readonly client: ReturnType<typeof createClient>;

  constructor() {
    this.client = createClient({
      url: REDIS_URL,
    });
  }

  async connect() {
    await this.client.connect();
    logger.info({ url: REDIS_URL }, '🔗 Redis connected successfully');
  }

  async disconnect() {
    await this.client.destroy();
    logger.info({ url: REDIS_URL }, '🔗 Redis disconnected successfully');
  }
}

export const redis = new Redis();
