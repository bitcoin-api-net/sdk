import { createClient } from 'redis';
import env, { required } from 'shared/src/env.js';
import { logger } from 'shared/src/logging.js';

export type RedisClientType = ReturnType<typeof createClient>;

const REDIS_URL = required(env.REDIS_URL);

export class Redis {
  readonly client: RedisClientType;
  readonly subscriber: RedisClientType;

  constructor() {
    this.client = createClient({ url: REDIS_URL });
    this.subscriber = this.client.duplicate();
  }

  async connect() {
    await this.client.connect();
    logger.info({ url: REDIS_URL }, 'Redis connected');
  }

  async connectSubscriber() {
    await this.subscriber.connect();
    logger.info({ url: REDIS_URL }, 'Redis subscriber connected');
  }

  async disconnect() {
    await this.client.destroy();
  }

  async disconnectSubscriber() {
    await this.subscriber.destroy();
  }

  async disconnectAll() {
    await this.disconnect();
    await this.disconnectSubscriber();
  }
}

export const redis = new Redis();
