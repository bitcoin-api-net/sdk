import { FastifyInstance } from 'fastify';
import { JSONSchemaType } from 'lib/src/validation.js';
import pino from 'pino';
import env, { required } from 'lib/src/env.js';

const LOG_LEVEL = required(env.LOG_LEVEL);

export function registerLoggingPlugin(fastify: FastifyInstance) {
  // Для совместимости: всегда логируем request body, а response body — только на debug.
  registerRequestBodyLogging(fastify);
  registerRequestHeadersLogging(fastify);
  if (env.LOG_LEVEL === 'debug') {
    registerResponseBodyLogging(fastify);
    registerRequestHeadersLogging(fastify);
  }
}

export function registerRequestBodyLogging(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.body) {
      fastify.log.info(
        {
          reqId: request.id,
          payload: request.body,
        },
        'Request body'
      );
    }
  });
}

export function registerResponseBodyLogging(fastify: FastifyInstance) {
  fastify.addHook('onSend', async (request, reply, payload) => {
    if (payload) {
      fastify.log.info(
        {
          reqId: request.id,
          payload: payload,
        },
        'Response body'
      );
    }
  });
}

export function registerRequestHeadersLogging(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.headers) {
      fastify.log.info(
        {
          reqId: request.id,
          headers: request.headers,
        },
        'Request headers'
      );
    }
  });
}

export function registerClientLogsRoute(fastify: FastifyInstance) {
  fastify.register(async (instance) => {
    const logEventSchema: JSONSchemaType<Pick<pino.LogEvent, 'messages' | 'level'>> = {
      type: 'object',
      required: ['level', 'messages'],
      properties: {
        level: {
          type: 'object',
          required: ['value', 'label'],
          properties: { label: { type: 'string' }, value: { type: 'number' } },
        },
        messages: { type: 'array', items: { type: 'string' } },
      },
    };

    instance.route<{ Body: pino.LogEvent }>({
      method: 'POST',
      url: '/api/logs',
      schema: {
        body: logEventSchema,
      },
      handler: async (request, reply) => {
        const level = request.body.level.label;
        // @ts-expect-error: log levels declared in type as string, but it's actually a literal
        fastify.log[level](request.body.messages, 'client log event');
        reply.send();
      },
    });
  });
}
