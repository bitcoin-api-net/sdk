import { stripe } from '#src/shared/stripe.js';
import { handleWebhookEventUsecase } from '#src/usecases/billing/handle-webhook-event.usecase.js';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import env, { required } from 'shared/src/env.js';
import { ValidationError } from 'shared/src/errors.js';
import Stripe from 'stripe';

const STRIPE_WEBHOOK_SECRET = required(env.STRIPE_WEBHOOK_SECRET);

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      const buffer = body as Buffer;
      req.rawBody = buffer;
      try {
        done(null, buffer.length === 0 ? {} : JSON.parse(buffer.toString('utf8')));
      } catch (error) {
        done(error as Error, undefined);
      }
    },
  );

  app.route({
    method: 'POST',
    url: '/webhook',
    config: { auth: false },
    handler: async (req, reply) => {
      const signature = req.headers['stripe-signature'];
      if (!req.rawBody || typeof signature !== 'string') {
        throw new ValidationError('Missing Stripe webhook signature or body');
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET);
      } catch (error) {
        req.log.warn({ err: error }, 'stripe webhook: signature verification failed');
        return reply.status(400).send({ error: 'invalid signature' });
      }

      await handleWebhookEventUsecase.execute(event);
      return reply.status(200).send({ received: true });
    },
  });
}
