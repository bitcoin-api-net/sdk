import Stripe from 'stripe';
import { ApplyBoostUsecase, applyBoostUsecase } from '#src/usecases/boosts/apply-boost.usecase.js';
import { BoostRepository, boostRepository } from '#src/repositories/boost.repository.js';
import { logger } from 'shared/src/logging.js';
import { UserRepository, userRepository } from 'shared/src/repositories/user.repository.js';

const ACTIVE_STATUSES: ReadonlyArray<Stripe.Subscription.Status> = ['active', 'trialing', 'past_due'];

export class HandleWebhookEventUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly boostRepository: BoostRepository,
    private readonly applyBoostUsecase: ApplyBoostUsecase,
  ) {}

  async execute(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpsert(event.data.object);
        return;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        return;

      default:
        logger.info({ type: event.type }, 'stripe webhook: ignored event');
    }
  }

  async handleSubscriptionUpsert(subscription: Stripe.Subscription): Promise<void> {
    const userId = await this.resolveUserId(subscription.customer);
    if (!userId) return;

    const isActive = ACTIVE_STATUSES.includes(subscription.status);
    for (const item of subscription.items.data) {
      if (isActive) {
        await this.applyBoostFromItem(userId, item);
      } else {
        await this.boostRepository.deleteByPaymentSubscriptionItemId(item.id);
      }
    }
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    for (const item of subscription.items.data) {
      await this.boostRepository.deleteByPaymentSubscriptionItemId(item.id);
    }
  }

  async applyBoostFromItem(userId: string, item: Stripe.SubscriptionItem): Promise<void> {
    const price = item.price;
    const routeId = price.metadata?.routeId;
    const rateLimitRaw = price.metadata?.rateLimit;
    const rateLimit = rateLimitRaw ? Number(rateLimitRaw) : NaN;

    if (!routeId || !Number.isFinite(rateLimit) || rateLimit <= 0) {
      logger.warn(
        { priceId: price.id, subscriptionItemId: item.id, metadata: price.metadata },
        'stripe webhook: skip item without valid routeId/rateLimit metadata',
      );
      return;
    }

    await this.applyBoostUsecase.execute({
      userId,
      routeId,
      rateLimit,
      paymentSubscriptionItemId: item.id,
      paymentPlanId: price.id,
      expiresAt: new Date(item.current_period_end * 1000),
    });
  }

  async resolveUserId(customer: string | Stripe.Customer | Stripe.DeletedCustomer): Promise<string | undefined> {
    const paymentCustomerId = typeof customer === 'string' ? customer : customer.id;
    const user = await this.userRepository.findFirst({
      where: { paymentCustomerId },
      select: { id: true },
    });
    if (!user) {
      logger.warn({ paymentCustomerId }, 'stripe webhook: user not found by paymentCustomerId');
      return undefined;
    }
    return user.id;
  }
}

export const handleWebhookEventUsecase = new HandleWebhookEventUsecase(
  userRepository,
  boostRepository,
  applyBoostUsecase,
);
