import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.route({
    method: 'GET',
    url: '/ping',
    schema: {
      operationId: 'ping',
      summary: 'Health check',
      description: 'Returns "ok" if the API is up and running.',
      tags: ['health'],
    },
    handler: async () => {
      return 'ok';
    },
  });
}
