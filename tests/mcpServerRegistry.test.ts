import { z } from 'zod';
import { selectTools, validateToolRegistry, type McpTool } from '../src/servers/toolRegistry.js';

function tool(name: string): McpTool {
  return { name, description: name, inputSchema: z.object({}), handler: async () => ({ status: 'planned' }) };
}

describe('engine MCP registries', () => {
  it('refuses ambiguous dispatch rather than silently choosing the first handler', () => {
    expect(() => validateToolRegistry([tool('same'), tool('same')])).toThrow('Duplicate MCP tool');
  });

  it('enforces the production surface limit', () => {
    expect(() => validateToolRegistry(Array.from({ length: 26 }, (_, i) => tool(`t${i}`)), 25)).toThrow('exceeds');
    expect(() => validateToolRegistry(Array.from({ length: 25 }, (_, i) => tool(`t${i}`)), 25)).not.toThrow();
  });

  it('fails a profile when a required handler is missing or ambiguous', () => {
    expect(() => selectTools([tool('a')], ['missing'])).toThrow('Expected one');
    expect(() => selectTools([tool('a'), tool('a')], ['a'])).toThrow('found 2');
    expect(selectTools([tool('a'), tool('b')], ['b']).map(item => item.name)).toEqual(['b']);
  });
});
