import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import env, { required } from 'shared/src/env.js';
import { userRepository } from 'shared/src/repositories/user.repository.js';
import { createPortalSessionUsecase } from '#src/usecases/billing/create-portal-session.usecase.js';

const STRIPE_BILLING_RETURN_URL = required(env.STRIPE_BILLING_RETURN_URL);

type ResponseData = {
  url: string;
};

const responseSchema: JSONSchemaType<ResponseData> = {
  type: 'object',
  properties: {
    url: { type: 'string' },
  },
  required: ['url'],
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Reply: ResponseData }>({
    method: 'POST',
    url: '/portal',
    config: { auth: true },
    schema: {
      operationId: 'createBillingPortalSession',
      summary: 'Create Stripe Customer Portal session',
      description: 'Creates a Stripe Customer Portal session for managing existing subscriptions.',
      tags: ['billing'],
      response: { 200: responseSchema },
      'x-default-rate-limit': 10,
    },
    handler: async (req, reply) => {
      const user = await userRepository.findFirstOrThrow({
        where: { email: req.user.email },
        select: { id: true, email: true },
      });
      const result = await createPortalSessionUsecase.execute({
        userId: user.id,
        email: user.email,
        returnUrl: STRIPE_BILLING_RETURN_URL,
      });
      return reply.status(200).send(result);
    },
  });
}
