import { registerApiEndpointTool } from '#src/mcp/tools/api-endpoint.js';
import { registerDocsFetchTool } from '#src/mcp/tools/docs-fetch.js';
import { registerDocsSearchTool } from '#src/mcp/tools/docs-search.js';
import { registerRecipeSearchTool } from '#src/mcp/tools/recipe-search.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from 'shared/src/logging.js';

export const mcpServer = new McpServer({
  name: 'bitcoin-api-docs',
  version: '0.0.1',
});

registerDocsSearchTool(mcpServer);
registerDocsFetchTool(mcpServer);
registerRecipeSearchTool(mcpServer);
registerApiEndpointTool(mcpServer);

// Lightweight tool-call analytics. The high-level McpServer doesn't expose a
// universal pre/post hook, so we wrap each registered tool's handler once
// after registration via the (private but stable) `_registeredTools` map.
wrapToolHandlersForLogging(mcpServer);

function wrapToolHandlersForLogging(server: McpServer): void {
  const tools = (server as unknown as { _registeredTools: Record<string, RegisteredToolLike> })._registeredTools;
  if (!tools) return;

  for (const [name, tool] of Object.entries(tools)) {
    const original = tool.handler;
    if (typeof original !== 'function') continue;

    tool.handler = async (...args: unknown[]) => {
      const startedAt = Date.now();
      try {
        const result = await (original as (...a: unknown[]) => Promise<unknown>)(...args);
        logger.info({ tool: name, durationMs: Date.now() - startedAt, ok: true }, 'mcp tool call');
        return result;
      } catch (err) {
        logger.error({ tool: name, durationMs: Date.now() - startedAt, ok: false, err }, 'mcp tool call failed');
        throw err;
      }
    };
  }
}

type RegisteredToolLike = {
  handler: unknown;
};
