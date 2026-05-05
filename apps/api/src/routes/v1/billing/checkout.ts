import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import env, { required } from 'shared/src/env.js';
import { userRepository } from 'shared/src/repositories/user.repository.js';
import { createCheckoutSessionUsecase, Tier } from '#src/usecases/billing/create-checkout-session.usecase.js';

const STRIPE_BILLING_RETURN_URL = required(env.STRIPE_BILLING_RETURN_URL);

type CheckoutItemRequest = {
  routeId: string;
  tier: Tier;
};

type RequestData = {
  items: CheckoutItemRequest[];
};

type ResponseData = {
  url: string;
};

const bodySchema: JSONSchemaType<RequestData> = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          routeId: { type: 'string', minLength: 1 },
          tier: { type: 'string', enum: ['1', '2', '3'] },
        },
        required: ['routeId', 'tier'],
      },
    },
  },
  required: ['items'],
};

const responseSchema: JSONSchemaType<ResponseData> = {
  type: 'object',
  properties: {
    url: { type: 'string' },
  },
  required: ['url'],
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Body: RequestData; Reply: ResponseData }>({
    method: 'POST',
    url: '/checkout',
    config: { auth: true },
    schema: {
      operationId: 'createBillingCheckoutSession',
      summary: 'Create Stripe Checkout session',
      description: 'Creates a Stripe Checkout session for subscribing to one or more rate-limit boosts.',
      tags: ['billing'],
      body: bodySchema,
      response: { 200: responseSchema },
      'x-default-rate-limit': 10,
    },
    handler: async (req, reply) => {
      const user = await userRepository.findFirstOrThrow({
        where: { email: req.user.email },
        select: { id: true, email: true },
      });
      const result = await createCheckoutSessionUsecase.execute({
        userId: user.id,
        email: user.email,
        items: req.body.items,
        returnUrl: STRIPE_BILLING_RETURN_URL,
      });
      return reply.status(200).send(result);
    },
  });
}
