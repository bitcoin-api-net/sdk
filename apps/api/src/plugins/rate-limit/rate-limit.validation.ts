import { FastifyInstance, RouteOptions } from 'fastify';
import fp from 'fastify-plugin';

function validateRoute(route: RouteOptions, seenOperationIds: Map<string, string>): void {
  const { schema, url, method } = route;
  const where = `${Array.isArray(method) ? method.join(',') : method} ${url}`;

  const operationId = schema?.operationId;
  if (!operationId) {
    throw new Error(`route ${where} is missing schema.operationId`);
  }

  const previousWhere = seenOperationIds.get(operationId);
  if (previousWhere && previousWhere !== where) {
    throw new Error(`duplicate schema.operationId "${operationId}": ${previousWhere} vs ${where}`);
  }
  seenOperationIds.set(operationId, where);

  const rateLimit = schema?.['x-default-rate-limit'];
  if (typeof rateLimit !== 'number' || rateLimit <= 0) {
    throw new Error(`route ${where} is missing schema['x-default-rate-limit']`);
  }

  if (route.wsHandler) {
    const wsLimit = schema?.['x-default-ws-connections-limit'];
    if (typeof wsLimit !== 'number' || wsLimit <= 0) {
      throw new Error(`ws route ${where} is missing schema['x-default-ws-connections-limit']`);
    }
  }
}

const SKIP_PREFIXES = ['/api/documentation', '/api/mcp'];

export default fp(async function rateLimitValidationPlugin(fastify: FastifyInstance) {
  const routes: RouteOptions[] = [];
  const seenOperationIds = new Map<string, string>();

  fastify.addHook('onRoute', (route) => {
    routes.push(route);
  });

  fastify.addHook('onReady', async () => {
    for (const route of routes) {
      if (SKIP_PREFIXES.some((p) => route.url.startsWith(p))) continue;
      if (route.method === 'HEAD' || (Array.isArray(route.method) && route.method.every((m) => m === 'HEAD'))) continue;
      validateRoute(route, seenOperationIds);
    }
  });
});
