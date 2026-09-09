import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'dual-mcp-check-'));
try {
  for (const engine of ['moho', 'harmony']) {
    const prefix = engine.toUpperCase();
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.join(root, 'scripts/start-engine.mjs'), engine],
      cwd: scratch,
      env: {
        PATH: process.env.PATH || '',
        [`${prefix}_MCP_DATA_ROOT`]: path.join(scratch, engine),
        [`${prefix}_MCP_ENV_FILE`]: path.join(scratch, 'absent.env'),
        // Intentionally invalid other-engine config must not affect this server.
        ...(engine === 'moho' ? { HARMONY_INSTALL: '/missing/harmony', HARMONY_FACTORY_TOKENS: 'invalid' }
          : { MOHO_EXECUTABLE: '/missing/moho', MOHO_FACTORY_TOKENS: 'invalid' })
      },
      stderr: 'pipe'
    });
    const client = new Client({ name: 'dual-mcp-install-check', version: '1.0.0' }, { capabilities: {} });
    try {
      await client.connect(transport);
      const result = await client.listTools();
      assert(result.tools.length > 0 && result.tools.length <= 25);
      assert.equal(new Set(result.tools.map(tool => tool.name)).size, result.tools.length);
      assert(result.tools.every(tool => tool.name.startsWith(`${engine}.`)));
      const call = await client.callTool({ name: `${engine}.system.status`, arguments: {} });
      assert(!call.isError);
      const status = JSON.parse(call.content[0].text);
      assert.equal(status.engine, engine);
      assert.equal(status.productionCertified, false);
      assert.equal(status.factoryRoot, path.join(scratch, engine, 'factory'));
      assert.equal(status.outputRoot, path.join(scratch, engine, 'results'));
      const foreign = await client.callTool({ name: `${engine === 'moho' ? 'harmony' : 'moho'}.system.status`, arguments: {} });
      assert.equal(foreign.isError, true);
      process.stdout.write(`${engine}: ${result.tools.length} tools, isolated paths, foreign dispatch rejected, protocol PASS\n`);
    } finally {
      await client.close();
      await transport.close();
    }
  }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
