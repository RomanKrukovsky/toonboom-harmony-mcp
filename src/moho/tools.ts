/**
 * MCP tool definitions and handlers for the MOHO bridge.
 *
 * Every tool:
 *  - Has its inputs validated by a Zod schema (see ./schemas.ts).
 *  - Routes through the MohoSafetyEngine whitelist.
 *  - Sends through the IPC client which applies timeout, queue, and error mapping.
 *  - Returns MCP-formatted content (text or error) with structured error codes.
 */

import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import os from "node:os";
import path from "node:path";

import { MohoClient, MohoIpcError } from "./moho-client.js";
import { config } from "./config.js";
import { safetyEngine, INTERPOLATION_MODES, LAYER_TYPES } from "./security/mohoSafetyEngine.js";
import { captureAppWindow } from "./platform-capture.js";
import { sendMouseClick, sendMouseDrag, sendKeys } from "./platform-input.js";
import { generateCorrelationId } from "./observability/errors.js";
import { SLO } from "./observability/slo.js";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function successContent(result: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

function errorContent(err: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  if (err instanceof MohoIpcError) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              error: {
                code: err.code,
                message: err.message,
                retryable: err.retryable,
                correlationId: err.correlationId,
                details: err.details,
              },
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

async function ensureConnected(client: MohoClient): Promise<void> {
  if (!client.isConnected()) await client.connect();
}

function checkScreenshotPermission(): void {
  if (!config.moho.enableScreenshots) {
    throw new Error(
      "SECURITY: Read-only screenshot capture is disabled by default. " +
        "Set MOHO_MCP_ENABLE_SCREENSHOTS=true in your environment to enable document_screenshot.",
    );
  }
}

function checkUiAutomationPermission(): void {
  if (!config.uiAutomation.enabled) {
    throw new Error(
      "SECURITY: Level 2 UI Automation is disabled by default. " +
        "Set MOHO_MCP_ENABLE_UI_AUTOMATION=true in your environment to allow mouse/keyboard input simulation. " +
        "Always prefer deterministic Lua API tools over UI automation.",
    );
  }
}

function isWriteMethod(method: string): boolean {
  return !method.startsWith("document.get") && method !== "system.getCapabilities" && method !== "system.diagnose";
}

/**
 * Register a tool with the McpServer without letting TypeScript deeply infer
 * the Zod type chain. This avoids TS2589 ("Type instantiation is excessively
 * deep") which the SDK's recursive generic signatures trigger when too many
 * rich Zod schemas are registered in a single file.
 */
type UntypedToolHandler = (args: Record<string, any>) => Promise<unknown>;
type UntypedSchema = Record<string, z.ZodTypeAny>;

/* eslint-disable @typescript-eslint/no-explicit-any */
function registerTool(
  server: McpServer,
  name: string,
  description: string,
  schema: UntypedSchema,
  handler: UntypedToolHandler,
): void {
  // The McpServer.tool signature is a deeply-recursive generic over the schema.
  // Casting through `any` here is the documented escape hatch for the type
  // depth, while runtime behavior is identical (Zod still validates inputs).
  (server as any).tool(name, description, schema, handler);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* -------------------------------------------------------------------------- */
/* Tool registration                                                          */
/* -------------------------------------------------------------------------- */

export function registerTools(server: McpServer, client: MohoClient): void {
  const safeSend = async <T>(
    method: string,
    params: Record<string, unknown> | unknown,
    options: { timeout?: number; previewHash?: string; signal?: AbortSignal } = {},
  ): Promise<T> => {
    safetyEngine.validateMethodWhitelist(method);
    if (safetyEngine.isDestructive(method)) {
      safetyEngine.validatePreviewConfirmation(
        method,
        (params as Record<string, unknown> | undefined) ?? {},
        options.previewHash,
      );
    }
    await ensureConnected(client);
    const correlationId = generateCorrelationId();
    const write = isWriteMethod(method);
    const startTime = Date.now();
    try {
      const result = (await client.sendRequest(method, (params ?? {}) as Record<string, unknown>, {
        ...options,
        correlationId,
      })) as T;
      const duration = Date.now() - startTime;
      SLO.ipcRoundtrip.inc(1, duration);
      if (write) {
        SLO.writeOperations.inc(1, duration);
        if (safetyEngine.isDestructive(method)) SLO.destructiveConfirmations.inc();
      } else {
        SLO.readOperations.inc(1, duration);
      }
      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      SLO.ipcRoundtrip.inc(1, duration);
      if (write) SLO.writeErrors.inc(1, duration);
      else SLO.readErrors.inc(1, duration);
      if (err instanceof MohoIpcError) {
        const code = err.code;
        if (code === -32011 || code === -32012 || code === -32015) SLO.readErrors.recordError();
        if (code === -32014) SLO.readErrors.recordError();
      }
      throw err;
    }
  };

  /* ====================================================================== */
  /* 1. Document tools                                                     */
  /* ====================================================================== */

  registerTool(server, 
    "document_getInfo",
    "Get information about the currently open MOHO document (name, path, dimensions, frame range, FPS)",
    {},
    async () => {
      try {
        return successContent(await safeSend("document.getInfo", {}));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "document_getLayers",
    "Get a list of all top-level layers (with nested children) in the current MOHO document",
    {},
    async () => {
      try {
        return successContent(await safeSend("document.getLayers", {}));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "document_setFrame",
    "Set current timeline frame in MOHO document",
    { frame: z.number().int().min(0).describe("Frame number to switch to") },
    async ({ frame }) => {
      try {
        return successContent(await safeSend("document.setFrame", { frame }));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "document_screenshot",
    "Render the current MOHO document frame to a PNG. Requires MOHO_MCP_ENABLE_SCREENSHOTS=true.",
    {
      width: z.number().int().min(1).max(8192).optional(),
      height: z.number().int().min(1).max(8192).optional(),
      outputPath: z.string().optional(),
    },
    async (args) => {
      try {
        checkScreenshotPermission();
        const outputPath = args.outputPath
          ? safetyEngine.validatePathSandbox(args.outputPath, [process.cwd(), os.tmpdir()])
          : path.join(os.tmpdir(), `moho_render_${Date.now()}.png`);
        const start = Date.now();
        const result = (await safeSend("document.screenshot", {
          width: args.width,
          height: args.height,
          outputPath,
        })) as { success: boolean; filePath: string; width: number; height: number };
        SLO.renderDuration.inc(1, Date.now() - start);
        return successContent(result);
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "document_createLayer",
    "Create a new top-level layer in the document",
    {
      layerType: z.enum(LAYER_TYPES).describe("Type of layer to create"),
      name: z.string().min(1).max(256).describe("Display name for the new layer"),
      parentId: z.number().int().min(0).optional().describe("Optional group layer to insert into"),
    },
    async (args) => {
      try {
        return successContent(await safeSend("document.createLayer", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "document_save",
    "Save the current document. DESTRUCTIVE — requires previewHash from workflow.createExecutionPlan preview.",
    {
      path: z.string().min(1).optional().describe("Optional destination path"),
      format: z.enum(["moho", "fbx", "json"]).optional().describe("Save format"),
      previewHash: z.string().min(1).describe("Preview hash from plan preview"),
    },
    async (args) => {
      try {
        return successContent(
          await safeSend("document.save", { path: args.path, format: args.format }, { previewHash: args.previewHash }),
        );
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "document_diagnose",
    "Run a full document health scan (missing media, broken refs, render budget).",
    {},
    async () => {
      try {
        return successContent(await safeSend("document.diagnose", {}));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "document_render",
    "Render a frame range to a PNG/JPG/EXR sequence",
    {
      outputPath: z.string().min(1).describe("Output file or directory"),
      width: z.number().int().min(1).max(8192).describe("Render width in pixels"),
      height: z.number().int().min(1).max(8192).describe("Render height in pixels"),
      startFrame: z.number().int().min(0).optional(),
      endFrame: z.number().int().min(0).optional(),
      format: z.enum(["png", "jpg", "tiff", "exr"]).optional(),
    },
    async (args) => {
      try {
        checkScreenshotPermission();
        const safePath = safetyEngine.validatePathSandbox(path.dirname(args.outputPath), [
          process.cwd(),
          os.tmpdir(),
        ]);
        return successContent(
          await safeSend("document.render", {
            ...args,
            outputPath: path.join(safePath, path.basename(args.outputPath)),
          }),
        );
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  /* ====================================================================== */
  /* 2. Layer tools                                                        */
  /* ====================================================================== */

  registerTool(server, 
    "layer_getProperties",
    "Get detailed properties of a specific layer (type, visibility, transform, opacity, blend, children/point/bone counts)",
    { layerId: z.number().int().min(0).describe("The absolute layer ID") },
    async ({ layerId }) => {
      try {
        return successContent(await safeSend("layer.getProperties", { layerId }));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "layer_getChildren",
    "Get direct child layers of a group layer",
    { layerId: z.number().int().min(0).describe("The parent group layer ID") },
    async ({ layerId }) => {
      try {
        return successContent(await safeSend("layer.getChildren", { layerId }));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "layer_getBones",
    "Get all bones in a bone layer",
    { layerId: z.number().int().min(0).describe("The bone layer ID") },
    async ({ layerId }) => {
      try {
        return successContent(await safeSend("layer.getBones", { layerId }));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "layer_setTransform",
    "Set translation, rotation, or scale for a layer at a frame",
    {
      layerId: z.number().int().min(0),
      translation: z.object({ x: z.number(), y: z.number() }).optional(),
      rotation: z.number().optional().describe("Rotation in radians"),
      scale: z.object({ x: z.number(), y: z.number() }).optional(),
      frame: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("layer.setTransform", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "layer_setVisibility",
    "Set layer visibility at an optional frame",
    {
      layerId: z.number().int().min(0),
      visible: z.boolean(),
      frame: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("layer.setVisibility", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "layer_setOpacity",
    "Set layer opacity (0.0 to 1.0) at an optional frame",
    {
      layerId: z.number().int().min(0),
      opacity: z.number().min(0).max(1),
      frame: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("layer.setOpacity", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "layer_setName",
    "Rename a layer",
    { layerId: z.number().int().min(0), name: z.string().min(1).max(256) },
    async (args) => {
      try {
        return successContent(await safeSend("layer.setName", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "layer_selectLayer",
    "Set the active selection to a layer",
    { layerId: z.number().int().min(0) },
    async ({ layerId }) => {
      try {
        return successContent(await safeSend("layer.selectLayer", { layerId }));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "layer_reorder",
    "Move a layer to a new index in its parent group",
    {
      layerId: z.number().int().min(0),
      newIndex: z.number().int().min(0).describe("Target index in parent group"),
      parentId: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("layer.reorder", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "layer_setBlendMode",
    "Set layer blend mode at an optional frame",
    {
      layerId: z.number().int().min(0),
      blendMode: z.enum([
        "normal",
        "multiply",
        "screen",
        "overlay",
        "darken",
        "lighten",
        "color_dodge",
        "color_burn",
        "soft_light",
        "hard_light",
        "difference",
        "exclusion",
      ]),
      frame: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("layer.setBlendMode", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "layer_setMask",
    "Toggle masking on a layer (optionally referencing another layer as mask source)",
    {
      layerId: z.number().int().min(0),
      masked: z.boolean(),
      maskLayerId: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("layer.setMask", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "layer_createGroup",
    "Create a new group layer and optionally reparent existing layers into it",
    {
      name: z.string().min(1).max(256),
      childLayerIds: z.array(z.number().int().min(0)).optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("layer.createGroup", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "layer_createSwitch",
    "Create a switch layer (cycles through options like a state machine)",
    {
      name: z.string().min(1).max(256),
      optionLayerIds: z.array(z.number().int().min(0)).min(1),
      activeIndex: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("layer.createSwitch", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "layer_delete",
    "Delete a layer. DESTRUCTIVE — requires previewHash.",
    {
      layerId: z.number().int().min(0),
      previewHash: z.string().min(1),
    },
    async (args) => {
      try {
        return successContent(
          await safeSend("layer.delete", { layerId: args.layerId }, { previewHash: args.previewHash }),
        );
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  /* ====================================================================== */
  /* 3. Bone tools                                                         */
  /* ====================================================================== */

  registerTool(server, 
    "bone_getProperties",
    "Get detailed properties of a single bone",
    {
      layerId: z.number().int().min(0),
      boneId: z.number().int().min(0),
    },
    async (args) => {
      try {
        return successContent(await safeSend("bone.getProperties", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "bone_setTransform",
    "Set position, angle, or scale for a bone at a specific frame",
    {
      layerId: z.number().int().min(0),
      boneId: z.number().int().min(0),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      angle: z.number().optional(),
      scale: z.number().optional(),
      frame: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("bone.setTransform", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "bone_selectBone",
    "Select a specific bone in a bone layer",
    {
      layerId: z.number().int().min(0),
      boneId: z.number().int().min(0),
    },
    async (args) => {
      try {
        return successContent(await safeSend("bone.selectBone", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "bone_createBone",
    "Create a new bone in a bone layer with an optional parent",
    {
      layerId: z.number().int().min(0),
      name: z.string().min(1).max(256),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      angle: z.number().optional(),
      parentBoneId: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("bone.createBone", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "bone_setConstraints",
    "Set min/max angle, control flags on a bone",
    {
      layerId: z.number().int().min(0),
      boneId: z.number().int().min(0),
      minAngle: z.number().optional(),
      maxAngle: z.number().optional(),
      enabled: z.boolean().optional(),
      positionControl: z.boolean().optional(),
      angleControl: z.boolean().optional(),
      scaleControl: z.boolean().optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("bone.setConstraints", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "bone_setTarget",
    "Bind a bone to a target layer (or another bone) for IK-driven animation",
    {
      layerId: z.number().int().min(0),
      boneId: z.number().int().min(0),
      targetLayerId: z.number().int().min(0),
      targetBoneId: z.number().int().min(0).optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("bone.setTarget", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "bone_setParent",
    "Re-parent a bone within the same bone layer",
    {
      layerId: z.number().int().min(0),
      boneId: z.number().int().min(0),
      parentBoneId: z.number().int().min(0),
    },
    async (args) => {
      try {
        return successContent(await safeSend("bone.setParent", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  /* ====================================================================== */
  /* 4. Animation tools                                                    */
  /* ====================================================================== */

  registerTool(server, 
    "animation_getKeyframes",
    "Get keyframe data for a specific animation channel on a layer",
    {
      layerId: z.number().int().min(0),
      channel: z.string().min(1).describe("Channel name (translation, rotation, scale, opacity, shear)"),
    },
    async (args) => {
      try {
        return successContent(await safeSend("animation.getKeyframes", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "animation_getFrameState",
    "Get the full animation state of a layer at a specific frame",
    {
      layerId: z.number().int().min(0),
      frame: z.number().int().min(0),
    },
    async (args) => {
      try {
        return successContent(await safeSend("animation.getFrameState", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "animation_setKeyframe",
    "Create or update a keyframe on an animation channel",
    {
      layerId: z.number().int().min(0),
      channel: z.string().min(1),
      frame: z.number().int().min(0),
      value: z.union([z.number(), z.object({ x: z.number(), y: z.number() }), z.boolean()]),
    },
    async (args) => {
      try {
        return successContent(await safeSend("animation.setKeyframe", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "animation_setMultiKeyframe",
    "Set multiple keyframes on a channel in a single IPC round-trip (much faster than N setKeyframe calls)",
    {
      layerId: z.number().int().min(0),
      channel: z.string().min(1),
      keyframes: z
        .array(
          z.object({
            frame: z.number().int().min(0),
            value: z.union([z.number(), z.object({ x: z.number(), y: z.number() }), z.boolean()]),
          }),
        )
        .min(1)
        .max(200),
    },
    async (args) => {
      try {
        return successContent(await safeSend("animation.setMultiKeyframe", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "animation_deleteKeyframe",
    "Delete a keyframe from a channel at a frame. DESTRUCTIVE — requires previewHash.",
    {
      layerId: z.number().int().min(0),
      channel: z.string().min(1),
      frame: z.number().int().min(0),
      previewHash: z.string().min(1),
    },
    async (args) => {
      try {
        return successContent(
          await safeSend(
            "animation.deleteKeyframe",
            { layerId: args.layerId, channel: args.channel, frame: args.frame },
            { previewHash: args.previewHash },
          ),
        );
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "animation_setInterpolation",
    "Set interpolation mode on a keyframe (linear, smooth, ease_in/out, step, bezier, noisy, cycle)",
    {
      layerId: z.number().int().min(0),
      channel: z.string().min(1),
      frame: z.number().int().min(0),
      interpMode: z.enum(INTERPOLATION_MODES),
    },
    async (args) => {
      try {
        return successContent(await safeSend("animation.setInterpolation", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "animation_getPointAnim",
    "Get point-level animation data (e.g. shape morph keyframes) on a vector layer",
    {
      layerId: z.number().int().min(0),
      pointIndex: z.number().int().min(0),
    },
    async (args) => {
      try {
        return successContent(await safeSend("animation.getPointAnim", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  /* ====================================================================== */
  /* 5. Mesh tools                                                         */
  /* ====================================================================== */

  registerTool(server, 
    "mesh_getPoints",
    "Get all mesh points (vertices) on a vector layer",
    { layerId: z.number().int().min(0) },
    async ({ layerId }) => {
      try {
        return successContent(await safeSend("mesh.getPoints", { layerId }));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "mesh_getShapes",
    "Get all shapes (filled regions) on a vector layer",
    { layerId: z.number().int().min(0) },
    async ({ layerId }) => {
      try {
        return successContent(await safeSend("mesh.getShapes", { layerId }));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "mesh_createPoint",
    "Add a single vector point to a mesh with optional bezier handles",
    {
      layerId: z.number().int().min(0),
      x: z.number(),
      y: z.number(),
      bezierInX: z.number().optional(),
      bezierInY: z.number().optional(),
      bezierOutX: z.number().optional(),
      bezierOutY: z.number().optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("mesh.createPoint", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "mesh_createBezier",
    "Create a multi-point bezier curve as a new shape on a vector layer",
    {
      layerId: z.number().int().min(0),
      points: z
        .array(
          z.object({
            x: z.number(),
            y: z.number(),
            bezierInX: z.number().optional(),
            bezierInY: z.number().optional(),
            bezierOutX: z.number().optional(),
            bezierOutY: z.number().optional(),
          }),
        )
        .min(2)
        .max(500),
      closed: z.boolean().optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("mesh.createBezier", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "mesh_weld",
    "Weld two adjacent points into one. DESTRUCTIVE — requires previewHash.",
    {
      layerId: z.number().int().min(0),
      pointIndexA: z.number().int().min(0),
      pointIndexB: z.number().int().min(0),
      previewHash: z.string().min(1),
    },
    async (args) => {
      try {
        return successContent(
          await safeSend(
            "mesh.weld",
            { layerId: args.layerId, pointIndexA: args.pointIndexA, pointIndexB: args.pointIndexB },
            { previewHash: args.previewHash },
          ),
        );
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "mesh_setFill",
    "Toggle fill on a shape and set its color (RGBA, 0..1)",
    {
      layerId: z.number().int().min(0),
      shapeIndex: z.number().int().min(0),
      hasFill: z.boolean(),
      color: z
        .object({
          r: z.number().min(0).max(1),
          g: z.number().min(0).max(1),
          b: z.number().min(0).max(1),
          a: z.number().min(0).max(1).optional(),
        })
        .optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("mesh.setFill", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "mesh_setStroke",
    "Toggle stroke on a shape and set its width and color (RGBA, 0..1)",
    {
      layerId: z.number().int().min(0),
      shapeIndex: z.number().int().min(0),
      hasStroke: z.boolean(),
      width: z.number().min(0).optional(),
      color: z
        .object({
          r: z.number().min(0).max(1),
          g: z.number().min(0).max(1),
          b: z.number().min(0).max(1),
          a: z.number().min(0).max(1).optional(),
        })
        .optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("mesh.setStroke", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "mesh_setGradient",
    "Configure a linear gradient fill on a shape",
    {
      layerId: z.number().int().min(0),
      shapeIndex: z.number().int().min(0),
      enabled: z.boolean(),
      startColor: z
        .object({ r: z.number().min(0).max(1), g: z.number().min(0).max(1), b: z.number().min(0).max(1) })
        .optional(),
      endColor: z
        .object({ r: z.number().min(0).max(1), g: z.number().min(0).max(1), b: z.number().min(0).max(1) })
        .optional(),
      angle: z.number().optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("mesh.setGradient", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "mesh_setCurvature",
    "Set bezier handle offsets for an existing point (controls curvature at that point)",
    {
      layerId: z.number().int().min(0),
      pointIndex: z.number().int().min(0),
      bezierInX: z.number(),
      bezierInY: z.number(),
      bezierOutX: z.number(),
      bezierOutY: z.number(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("mesh.setCurvature", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  /* ====================================================================== */
  /* 6. Batch execution                                                    */
  /* ====================================================================== */

  registerTool(server, 
    "batch_execute",
    "Execute multiple operations sequentially within a single Lua round-trip. Strongly preferred for ≥2 ops.",
    {
      operations: z
        .array(
          z.object({
            method: z.string().min(1),
            params: z.record(z.unknown()).optional(),
          }),
        )
        .min(1)
        .max(config.moho.maxBatchSize)
        .describe("Array of operations to execute"),
      stopOnError: z.boolean().optional(),
    },
    async (args) => {
      try {
        safetyEngine.validateBatchSafety(args.operations as never, [process.cwd(), os.tmpdir()]);
        const timeout = config.moho.requestTimeout + args.operations.length * config.moho.batchTimeoutPerOp;
        const start = Date.now();
        const result = await safeSend("batch.execute", args, { timeout });
        SLO.batchDuration.inc(1, Date.now() - start);
        return successContent(result);
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  /* ====================================================================== */
  /* 7. Workflows (high-level multi-op builders)                          */
  /* ====================================================================== */

  registerTool(server, 
    "workflow_applyLipSync",
    "Apply a list of phoneme keyframes (one per frame) to a vector layer's mouth shape",
    {
      layerId: z.number().int().min(0),
      phonemes: z
        .array(
          z.object({
            frame: z.number().int().min(0),
            phoneme: z.enum(["AI", "E", "U", "O", "MBP", "FV", "L", "WQ", "etc", "rest"]),
          }),
        )
        .min(1)
        .max(1000),
    },
    async (args) => {
      try {
        return successContent(await safeSend("workflow.applyLipSync", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "workflow_createSmartBone",
    "Define a Smart Bone action: a range of frames and parameters that drive a bone from the user's input",
    {
      layerId: z.number().int().min(0),
      boneId: z.number().int().min(0),
      actionName: z.string().min(1).max(64),
      startFrame: z.number().int().min(0),
      endFrame: z.number().int().min(0),
      parameters: z.record(z.number()).optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("workflow.createSmartBone", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "workflow_duplicateLayerTree",
    "Deep-clone a layer (with all children and keyframes) under a new name",
    {
      layerId: z.number().int().min(0),
      newName: z.string().min(1).max(256),
      includeAnimation: z.boolean().optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("workflow.duplicateLayerTree", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "workflow_batchRender",
    "Render a list of scene configurations in sequence. DESTRUCTIVE — requires previewHash.",
    {
      scenes: z
        .array(
          z.object({
            sceneName: z.string().min(1),
            outputPath: z.string().min(1),
            width: z.number().int().min(1).max(8192),
            height: z.number().int().min(1).max(8192),
          }),
        )
        .min(1)
        .max(20),
      previewHash: z.string().min(1),
    },
    async (args) => {
      try {
        checkScreenshotPermission();
        for (const scene of args.scenes) {
          safetyEngine.validatePathSandbox(path.dirname(scene.outputPath), [process.cwd(), os.tmpdir()]);
        }
        return successContent(
          await safeSend("workflow.batchRender", { scenes: args.scenes }, { previewHash: args.previewHash }),
        );
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "workflow_projectDiagnostics",
    "Project-wide health scan: missing media, broken refs, render budget, keyframe density, palette issues",
    {},
    async () => {
      try {
        return successContent(await safeSend("workflow.projectDiagnostics", {}));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "workflow_createCharacterRig",
    "Build a starter character rig scaffold (bone layer + named bones) ready for the user to bind to art layers",
    {
      characterName: z.string().min(1).max(64),
      rigProfile: z.enum(["simple", "standard", "complex"]).optional(),
      views: z
        .array(
          z.enum([
            "front",
            "front_3q_left",
            "side_left",
            "back_3q_left",
            "back",
            "back_3q_right",
            "side_right",
            "front_3q_right",
          ]),
        )
        .optional(),
    },
    async (args) => {
      try {
        return successContent(await safeSend("workflow.createCharacterRig", args));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  /* ====================================================================== */
  /* 8. UI automation (Level 2, opt-in)                                   */
  /* ====================================================================== */

  registerTool(server, 
    "document_screenshot_window",
    "Capture the live MOHO application window (OS-level) to a PNG. Requires MOHO_MCP_ENABLE_SCREENSHOTS=true.",
    {
      outputPath: z.string().optional(),
    },
    async ({ outputPath }) => {
      try {
        checkScreenshotPermission();
        const destination = outputPath
          ? safetyEngine.validatePathSandbox(outputPath, [process.cwd(), os.tmpdir()])
          : path.join(os.tmpdir(), `moho_screenshot_${Date.now()}.png`);
        const start = Date.now();
        const dimensions = await captureAppWindow(destination);
        SLO.renderDuration.inc(1, Date.now() - start);
        return successContent({
          success: true,
          filePath: destination,
          width: dimensions.width,
          height: dimensions.height,
          notice: "OS-level window capture; for design references only.",
        });
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "input_mouseClick",
    "Send a mouse click within the Moho window bounds. Requires MOHO_MCP_ENABLE_UI_AUTOMATION=true.",
    {
      x: z.number(),
      y: z.number(),
      button: z.enum(["left", "right", "middle"]).optional().default("left"),
      clickType: z.enum(["single", "double"]).optional().default("single"),
    },
    async (args) => {
      try {
        checkUiAutomationPermission();
        return successContent(await sendMouseClick(args.x, args.y, args.button, args.clickType));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "input_mouseDrag",
    "Send a mouse drag from one point to another within the Moho window. Requires MOHO_MCP_ENABLE_UI_AUTOMATION=true.",
    {
      startX: z.number(),
      startY: z.number(),
      endX: z.number(),
      endY: z.number(),
      button: z.enum(["left", "right"]).optional().default("left"),
      steps: z.number().int().min(1).max(100).optional().default(10),
    },
    async (args) => {
      try {
        checkUiAutomationPermission();
        return successContent(await sendMouseDrag(args.startX, args.startY, args.endX, args.endY, args.button, args.steps));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "input_sendKeys",
    "Send a keyboard shortcut to the Moho window. Requires MOHO_MCP_ENABLE_UI_AUTOMATION=true.",
    {
      keys: z.string().min(1).describe("Shortcut string, e.g. 'ctrl+z'"),
    },
    async (args) => {
      try {
        checkUiAutomationPermission();
        return successContent(await sendKeys(args.keys));
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  /* ====================================================================== */
  /* 9. Enterprise diagnostics                                             */
  /* ====================================================================== */

  registerTool(server, 
    "system_getCapabilities",
    "Return Moho and bridge capability manifest",
    {},
    async () => {
      try {
        return successContent({
          mohoVersion: "14.0",
          scriptingApiVersion: "14.0",
          bridgeVersion: config.server.version,
          protocolVersion: config.server.protocolVersion,
          minProtocolVersion: config.server.minProtocolVersion,
          maxProtocolVersion: config.server.maxProtocolVersion,
          legacyAliasesEnabled: config.moho.enableLegacyAliases,
          screenshotsEnabled: config.moho.enableScreenshots,
          uiAutomationEnabled: config.uiAutomation.enabled,
          supportedMethods: Object.keys(safetyEngine).filter((k) => k.startsWith("validate")),
          supportedModules: ["document", "layer", "bone", "animation", "mesh", "batch", "workflow"],
        });
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  registerTool(server, 
    "system_diagnose",
    "Diagnostic check of IPC spooling, file system permissions, and bridge health",
    {},
    async () => {
      try {
        await ensureConnected(client);
        const docInfo = await safeSend("document.getInfo", {});
        const stats = client.getStats();
        return successContent({
          status: "HEALTHY",
          connected: stats.connected,
          ipcDir: stats.ipcDir,
          activeDocument: docInfo,
          protocolVersion: stats.protocolVersion,
          pendingRequests: stats.pendingRequests,
          screenshotsEnabled: config.moho.enableScreenshots,
          uiAutomationEnabled: config.uiAutomation.enabled,
        });
      } catch (err) {
        return successContent({
          status: "DEGRADED",
          connected: client.isConnected(),
          error: err instanceof Error ? err.message : String(err),
          recommendation: "Ensure Moho Pro 14 is running and MohoMCP Server script is activated.",
        });
      }
    },
  );

  registerTool(server, 
    "system_sloSnapshot",
    "Snapshot in-process SLO counters (read/write/timeout/render counts and percentiles)",
    {},
    async () => {
      try {
        return successContent({
          counters: (await import("./observability/slo.js")).snapshotSlo(),
          text: (await import("./observability/slo.js")).summarizeSlo(),
        });
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  /* ====================================================================== */
  /* 10. Optional legacy aliases (OFF by default)                          */
  /* ====================================================================== */

  if (config.moho.enableLegacyAliases) {
    const aliasMap: Array<{ alias: string; primary: string }> = [
      { alias: "moho_doc_info", primary: "document_getInfo" },
      { alias: "moho_list_layers", primary: "document_getLayers" },
      { alias: "moho_layer_props", primary: "layer_getProperties" },
      { alias: "moho_set_bone_transform", primary: "bone_setTransform" },
      { alias: "moho_set_layer_transform", primary: "layer_setTransform" },
      { alias: "moho_set_keyframe", primary: "animation_setKeyframe" },
      { alias: "moho_set_frame", primary: "document_setFrame" },
      { alias: "moho_batch_execute", primary: "batch_execute" },
      { alias: "moho_diagnose_system", primary: "system_diagnose" },
      { alias: "moho_get_capabilities", primary: "system_getCapabilities" },
    ];

    for (const { alias, primary } of aliasMap) {
      registerTool(server, 
        alias,
        `[DEPRECATED LEGACY ALIAS] Use '${primary}' instead. Enabled via MOHO_MCP_ENABLE_LEGACY_ALIASES=true.`,
        { params: z.record(z.unknown()).optional() },
        async (args) => {
          try {
            const payload = (args?.params as Record<string, unknown>) ?? {};
            const result = await safeSend(primary.replace("_", ".") as never, payload);
            return successContent({ deprecatedAlias: alias, useInstead: primary, result });
          } catch (err) {
            return errorContent(err);
          }
        },
      );
    }
  }
}
