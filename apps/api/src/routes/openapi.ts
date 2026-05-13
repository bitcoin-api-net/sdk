import { openApiRepository } from '#src/repositories/openapi.repository.js';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.route({
    method: 'GET',
    url: '/openapi.json',
    schema: {
      operationId: 'openapi',
      hide: true, // Hide from the schema itself to avoid recursion
      summary: 'Get OpenAPI specification',
      description: 'Returns the full OpenAPI 3.x specification for this API in JSON format.',
      'x-default-rate-limit': 60,
    },
    handler: async (request, reply) => {
      const schema = openApiRepository.getSchema();

      reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .header('Cache-Control', 'public, max-age=300')
        .send(schema);
    },
  });
}
