import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route({
    method: 'POST',
    url: '/logout',
    config: { auth: true },
    schema: {
      operationId: 'logout',
      summary: 'Log out the current user',
      description: 'Clears the access cookie for the authenticated user.',
      tags: ['auth'],
    },
    handler: async (_req, reply) => {
      return reply
        .clearCookie('access', { path: '/' })
        .status(200)
        .send({ message: 'ok' });
    },
  });
}
