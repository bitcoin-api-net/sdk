import { FastifyRequest } from 'fastify';

export function getOperationId(req: FastifyRequest): string {
  const operationId = req.routeOptions.schema?.operationId;
  if (!operationId) throw new Error(`route ${req.routeOptions.url} is missing schema.operationId`);
  return operationId;
}

export function getSchemaLimit(req: FastifyRequest, field: `x-${string}`): number {
  const value = (req.routeOptions.schema as Record<string, unknown> | undefined)?.[field];
  if (typeof value !== 'number' || value <= 0) {
    throw new Error(`route ${req.routeOptions.url} is missing schema['${field}']`);
  }
  return value;
}

export function buildRateLimitKey(req: FastifyRequest, operationId: string): string {
  const owner = req.userId ? `u:${req.userId}` : `ip:${req.ip}`;
  return `${operationId}:${owner}`;
}
