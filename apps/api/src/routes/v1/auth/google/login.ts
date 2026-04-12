import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { googleProvider } from '#src/providers/google.provider.js';

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route({
    method: 'GET',
    url: '/login',
    handler: async (_req, reply) => {
      const url = googleProvider.getAuthUrl();
      return reply.redirect(url);
    },
  });
}
