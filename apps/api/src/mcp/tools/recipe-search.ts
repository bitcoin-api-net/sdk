import { recipeSearchUseCase } from '#src/usecases/docs/recipe-search.usecase.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerRecipeSearchTool(server: McpServer): void {
  server.registerTool(
    'recipe_search',
    {
      title: 'Find code recipes',
      description:
        'Find code recipes by endpoint operationId, free-form query, or programming language. At least one of `operationId` or `query` must be provided.',
      inputSchema: {
        operationId: z
          .string()
          .optional()
          .describe('OpenAPI operationId — returns all recipes that use this endpoint.'),
        query: z.string().optional().describe('Free-form query for semantic ranking.'),
        language: z.string().optional().describe('Filter by programming language (e.g. "javascript").'),
        k: z.number().int().min(1).max(50).optional().describe('Max results (default 10).'),
      },
    },
    async ({ operationId, query, language, k }) => {
      if (!operationId && !query) {
        return {
          content: [
            {
              type: 'text',
              text: 'Either `operationId` or `query` must be provided.',
            },
          ],
          isError: true,
        };
      }
      const hits = await recipeSearchUseCase.execute({ operationId, query, language, k });
      return {
        content: [{ type: 'text', text: JSON.stringify(hits, null, 2) }],
        structuredContent: { hits },
      };
    }
  );
}
