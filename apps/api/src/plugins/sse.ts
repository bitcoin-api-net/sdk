import fastifySseModule from '@fastify/sse';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// `@fastify/sse` declares ESM default in d.ts but ships CJS `module.exports = fp(...)`.
// Under nodenext the default import resolves to the namespace; unwrap to the real plugin.
const fastifySse = ((fastifySseModule as unknown as { default?: FastifyPluginAsync }).default ??
  (fastifySseModule as unknown as FastifyPluginAsync)) as FastifyPluginAsync;

export default fp(async function ssePlugin(fastify: FastifyInstance) {
  await fastify.register(fastifySse);
});
