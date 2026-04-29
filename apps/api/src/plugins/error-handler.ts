import type { ResponseErrorPayload } from '#src/shared/errors.js';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from 'shared/src/errors.js';

export default fp(async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler<Error>((error, request, reply) => {
    const payload = toPayload(error);
    const statusCode = toStatusCode(error);

    if (reply.sse && reply.raw.headersSent) {
      request.log.error({ err: error }, 'sse stream failed mid-flight');
      try {
        reply.raw.write(`event: error\ndata: ${JSON.stringify(payload)}\n\n`);
      } catch {
        // socket may already be closed — nothing we can do
      }
      reply.sse.close();
      return reply;
    }

    return reply.status(statusCode).send(payload);
  });
});

function toPayload(error: Error): ResponseErrorPayload {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message };
  }
  const code = (error as Error & { code?: string }).code ?? 'INTERNAL_ERROR';
  return { code, message: error.message };
}

function toStatusCode(error: Error): number {
  if (error instanceof AppError) return error.httpCode;
  return (error as Error & { statusCode?: number }).statusCode ?? 500;
}
