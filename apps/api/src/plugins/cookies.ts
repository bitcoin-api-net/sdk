import { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import env from 'lib/src/env.js';
import { required } from 'lib/src/env.js';

const SECRET_KEY = required(env.SECRET_KEY);

export function registerCookiePlugin(fastify: FastifyInstance) {
  fastify.register(fastifyCookie, {
    secret: SECRET_KEY,
    parseOptions: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  });
}
