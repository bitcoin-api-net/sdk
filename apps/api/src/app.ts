import apiKeyAuthPlugin from '#src/plugins/api-key-auth.js';
import corsPlugin from '#src/plugins/cors.js';
import errorHandlerPlugin from '#src/plugins/error-handler.js';
import jwtAuthPlugin from '#src/plugins/jwt-auth.js';
import loggingPlugin from '#src/plugins/logging.js';
import mcpPlugin from '#src/plugins/mcp.js';
import rateLimitPlugin from '#src/plugins/rate-limit.js';
import ssePlugin from '#src/plugins/sse.js';
import { openApiRepository } from '#src/repositories/openapi.repository.js';
import fastifyAutoload from '@fastify/autoload';
import fastifyCookie from '@fastify/cookie';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyWebsocket from '@fastify/websocket';
import Fastify from 'fastify';
import path from 'node:path';
import env, { required } from 'shared/src/env.js';
import { defaultOptions, logProcessErrors } from 'shared/src/logging.js';
import { redis } from 'shared/src/redis.js';
import { connectToDb } from 'shared/src/repositories/client.js';

const API_PORT = required(env.API_PORT);
const NODE_ENV = required(env.NODE_ENV);
const SECRET_KEY = required(env.SECRET_KEY);
const RUN_FILE_EXTENSION = required(env.RUN_FILE_EXTENSION);

async function main() {
  logProcessErrors();

  await redis.connect();
  await redis.connectSubscriber();
  await connectToDb();

  const app = Fastify({ logger: defaultOptions, trustProxy: true });

  await app.register(loggingPlugin);
  await app.register(errorHandlerPlugin);

  if (NODE_ENV === 'development') await app.register(corsPlugin);

  await app.register(fastifyCookie, {
    secret: SECRET_KEY,
    parseOptions: {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
    },
  });

  await app.register(jwtAuthPlugin);
  await app.register(apiKeyAuthPlugin);
  await app.register(rateLimitPlugin);

  await app.register(fastifyWebsocket);

  await app.register(ssePlugin);

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Bitcoin API',
        description: 'Real-time Bitcoin price API.',
        version: '0.0.1',
      },
      tags: [
        { name: 'health', description: 'Health checks' },
        { name: 'auth', description: 'Authentication and account management' },
        { name: 'prices', description: 'Cryptocurrency prices' },
        { name: 'docs', description: 'Documentation search and AI assistant' },
      ],
    },
  });
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

  await app.register(mcpPlugin);

  await app.ready();

  openApiRepository.save(app.swagger());

  await app.listen({ host: '0.0.0.0', port: Number(API_PORT) });
}

main();
