/**
 * Simulated Moho Pro 14 end-to-end verification protocol.
 *
 * Drives the real `MohoClient` against a fake Moho: a poll loop that consumes
 * `req_*.json` files out of the IPC spool and writes matching `resp_*.json`
 * replies. Everything below the fake plugin is production code — atomic writes,
 * the client lock, response parsing, timeout handling — so this exercises the
 * genuine file-IPC path without needing Moho installed.
 *
 * WHAT IT DOES NOT PROVE. The plugin is simulated, so a real Moho answering
 * these methods is still unverified. The value here is the bridge half of the
 * exchange and the Lua method names on the wire.
 *
 * Converted from vitest to jest (`vi.mock` -> `jest.mock`, paths rooted at
 * `../../src/moho/...`). Two changes beyond the mechanical conversion:
 *
 *   1. The IPC directory is a per-test `mkdtemp` directory instead of the real
 *      `config.moho.ipcDir`. The original wrote request and response files into
 *      the developer's own `~/Library/Application Support/MohoMCP/ipc`, so a
 *      test run collided with a live bridge session and left files behind. The
 *      config mock follows the pattern already used by moho-client.test.ts.
 *   2. Stopping the simulated daemon is awaited. The original left its poll loop
 *      running after the test returned, which kept touching the spool directory
 *      during teardown.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { MohoClient } from "../../src/moho/moho-client.js";
import { config } from "../../src/moho/config.js";

/**
 * Point the bridge at a temp spool directory. `ipcDir` is a getter so each test
 * can repoint it via `MOHO_IPC_DIR` after this module has loaded; the real config
 * freezes the value at import time.
 */
jest.mock("../../src/moho/config.js", () => ({
  config: {
    moho: {
      get ipcDir() {
        return process.env.MOHO_IPC_DIR || path.join(os.tmpdir(), "moho-mcp-e2e");
      },
      pollInterval: 20,
      requestTimeout: 5000,
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
      logFile: ""
    },
    server: {
      name: "moho-mcp-test",
      version: "0.0.0",
      protocolVersion: "1.1.0",
      minProtocolVersion: "1.0.0",
      maxProtocolVersion: "1.1.x"
    },
    security: {
      allowedDirectories: [process.cwd(), os.tmpdir()],
      noOutboundTraffic: true,
      auditLogPath: ""
    },
    uiAutomation: {
      enabled: false,
      rateLimitPerSec: 10,
      emergencyStopKey: "Ctrl+Alt+Shift+X",
      enforceForeground: true,
      boundedByMohoWindow: true,
      auditLog: ""
    }
  }
}));

interface SimulatedRequest {
  id: number;
  method: string;
  params: Record<string, any>;
  correlationId?: string;
  protocolVersion?: string;
}

interface OpLogEntry {
  timestamp: string;
  correlationId: string;
  op: string;
  durationMs: number;
  req: unknown;
  res: unknown;
}

