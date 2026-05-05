import Stripe from 'stripe';
import { stripe } from '#src/shared/stripe.js';
import { BillingBaseUsecase } from '#src/usecases/billing/billing-base.usecase.js';
import { NotFoundError } from 'shared/src/errors.js';
import { userRepository } from 'shared/src/repositories/user.repository.js';

export type Tier = '1' | '2' | '3';

export type CheckoutItem = {
  routeId: string;
  tier: Tier;
};

export type ExecuteParams = {
  userId: string;
  email: string;
  items: CheckoutItem[];
  returnUrl: string;
};

export class CreateCheckoutSessionUsecase extends BillingBaseUsecase {
  async execute({ userId, email, items, returnUrl }: ExecuteParams): Promise<{ url: string }> {
    const customer = await this.getOrCreatePaymentCustomer(userId, email);

    const lineItems = await Promise.all(
      items.map(async ({ routeId, tier }) => {
        const price = await this.resolvePrice(routeId, tier);
        return { price: price.id, quantity: 1 };
      }),
    );

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: lineItems,
      success_url: returnUrl,
      cancel_url: returnUrl,
    });

    if (!session.url) {
      throw new Error('Stripe checkout session has no url');
    }

    return { url: session.url };
  }

  async resolvePrice(routeId: string, tier: Tier): Promise<Stripe.Price> {
    for await (const price of this.stripe.prices.list({ active: true, limit: 100 })) {
      if (price.metadata.routeId === routeId && price.metadata.tier === tier) {
        return price;
      }
    }
    throw new NotFoundError(`Stripe price not found for route="${routeId}" tier="${tier}"`);
  }
}

export const createCheckoutSessionUsecase = new CreateCheckoutSessionUsecase(stripe, userRepository);
