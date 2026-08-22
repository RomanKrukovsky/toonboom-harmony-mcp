/**
 * Helpers for invoking MCP tools from tests.
 *
 * Tool arrays are heterogeneous: after the defineTool() migration each entry
 * carries its own `args` type inferred from its own Zod schema. That is exactly
 * what we want in production code, but it means `someTools.find(...)` widens to
 * an intersection of every schema in the array, so calling `.handler({...})`
 * with one tool's payload no longer typechecks.
 *
 * Tests legitimately dispatch dynamically by name, so they use these helpers to
 * get a loosely-typed handle. Real argument validation still happens at runtime
 * via the dispatcher's `inputSchema.safeParse`, and production call sites keep
 * their full inference.
 */

/** A tool viewed dynamically: name plus a handler accepting an arbitrary payload. */
export interface DynamicTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any> | any;
}

/** Find a tool by exact name, or `undefined` when it is not registered. */
export function findTool(tools: readonly unknown[], name: string): DynamicTool | undefined {
  return (tools as readonly DynamicTool[]).find(tool => tool.name === name);
}

/**
 * Find a tool by exact name and fail loudly when it is missing.
 *
 * Preferred in tests: a renamed or dropped tool then surfaces as a clear error
 * instead of a confusing `undefined is not a function`.
 */
export function requireTool(tools: readonly unknown[], name: string): DynamicTool {
  const tool = findTool(tools, name);
  if (!tool) {
    const available = (tools as readonly DynamicTool[]).map(t => t.name).join(', ');
    throw new Error(`tool "${name}" is not registered. Available: ${available}`);
  }
  return tool;
}

/** Convenience: look the tool up and immediately invoke its handler. */
export async function callTool(
  tools: readonly unknown[],
  name: string,
  args: Record<string, unknown> = {}
): Promise<any> {
  return requireTool(tools, name).handler(args);
}
