import { apiKeyRepository } from '#src/repositories/api-key.repository.js';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { UnauthorizedError } from 'shared/src/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    apiKeyId?: string;
  }
}

const BEARER_PREFIX = 'Bearer ';

function parseBearerToken(header: string | undefined): string | undefined {
  if (!header || !header.startsWith(BEARER_PREFIX)) return undefined;
  const token = header.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : undefined;
}

export default fp(async function apiKeyAuthPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request) => {
    const token = parseBearerToken(request.headers.authorization);
    if (!token) return;

    const apiKey = await apiKeyRepository.findByToken(token);
    if (!apiKey || !apiKey.isActive) throw new UnauthorizedError();

    request.userId = apiKey.userId;
    request.apiKeyId = apiKey.id;
  });
});
