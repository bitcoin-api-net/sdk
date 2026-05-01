import { openApiRepository } from '#src/repositories/openapi.repository.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NotFoundError } from 'shared/src/errors.js';
import { z } from 'zod';

export function registerApiEndpointTool(server: McpServer): void {
  server.registerTool(
    'api_endpoint',
    {
      title: 'Get OpenAPI fragment for an endpoint',
      description:
        'Returns the raw OpenAPI operation object (parameters, request/response schemas) for the given operationId. Use api_endpoints_list to discover available operationIds.',
      inputSchema: {
        operationId: z.string().min(1).describe('OpenAPI operationId of the endpoint, e.g. "getCurrentPrice".'),
      },
    },
    async ({ operationId }) => {
      const result = await openApiRepository.findOperationById(operationId);
      if (!result) {
        throw new NotFoundError(`No OpenAPI operation found for operationId "${operationId}".`);
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );
}
