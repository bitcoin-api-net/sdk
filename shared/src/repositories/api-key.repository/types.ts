import { PrismaClient } from '../client.js';

export type CreatableApiKey = Parameters<PrismaClient['apiKey']['create']>[0]['data'];
export type UpdatableApiKey = Parameters<PrismaClient['apiKey']['update']>[0]['data'];

export type ApiKeyAuthInfo = { id: string; userId: string; isActive: boolean };
