import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { userRepository } from 'shared/src/repositories/user.repository.js';
import { ApiKeyView, apiKeyViewSchema, toApiKeyView } from './shared/api-key.mapper.js';
import { createApiKeyUsecase } from '#src/usecases/api-keys/create-api-key.usecase.js';

type RequestData = {
  name: string;
};

const bodySchema: JSONSchemaType<RequestData> = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
  },
  required: ['name'],
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Body: RequestData; Reply: ApiKeyView }>({
    method: 'POST',
    url: '/',
    config: { auth: true },
    schema: {
      operationId: 'createApiKey',
      summary: 'Create API key',
      description: 'Generates a new API key for the authenticated user.',
      tags: ['api-keys'],
      body: bodySchema,
      response: { 201: apiKeyViewSchema },
      'x-default-rate-limit': 10,
    },
    handler: async (req, reply) => {
      const user = await userRepository.findFirstOrThrow({ where: { email: req.user.email }, select: { id: true } });
      const apiKey = await createApiKeyUsecase.execute({ userId: user.id, name: req.body.name });
      return reply.status(201).send(toApiKeyView(apiKey));
    },
  });
}
