import { FastifyInstance } from 'fastify';
import fastifyCsrf from '@fastify/csrf-protection';

export function registerCsrfPlugin(fastify: FastifyInstance) {
  fastify.register(fastifyCsrf, {
    cookieOpts: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      signed: true,
    },
  });
}
