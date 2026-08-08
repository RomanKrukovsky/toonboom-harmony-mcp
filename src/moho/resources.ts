/**
 * MCP resource definitions for Moho knowledge.
 *
 * Provides static reference data (shortcuts, tools, capabilities) taken from
 * the official Moho manual so that a model can look up the right shortcut or
 * tool without a round-trip to the running application.
 *
 * Target version: Moho Pro 14.4
 *
 * REGISTRATION STYLE. This module exports a plain array, not a
 * `registerResources(server)` function. Per contract decision 5 the single
 * server uses the Harmony style: a data array walked by the manual dispatcher
 * in `src/index.ts`. The `McpResource` type is imported (type-only, erased at
 * runtime) from `src/resources.ts` so the compiler enforces that Moho and
 * Harmony resources are interchangeable in that one dispatcher.
 *
 * WHAT THESE RESOURCES MAY AND MAY NOT CLAIM. A resource has no Moho IPC
 * client: the client is injected into `registerTools(server, client)`, not
 * here. So these resources can report *static reference data* and *local
 * configuration*, and they must not pretend to report live document state.
 * Live state is read with the `moho.document.get_info` /
 * `moho.workflow.project_diagnostics` tools, which do have the client.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import type { McpResource } from "../resources.js";
import { config } from "./config.js";
import { standardCapabilities, CURRENT } from "./protocol-version.js";

const shortcuts = {
  file: [
    { keys: "Ctrl+N", action: "New" },
    { keys: "Ctrl+O", action: "Open" },
    { keys: "Ctrl+W", action: "Close" },
    { keys: "Alt+Ctrl+W", action: "Close all" },
    { keys: "Ctrl+S", action: "Save" },
    { keys: "Ctrl+Shift+S", action: "Save As" },
    { keys: "Alt+Shift+Ctrl+S", action: "Save all" },
    { keys: "Ctrl+Shift+P", action: "Project settings" },
    { keys: "Alt+Ctrl+M", action: "Refresh media" },
    { keys: "Ctrl+R", action: "Preview" },
    { keys: "Ctrl+Shift+R", action: "Preview animation" },
    { keys: "Ctrl+E", action: "Export animation" },
    { keys: "Alt+Ctrl+E", action: "Export animation with previous settings" },
    { keys: "Ctrl+B", action: "Moho exporter" },
    { keys: "Alt+Ctrl+O", action: "Open profile" },
    { keys: "Alt+Ctrl+S", action: "Save profile" },
    { keys: "Alt+Ctrl+Y", action: "General import" },
    { keys: "Ctrl+Q", action: "Quit" },
  ],
  edit: [
    { keys: "Ctrl+Z", action: "Undo" },
    { keys: "Ctrl+Shift+Z", action: "Redo" },
    { keys: "Ctrl+X", action: "Cut" },
    { keys: "Ctrl+C", action: "Copy" },
    { keys: "Ctrl+V", action: "Paste" },
    { keys: "Ctrl+A", action: "Select all" },
    { keys: "Ctrl+I", action: "Select inverse" },
  ],
} as const;

const tools = {
  draw: [
    { name: "Transform Points", shortcut: "T" },
    { name: "Add Point", shortcut: "A" },
    { name: "Curvature", shortcut: "C" },
  ],
} as const;

export const mohoResources: McpResource[] = [
  {
    uri: "moho://shortcuts",
    name: "Moho keyboard shortcuts",
    description: "Comprehensive Moho Pro 14 keyboard shortcuts organized by category",
    mimeType: "application/json",
    read: async () => JSON.stringify(shortcuts, null, 2),
  },
  {
    uri: "moho://tools",
    name: "Moho toolbar tools",
    description: "Moho Pro 14 tools organized by toolbar group with shortcuts",
    mimeType: "application/json",
    read: async () => JSON.stringify(tools, null, 2),
  },
  {
    uri: "moho://capabilities",
    name: "Moho bridge capabilities",
    description: "Moho MCP bridge capabilities and supported feature matrix",
    mimeType: "application/json",
    read: async () =>
      JSON.stringify(
        {
          // Declared target versions, not values probed from a running Moho.
          // Nothing here talks to the application, so these are the versions
          // this bridge was written against.
          targetMohoVersion: "14.4",
          targetScriptingApiVersion: "14.4",
          bridgeVersion: config.server.version,
          protocolVersion: config.server.protocolVersion,
          minProtocolVersion: config.server.minProtocolVersion,
          maxProtocolVersion: config.server.maxProtocolVersion,
          capabilities: standardCapabilities(),
        },
        null,
        2,
      ),
  },
  {
    uri: "moho://project/state",
    name: "Moho live document state (how to read it)",
    description:
      "Explains how to obtain live Moho document state. Resources cannot read it; the document tools can.",
    mimeType: "application/json",
    read: async () =>
      JSON.stringify(
        {
          liveStateAvailableHere: false,
          reason:
            "MCP resources in this server are static/config-only: they are not given a Moho IPC client, " +
            "so they cannot observe the open document. Any fps/dimensions printed here would be invented.",
          readInsteadWith: [
            "moho.document.get_info",
            "moho.document.get_layers",
            "moho.workflow.project_diagnostics",
          ],
          note: "Those tools hold the IPC client and return values from the running application.",
        },
        null,
        2,
      ),
  },
  {
    uri: "moho://diagnostics",
    name: "Moho bridge diagnostics",
    description: "Moho MCP bridge IPC configuration and locally observable IPC state",
    mimeType: "application/json",
    read: async () => {
      // Locally observable facts only: whether the IPC directory exists and
      // whether a single-consumer client lock file is present. This does not
      // prove Moho is running or that the plugin is responding — confirming
      // that requires an actual request, which is a tool's job, not a
      // resource read's.
      const ipcDirPresent = existsSync(config.moho.ipcDir);
      const clientLockPresent =
        ipcDirPresent && existsSync(path.join(config.moho.ipcDir, "client_lock.json"));
      return JSON.stringify(
        {
          ipcDirPresent,
          clientLockPresent,
          ipcStatusIsProbed: false,
          ipcStatusNote:
            "Liveness is not probed here. Use moho.system.diagnose for an end-to-end IPC check.",
          protocolVersion: CURRENT,
          maxQueueSize: config.moho.maxQueueSize,
          requestTtlMs: config.moho.requestTtlMs,
          previewTtlMs: config.moho.previewTtlMs,
          batchTimeoutPerOpMs: config.moho.batchTimeoutPerOp,
          renderTimeoutMs: config.moho.renderTimeout,
        },
        null,
        2,
      );
    },
  },
  {
    uri: "moho://security/policy",
    name: "Moho automation security policy",
    description: "Moho MCP security rules, sandbox policies, and UI automation limits",
    mimeType: "application/json",
    read: async () =>
      JSON.stringify(
        {
          level1Control: "Safe Lua API (enabled by default)",
          level2Control:
            "UI Automation (disabled by default, requires MOHO_MCP_ENABLE_UI_AUTOMATION=true)",
          pathSandbox: "Restricted to current working directory and OS tmpdir",
          commandExecution: "Arbitrary shell injection strictly prohibited",
          destructiveMethods:
            "Require valid previewHash from safety engine plan preview (60s TTL)",
          ipcLocking:
            "Single-consumer client_lock.json with heartbeat refresh; stale lock auto-stolen after TTL",
          screenshots: config.moho.enableScreenshots ? "enabled" : "disabled (default)",
          uiAutomation: config.uiAutomation.enabled ? "enabled" : "disabled (default)",
        },
        null,
        2,
      ),
  },
];
