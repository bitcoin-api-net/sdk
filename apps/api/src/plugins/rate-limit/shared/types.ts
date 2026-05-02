declare module 'fastify' {
  interface FastifySchema {
    'x-default-rate-limit'?: number;
    'x-default-ws-connections-limit'?: number;
  }
}
