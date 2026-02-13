import fastifyHelmet from '@fastify/helmet';
import { FastifyInstance } from 'fastify';

export function registerSecurityHeadersPlugin(fastify: FastifyInstance) {
  fastify.register(fastifyHelmet, {});
}
