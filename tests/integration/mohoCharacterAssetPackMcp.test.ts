import { spawn } from 'child_process';
import path from 'path';

interface JsonRpcResponse {
  id: number;
  result?: unknown;
  error?: unknown;
}

interface ToolsListResult {
  tools: Array<{ name: string }>;
}

describe('Moho character asset pack MCP registration', () => {
  it('lists the character pack validator from the running MCP server', async () => {
    const child = spawn(
      process.execPath,
      [
        '--loader',
        'ts-node/esm',
        path.join(process.cwd(), 'src/index.ts')
      ],
      { stdio: ['pipe', 'pipe', 'ignore'] }
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
        const response = JSON.parse(line) as JsonRpcResponse;
        pending.get(response.id)?.(response);
        pending.delete(response.id);
        newlineIndex = buffer.indexOf('\n');
      }
    });

    const request = (id: number, method: string, params: object = {}): Promise<JsonRpcResponse> => {
      const response = new Promise<JsonRpcResponse>(resolve => pending.set(id, resolve));
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
      return response;
    };

    try {
      const initialized = await request(1, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'moho-character-pack-registration-test', version: '1.0.0' }
      });
      expect(initialized.error).toBeUndefined();

      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
      const listed = await request(2, 'tools/list');
      expect(listed.error).toBeUndefined();
      const result = listed.result as ToolsListResult;

      expect(result.tools.map(tool => tool.name)).toContain('moho.character_pack.validate');
    } finally {
      child.kill();
    }
  }, 30_000);
});
