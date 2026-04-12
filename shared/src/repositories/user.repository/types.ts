import { PrismaClient } from '../client.js';

export type CreatableUser = Parameters<PrismaClient['user']['create']>[0]['data'];
export type UpdatableUser = Parameters<PrismaClient['user']['update']>[0]['data'];
