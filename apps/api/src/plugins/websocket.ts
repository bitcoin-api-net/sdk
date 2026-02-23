import { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { logger } from 'lib/src/logging/server.js';
import { AppError, ForbiddenError, NotFoundError, ValidationError } from 'lib/src/errors.js';
import { SocketErrorResponse } from './errors.js';

export function registerWebsocketPlugin(fastify: FastifyInstance) {
  fastify.register(fastifyWebsocket, {
    errorHandler: (error, connection) => handleWebSocketError(connection, error),
  });
}

export function handleWebSocketError(connection: WebSocket, error: unknown) {
  let statusCode = 1011;
  const responsePayload: SocketErrorResponse = {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    success: false,
  };

  if (error instanceof ValidationError) {
    responsePayload.code = ValidationError.code;
    responsePayload.message = error.message;
    statusCode = 1008;
    logger.error({ statusCode, responsePayload, data: error.data }, 'WebSocket error');
  } else if (error instanceof ForbiddenError) {
    responsePayload.code = ForbiddenError.code;
    responsePayload.message = error.message;
    statusCode = 1008;
    logger.error({ statusCode, responsePayload, data: error.data }, 'WebSocket error');
  } else if (error instanceof NotFoundError) {
    responsePayload.code = NotFoundError.code;
    responsePayload.message = error.message;
    statusCode = 1003;
    logger.error({ statusCode, responsePayload, data: error.data }, 'WebSocket error');
  } else if (error instanceof AppError) {
    responsePayload.code = error.code;
    responsePayload.message = error.message;
    statusCode = 1011;
    logger.error({ statusCode, responsePayload, data: error.data }, 'WebSocket error');
  } else {
    logger.error({ statusCode, responsePayload, data: error }, 'WebSocket error');
  }

  connection.send(JSON.stringify(responsePayload));
  connection.close(statusCode, responsePayload.message);
}
