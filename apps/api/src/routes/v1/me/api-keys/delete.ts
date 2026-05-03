import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { userRepository } from 'shared/src/repositories/user.repository.js';
import { deleteApiKeyUsecase } from '#src/usecases/api-keys/delete-api-key.usecase.js';

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
  app.route<{ Params: RequestParams }>({
    method: 'DELETE',
    url: '/:id',
    config: { auth: true },
    schema: {
      operationId: 'deleteApiKey',
      summary: 'Delete API key',
      description: 'Permanently deletes an API key belonging to the authenticated user.',
      tags: ['api-keys'],
      params: paramsSchema,
      'x-default-rate-limit': 10,
    },
    handler: async (req, reply) => {
      const user = await userRepository.findFirstOrThrow({ where: { email: req.user.email }, select: { id: true } });
      await deleteApiKeyUsecase.execute({ userId: user.id, apiKeyId: req.params.id });
      return reply.status(204).send();
    },
  });
}
