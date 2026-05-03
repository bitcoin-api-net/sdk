import { Boost } from '../../../../../generated/prisma/client.js';
import { BoostRepository, boostRepository } from '#src/repositories/boost.repository.js';

export type ExecuteParams = {
  userId: string;
  routeId: string;
  rateLimit: number;
  expiresAt?: Date;
  paymentSubscriptionItemId?: string;
  paymentPlanId?: string;
};

export class ApplyBoostUsecase {
  constructor(private readonly boostRepository: BoostRepository) {}

  async execute(params: ExecuteParams): Promise<Boost> {
    return this.boostRepository.upsertBoost(params);
  }
}

export const applyBoostUsecase = new ApplyBoostUsecase(boostRepository);
