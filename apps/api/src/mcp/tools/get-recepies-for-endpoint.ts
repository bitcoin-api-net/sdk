import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { recipeChunkRepository } from 'shared/src/repositories/recipe-chunk.repository.js';
import { z } from 'zod';

export function registerRecipeSearchTool(server: McpServer): void {
  server.registerTool(
    'get_recepies_for_endpoint',
    {
      title: 'Get code recipes for an API endpoint',
      description:
        'Returns a list of code recipes that use the given OpenAPI endpoint. Each recipe has url, anchor, title, description and language.',
      inputSchema: {
        operationId: z.string().describe('OpenAPI operationId — returns all recipes that use this endpoint.'),
      },
    },
    async ({ operationId }) => {
      const chunks = await recipeChunkRepository.findByEndpoint(operationId);
      const recipes = chunks.map((c) => ({
        url: c.url,
        anchor: c.anchor,
        title: c.title,
        description: c.description,
        language: c.language,
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify(recipes, null, 2) }],
        structuredContent: { recipes },
      };
    }
  );
}
