import corsPlugin from '#src/plugins/cors.js';
import loggingPlugin from '#src/plugins/logging.js';
import type { ResponseErrorPayload } from '#src/shared/errors.js';
import fastifyAutoload from '@fastify/autoload';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import env, { required } from 'shared/src/env.js';
import { AppError } from 'shared/src/errors.js';
import { defaultOptions, logProcessErrors } from 'shared/src/logging.js';
import path from 'node:path';

const API_PORT = required(env.API_PORT);
const NODE_ENV = required(env.NODE_ENV);
const RUN_FILE_EXTENSION = required(env.RUN_FILE_EXTENSION);

async function main() {
  logProcessErrors();

  const app = Fastify({ logger: defaultOptions });

  app.setErrorHandler<Error>((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.httpCode).send({
        code: error.code,
        message: error.message,
      } satisfies ResponseErrorPayload);
    }

    const fastifyError = error as Error & { statusCode?: number; code?: string };
    const statusCode = fastifyError.statusCode ?? 500;
    return reply.status(statusCode).send({
      code: fastifyError.code ?? 'INTERNAL_ERROR',
      message: fastifyError.message,
    } satisfies ResponseErrorPayload);
  });

  await app.register(loggingPlugin);

  if (NODE_ENV === 'development') await app.register(corsPlugin);

  await app.register(fastifySwagger);
  await app.register(fastifySwaggerUi, {
    routePrefix: '/api/documentation',
  });

  const scriptPattern = new RegExp(`\\${RUN_FILE_EXTENSION}$`);
  const ignorePattern = new RegExp(`\\.types\\${RUN_FILE_EXTENSION}$`);
  await app.register(fastifyAutoload, {
    dir: path.join(import.meta.dirname, 'routes'),
    scriptPattern,
    ignorePattern,
    routeParams: true,
    options: { prefix: 'api' },
  });

  await app.listen({ host: '0.0.0.0', port: Number(API_PORT) });
}

main();
