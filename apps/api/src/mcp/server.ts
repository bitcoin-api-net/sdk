import { registerApiEndpointTool } from '#src/mcp/tools/api-endpoint.js';
import { registerApiEndpointsListTool } from '#src/mcp/tools/api-endpoints-list.js';
import { registerDocsFetchTool } from '#src/mcp/tools/docs-fetch.js';
import { registerDocsSearchTool } from '#src/mcp/tools/docs-search.js';
import { registerRecipeSearchTool } from '#src/mcp/tools/recipe-search.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AppError } from 'shared/src/errors.js';
import { logger } from 'shared/src/logging.js';

export const mcpServer = new McpServer({
  name: 'bitcoin-api-docs',
  version: '0.0.1',
});

registerDocsSearchTool(mcpServer);
registerDocsFetchTool(mcpServer);
registerRecipeSearchTool(mcpServer);
registerApiEndpointsListTool(mcpServer);
registerApiEndpointTool(mcpServer);

// Centralized tool-call analytics + error mapping. The high-level McpServer
// has no universal pre/post hook, so we wrap each registered handler once
// via the (private but stable) `_registeredTools` map. Tool handlers can
// throw `AppError` (e.g. NotFoundError) — wrapper converts them into a
// proper MCP error result so individual tools stay a one-liner around the
// usecase call.
wrapToolHandlers(mcpServer);

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
  structuredContent?: unknown;
};

function wrapToolHandlers(server: McpServer): void {
  const tools = (server as unknown as { _registeredTools: Record<string, RegisteredToolLike> })._registeredTools;
  if (!tools) return;

  for (const [name, tool] of Object.entries(tools)) {
    const original = tool.handler;
    if (typeof original !== 'function') continue;

    tool.handler = async (...args: unknown[]) => {
      const startedAt = Date.now();
      try {
        const result = await (original as (...a: unknown[]) => Promise<ToolResult>)(...args);
        logger.info({ tool: name, durationMs: Date.now() - startedAt, ok: true }, 'mcp tool call');
        return result;
      } catch (err) {
        const durationMs = Date.now() - startedAt;
        if (err instanceof AppError) {
          logger.info(
            { tool: name, durationMs, ok: false, code: err.code, message: err.message },
            'mcp tool call rejected',
          );
          return toErrorResult(err.code, err.message);
        }
        logger.error({ tool: name, durationMs, ok: false, err }, 'mcp tool call failed');
        return toErrorResult('INTERNAL_ERROR', 'Internal server error.');
      }
    };
  }
}

function toErrorResult(code: string, message: string): ToolResult {
  return {
    content: [{ type: 'text', text: `${code}: ${message}` }],
    isError: true,
  };
}

type RegisteredToolLike = {
  handler: unknown;
};
