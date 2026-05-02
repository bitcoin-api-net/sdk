import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';

type ResponseData = {
  email: string;
};

const responseSchema: JSONSchemaType<ResponseData> = {
  type: 'object',
  properties: {
    email: { type: 'string' },
  },
  required: ['email'],
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Reply: ResponseData }>({
    method: 'GET',
    url: '/me',
    config: { auth: true },
    schema: {
      operationId: 'getMe',
      summary: 'Get current user',
      description: 'Returns information about the currently authenticated user.',
      tags: ['auth'],
      response: {
        200: responseSchema,
      },
      'x-default-rate-limit': 60,
    },
    handler: async (req, reply) => {
      return reply.status(200).send({ email: req.user.email });
    },
  });
}
