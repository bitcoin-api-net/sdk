import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { docChunkRepository } from 'shared/src/repositories/doc-chunk.repository.js';

export function registerDocsListTool(server: McpServer): void {
  server.registerTool(
    'get_docs_list',
    {
      title: 'List all documentation chunks',
      description:
        'Returns a list of all documentation chunks with their url, anchor and title. Use get_doc to fetch the full markdown content of a page by its URL.',
      inputSchema: {},
    },
    async () => {
      const docs = await docChunkRepository.listAll();
      return {
        content: [{ type: 'text', text: JSON.stringify(docs, null, 2) }],
        structuredContent: { docs },
      };
    }
  );
}
