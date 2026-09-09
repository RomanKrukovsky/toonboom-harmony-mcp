import { spawn } from 'child_process';
import path from 'path';

interface JsonRpcResponse {
  id: number;
  result?: unknown;
  error?: unknown;
}

interface ToolsListResult {
  tools: Array<{ name: string; description: string }>;
}

describe('Adobe Animate MCP server integration', () => {
  it('initializes and lists animate tools from combined server', async () => {
    const child = spawn(
      process.execPath,
      [path.join(process.cwd(), 'dist/index.js')],
      {
        env: {
          ...process.env,
          ANIMATE_BRIDGE_MODE: 'mock'
        },
        stdio: ['pipe', 'pipe', 'ignore']
      }
    );
    const pending = new Map<number, (response: JsonRpcResponse) => void>();
    let buffer = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      buffer += chunk;
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        try {
          const response = JSON.parse(line) as JsonRpcResponse;
          pending.get(response.id)?.(response);
          pending.delete(response.id);
        } catch {
          // Ignore non-json lines
        }
        newlineIndex = buffer.indexOf('\n');
      }
    });

    const request = (id: number, method: string, params: object = {}): Promise<JsonRpcResponse> => {
      const response = new Promise<JsonRpcResponse>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error(`MCP server did not answer ${method}.`)),
          15_000
        );
        pending.set(id, value => {
          clearTimeout(timeout);
          resolve(value);
        });
      });
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
      return response;
    };

    try {
      const initialized = await request(1, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'animate-mcp-combined-test', version: '1.0.0' }
      });
      expect(initialized.error).toBeUndefined();

      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
      const listed = await request(2, 'tools/list');
      expect(listed.error).toBeUndefined();
      const result = listed.result as ToolsListResult;

      const toolNames = result.tools.map(t => t.name);
      expect(toolNames).toContain('animate_system_status');
      expect(toolNames).toContain('animate_get_capabilities');
      expect(toolNames).toContain('animate_create_document');
      expect(toolNames).toContain('animate_export_video');

      // Test calling a tool
      const callRes = await request(3, 'tools/call', {
        name: 'animate_system_status',
        arguments: {}
      });
      expect(callRes.error).toBeUndefined();
      const content = (callRes.result as any).content;
      expect(content).toBeDefined();
      expect(content[0].type).toBe('text');
      const parsedStatus = JSON.parse(content[0].text);
      expect(parsedStatus.bridgeMode).toBe('mock');
    } finally {
      child.kill();
    }
  }, 30_000);

  it('initializes and executes animate tools via start-engine animate launcher', async () => {
    const child = spawn(
      process.execPath,
      [path.join(process.cwd(), 'scripts/start-engine.mjs'), 'animate'],
      {
        env: {
          ...process.env,
          ANIMATE_BRIDGE_MODE: 'mock',
          MCP_TOOL_PROFILE: 'production'
        },
        stdio: ['pipe', 'pipe', 'ignore']
      }
    );
    const pending = new Map<number, (response: JsonRpcResponse) => void>();
    let buffer = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      buffer += chunk;
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        try {
          const response = JSON.parse(line) as JsonRpcResponse;
          pending.get(response.id)?.(response);
          pending.delete(response.id);
        } catch {
          // Ignore non-json lines
        }
        newlineIndex = buffer.indexOf('\n');
      }
    });

    const request = (id: number, method: string, params: object = {}): Promise<JsonRpcResponse> => {
      const response = new Promise<JsonRpcResponse>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error(`MCP dedicated animate server did not answer ${method}.`)),
          15_000
        );
        pending.set(id, value => {
          clearTimeout(timeout);
          resolve(value);
        });
      });
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
      return response;
    };

    try {
      const initialized = await request(1, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'animate-engine-test', version: '1.0.0' }
      });
      expect(initialized.error).toBeUndefined();

      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
      const listed = await request(2, 'tools/list');
      expect(listed.error).toBeUndefined();
      const result = listed.result as ToolsListResult;

      // In production profile, tools count <= 25
      expect(result.tools.length).toBeLessThanOrEqual(25);
      expect(result.tools.map(t => t.name)).toContain('animate.system.status');
      expect(result.tools.map(t => t.name)).toContain('animate_create_document');

      // Test call
      const callRes = await request(3, 'tools/call', {
        name: 'animate.system.status',
        arguments: {}
      });
      expect(callRes.error).toBeUndefined();
      const content = (callRes.result as any).content;
      const parsed = JSON.parse(content[0].text);
      expect(parsed.engine).toBe('animate');
    } finally {
      child.kill();
    }
  }, 30_000);
});
