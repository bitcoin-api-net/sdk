import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { userRepository } from 'shared/src/repositories/user.repository.js';
import { ApiKeyView, apiKeyViewSchema, toApiKeyView } from './shared/api-key.mapper.js';
import { rotateApiKeyUsecase } from '#src/usecases/api-keys/rotate-api-key.usecase.js';

type RequestParams = {
  id: string;
};

const paramsSchema: JSONSchemaType<RequestParams> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Params: RequestParams; Reply: ApiKeyView }>({
    method: 'POST',
    url: '/:id/rotate',
    config: { auth: true },
    schema: {
      operationId: 'rotateApiKey',
      summary: 'Rotate API key',
      description: 'Replaces the API key with a new token; old token is invalidated.',
      tags: ['api-keys'],
      params: paramsSchema,
      response: { 200: apiKeyViewSchema },
      'x-default-rate-limit': 10,
    },
    handler: async (req, reply) => {
      const user = await userRepository.findFirstOrThrow({ where: { email: req.user.email }, select: { id: true } });
      const apiKey = await rotateApiKeyUsecase.execute({ userId: user.id, apiKeyId: req.params.id });
      return reply.status(200).send(toApiKeyView(apiKey));
    },
  });
}
