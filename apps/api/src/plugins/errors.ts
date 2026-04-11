import { AppError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from 'lib/src/errors.js';
import { logger } from 'lib/src/logging/server.js';
import Fastify, { FastifyInstance } from 'fastify';
import { JSONSchemaType } from 'lib/src/validation.js';

export type DefaultResponseErrorPayload = {
  code: string;
  message: string;
};

export type ValidationErrorResponsePayload = {
  success: false;
  code: string;
  message: string;
  data?: ValidationErrorData;
};

export type ValidationErrorData = {
  instancePath: string;
  message: string;
};

export type SocketErrorResponse = {
  code: string;
  success: boolean;
  message: string;
};

export const SocketErrorResponseSchema: JSONSchemaType<SocketErrorResponse> = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'INTERNAL_ERROR' },
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: 'Internal server error' },
  },
  required: ['code', 'success', 'message'],
};

export function setErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler<any>((error, request, reply) => {
    const responsePayload: DefaultResponseErrorPayload = {
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    };
    if (error.statusCode === 400 && Array.isArray(error.validation)) {
      const validationError = error.validation[0];
      const responsePayload: ValidationErrorResponsePayload = {
        success: false,
        code: error.code,
        message: error.message,
        data: {
          instancePath: validationError.instancePath,
          message: validationError.message || '',
        },
      };
      return reply.status(400).send(responsePayload);
    }

    if (error.statusCode === 400) {
      responsePayload.code = ValidationError.code;
      responsePayload.message = error.message;
      reply.status(error.statusCode || 400).send(responsePayload);
      return;
    }

    if (error instanceof ValidationError) {
      responsePayload.code = error.code;
      responsePayload.message = error.message;
      reply.status(error.statusCode).send(responsePayload);
      return;
    }
    if (error instanceof Fastify.errorCodes.FST_ERR_NOT_FOUND) {
      responsePayload.code = NotFoundError.code;
      responsePayload.message = NotFoundError.message;
      reply.status(404).send(responsePayload);
      return;
    }
    if (error instanceof NotFoundError) {
      responsePayload.code = error.code;
      responsePayload.message = error.message;
      reply.status(error.statusCode).send(responsePayload);
      return;
    }
    if (error instanceof UnauthorizedError) {
      responsePayload.code = UnauthorizedError.code;
      responsePayload.message = UnauthorizedError.message;
      reply.status(error.statusCode).send(responsePayload);
      return;
    }
    if (error instanceof ForbiddenError) {
      responsePayload.code = error.code;
      responsePayload.message = error.message;
      reply.status(error.statusCode).send(responsePayload);
      return;
    }
    logger.error({ reqId: request.id, error, stack: error.stack }, 'Internal server error');

    reply.status(error.statusCode || 500).send({
      ...responsePayload,
      message: 'Internal server error',
    });
  });
}
