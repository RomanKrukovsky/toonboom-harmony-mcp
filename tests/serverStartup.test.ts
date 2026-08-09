/**
 * Live server startup gate.
 *
 * WHY A PROCESS-LEVEL TEST EXISTS AT ALL. Every other suite imports tool
 * modules directly, which is fast and safe but cannot see the things that
 * actually break a client:
 *
 *   - `src/index.ts` picks the tool set inside `run()`, after the constructor.
 *     A unit test importing tool arrays would pass even if the dispatcher
 *     handed the client an empty list.
 *   - stdout carries the JSON-RPC stream. One stray `console.log` anywhere in
 *     the import graph corrupts the protocol, and no module-level test notices.
 *   - a typo in ANIM_HOST must stop startup rather than silently serving 570
 *     Harmony tools to someone who asked for Moho.
 *
 * All three were verified by hand during the Moho integration. This file makes
 * them survive the next refactor: it spawns the BUILT server, speaks real
 * JSON-RPC over stdio, and asserts on what a client would actually receive.
 *
 * The suite skips itself (rather than failing) when dist/ is absent, so a
 * checkout without a build does not produce a misleading red. CI builds before
 * running tests, so the gate is live there.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const REPO_ROOT = process.cwd();
const SERVER_ENTRY = path.join(REPO_ROOT, 'dist', 'index.js');
const HAS_BUILD = fs.existsSync(SERVER_ENTRY);

interface ServerProbe {
  /** Tool names as the client would see them, or null when tools/list never answered. */
  toolNames: string[] | null;
  /** Resource URIs as the client would see them, or null when resources/list never answered. */
  resourceUris: string[] | null;
  /** stdout lines that were not valid JSON — any of these corrupts the protocol. */
  junkLines: string[];
  stderr: string;
  exitCode: number | null;
}

/**
 * Boot the built server with a given ANIM_HOST and complete a real handshake.
 *
 * Ordering matters and mirrors a real client: initialize, then the
 * `notifications/initialized` acknowledgement, then tools/list. Sending
 * tools/list too early is answered by the SDK before our tool set is attached.
 */
async function probeServer(host: string | undefined, timeoutMs = 20_000): Promise<ServerProbe> {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (host === undefined) delete env.ANIM_HOST;
  else env.ANIM_HOST = host;
  // Keep a stalled Moho from stretching the run: no live app is needed to list tools.
  env.MOHO_MCP_REQUEST_TIMEOUT_MS = '1500';

  const child = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: REPO_ROOT,
    env,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => {
    stdout += String(chunk);
  });
  child.stderr.on('data', chunk => {
    stderr += String(chunk);
  });

  const exited = new Promise<number | null>(resolve => {
    child.on('close', code => resolve(code));
  });

  const send = (payload: unknown): void => {
    if (child.stdin.writable) child.stdin.write(`${JSON.stringify(payload)}\n`);
  };

  const parseToolList = (): string[] | null => {
    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line);
        if (message.id === 2 && message.result?.tools) {
          return message.result.tools.map((t: { name: string }) => t.name);
        }
      } catch {
        // Non-JSON line: collected separately as protocol junk.
      }
    }
    return null;
  };

  const parseResourceList = (): string[] | null => {
    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line);
        if (message.id === 3 && message.result?.resources) {
          return message.result.resources.map((r: { uri: string }) => r.uri);
        }
      } catch {
        // Non-JSON line: collected separately as protocol junk.
      }
    }
    return null;
  };

  send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'startup-gate', version: '1' }
    }
  });

  const deadline = Date.now() + timeoutMs;
  let acknowledged = false;
  let toolNames: string[] | null = null;
  let resourceUris: string[] | null = null;
  let exitCode: number | null = null;
  let settled = false;

  void exited.then(code => {
    exitCode = code;
    settled = true;
  });

  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 150));
    // A bad ANIM_HOST is expected to kill the process before any handshake.
    if (settled) break;
    if (!acknowledged && stdout.includes('"id":1')) {
      acknowledged = true;
      send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });
      send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
      send({ jsonrpc: '2.0', id: 3, method: 'resources/list', params: {} });
    }
    toolNames = parseToolList();
    resourceUris = parseResourceList();
    if (toolNames && resourceUris) break;
  }

  if (!settled) {
    child.kill('SIGKILL');
    await exited;
  }

  const junkLines = stdout
    .split('\n')
    .filter(line => line.trim().length > 0)
    .filter(line => {
      try {
        JSON.parse(line);
        return false;
      } catch {
        return true;
      }
    });

  return { toolNames, resourceUris, junkLines, stderr, exitCode };
}

