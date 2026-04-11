import env, { required } from 'shared/src/env.js';
import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';

const LOG_LEVEL = required(env.LOG_LEVEL);
const isDebug = LOG_LEVEL === 'debug';

export default fp(async function loggingPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request) => {
    const payload: Record<string, unknown> = {
      id: request.id,
      payload: request.body,
    };

    if (isDebug) {
      payload.headers = request.headers;
    }

    request.log.info(payload, 'Incoming request');
  });

  fastify.addHook('onResponse', async (request, reply) => {
    if (!isDebug) return;

    request.log.debug({ id: request.id, payload: reply.getHeaders() }, 'Outgoing response');
  });
});
