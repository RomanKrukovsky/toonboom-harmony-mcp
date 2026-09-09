import type { z } from 'zod';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  handler: (args: any) => Promise<unknown>;
}

export function validateToolRegistry(tools: readonly McpTool[], maximum?: number): void {
  const names = new Set<string>();
  for (const tool of tools) {
    if (names.has(tool.name)) throw new Error(`Duplicate MCP tool: ${tool.name}`);
    names.add(tool.name);
  }
  if (maximum !== undefined && tools.length > maximum) {
    throw new Error(`Production profile exceeds ${maximum} tools (${tools.length}).`);
  }
}

export function selectTools(tools: readonly McpTool[], names: readonly string[]): McpTool[] {
  return names.map(name => {
    const matches = tools.filter(tool => tool.name === name);
    if (matches.length !== 1) throw new Error(`Expected one implementation of ${name}; found ${matches.length}.`);
    return matches[0];
  });
}
