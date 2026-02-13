import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

export function registerSwaggerPlugin(fastify: FastifyInstance) {
  fastify.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'API',
        description: 'API documentation',
        version: '0.0.1',
      },
      consumes: ['application/json', 'multipart/form-data'],
      produces: ['application/json', 'multipart/form-data'],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'Authorization token',
        },
      },
      security: [{ apiKey: [] }],
    },
    transform: ({ schema, url }) => {
      schema.hide = false;
      return { schema, url };
    },
  });

  fastify.register(fastifySwaggerUi, {
    routePrefix: '/api/documentation',
    theme: {
      title: 'API documentation',
    },
  });
}
