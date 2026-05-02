import { PrismaClient } from '../client.js';

export type CreatableBoost = Parameters<PrismaClient['boost']['create']>[0]['data'];
export type UpdatableBoost = Parameters<PrismaClient['boost']['update']>[0]['data'];

export type BoostUpsertInput = {
  userId: string;
  routeId: string;
  rateLimit: number;
  expiresAt?: Date;
  paymentSubscriptionItemId?: string;
  paymentPlanId?: string;
};
