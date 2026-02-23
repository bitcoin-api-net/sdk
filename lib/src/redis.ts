import { createClient } from 'redis';
import env, { required } from 'lib/src/env.js';
import { logger } from 'lib/src/logging/server.js';

export * from 'redis';

const REDIS_URL = required(env.REDIS_URL);

export class Redis {
  readonly client: ReturnType<typeof createClient>;
  readonly subscriber: ReturnType<typeof createClient>;

  constructor() {
    this.client = createClient({
      url: REDIS_URL,
    });
    this.subscriber = this.client.duplicate();
  }

  async connect() {
    await this.client.connect();
    logger.info({ url: REDIS_URL }, '🔗 Redis connected successfully');
  }

  async connectSubscriber() {
    await this.subscriber.connect();
    logger.info({ url: REDIS_URL }, '🔗 Redis subscriber connected successfully');
  }

  async disconnect() {
    await this.client.destroy();
    logger.info({ url: REDIS_URL }, '🔗 Redis disconnected successfully');
  }

  async disconnectSubscriber() {
    await this.subscriber.destroy();
    logger.info({ url: REDIS_URL }, '🔗 Redis subscriber disconnected successfully');
  }

  async disconnectAll() {
    await this.disconnect();
    await this.disconnectSubscriber();
  }
}

export const redis = new Redis();
