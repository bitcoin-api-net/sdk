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
      body: bodySchema,
    },
    handler: async (req, reply) => {
      await forgotPasswordUsecase.execute({ email: req.body.email });
      return reply.status(201).send();
    },
  });
}
