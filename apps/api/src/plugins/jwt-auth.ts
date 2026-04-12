import fastifyJwt from '@fastify/jwt';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import env, { required } from 'shared/src/env.js';
import { UnauthorizedError } from 'shared/src/errors.js';

const SECRET_KEY = required(env.SECRET_KEY);

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { email: string };
    user: { email: string };
  }
}

declare module 'fastify' {
  interface FastifyContextConfig {
    auth?: boolean;
  }
}

export default fp(async function jwtAuthPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyJwt, {
    secret: SECRET_KEY,
    cookie: {
      cookieName: 'access',
      signed: false,
    },
  });

  fastify.addHook('onRequest', async (request) => {
    if (!request.routeOptions.config.auth) return;

    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError();
    }
  });
});
