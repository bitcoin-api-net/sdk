import { openApiRepository } from '#src/repositories/openapi.repository.js';
import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv/dist/ajv.js';
import { FastifyInstance } from 'fastify';

export type RequestData = {
  download?: boolean;
};

const querySchema: JSONSchemaType<RequestData> = {
  type: 'object',
  properties: {
    download: { type: 'boolean', nullable: true },
  },
  required: [],
};

export default async function (fastify: FastifyInstance) {
  fastify.route<{ Querystring: RequestData }>({
    method: 'GET',
    url: '/openapi.json',
    schema: {
      operationId: 'openapi',
      hide: true, // Hide from the schema itself to avoid recursion
      summary: 'Get OpenAPI specification',
      description: 'Returns the full OpenAPI 3.x specification for this API in JSON format.',
      querystring: querySchema,
      'x-default-rate-limit': 60,
    },
    handler: async (request, reply) => {
      const schema = openApiRepository.getSchema();

      if (request.query.download) {
        reply.header('Content-Disposition', 'attachment; filename="openapi.json"');
      }

      reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .header('Cache-Control', 'public, max-age=300')
        .send(schema);
    },
  });
}