describe("Real Moho Pro 14 E2E Verification Protocol", () => {
  let testIpcDir: string;
  let client: MohoClient;
  let simulatedLogs: OpLogEntry[] = [];

  beforeEach(() => {
    testIpcDir = fs.mkdtempSync(path.join(os.tmpdir(), "moho-mcp-e2e-"));
    process.env.MOHO_IPC_DIR = testIpcDir;
    expect(config.moho.ipcDir).toBe(testIpcDir);
    fs.mkdirSync(testIpcDir, { recursive: true });
    client = new MohoClient();
    simulatedLogs = [];
  });

  afterEach(() => {
    client.disconnect();
    try {
      const lockFile = path.join(testIpcDir, "client_lock.json");
      if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
    } catch {
      /* ignore */
    }
    try {
      for (const f of fs.readdirSync(testIpcDir)) {
        fs.unlinkSync(path.join(testIpcDir, f));
      }
      fs.rmdirSync(testIpcDir);
    } catch {
      /* ignore */
    }
    delete process.env.MOHO_IPC_DIR;
  });

  /**
   * Fake Moho plugin. Records every request it served so the test can assert on
   * what actually crossed the IPC boundary, and returns a `stop()` that is
   * awaited so the loop cannot outlive the test.
   */
  function startMohoDaemonSimulator(): {
    stop: () => Promise<void>;
    served: SimulatedRequest[];
  } {
    const active = { running: true };
    const served: SimulatedRequest[] = [];

    const pollLoop = async (): Promise<void> => {
      while (active.running) {
        if (fs.existsSync(testIpcDir)) {
          let files: string[] = [];
          try {
            files = fs.readdirSync(testIpcDir);
          } catch {
            files = [];
          }
          for (const file of files) {
            if (file.startsWith("req_") && file.endsWith(".json")) {
              const idStr = file.replace("req_", "").replace(".json", "");
              const reqPath = path.join(testIpcDir, file);
              const respPath = path.join(testIpcDir, `resp_${idStr}.json`);
              try {
                const reqContent = fs.readFileSync(reqPath, "utf-8");
                const parsedReq = JSON.parse(reqContent) as SimulatedRequest;
                fs.unlinkSync(reqPath);
                served.push(parsedReq);

                let resultPayload: unknown = { ok: true };
                if (parsedReq.method === "document.getInfo") {
                  resultPayload = {
                    name: "Enterprise_Character_Test.moho",
                    filePath: "/projects/Character_Test.moho",
                    width: 1920,
                    height: 1080,
                    fps: 24,
                    startFrame: 0,
                    endFrame: 240,
                    currentFrame: 1
                  };
                } else if (parsedReq.method === "document.getLayers") {
                  resultPayload = {
                    layers: [
                      { id: 1, name: "Character Group", type: "group", visible: true, locked: false, parentId: null },
                      { id: 2, name: "Skeleton", type: "bone", visible: true, locked: false, parentId: 1 },
                      { id: 3, name: "Head Vector", type: "vector", visible: true, locked: false, parentId: 2 }
                    ]
                  };
                } else if (parsedReq.method === "document.setFrame") {
                  resultPayload = { currentFrame: parsedReq.params.frame };
                } else if (parsedReq.method === "layer.setName") {
                  resultPayload = { layerId: parsedReq.params.layerId, name: parsedReq.params.name, success: true };
                } else if (parsedReq.method === "layer.setTransform") {
                  resultPayload = { layerId: parsedReq.params.layerId, transformApplied: true };
                } else if (parsedReq.method === "animation.setKeyframe") {
                  resultPayload = { keyframeCreated: true, frame: parsedReq.params.frame };
                } else if (parsedReq.method === "animation.deleteKeyframe") {
                  resultPayload = { keyframeDeleted: true, frame: parsedReq.params.frame };
                } else if (parsedReq.method === "batch.execute") {
                  resultPayload = parsedReq.params.operations.map((op: any, i: number) => ({
                    opIndex: i,
                    method: op.method,
                    success: true
                  }));
                }

                const response = {
                  jsonrpc: "2.0",
                  protocolVersion: "1.1.0",
                  id: parsedReq.id,
                  correlationId: parsedReq.correlationId,
                  result: resultPayload
                };

                fs.writeFileSync(respPath, JSON.stringify(response));
              } catch {
                /* request vanished or was half-written; the client will retry */
              }
            }
          }
        }
        await new Promise(r => setTimeout(r, 10));
      }
    };

    const finished = pollLoop();
    return {
      async stop(): Promise<void> {
        active.running = false;
        await finished;
      },
      served
    };
  }

  it("completes full 12-step Moho Pro 14 End-to-End scenario with correlation tracking", async () => {
    const daemon = startMohoDaemonSimulator();
    try {
      await client.connect();

      const runLoggedOp = async (
        name: string,
        method: string,
        params: Record<string, unknown> = {}
      ): Promise<unknown> => {
        const start = Date.now();
        const corrId = `corr_${name}_${start}`;
        const res = await client.sendRequest(method, params, { correlationId: corrId });
        const duration = Date.now() - start;
        simulatedLogs.push({
          timestamp: new Date(start).toISOString(),
          correlationId: corrId,
          op: name,
          durationMs: duration,
          req: { method, params },
          res
        });
        return res;
      };

      // Step 1: Connect and query server info
      expect(client.isConnected()).toBe(true);

      // Step 2: Query document info
      const docInfo = (await runLoggedOp("get_doc_info", "document.getInfo")) as any;
      expect(docInfo.name).toBe("Enterprise_Character_Test.moho");

      // Step 3: Query layer tree
      const layers = (await runLoggedOp("get_layer_tree", "document.getLayers")) as any;
      expect(layers.layers).toHaveLength(3);

      // Step 4: Switch timeline frame
      const frameRes = (await runLoggedOp("change_frame", "document.setFrame", { frame: 24 })) as any;
      expect(frameRes.currentFrame).toBe(24);

      // Step 5: Rename layer
      const renameRes = (await runLoggedOp("rename_layer", "layer.setName", {
        layerId: 3,
        name: "Head_Rigged"
      })) as any;
      expect(renameRes.name).toBe("Head_Rigged");

      // Step 6: Set transform
      const transformRes = (await runLoggedOp("set_transform", "layer.setTransform", {
        layerId: 3,
        rotation: 45
      })) as any;
      expect(transformRes.transformApplied).toBe(true);

      // Step 7: Create keyframe
      const keyCreate = (await runLoggedOp("create_keyframe", "animation.setKeyframe", {
        layerId: 3,
        channel: "rotation",
        frame: 24,
        value: 45
      })) as any;
      expect(keyCreate.keyframeCreated).toBe(true);

      // Step 8: Delete keyframe
      const keyDelete = (await runLoggedOp("delete_keyframe", "animation.deleteKeyframe", {
        layerId: 3,
        channel: "rotation",
        frame: 24
      })) as any;
      expect(keyDelete.keyframeDeleted).toBe(true);

      // Step 9: Batch operation
      const batchRes = (await runLoggedOp("batch_ops", "batch.execute", {
        operations: [
          { method: "document.setFrame", params: { frame: 1 } },
          { method: "layer.setTransform", params: { layerId: 3, rotation: 0 } }
        ]
      })) as any;
      expect(batchRes).toHaveLength(2);

      expect(simulatedLogs).toHaveLength(8);

      /* -------------------------------------------------------------------- */
      /* Correlation tracking — the part the test title promises              */
      /* -------------------------------------------------------------------- */

      // The original test built a correlationId and stored it in its own log, but
      // never checked that it left the process. That made the "with correlation
      // tracking" in the name unearned: the id could have been dropped before the
      // request file was written and every assertion above would still pass.
      // Correlation ids are how a failure in production is traced back to the
      // exchange that caused it, so they are verified on the wire here.
      expect(daemon.served).toHaveLength(8);

      const sentCorrelationIds = daemon.served.map(r => r.correlationId);
      expect(sentCorrelationIds).toEqual(simulatedLogs.map(l => l.correlationId));
      for (const id of sentCorrelationIds) {
        expect(id).toMatch(/^corr_[a-z_]+_\d+$/);
      }

      // Ids are per-request, not reused across the session.
      expect(new Set(sentCorrelationIds).size).toBe(8);

      // Every request carries the negotiated protocol version; the plugin refuses
      // requests it cannot version-check.
      for (const request of daemon.served) {
        expect(request.protocolVersion).toBe("1.1.0");
      }

      // Request ids are unique and monotonic, so a response can never be matched
      // to the wrong request.
      const ids = daemon.served.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect([...ids].sort((a, b) => a - b)).toEqual(ids);

      /* -------------------------------------------------------------------- */
      /* Lua method names on the wire                                          */
      /* -------------------------------------------------------------------- */

      // The plugin dispatches on these exact strings. They are the Lua-side
      // names and must stay camelCase after the MCP tools were renamed to
      // moho.<domain>.<action> — see toolNames.ts.
      expect(daemon.served.map(r => r.method)).toEqual([
        "document.getInfo",
        "document.getLayers",
        "document.setFrame",
        "layer.setName",
        "layer.setTransform",
        "animation.setKeyframe",
        "animation.deleteKeyframe",
        "batch.execute"
      ]);

      // Parameters arrive unmodified: the bridge is a transport, not a rewriter.
      const setFrameRequest = daemon.served.find(r => r.method === "document.setFrame");
      expect(setFrameRequest?.params).toEqual({ frame: 24 });

      /* -------------------------------------------------------------------- */
      /* Spool hygiene                                                        */
      /* -------------------------------------------------------------------- */

      // Both files of every exchange are consumed. A leftover req_/resp_ pair
      // would be replayed or time out on the next connect.
      const leftovers = fs
        .readdirSync(testIpcDir)
        .filter(f => f.startsWith("req_") || f.startsWith("resp_") || f.endsWith(".tmp"));
      expect(leftovers).toEqual([]);
    } finally {
      await daemon.stop();
    }
  });

  it("reports a timeout rather than hanging when no plugin is polling", async () => {
    // No simulator is started, so nothing ever answers. The bridge must fail with
    // a diagnosable timeout; a hang here is what the 30s jest budget hides.
    await client.connect();

    await expect(
      client.sendRequest("document.getInfo", {}, { timeout: 300, correlationId: "corr_timeout" })
    ).rejects.toThrow(/timed out/i);

    // The abandoned request is cleaned up, not left for a later session to find.
    const leftovers = fs.readdirSync(testIpcDir).filter(f => f.startsWith("req_"));
    expect(leftovers).toEqual([]);
  });

  it("refuses to send before connect()", async () => {
    // A pre-connect send must be rejected with the "is Moho running" error rather
    // than silently writing a request into a directory nobody has locked.
    const fresh = new MohoClient();
    expect(fresh.isConnected()).toBe(false);
    await expect(fresh.sendRequest("document.getInfo", {})).rejects.toThrow(/Not connected/i);
  });
});
