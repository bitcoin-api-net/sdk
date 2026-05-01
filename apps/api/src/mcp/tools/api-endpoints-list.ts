import { openApiRepository } from '#src/repositories/openapi.repository.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerApiEndpointsListTool(server: McpServer): void {
  server.registerTool(
    'api_endpoints_list',
    {
      title: 'List all API endpoints',
      description:
        'Returns a list of all available API endpoints with their operationId, method, path, summary, description and tags. Use api_endpoint to fetch full OpenAPI fragment by operationId.',
      inputSchema: {},
    },
    async () => {
      const endpoints = openApiRepository.listOperations().map((op) => ({
        operationId: op.operationId,
        method: op.method.toUpperCase(),
        path: op.path,
        summary: op.summary,
        description: op.description,
        tags: op.tags,
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify(endpoints, null, 2) }],
        structuredContent: { endpoints },
      };
    }
  );
}
