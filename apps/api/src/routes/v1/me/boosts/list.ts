import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { Boost } from 'shared/generated/prisma/client.js';
import { userRepository } from 'shared/src/repositories/user.repository.js';
import { boostRepository } from '#src/repositories/boost.repository.js';

type BoostView = {
  id: string;
  routeId: string;
  rateLimit: number;
  wsConnectionsLimit?: number;
  expiresAt?: string;
  createdAt: string;
};

type ResponseData = {
  boosts: BoostView[];
};

const boostViewSchema: JSONSchemaType<BoostView> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    routeId: { type: 'string' },
    rateLimit: { type: 'integer' },
    wsConnectionsLimit: { type: 'integer', nullable: true },
    expiresAt: { type: 'string', nullable: true },
    createdAt: { type: 'string' },
  },
  required: ['id', 'routeId', 'rateLimit', 'createdAt'],
};

const responseSchema: JSONSchemaType<ResponseData> = {
  type: 'object',
  properties: {
    boosts: { type: 'array', items: boostViewSchema },
  },
  required: ['boosts'],
};

function toBoostView(boost: Boost): BoostView {
  return {
    id: boost.id,
    routeId: boost.routeId,
    rateLimit: boost.rateLimit,
    wsConnectionsLimit: boost.wsConnectionsLimit ?? undefined,
    expiresAt: boost.expiresAt?.toISOString(),
    createdAt: boost.createdAt.toISOString(),
  };
}

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Reply: ResponseData }>({
    method: 'GET',
    url: '/',
    config: { auth: true },
    schema: {
      operationId: 'listBoosts',
      summary: 'List active boosts',
      description: 'Returns rate-limit boosts owned by the authenticated user.',
      tags: ['boosts'],
      response: { 200: responseSchema },
      'x-default-rate-limit': 60,
    },
    handler: async (req, reply) => {
      const user = await userRepository.findFirstOrThrow({ where: { email: req.user.email }, select: { id: true } });
      const boosts = await boostRepository.listByUserId(user.id);
      return reply.status(200).send({ boosts: boosts.map(toBoostView) });
    },
  });
}
