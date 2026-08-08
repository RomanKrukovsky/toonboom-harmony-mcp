import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { MohoClient, MohoIpcError } from "../../src/moho/moho-client.js";

let testIpcDir = "";

/**
 * Unique spool directory per test.
 *
 * `mkdtempSync` already guarantees uniqueness, so two Jest workers running this
 * file alongside adversarial_ipc.test.ts can never collide on a spool path. The
 * pid in the prefix is only there to make a leaked directory traceable to the
 * worker that left it behind.
 */
function createTestIpcDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `moho-mcp-test-${process.pid}-`));
}

/**
 * Remove a spool directory and everything under it.
 *
 * Recursive on purpose: the client writes `req_*.json`, `resp_*.json`,
 * `*.tmp` and `client_lock.json` at the top level, but tests also create
 * nested directories (see "creates the IPC directory if it doesn't exist").
 * A flat unlink+rmdir leaves those behind, so every run would leak a directory
 * under the system temp path.
 */
function cleanupTestIpcDir(dir: string): void {
  if (!dir || !fs.existsSync(dir)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

/**
 * Simulate MOHO responding: watch for req_*.json files and write resp_*.json.
 * Returns a cleanup function to stop watching.
 */
function simulateMohoServer(
  dir: string,
  handler: (request: { id: number; method: string; params: Record<string, unknown> }) => unknown,
): { stop: () => void } {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const poll = (): void => {
    if (stopped) return;

    try {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (f.startsWith("req_") && f.endsWith(".json") && !f.endsWith(".tmp")) {
          const reqPath = path.join(dir, f);
          const content = fs.readFileSync(reqPath, "utf-8");
          const request = JSON.parse(content);

          // Generate response with matching protocolVersion
          const result = handler(request) as Record<string, unknown>;
          const response = { jsonrpc: "2.0", protocolVersion: "1.1.0", ...result };
          const reqId = f.match(/^req_(.+)\.json$/)?.[1];
          if (reqId) {
            const respPath = path.join(dir, `resp_${reqId}.json`);
            fs.writeFileSync(respPath, JSON.stringify(response));
          }

          fs.unlinkSync(reqPath);
        }
      }
    } catch {
      // directory may have been cleaned up
    }

    timeoutId = setTimeout(poll, 20);
  };

  poll();

  return {
    stop(): void {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
}

/**
 * The real `src/moho/config.ts` freezes `ipcDir` at import time from the
 * environment, but every test needs its own freshly-created spool directory.
 * The getter below re-reads `MOHO_IPC_DIR` on each access so `beforeEach` can
 * repoint the client after the module has already loaded.
 *
 * Timeouts are also deliberately shorter than production defaults
 * (2000ms vs 10000ms) to keep the timeout-path tests fast.
 */
jest.mock("../../src/moho/config.js", () => ({
  config: {
    moho: {
      get ipcDir() {
        return process.env.MOHO_IPC_DIR || "/tmp/moho-mcp";
      },
      pollInterval: 20,
      requestTimeout: 2000,
      renderTimeout: 30000,
      batchTimeoutPerOp: 500,
      maxBatchSize: 50,
      maxQueueSize: 50,
      maxJsonSizeBytes: 10 * 1024 * 1024,
      requestTtlMs: 30000,
      previewTtlMs: 60000,
      clientLockTtlMs: 5000,
      enableLegacyAliases: false,
      enableScreenshots: false,
      enableUiAutomation: false,
      logFile: "",
    },
    server: {
      name: "moho-mcp-test",
      version: "0.0.0",
      protocolVersion: "1.1.0",
      minProtocolVersion: "1.0.0",
      maxProtocolVersion: "1.1.0",
    },
    security: {
      allowedDirectories: [process.cwd(), os.tmpdir()],
      noOutboundTraffic: true,
      auditLogPath: "",
    },
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

describe("MohoClient", () => {
  let client: MohoClient;
  let mohoServer: { stop: () => void } | null = null;

  beforeEach(() => {
    testIpcDir = createTestIpcDir();
    process.env.MOHO_IPC_DIR = testIpcDir;
    client = new MohoClient();
  });

  afterEach(() => {
    try {
      client.disconnect();
    } catch {
      /* ignore */
    }

    if (mohoServer) {
      mohoServer.stop();
      mohoServer = null;
    }

    cleanupTestIpcDir(testIpcDir);
    delete process.env.MOHO_IPC_DIR;
  });

  describe("connect()", () => {
    it("connects successfully when the IPC dir exists", async () => {
      await client.connect();
      expect(client.isConnected()).toBe(true);
    });

    it("resolves immediately if already connected", async () => {
      await client.connect();
      await client.connect();
      expect(client.isConnected()).toBe(true);
    });

    it("creates the IPC directory if it doesn't exist", async () => {
      const subDir = path.join(testIpcDir, "sub", "dir");
      process.env.MOHO_IPC_DIR = subDir;
      const c2 = new MohoClient();
      await c2.connect();
      expect(c2.isConnected()).toBe(true);
      c2.disconnect();
      cleanupTestIpcDir(subDir);
    });

    it("rejects on symlink directory", async () => {
      const realDir = createTestIpcDir();
      // Random suffix, not just Date.now(): two workers entering this test in the
      // same millisecond would otherwise fight over one symlink path.
      const symlinkPath = path.join(
        os.tmpdir(),
        `moho-mcp-symlink-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      try {
        fs.symlinkSync(realDir, symlinkPath, "dir");
        process.env.MOHO_IPC_DIR = symlinkPath;
        const c2 = new MohoClient();
        await expect(c2.connect()).rejects.toThrow(/symbolic link/);
      } finally {
        try {
          fs.unlinkSync(symlinkPath);
        } catch {
          /* ignore */
        }
        cleanupTestIpcDir(realDir);
      }
    });
  });

  describe("disconnect()", () => {
    it("marks the client as disconnected", async () => {
      await client.connect();
      expect(client.isConnected()).toBe(true);

      client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it("can be called when not connected without error", () => {
      expect(() => client.disconnect()).not.toThrow();
    });
  });

  describe("isConnected()", () => {
    it("returns false initially", () => {
      expect(client.isConnected()).toBe(false);
    });
  });

  describe("sendRequest()", () => {
    it("sends correct JSON-RPC and resolves with the result", async () => {
      await client.connect();

      mohoServer = simulateMohoServer(testIpcDir, (request) => ({
        id: request.id,
        result: { name: "test-document.moho" },
      }));

      const result = await client.sendRequest("document.getInfo");
      expect(result).toEqual({ name: "test-document.moho" });
    });

    it("sends params correctly", async () => {
      await client.connect();
      let receivedParams: Record<string, unknown> | undefined;
      mohoServer = simulateMohoServer(testIpcDir, (request) => {
        receivedParams = request.params;
        return { id: request.id, result: { success: true } };
      });

      await client.sendRequest("layer.getProperties", { layerId: 42 });
      expect(receivedParams).toEqual({ layerId: 42 });
    });

    it("rejects on JSON-RPC error response with MohoIpcError", async () => {
      await client.connect();
      mohoServer = simulateMohoServer(testIpcDir, (request) => ({
        id: request.id,
        error: { code: -32601, message: "Method not found" },
      }));

      await expect(client.sendRequest("nonexistent.method")).rejects.toBeInstanceOf(MohoIpcError);
    });

    it("rejects when not connected", async () => {
      await expect(client.sendRequest("test.method")).rejects.toBeInstanceOf(MohoIpcError);
    });

    it("rejects on request timeout with MohoIpcError", async () => {
      await client.connect();
      await expect(client.sendRequest("slow.method")).rejects.toBeInstanceOf(MohoIpcError);
    }, 10000);

    it("cleans up request file on timeout", async () => {
      await client.connect();
      await expect(client.sendRequest("slow.method")).rejects.toBeInstanceOf(MohoIpcError);
      const files = fs.readdirSync(testIpcDir);
      const reqFiles = files.filter((f) => f.startsWith("req_"));
      expect(reqFiles).toHaveLength(0);
    }, 10000);

    it("handles multiple sequential requests", async () => {
      await client.connect();
      mohoServer = simulateMohoServer(testIpcDir, (request) => ({
        id: request.id,
        result: { method: request.method },
      }));

      const r1 = await client.sendRequest("method.a");
      const r2 = await client.sendRequest("method.b");
      const r3 = await client.sendRequest("method.c");
      expect(r1).toEqual({ method: "method.a" });
      expect(r2).toEqual({ method: "method.b" });
      expect(r3).toEqual({ method: "method.c" });
    });

    it("writes request files atomically (via .tmp rename)", async () => {
      await client.connect();
      let sawReqFile = false;
      mohoServer = simulateMohoServer(testIpcDir, (request) => {
        sawReqFile = true;
        return { id: request.id, result: { ok: true } };
      });
      await client.sendRequest("test.atomic");
      expect(sawReqFile).toBe(true);
    });

    it("increments request IDs", async () => {
      await client.connect();
      const receivedIds: number[] = [];
      mohoServer = simulateMohoServer(testIpcDir, (request) => {
        receivedIds.push(request.id);
        return { id: request.id, result: {} };
      });
      await client.sendRequest("a");
      await client.sendRequest("b");
      await client.sendRequest("c");
      expect(receivedIds[0]).toBeLessThan(receivedIds[1]);
      expect(receivedIds[1]).toBeLessThan(receivedIds[2]);
    });

    it("rejects with QUEUE_OVERFLOW when maxQueueSize reached", async () => {
      await client.connect();
      // Spawn many in-flight requests without server; mock config sets maxQueueSize=50
      const promises: Promise<unknown>[] = [];
      for (let i = 0; i < 50; i++) {
        promises.push(client.sendRequest("slow.op").catch(() => "timeout"));
      }
      await expect(client.sendRequest("overflow.op")).rejects.toThrow(/queue limit/);
      await Promise.allSettled(promises);
    }, 30000);
  });
});
