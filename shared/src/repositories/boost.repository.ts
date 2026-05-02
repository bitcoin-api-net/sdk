import { Boost } from '../../../generated/prisma/client.js';
import { BaseRepository } from './base.repository.js';
import { PrismaClient, prismaClient } from './client.js';
import type { BoostUpsertInput } from './boost.repository/types.js';

export class BoostRepository extends BaseRepository<PrismaClient['boost']> {
  async findByUserAndRoute(userId: string, routeId: string): Promise<Boost | undefined> {
    const boost = await this.model.findUnique({ where: { userId_routeId: { userId, routeId } } });
    return boost ?? undefined;
  }

  async listByUserId(userId: string): Promise<Boost[]> {
    return this.model.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async upsertBoost(input: BoostUpsertInput): Promise<Boost> {
    const { userId, routeId, rateLimit, expiresAt, paymentSubscriptionItemId, paymentPlanId } = input;
    return this.model.upsert({
      where: { userId_routeId: { userId, routeId } },
      create: { userId, routeId, rateLimit, expiresAt, paymentSubscriptionItemId, paymentPlanId },
      update: { rateLimit, expiresAt, paymentSubscriptionItemId, paymentPlanId },
    });
  }

  async deleteByPaymentSubscriptionItemId(paymentSubscriptionItemId: string): Promise<Boost | undefined> {
    const boost = await this.model.findUnique({ where: { paymentSubscriptionItemId } });
    if (!boost) return undefined;
    return this.model.delete({ where: { id: boost.id } });
  }
}

export const boostRepository = new BoostRepository(prismaClient.boost);
