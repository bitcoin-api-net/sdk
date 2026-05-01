import { recipeFetchUseCase } from '#src/usecases/docs/recipe-fetch.usecase.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerRecipeFetchTool(server: McpServer): void {
  server.registerTool(
    'get_recipe',
    {
      title: 'Fetch full code recipe',
      description:
        'Returns the full markdown content of a code recipe by its URL together with metadata (language, tags, endpoints used, etc.). Use after get_recepies_for_endpoint.',
      inputSchema: {
        url: z
          .string()
          .min(1)
          .describe('Recipe URL/path as returned by get_recepies_for_endpoint (e.g. "/docs/recipes/foo").'),
      },
    },
    async ({ url }) => {
      const result = await recipeFetchUseCase.execute({ url });
      if (!result) {
        return {
          content: [{ type: 'text', text: `No recipe found for URL: ${url}` }],
          isError: true,
        };
      }
      const text = `# ${result.title}\n\n${result.markdown}`;
      return {
        content: [{ type: 'text', text }],
        structuredContent: result,
      };
    }
  );
}
