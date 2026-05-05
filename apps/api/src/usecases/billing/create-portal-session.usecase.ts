import { stripe } from '#src/shared/stripe.js';
import { BillingBaseUsecase } from '#src/usecases/billing/billing-base.usecase.js';
import { userRepository } from 'shared/src/repositories/user.repository.js';

export type ExecuteParams = {
  userId: string;
  email: string;
  returnUrl: string;
};

export class CreatePortalSessionUsecase extends BillingBaseUsecase {
  async execute({ userId, email, returnUrl }: ExecuteParams): Promise<{ url: string }> {
    const customer = await this.getOrCreatePaymentCustomer(userId, email);

    const session = await this.stripe.billingPortal.sessions.create({
      customer,
      return_url: returnUrl,
    });

    return { url: session.url };
  }
}

export const createPortalSessionUsecase = new CreatePortalSessionUsecase(stripe, userRepository);
