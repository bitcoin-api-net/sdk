import { docsSearchUseCase } from '#src/usecases/docs/docs-search.usecase.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerDocsSearchTool(server: McpServer): void {
  server.registerTool(
    'search_docs',
    {
      title: 'Search Bitcoin API documentation',
      description:
        'Semantic search over Bitcoin API docs (narrative, recipes, OpenAPI endpoints). Returns top-k chunks ranked by similarity. Use this first to find relevant material, then call docs_fetch / api_endpoint / recipe_search for details.',
      inputSchema: {
        query: z.string().min(1).max(500).describe('Free-form natural language query.'),
        k: z.number().int().min(1).max(20).optional().describe('Max results to return (default 8).'),
      },
    },
    async ({ query, k }) => {
      const hits = await docsSearchUseCase.execute({ query, k });
      return {
        content: [{ type: 'text', text: JSON.stringify(hits, null, 2) }],
        structuredContent: { hits },
      };
    }
  );
}
