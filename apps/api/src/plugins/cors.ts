import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import env, { required } from 'lib/src/env.js';

const CORS_ORIGIN = required(env.CORS_ORIGIN);

export function registerCorsPlugin(fastify: FastifyInstance) {
  fastify.register(fastifyCors, {
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  });
}
