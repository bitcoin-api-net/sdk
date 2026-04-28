import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { googleProvider } from '#src/providers/google.provider.js';

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route({
    method: 'GET',
    url: '/login',
    schema: {
      operationId: 'googleLogin',
      summary: 'Start Google OAuth login flow',
      description: 'Redirects the user to the Google OAuth consent screen.',
      tags: ['auth'],
    },
    handler: async (_req, reply) => {
      const url = googleProvider.getAuthUrl();
      return reply.redirect(url);
    },
  });
}
