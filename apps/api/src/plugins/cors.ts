import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import env, { required } from 'shared/src/env.js';

const CORS_ORIGIN = required(env.CORS_ORIGIN).split(',');

export default fp(async function corsPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && CORS_ORIGIN.includes(origin)) {
      reply.header('Access-Control-Allow-Origin', origin);
    } else {
      reply.header('Access-Control-Allow-Origin', CORS_ORIGIN[0]);
    }
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    reply.header('Access-Control-Allow-Credentials', 'true');

    if (request.method === 'OPTIONS') {
      return reply.status(204).send();
    }
  });
});
