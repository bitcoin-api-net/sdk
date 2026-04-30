import { docsFetchUseCase } from '#src/usecases/docs/docs-fetch.usecase.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerDocsFetchTool(server: McpServer): void {
  server.registerTool(
    'docs_fetch',
    {
      title: 'Fetch full documentation page',
      description:
        'Returns the full markdown content of a documentation page by its URL (path like /docs/quickstart). Use after docs_search.',
      inputSchema: {
        url: z.string().min(1).describe('Page URL/path as returned by docs_search (e.g. "/docs/quickstart").'),
      },
    },
    async ({ url }) => {
      const result = await docsFetchUseCase.execute({ url });
      if (!result) {
        return {
          content: [{ type: 'text', text: `No documentation found for URL: ${url}` }],
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
