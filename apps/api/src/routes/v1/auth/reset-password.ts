import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { resetPasswordUsecase } from '#src/usecases/reset-password.usecase.js';

type RequestData = {
  token: string;
  password: string;
};

const bodySchema: JSONSchemaType<RequestData> = {
  type: 'object',
  properties: {
    token: { type: 'string' },
    password: { type: 'string', minLength: 8 },
  },
  required: ['token', 'password'],
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Body: RequestData }>({
    method: 'POST',
    url: '/reset-password',
    schema: {
      operationId: 'resetPassword',
      summary: 'Reset password using a reset token',
      description: 'Sets a new password for the user identified by the reset token from the email.',
      tags: ['auth'],
      body: bodySchema,
    },
    handler: async (req, reply) => {
      const { token, password } = req.body;
      await resetPasswordUsecase.execute({ token, password });
      return reply.status(201).send();
    },
  });
}
