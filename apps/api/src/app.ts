import { join } from 'path';
import env, { required } from 'lib/src/env.js';
import { errorsHandler } from 'lib/src/errors.js';

import path from 'node:path';

import Fastify from 'fastify';
import { options as loggerOptions } from 'lib/src/logging/server.js';
import { registerLoggingPlugin } from './plugins/logging.js';
import { setErrorHandler } from './plugins/errors.js';
import { registerWebsocketPlugin } from './plugins/websocket.js';
import { registerCookiePlugin } from './plugins/cookies.js';
import { registerCorsPlugin } from './plugins/cors.js';
import { registerCsrfPlugin } from './plugins/csrf.js';
import { registerSecurityHeadersPlugin } from './plugins/headers.js';
import { registerRateLimitPlugin } from './plugins/rate-limit.js';
import { registerSwaggerPlugin } from './plugins/swagger.js';
import { registerRoutesAutoloadPlugin } from './plugins/routes.js';

errorsHandler.handleProcessErrors();

const API_PORT = Number(required(env.API_PORT));
const APP_DIR = import.meta.dirname.split(path.sep).slice(0, -1).join(path.sep);
const SRC_DIR = join(APP_DIR, 'src');

async function main() {
  const apiServer = Fastify({
    logger: loggerOptions,
    ajv: {
      customOptions: {
        keywords: ['collectionFormat'], // To support OpenAPI collectionFormat to handle querystring arrays. https://github.com/fastify/fastify-swagger?tab=readme-ov-file#openapi-parameter-options
      },
    },
  }); // https://fastify.dev/docs/latest/Reference/Server/#jsonshorthand
  setErrorHandler(apiServer);
  registerCookiePlugin(apiServer);
  registerLoggingPlugin(apiServer);
  registerWebsocketPlugin(apiServer);
  registerCorsPlugin(apiServer);
  registerCsrfPlugin(apiServer);
  registerSecurityHeadersPlugin(apiServer);
  registerRateLimitPlugin(apiServer);
  registerSwaggerPlugin(apiServer);
  registerRoutesAutoloadPlugin(apiServer, { prefix: 'api', dir: join(SRC_DIR, 'routes') });
  await apiServer.listen({ host: '0.0.0.0', port: API_PORT });
}

await main();
