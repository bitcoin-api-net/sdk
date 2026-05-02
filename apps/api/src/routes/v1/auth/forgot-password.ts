import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { forgotPasswordUsecase } from '#src/usecases/forgot-password.usecase.js';

type RequestData = {
  email: string;
};

const bodySchema: JSONSchemaType<RequestData> = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
  },
  required: ['email'],
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Body: RequestData }>({
    method: 'POST',
    url: '/forgot-password',
    schema: {
      operationId: 'forgotPassword',
      summary: 'Request a password reset email',
      description: 'Sends a password reset link to the given email if the account exists.',
      tags: ['auth'],
      body: bodySchema,
      'x-default-rate-limit': 3,
    },
    handler: async (req, reply) => {
      await forgotPasswordUsecase.execute({ email: req.body.email });
      return reply.status(201).send();
    },
  });
}
