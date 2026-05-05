import Stripe from 'stripe';
import { UserRepository } from 'shared/src/repositories/user.repository.js';

export class BillingBaseUsecase {
  constructor(
    protected readonly stripe: Stripe,
    protected readonly userRepository: UserRepository,
  ) {}

  async getOrCreatePaymentCustomer(userId: string, email: string): Promise<string> {
    const user = await this.userRepository.findFirstOrThrow({
      where: { id: userId },
      select: { paymentCustomerId: true },
    });

    if (user.paymentCustomerId) return user.paymentCustomerId;

    const customer = await this.stripe.customers.create({ email, metadata: { userId } });
    await this.userRepository.update({
      where: { id: userId },
      data: { paymentCustomerId: customer.id },
    });
    return customer.id;
  }
}
