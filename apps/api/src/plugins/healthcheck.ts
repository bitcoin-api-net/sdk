import { FastifyInstance } from 'fastify';

export function registerPingRoute(fastify: FastifyInstance, options: { prefix: string }) {
  const url = `/${options.prefix}/ping`.replace(/\/\//g, '/');
  fastify.get(url, async () => {
    return 'pong';
  });
}
