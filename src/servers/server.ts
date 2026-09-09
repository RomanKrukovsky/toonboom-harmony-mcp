import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { validateToolRegistry, type McpTool } from './toolRegistry.js';
export { selectTools } from './toolRegistry.js';
export type { McpTool } from './toolRegistry.js';

export function createEngineServer(engine: 'moho' | 'harmony', tools: McpTool[], profile = 'production'): Server {
  validateToolRegistry(tools, profile === 'production' ? 25 : undefined);
  const registry = new Map(tools.map(tool => [tool.name, tool]));
  const server = new Server({ name: `${engine}-mcp`, version: '1.0.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema, { target: 'jsonSchema7', $refStrategy: 'none' })
    }))
  }));
  server.setRequestHandler(CallToolRequestSchema, async request => {
    try {
      const tool = registry.get(request.params.name);
      if (!tool) throw new Error(`Unknown ${engine} tool: ${request.params.name}`);
      const args = tool.inputSchema.parse(request.params.arguments ?? {});
      const result = await tool.handler(args);
      const body = result as { status?: string; error?: unknown; ok?: boolean } | null;
      const isError = body?.ok === false || Boolean(body?.error)
        || ['error', 'failed', 'blocked', 'invalid', 'not_implemented'].includes(body?.status ?? '');
      return { content: [{ type: 'text', text: JSON.stringify(result) }], ...(isError ? { isError: true } : {}) };
    } catch (error) {
      const failure = error as Error & { code?: string };
      return { isError: true, content: [{ type: 'text', text: JSON.stringify({
        status: 'failed', code: failure.code ?? 'MCP_CALL_FAILED', message: failure.message
      }) }] };
    }
  });
  return server;
}

export async function serveEngine(engine: 'moho' | 'harmony', tools: McpTool[], profile: string): Promise<void> {
  const server = createEngineServer(engine, tools, profile);
  await server.connect(new StdioServerTransport());
  process.stderr.write(`${engine}-mcp: ${profile}, ${tools.length} tools; runtime acceptance required.\n`);
}
