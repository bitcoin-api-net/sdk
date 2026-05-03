import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { userRepository } from 'shared/src/repositories/user.repository.js';
import { apiKeyRepository } from '#src/repositories/api-key.repository.js';
import { ApiKeyView, apiKeyViewSchema, toApiKeyView } from './shared/api-key.mapper.js';

type ResponseData = {
  apiKeys: ApiKeyView[];
};

const responseSchema: JSONSchemaType<ResponseData> = {
  type: 'object',
  properties: {
    apiKeys: { type: 'array', items: apiKeyViewSchema },
  },
  required: ['apiKeys'],
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Reply: ResponseData }>({
    method: 'GET',
    url: '/',
    config: { auth: true },
    schema: {
      operationId: 'listApiKeys',
      summary: 'List API keys',
      description: 'Returns all API keys belonging to the authenticated user.',
      tags: ['api-keys'],
      response: { 200: responseSchema },
      'x-default-rate-limit': 60,
    },
    handler: async (req, reply) => {
      const user = await userRepository.findFirstOrThrow({ where: { email: req.user.email }, select: { id: true } });
      const apiKeys = await apiKeyRepository.listByUserId(user.id);
      return reply.status(200).send({ apiKeys: apiKeys.map(toApiKeyView) });
    },
  });
}
