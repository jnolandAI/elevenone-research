import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolError } from './core/errors.js';
import { INSTRUCTIONS, TOOLS, runTool, type Deps } from './tools.js';
import { VERSION } from './version.js';

export function buildMcpServer(deps: Deps, log: (line: Record<string, unknown>) => void = () => {}): McpServer {
  const server = new McpServer({ name: 'eleven-one-data', title: 'Eleven One Data', version: VERSION }, { instructions: INSTRUCTIONS });
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: true },
      },
      async (args: unknown) => {
        try {
          const result = await runTool(deps, tool.name, args);
          log({ tool: tool.name, ms: result.meta.latency_ms, upstream: result.meta.upstream_calls, cached: result.meta.cache_hits });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        } catch (err) {
          const e = err instanceof ToolError ? err : new ToolError('upstream_error', 'internal error');
          if (!(err instanceof ToolError)) log({ tool: tool.name, error: String(err) });
          return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify(e.toJSON()) }] };
        }
      },
    );
  }
  return server;
}
