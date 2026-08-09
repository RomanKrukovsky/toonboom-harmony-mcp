/**
 * Client lock lifecycle gate.
 *
 * `client_lock.json` grants a single consumer the right to read responses out
 * of the shared spool directory. A lock that outlives its process is not a
 * cosmetic leftover: the next run reads it, sees a PID it cannot verify, and
 * refuses to start with "held by another live process" — naming a process that
 * no longer exists. Only the TTL steal path eventually unblocks it, so the
 * observable symptom is a server that waits instead of working.
 *
 * The defect was real and observed: `disconnect()` existed but nothing called
 * it, and no exit handler was installed, so every run left a stale lock behind.
 * `releaseClientLockSync()` plus process-exit handlers in mohoTools.ts fix it.
 *
 * These tests exercise the lock file directly rather than spawning a server:
 * spawning would make them slow and dependent on timing, while the invariant
 * under test is entirely about what the lock file looks like after release.
 */

import fs from "fs";
import os from "os";
import path from "path";

/** Per-test spool directory. mkdtempSync is unique per call, so parallel workers cannot collide. */
function makeIpcDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `moho-lock-${process.pid}-`));
}

// The client reads its spool path from config at construction time, so the mock
// re-reads the env var on every access: each test points it at a fresh directory.
jest.mock("../../src/moho/config.js", () => ({
  config: {
    moho: {
      get ipcDir() {
        return process.env.MOHO_IPC_DIR || "/tmp/moho-mcp";
      },
      pollInterval: 10,
      requestTimeout: 500,
      renderTimeout: 500,
      batchTimeoutPerOp: 50,
      maxBatchSize: 10,
      maxQueueSize: 10,
      maxJsonSizeBytes: 1024 * 1024,
      requestTtlMs: 5_000,
      previewTtlMs: 5_000,
      clientLockTtlMs: 5_000,
      enableLegacyAliases: false,
      enableScreenshots: false,
      enableUiAutomation: false,
      logFile: "",
    },
    server: {
      name: "moho-mcp",
      version: "0.2.0",
      protocolVersion: "1.1.0",
      minProtocolVersion: "1.0.0",
      maxProtocolVersion: "1.1.0",
    },
    security: { allowedDirectories: [], noOutboundTraffic: true, auditLogPath: "" },
    uiAutomation: {
      enabled: false,
      rateLimitPerSec: 10,
      emergencyStopKey: "Ctrl+Alt+Shift+X",
      enforceForeground: true,
      boundedByMohoWindow: true,
      auditLog: "",
    },
  },
}));

import { MohoClient } from "../../src/moho/moho-client.js";

describe("client lock lifecycle", () => {
  let ipcDir: string;
  let lockPath: string;
  const originalIpcDir = process.env.MOHO_IPC_DIR;

  beforeEach(() => {
    ipcDir = makeIpcDir();
    lockPath = path.join(ipcDir, "client_lock.json");
    process.env.MOHO_IPC_DIR = ipcDir;
  });

  afterEach(() => {
    if (originalIpcDir === undefined) delete process.env.MOHO_IPC_DIR;
    else process.env.MOHO_IPC_DIR = originalIpcDir;
    // Recursive: connect() creates a dead_letter/ subdirectory, and rmdir cannot
    // remove a non-empty directory.
    fs.rmSync(ipcDir, { recursive: true, force: true });
  });

  it("создаёт блокировку при подключении", async () => {
    const client = new MohoClient();
    await client.connect();
    expect(fs.existsSync(lockPath)).toBe(true);

    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    expect(lock.pid).toBe(process.pid);
    expect(typeof lock.timestamp).toBe("number");

    client.releaseClientLockSync();
  });

  it("releaseClientLockSync удаляет файл блокировки", async () => {
    const client = new MohoClient();
    await client.connect();
    expect(fs.existsSync(lockPath)).toBe(true);

    client.releaseClientLockSync();

    // Синхронно: в обработчике 'exit' событийный цикл уже закрывается, поэтому
    // асинхронное удаление там не успевает выполниться вовсе.
    expect(fs.existsSync(lockPath)).toBe(false);
    expect(client.isConnected()).toBe(false);
  });

  it("releaseClientLockSync безопасен при повторном вызове", async () => {
    const client = new MohoClient();
    await client.connect();

    client.releaseClientLockSync();
    // Второй вызов приходит, когда файла уже нет: обработчики 'exit' и SIGTERM
    // могут сработать оба, и второй не должен бросать.
    expect(() => client.releaseClientLockSync()).not.toThrow();
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it("releaseClientLockSync без подключения ничего не делает", () => {
    const client = new MohoClient();
    expect(() => client.releaseClientLockSync()).not.toThrow();
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it("после снятия блокировки новый клиент подключается сразу", async () => {
    const first = new MohoClient();
    await first.connect();
    first.releaseClientLockSync();

    // Это и есть цена дефекта: без снятия следующий запуск падал бы с
    // RESOURCE_LOCKED до истечения TTL, ссылаясь на несуществующий процесс.
    const second = new MohoClient();
    await expect(second.connect()).resolves.toBeUndefined();
    expect(fs.existsSync(lockPath)).toBe(true);

    second.releaseClientLockSync();
  });

  it("оставленная блокировка мешает подключению, пока жив её срок", async () => {
    // Ровно тот отказ, который наблюдался: файл с чужим живым PID.
    fs.writeFileSync(lockPath, JSON.stringify({ pid: 999_999, timestamp: Date.now() }), {
      mode: 0o600,
    });

    const client = new MohoClient();
    await expect(client.connect()).rejects.toThrow(/lock/i);
  });

  it("устаревшая блокировка отбирается по истечении срока", async () => {
    // Возраст заведомо больше clientLockTtlMs (5000 в моке конфига выше).
    fs.writeFileSync(
      lockPath,
      JSON.stringify({ pid: 999_999, timestamp: Date.now() - 60_000 }),
      { mode: 0o600 },
    );

    const client = new MohoClient();
    await expect(client.connect()).resolves.toBeUndefined();

    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    expect(lock.pid).toBe(process.pid);

    client.releaseClientLockSync();
  });
});
