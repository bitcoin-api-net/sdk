import { createMcpServer } from '#src/mcp/server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

async function handleMcp(req: FastifyRequest, reply: FastifyReply) {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  reply.raw.on('close', () => {
    transport.close().catch(() => {
      // already closed
    });
    server.close().catch(() => {
      // already closed
    });
  });

  await server.connect(transport);
  await transport.handleRequest(req.raw, reply.raw, req.body);

  return reply;
}

export default fp(async function mcpPlugin(fastify: FastifyInstance) {
  fastify.route({ method: 'POST', url: '/mcp', handler: handleMcp });
  fastify.route({ method: 'GET', url: '/mcp', handler: handleMcp });
  fastify.route({ method: 'DELETE', url: '/mcp', handler: handleMcp });
});
