import { registerApiEndpointTool } from '#src/mcp/tools/get-api-endpoint.js';
import { registerApiEndpointsListTool } from '#src/mcp/tools/get-api-endpoints-list.js';
import { registerDocsFetchTool } from '#src/mcp/tools/get-doc.js';
import { registerDocsListTool } from '#src/mcp/tools/get-docs-list.js';
import { registerRecipeSearchTool } from '#src/mcp/tools/get-recepies-for-endpoint.js';
import { registerRecipeFetchTool } from '#src/mcp/tools/get-recipe.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AppError } from 'shared/src/errors.js';
import { logger } from 'shared/src/logging.js';

// Streamable HTTP in stateless mode requires a fresh McpServer + Transport
// per request, otherwise SDK throws "Already connected to a transport".
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'bitcoin-api-docs',
    version: '0.0.1',
  });

  registerDocsListTool(server);
  registerDocsFetchTool(server);
  registerRecipeSearchTool(server);
  registerRecipeFetchTool(server);
  registerApiEndpointsListTool(server);
  registerApiEndpointTool(server);

  // Centralized tool-call analytics + error mapping. The high-level McpServer
  // has no universal pre/post hook, so we wrap each registered handler via
  // the (private but stable) `_registeredTools` map. Tool handlers can throw
  // `AppError` (e.g. NotFoundError) — wrapper converts them into a proper MCP
  // error result so individual tools stay a one-liner around the usecase call.
  wrapToolHandlers(server);

  return server;
}

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
            'mcp tool call rejected'
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
