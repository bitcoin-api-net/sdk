import fastifyAutoload from '@fastify/autoload';
import { FastifyInstance } from 'fastify';

import env, { required } from 'lib/src/env.js';

const RUN_FILE_EXTENSION = required(env.RUN_FILE_EXTENSION);

export function registerRoutesAutoloadPlugin(fastify: FastifyInstance, options: { prefix: string; dir: string }) {
  const scriptPattern = new RegExp(`\\${RUN_FILE_EXTENSION}$`);
  const ignorePattern = new RegExp(`\\.types\\${RUN_FILE_EXTENSION}$`);
  fastify.register(fastifyAutoload, {
    dir: options.dir,
    scriptPattern: scriptPattern,
    ignorePattern: ignorePattern,
    routeParams: true,
    options: { prefix: options.prefix },
  });
}
