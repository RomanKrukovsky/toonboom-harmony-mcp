/**
 * Moho tool registration — the seam between `tools.ts` and this project's dispatcher.
 *
 * WHAT CHANGED FROM THE ORIGINAL. This file used to build a fake `McpServer`
 * (an object with a `.tool(...)` method) and assert on the names `tools.ts`
 * registered on it. That mechanism is gone: the project registers tools as an
 * array of `{ name, description, inputSchema, handler }` objects that
 * `src/index.ts` dispatches by hand. The equivalent surface is now
 * `MohoToolCollector` (src/moho/registry.ts) and `buildMohoTools()`
 * (src/moho/mohoTools.ts), so the tests drive those instead.
 *
 * Tool names changed with the mechanism: `document_getInfo` is published as
 * `moho.document.get_info`. The Lua method names did NOT change, and that
 * distinction is the single most important thing covered here — see the
 * "Lua method invariant" block. A rename that leaked into `safeSend(...)` would
 * leave every test on mocks green while the live plugin stopped answering.
 *
 * Converted from vitest to jest: `vi.mock`/`vi.fn` are `jest.mock`/`jest.fn`,
 * and import paths are rooted at `../../src/moho/...`.
 */

import { z } from "zod";

import { MohoToolCollector, adaptHandlerResult, MohoToolError } from "../../src/moho/registry.js";
import { buildMohoTools } from "../../src/moho/mohoTools.js";
import { registerTools } from "../../src/moho/tools.js";
import { MohoClient, MohoIpcError } from "../../src/moho/moho-client.js";
import { MOHO_TOOL_NAMES, allMohoToolNames, renamed } from "../../src/moho/toolNames.js";
import { safetyEngine } from "../../src/moho/security/mohoSafetyEngine.js";

/**
 * The IPC client is replaced wholesale. Every assertion about "which Lua method
 * went out" reads `sendRequest.mock.calls`, so the transport must never touch a
 * real spool directory. `isConnected` returns true so `ensureConnected` is a
 * no-op and handlers proceed to `sendRequest`.
 */
jest.mock("../../src/moho/moho-client.js", () => {
  class MohoIpcError extends Error {
    public readonly code: number;
    public readonly retryable: boolean;
    public readonly correlationId: string;
    public readonly details?: unknown;

    constructor(
      message: string,
      code: number,
      options: { retryable?: boolean; correlationId?: string; details?: unknown } = {}
    ) {
      super(message);
      this.name = "MohoIpcError";
      this.code = code;
      this.retryable = options.retryable ?? false;
      this.correlationId = options.correlationId ?? "";
      this.details = options.details;
    }
  }

  const MohoClient = jest.fn();
  MohoClient.prototype.isConnected = jest.fn().mockReturnValue(true);
  MohoClient.prototype.connect = jest.fn().mockResolvedValue(undefined);
  MohoClient.prototype.sendRequest = jest.fn().mockResolvedValue({ ok: true });
  MohoClient.prototype.disconnect = jest.fn();
  MohoClient.prototype.getStats = jest.fn().mockReturnValue({
    connected: true,
    pendingRequests: 0,
    ipcDir: "/tmp/moho-mcp-test",
    protocolVersion: "1.1.0"
  });

  return { MohoClient, MohoIpcError };
});

/** The mocked `sendRequest`, typed for call inspection. */
const sendRequest = MohoClient.prototype.sendRequest as unknown as jest.Mock;

/** Shape a collected tool takes once `MohoToolCollector` has processed it. */
interface CollectedTool {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  handler: (args: unknown) => Promise<unknown>;
}

/**
 * Register through the real collector, exactly as `buildMohoTools()` does.
 * Used where a test needs a fresh, isolated registration.
 */
function collectTools(): CollectedTool[] {
  const collector = new MohoToolCollector(shape => z.object(shape));
  const client = new MohoClient();
  registerTools(collector as never, client);
  return collector.tools() as unknown as CollectedTool[];
}

