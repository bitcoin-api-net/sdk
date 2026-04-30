import { apiEndpointUseCase } from '#src/usecases/docs/api-endpoint.usecase.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerApiEndpointTool(server: McpServer): void {
  server.registerTool(
    'api_endpoint',
    {
      title: 'Get OpenAPI fragment for an endpoint',
      description:
        'Returns the raw OpenAPI operation object (parameters, request/response schemas) for the given HTTP method and path.',
      inputSchema: {
        method: z.string().min(3).max(7).describe('HTTP method: GET, POST, PUT, PATCH, DELETE.'),
        path: z
          .string()
          .min(1)
          .describe('Full API path including prefix, e.g. "/api/v1/prices/current".'),
      },
    },
    async ({ method, path }) => {
      const result = await apiEndpointUseCase.execute({ method, path });
      if (!result) {
        return {
          content: [
            {
              type: 'text',
              text: `No OpenAPI operation found for ${method.toUpperCase()} ${path}.`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );
}