const describeIfBuilt = HAS_BUILD ? describe : describe.skip;

describeIfBuilt('live server startup', () => {
  // Spawning Node and booting 62 tool modules is slower than the default budget.
  jest.setTimeout(120_000);

  it('ANIM_HOST=harmony отдаёт только harmony-тулы', async () => {
    const probe = await probeServer('harmony');

    expect(probe.toolNames).not.toBeNull();
    const names = probe.toolNames!;
    // A non-trivial count guards against a refactor that empties the registry:
    // an empty list would satisfy every "no moho.* present" assertion below.
    expect(names.length).toBeGreaterThan(400);
    expect(names.filter(n => n.startsWith('moho.'))).toEqual([]);
    expect(names.every(n => n.startsWith('harmony.'))).toBe(true);
  });

  it('ANIM_HOST=moho отдаёт только moho-тулы', async () => {
    const probe = await probeServer('moho');

    expect(probe.toolNames).not.toBeNull();
    const names = probe.toolNames!;
    expect(names.filter(n => n.startsWith('harmony.'))).toEqual([]);
    expect(names.every(n => n.startsWith('moho.'))).toBe(true);
    // The Moho surface is a fixed, hand-maintained map; drift is a real signal.
    expect(names.length).toBe(59);
  });

  it('наборы не пересекаются', async () => {
    const [harmony, moho] = await Promise.all([probeServer('harmony'), probeServer('moho')]);

    const harmonyNames = new Set(harmony.toolNames ?? []);
    const mohoNames = moho.toolNames ?? [];
    expect(harmonyNames.size).toBeGreaterThan(0);
    expect(mohoNames.length).toBeGreaterThan(0);

    // A shared name would make dispatch ambiguous: the registry resolves by
    // find(), so the second tool of a colliding pair is unreachable.
    expect(mohoNames.filter(n => harmonyNames.has(n))).toEqual([]);
  });

  it('без ANIM_HOST берётся harmony', async () => {
    const probe = await probeServer(undefined);

    expect(probe.toolNames).not.toBeNull();
    expect(probe.toolNames!.every(n => n.startsWith('harmony.'))).toBe(true);
  });

  it('stdout не содержит ничего кроме JSON-RPC', async () => {
    // stdout IS the protocol channel. A stray console.log in any imported
    // module corrupts every response, and the failure surfaces at the client
    // as unparseable output rather than as an error here.
    for (const host of ['harmony', 'moho']) {
      const probe = await probeServer(host);
      expect(probe.junkLines).toEqual([]);
    }
  });

  it('ANIM_HOST=moho отдаёт только ресурсы moho://', async () => {
    const probe = await probeServer('moho');

    // Ресурсы легко забыть подключить: их отсутствие не ломает ни один вызов
    // тула, поэтому клиент просто не увидит moho://project/state и никто не
    // заметит. Именно так и случилось при интеграции — экспорт существовал,
    // а диспетчер оставался прибит к набору Harmony.
    expect(probe.resourceUris).not.toBeNull();
    const uris = probe.resourceUris!;
    expect(uris.length).toBeGreaterThan(0);
    expect(uris.every(u => u.startsWith('moho://'))).toBe(true);
    expect(uris.filter(u => u.startsWith('harmony://'))).toEqual([]);
  });

  it('ANIM_HOST=harmony отдаёт только ресурсы harmony://', async () => {
    const probe = await probeServer('harmony');

    expect(probe.resourceUris).not.toBeNull();
    const uris = probe.resourceUris!;
    expect(uris.length).toBeGreaterThan(0);
    expect(uris.every(u => u.startsWith('harmony://'))).toBe(true);
    expect(uris.filter(u => u.startsWith('moho://'))).toEqual([]);
  });

  it('опечатка в ANIM_HOST останавливает запуск', async () => {
    const probe = await probeServer('mohoo');

    // Loud failure is the point: a silent fallback to harmony would serve 570
    // unrelated tools to someone who asked for Moho, with no explanation.
    expect(probe.exitCode).not.toBe(0);
    expect(probe.toolNames).toBeNull();
    expect(probe.stderr).toMatch(/ANIM_HOST/);
    expect(probe.stderr).toMatch(/mohoo/);
  });

  it('сообщение о старте уходит в stderr и называет хост', async () => {
    const probe = await probeServer('moho');

    expect(probe.stderr).toMatch(/хост moho/);
    expect(probe.stderr).toMatch(/тулов 59/);
  });
});