/** Look a tool up by its published name, failing loudly when absent. */
function toolNamed(tools: CollectedTool[], name: string): CollectedTool {
  const found = tools.find(t => t.name === name);
  if (!found) throw new Error(`Тул отсутствует в наборе: ${name}`);
  return found;
}

/** The Lua method of the Nth `sendRequest` call (default: the only call). */
function luaMethodOfCall(index = 0): string {
  return sendRequest.mock.calls[index][0] as string;
}

/** The params of the Nth `sendRequest` call. */
function luaParamsOfCall(index = 0): Record<string, unknown> {
  return sendRequest.mock.calls[index][1] as Record<string, unknown>;
}

describe("Moho tool registration", () => {
  beforeEach(() => {
    sendRequest.mockClear();
    sendRequest.mockResolvedValue({ ok: true });
    (MohoClient.prototype.isConnected as unknown as jest.Mock).mockReturnValue(true);
  });

  /* ------------------------------------------------------------------------ */
  /* Registration                                                             */
  /* ------------------------------------------------------------------------ */

  describe("registration", () => {
    it("registers tools without throwing", () => {
      expect(() => collectTools()).not.toThrow();
    });

    it("registers canonical tools, expanded workflows, and diagnostics", () => {
      expect(collectTools().length).toBeGreaterThanOrEqual(50);
    });

    it("builds the same set through buildMohoTools()", () => {
      // buildMohoTools is what src/index.ts actually calls. If it drifted from
      // the collector path used by the rest of this file, every other assertion
      // here would be testing something the server never serves.
      expect(buildMohoTools().map(t => t.name).sort()).toEqual(
        collectTools().map(t => t.name).sort()
      );
    });

    it("registers every canonical tool under its published name", () => {
      const names = collectTools().map(t => t.name);

      // Read-only query tools
      expect(names).toContain("moho.document.get_info");
      expect(names).toContain("moho.document.get_layers");
      expect(names).toContain("moho.layer.get_properties");
      expect(names).toContain("moho.layer.get_children");
      expect(names).toContain("moho.layer.get_bones");
      expect(names).toContain("moho.bone.get_properties");
      expect(names).toContain("moho.animation.get_keyframes");
      expect(names).toContain("moho.animation.get_frame_state");
      expect(names).toContain("moho.animation.get_point_anim");
      expect(names).toContain("moho.mesh.get_points");
      expect(names).toContain("moho.mesh.get_shapes");

      // Mutation tools
      expect(names).toContain("moho.bone.set_transform");
      expect(names).toContain("moho.bone.select");
      expect(names).toContain("moho.bone.create");
      expect(names).toContain("moho.bone.set_constraints");
      expect(names).toContain("moho.bone.set_target");
      expect(names).toContain("moho.bone.set_parent");
      expect(names).toContain("moho.animation.set_keyframe");
      expect(names).toContain("moho.animation.set_multi_keyframe");
      expect(names).toContain("moho.animation.delete_keyframe");
      expect(names).toContain("moho.animation.set_interpolation");
      expect(names).toContain("moho.document.set_frame");
      expect(names).toContain("moho.document.create_layer");
      expect(names).toContain("moho.document.diagnose");
      expect(names).toContain("moho.document.render");
      expect(names).toContain("moho.layer.set_transform");
      expect(names).toContain("moho.layer.set_visibility");
      expect(names).toContain("moho.layer.set_opacity");
      expect(names).toContain("moho.layer.set_name");
      expect(names).toContain("moho.layer.select");
      expect(names).toContain("moho.layer.reorder");
      expect(names).toContain("moho.layer.set_blend_mode");
      expect(names).toContain("moho.layer.set_mask");
      expect(names).toContain("moho.layer.create_group");
      expect(names).toContain("moho.layer.create_switch");
      expect(names).toContain("moho.layer.delete");
      expect(names).toContain("moho.mesh.create_point");
      expect(names).toContain("moho.mesh.create_bezier");
      expect(names).toContain("moho.mesh.weld");
      expect(names).toContain("moho.mesh.set_fill");
      expect(names).toContain("moho.mesh.set_stroke");
      expect(names).toContain("moho.mesh.set_gradient");
      expect(names).toContain("moho.mesh.set_curvature");

      // Workflow tools
      expect(names).toContain("moho.workflow.apply_lipsync");
      expect(names).toContain("moho.workflow.create_smart_bone");
      expect(names).toContain("moho.workflow.duplicate_layer_tree");
      expect(names).toContain("moho.workflow.batch_render");
      expect(names).toContain("moho.workflow.project_diagnostics");
      expect(names).toContain("moho.workflow.create_character_rig");

      // Enterprise system diagnostics
      expect(names).toContain("moho.system.get_capabilities");
      expect(names).toContain("moho.system.diagnose");
      expect(names).toContain("moho.system.slo_snapshot");
    });

    it("publishes no legacy camelCase or underscore names", () => {
      // Catches a partially-applied rename: a tool that slipped through under
      // its old identifier would still be reachable and would read to a client
      // as a second, unrelated naming system.
      for (const name of collectTools().map(t => t.name)) {
        expect(name).toMatch(/^moho\.[a-z0-9]+\.[a-z0-9_]+$/);
      }
    });

    it("registers exactly the names declared in the rename map", () => {
      // The map is what documentation and the capability registry are written
      // against. A tool registered but unmapped throws inside `renamed()`; a
      // mapped name never registered would silently be a dead entry, which this
      // catches.
      expect(collectTools().map(t => t.name).sort()).toEqual([...allMohoToolNames()].sort());
    });

    it("gives every tool a description and an object input schema", () => {
      for (const tool of collectTools()) {
        expect(typeof tool.description).toBe("string");
        expect(tool.description.length).toBeGreaterThan(0);
        // The dispatcher calls `inputSchema.safeParse(...)` unconditionally, so a
        // tool whose schema is not a Zod object would throw at call time.
        expect(tool.inputSchema).toBeInstanceOf(z.ZodObject);
      }
    });

    it("refuses to collect two tools under one published name", () => {
      // Guards the failure mode the collector was written to surface: a rename
      // map that folds two distinct tools together. Silently keeping the first
      // would lose the second without a trace.
      const collector = new MohoToolCollector(shape => z.object(shape));
      const noop = async () => ({ content: [{ type: "text" as const, text: "{}" }] });

      collector.tool("document_getInfo", "first", {}, noop);
      expect(() => collector.tool("document_getInfo", "second", {}, noop)).toThrow(
        /Повторное имя/
      );
    });

    it("rejects a tool name missing from the rename map", () => {
      const collector = new MohoToolCollector(shape => z.object(shape));
      expect(() =>
        collector.tool("totally_unknown_tool", "d", {}, async () => ({
          content: [{ type: "text" as const, text: "{}" }]
        }))
      ).toThrow(/карте переименования/);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* Lua method invariant                                                     */
  /* ------------------------------------------------------------------------ */

  /**
   * The contract's central invariant: the MCP tool name is owned by this project,
   * the Lua method is owned by the Moho plugin, and renaming the former must not
   * touch the latter. Each case invokes the published tool and asserts on the
   * method string that reached the IPC client.
   */
  describe("Lua method invariant", () => {
    const cases: Array<{ tool: string; lua: string; args: Record<string, unknown> }> = [
      { tool: "moho.document.get_info", lua: "document.getInfo", args: {} },
      { tool: "moho.document.get_layers", lua: "document.getLayers", args: {} },
      { tool: "moho.document.set_frame", lua: "document.setFrame", args: { frame: 24 } },
      { tool: "moho.document.diagnose", lua: "document.diagnose", args: {} },
      {
        tool: "moho.document.create_layer",
        lua: "document.createLayer",
        args: { layerType: "vector", name: "Head" }
      },
      { tool: "moho.layer.get_properties", lua: "layer.getProperties", args: { layerId: 1 } },
      { tool: "moho.layer.get_children", lua: "layer.getChildren", args: { layerId: 1 } },
      { tool: "moho.layer.get_bones", lua: "layer.getBones", args: { layerId: 1 } },
      {
        tool: "moho.layer.set_name",
        lua: "layer.setName",
        args: { layerId: 3, name: "Head_Rigged" }
      },
      // Renamed with a shortened tail (`layer_selectLayer` -> `moho.layer.select`).
      // The Lua side is still `layer.selectLayer`; this is precisely the pair a
      // "tidy up the names" refactor is most likely to break.
      { tool: "moho.layer.select", lua: "layer.selectLayer", args: { layerId: 2 } },
      { tool: "moho.bone.select", lua: "bone.selectBone", args: { layerId: 1, boneId: 0 } },
      {
        tool: "moho.bone.create",
        lua: "bone.createBone",
        args: { layerId: 1, name: "arm", x: 0, y: 0, angle: 0, length: 10 }
      },
      { tool: "moho.bone.get_properties", lua: "bone.getProperties", args: { layerId: 1, boneId: 0 } },
      {
        tool: "moho.animation.get_keyframes",
        lua: "animation.getKeyframes",
        args: { layerId: 1, channel: "rotation" }
      },
      {
        tool: "moho.animation.set_keyframe",
        lua: "animation.setKeyframe",
        args: { layerId: 1, channel: "rotation", frame: 10, value: 45 }
      },
      { tool: "moho.mesh.get_points", lua: "mesh.getPoints", args: { layerId: 1 } },
      { tool: "moho.mesh.get_shapes", lua: "mesh.getShapes", args: { layerId: 1 } },
      {
        tool: "moho.workflow.project_diagnostics",
        lua: "workflow.projectDiagnostics",
        args: {}
      }
    ];

    for (const { tool, lua, args } of cases) {
      it(`${tool} sends the Lua method ${lua}`, async () => {
        const target = toolNamed(collectTools(), tool);
        const parsed = target.inputSchema.safeParse(args);
        expect(parsed.success).toBe(true);

        await target.handler((parsed as { data: unknown }).data);

        expect(sendRequest).toHaveBeenCalledTimes(1);
        expect(luaMethodOfCall()).toBe(lua);
      });
    }

    it("keeps every dispatched Lua method inside the safety allow-list", async () => {
      // A typo in a Lua method string would otherwise surface only against a
      // live plugin. The allow-list is an independent copy of the method names,
      // so cross-checking against it catches drift on either side.
      for (const { tool, lua, args } of cases) {
        sendRequest.mockClear();
        const target = toolNamed(collectTools(), tool);
        const parsed = target.inputSchema.safeParse(args);
        await target.handler((parsed as { data: unknown }).data);

        expect(luaMethodOfCall()).toBe(lua);
        expect(safetyEngine.isMethodAllowed(luaMethodOfCall())).toBe(true);
      }
    });

    it("never sends an MCP tool name as a Lua method", async () => {
      const target = toolNamed(collectTools(), "moho.document.get_info");
      await target.handler({});
      expect(luaMethodOfCall()).not.toContain("moho.");
      expect(luaMethodOfCall()).not.toContain("_");
    });

    it("maps every old tool name to a distinct new name", () => {
      const values = Object.values(MOHO_TOOL_NAMES);
      expect(new Set(values).size).toBe(values.length);
      expect(renamed("document_getInfo")).toBe("moho.document.get_info");
    });

    it("forwards caller parameters to the plugin unchanged", () => {
      // Renaming must not reshape payloads either: the plugin reads these keys.
      return (async () => {
        const target = toolNamed(collectTools(), "moho.document.set_frame");
        await target.handler(target.inputSchema.parse({ frame: 42 }));
        expect(luaParamsOfCall()).toEqual({ frame: 42 });
      })();
    });
  });

  /* ------------------------------------------------------------------------ */
  /* Schema validation                                                        */
  /* ------------------------------------------------------------------------ */

  describe("input schemas", () => {
    it("accepts a valid payload and rejects a wrongly-typed one", () => {
      const setFrame = toolNamed(collectTools(), "moho.document.set_frame");
      expect(setFrame.inputSchema.safeParse({ frame: 12 }).success).toBe(true);
      expect(setFrame.inputSchema.safeParse({ frame: "twelve" }).success).toBe(false);
      expect(setFrame.inputSchema.safeParse({ frame: -1 }).success).toBe(false);
      expect(setFrame.inputSchema.safeParse({ frame: 1.5 }).success).toBe(false);
      expect(setFrame.inputSchema.safeParse({}).success).toBe(false);
    });

    it("constrains enum-valued fields", () => {
      const createLayer = toolNamed(collectTools(), "moho.document.create_layer");
      expect(createLayer.inputSchema.safeParse({ layerType: "vector", name: "L" }).success).toBe(
        true
      );
      expect(createLayer.inputSchema.safeParse({ layerType: "wormhole", name: "L" }).success).toBe(
        false
      );
    });

    it("requires previewHash in the schema of every destructive tool", () => {
      // The engine enforces this at dispatch, but the schema is what the client
      // sees. Omitting the field there means the model is never told to obtain a
      // plan first, and every attempt fails at runtime instead.
      const tools = collectTools();
      for (const name of [
        "moho.document.save",
        "moho.layer.delete",
        "moho.animation.delete_keyframe",
        "moho.mesh.weld",
        "moho.workflow.batch_render"
      ]) {
        const shape = (toolNamed(tools, name).inputSchema as z.ZodObject<z.ZodRawShape>).shape;
        expect(Object.keys(shape)).toContain("previewHash");
        expect(shape.previewHash.isOptional()).toBe(false);
      }
    });

    it("rejects a destructive call whose previewHash is missing or blank", () => {
      const del = toolNamed(collectTools(), "moho.animation.delete_keyframe");
      expect(
        del.inputSchema.safeParse({ layerId: 1, channel: "rotation", frame: 10 }).success
      ).toBe(false);
      expect(
        del.inputSchema.safeParse({ layerId: 1, channel: "rotation", frame: 10, previewHash: "" })
          .success
      ).toBe(false);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* Destructive gate                                                         */
  /* ------------------------------------------------------------------------ */

  describe("destructive operations", () => {
    it("does not reach the plugin when the previewHash is unknown", async () => {
      const del = toolNamed(collectTools(), "moho.animation.delete_keyframe");
      const args = {
        layerId: 1,
        channel: "rotation",
        frame: 10,
        previewHash: "deadbeefdeadbeefdeadbeefdeadbeef"
      };
      expect(del.inputSchema.safeParse(args).success).toBe(true);

      await expect(del.handler(args)).rejects.toThrow(MohoToolError);
      // The point of the gate: nothing was dispatched to Moho.
      expect(sendRequest).not.toHaveBeenCalled();
    });

    it("reaches the plugin once a matching plan has been approved", async () => {
      const plan = safetyEngine.createExecutionPlan("corr_tools", "rev_tools", [
        {
          method: "animation.deleteKeyframe",
          params: { layerId: 1, channel: "rotation", frame: 10 },
          description: "Delete rotation key at 10"
        }
      ]);

      const del = toolNamed(collectTools(), "moho.animation.delete_keyframe");
      await del.handler({
        layerId: 1,
        channel: "rotation",
        frame: 10,
        previewHash: plan.previewHash
      });

      expect(sendRequest).toHaveBeenCalledTimes(1);
      expect(luaMethodOfCall()).toBe("animation.deleteKeyframe");
      // previewHash is a bridge-side capability token; the plugin must not see it.
      expect(luaParamsOfCall()).toEqual({ layerId: 1, channel: "rotation", frame: 10 });
    });

    it("refuses a hash approved for a different target", async () => {
      const plan = safetyEngine.createExecutionPlan("corr_wrong", "rev_wrong", [
        {
          method: "animation.deleteKeyframe",
          params: { layerId: 1, channel: "rotation", frame: 10 },
          description: "Delete rotation key at 10"
        }
      ]);

      const del = toolNamed(collectTools(), "moho.animation.delete_keyframe");
      await expect(
        del.handler({ layerId: 1, channel: "rotation", frame: 999, previewHash: plan.previewHash })
      ).rejects.toThrow(MohoToolError);
      expect(sendRequest).not.toHaveBeenCalled();
    });

    it("blocks a destructive operation smuggled inside a batch", async () => {
      const batch = toolNamed(collectTools(), "moho.batch.execute");
      await expect(
        batch.handler({
          operations: [
            { method: "document.getInfo", params: {} },
            { method: "layer.delete", params: { layerId: 3 } }
          ]
        })
      ).rejects.toThrow(MohoToolError);
      expect(sendRequest).not.toHaveBeenCalled();
    });
  });

  /* ------------------------------------------------------------------------ */
  /* Result adaptation — double wrapping                                      */
  /* ------------------------------------------------------------------------ */

  /**
   * `src/index.ts` wraps whatever a handler returns into
   * `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`. Moho handlers
   * already return that shape via `successContent`, so without the collector
   * unwrapping it the client would receive a JSON string containing another
   * `content` block containing a JSON string. It parses, so nothing throws — the
   * data is simply unreadable. These tests assert the unwrap happens.
   */
  describe("no double wrapping", () => {
    it("returns parsed data, not a nested content envelope", async () => {
      const payload = { name: "Character.moho", width: 1920, height: 1080, fps: 24 };
      sendRequest.mockResolvedValue(payload);

      const result = await toolNamed(collectTools(), "moho.document.get_info").handler({});

      // Exactly the plugin's payload: no envelope, no JSON string.
      expect(result).toEqual(payload);
      expect(typeof result).not.toBe("string");
      expect(result).not.toHaveProperty("content");
    });

    it("survives the dispatcher's own wrap without a second envelope inside", async () => {
      const payload = { currentFrame: 24 };
      sendRequest.mockResolvedValue(payload);

      const tool = toolNamed(collectTools(), "moho.document.set_frame");
      const raw = await tool.handler(tool.inputSchema.parse({ frame: 24 }));

      // Reproduce what src/index.ts does with a handler result.
      const dispatched = { content: [{ type: "text", text: JSON.stringify(raw, null, 2) }] };
      const decoded = JSON.parse(dispatched.content[0].text);

      // One decode is enough to reach the data. Before the unwrap this yielded
      // another { content: [...] } object and needed a second parse.
      expect(decoded).toEqual(payload);
      expect(decoded).not.toHaveProperty("content");
      expect(typeof decoded.currentFrame).toBe("number");
    });

    it("unwraps a single-level content envelope", () => {
      expect(
        adaptHandlerResult({ content: [{ type: "text", text: '{"a":1}' }] })
      ).toEqual({ a: 1 });
    });

    it("keeps non-JSON text as a string rather than losing it", () => {
      // Platform errors and permission notices are plain prose. Dropping them
      // because they do not parse would erase the diagnostic.
      expect(adaptHandlerResult({ content: [{ type: "text", text: "not json at all" }] })).toBe(
        "not json at all"
      );
    });

    it("passes a raw value through untouched", () => {
      expect(adaptHandlerResult({ plain: "object" })).toEqual({ plain: "object" });
      expect(adaptHandlerResult(42)).toBe(42);
      expect(adaptHandlerResult(null)).toBeNull();
    });

    it("joins multiple text parts before parsing", () => {
      expect(
        adaptHandlerResult({
          content: [
            { type: "text", text: '{"split":' },
            { type: "text", text: "true}" }
          ]
        })
      ).toEqual({ split: true });
    });
  });

  /* ------------------------------------------------------------------------ */
  /* Result adaptation — swallowed errors                                     */
  /* ------------------------------------------------------------------------ */

  /**
   * `errorContent` RETURNS `{ isError: true, content: [...] }` instead of
   * throwing. The dispatcher only marks a response as an error when it catches an
   * exception, so an un-adapted Moho failure ("plugin not answering", "no
   * confirmation for a destructive operation") would arrive at the client as a
   * SUCCESS and the agent would carry on against false data. These tests assert
   * the failure becomes a thrown exception.
   */
  describe("errors surface as exceptions", () => {
    it("throws instead of returning an isError result", async () => {
      sendRequest.mockRejectedValue(
        new MohoIpcError("MOHO error [-32011]: no document open", -32011, {
          retryable: false,
          correlationId: "corr_test",
          details: { hint: "open a document" }
        })
      );

      const tool = toolNamed(collectTools(), "moho.document.get_info");
      await expect(tool.handler({})).rejects.toThrow(MohoToolError);
    });

    it("preserves the plugin's code and message on the thrown error", async () => {
      sendRequest.mockRejectedValue(
        new MohoIpcError("MOHO error [-32011]: no document open", -32011, {
          retryable: true,
          correlationId: "corr_keepme",
          details: { hint: "open a document" }
        })
      );

      const tool = toolNamed(collectTools(), "moho.document.get_info");
      const error = await tool.handler({}).then(
        () => {
          throw new Error("ожидалось исключение, получен успешный результат");
        },
        (err: unknown) => err as MohoToolError
      );

      expect(error).toBeInstanceOf(MohoToolError);
      expect(error.code).toBe("-32011");
      expect(error.message).toContain("no document open");
      // Diagnostics must survive the round trip: without correlationId a failure
      // cannot be tied back to its IPC exchange in the logs.
      expect(error.details).toMatchObject({
        retryable: true,
        correlationId: "corr_keepme",
        details: { hint: "open a document" }
      });
    });

    it("throws on a plain-text failure with no error object", async () => {
      sendRequest.mockRejectedValue(new Error("spool directory is read-only"));

      const tool = toolNamed(collectTools(), "moho.document.get_info");
      const error = await tool.handler({}).then(
        () => {
          throw new Error("ожидалось исключение, получен успешный результат");
        },
        (err: unknown) => err as MohoToolError
      );

      expect(error).toBeInstanceOf(MohoToolError);
      expect(error.message).toBe("spool directory is read-only");
      expect(error.code).toBe("MOHO_TOOL_ERROR");
    });

    it("throws when an opt-in capability is disabled", async () => {
      // Screenshots are off unless MOHO_MCP_ENABLE_SCREENSHOTS=true. The refusal
      // is a security decision and must not read as a successful capture.
      const tool = toolNamed(collectTools(), "moho.document.screenshot");
      await expect(tool.handler({})).rejects.toThrow(/SECURITY/);
      expect(sendRequest).not.toHaveBeenCalled();
    });

    it("throws when UI automation is disabled", async () => {
      const tool = toolNamed(collectTools(), "moho.input.mouse_click");
      await expect(
        tool.handler(tool.inputSchema.parse({ x: 10, y: 10 }))
      ).rejects.toThrow(/SECURITY/);
    });

    it("converts an isError envelope directly through adaptHandlerResult", () => {
      expect(() =>
        adaptHandlerResult({
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: { code: -32014, message: "IPC timeout" } })
            }
          ]
        })
      ).toThrow(MohoToolError);
    });

    it("still throws when the error payload is not JSON", () => {
      expect(() =>
        adaptHandlerResult({ isError: true, content: [{ type: "text", text: "plain failure" }] })
      ).toThrow(/plain failure/);
    });

    it("reports degraded health as data, not as a thrown error", async () => {
      // system_diagnose deliberately answers with successContent({status:'DEGRADED'})
      // when the bridge is unreachable: the diagnostic itself succeeded. Turning
      // that into an exception would make the tool useless exactly when needed.
      sendRequest.mockRejectedValue(new Error("moho not running"));

      const result = (await toolNamed(collectTools(), "moho.system.diagnose").handler({})) as {
        status: string;
      };

      expect(result.status).toBe("DEGRADED");
    });
  });
});
