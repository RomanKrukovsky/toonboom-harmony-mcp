/**
 * Platform-dispatch wrapper for input simulation.
 * Routes to win32-input.ts on Windows or darwin-input.ts on macOS.
 * Strict Level 2 UI Automation guard enforced.
 *
 * The gate is checked on every call, not only when the backend is first
 * loaded: caching the module must never turn into caching the permission.
 * The backends re-check the same gate themselves, so a direct import of a
 * backend cannot bypass it either.
 */

import os from "node:os";
import { config } from "./config.js";

// Lazy-loaded platform backends
let _sendMouseClick: typeof import("./win32-input.js").sendMouseClick;
let _sendMouseDrag: typeof import("./win32-input.js").sendMouseDrag;
let _sendKeys: typeof import("./win32-input.js").sendKeys;
let _loaded = false;

function checkUiAutomationEnabled(): void {
  // Both flags must agree. config.uiAutomation.enabled is the value tools.ts
  // checks; config.moho.enableUiAutomation is the value this module has always
  // checked. Requiring both means neither can be relaxed on its own.
  const enabled =
    config.uiAutomation?.enabled === true && config.moho?.enableUiAutomation === true;
  if (!enabled) {
    throw new Error(
      "SECURITY WARNING: Level 2 UI Automation is disabled by default. " +
      "Set MOHO_MCP_ENABLE_UI_AUTOMATION=true in your environment to allow mouse/keyboard input simulation. " +
      "Always prefer deterministic Lua API tools over UI automation.",
    );
  }
}

async function loadBackend(): Promise<void> {
  checkUiAutomationEnabled();
  if (_loaded) return;
  const platform = os.platform();
  if (platform === "win32") {
    const mod = await import("./win32-input.js");
    _sendMouseClick = mod.sendMouseClick;
    _sendMouseDrag = mod.sendMouseDrag;
    _sendKeys = mod.sendKeys;
  } else if (platform === "darwin") {
    const mod = await import("./darwin-input.js");
    _sendMouseClick = mod.sendMouseClick;
    _sendMouseDrag = mod.sendMouseDrag;
    _sendKeys = mod.sendKeys;
  } else {
    throw new Error(
      `Input simulation is not supported on ${platform}. ` +
      `Supported platforms: Windows (win32), macOS (darwin).`,
    );
  }
  _loaded = true;
}

export async function sendMouseClick(
  x: number,
  y: number,
  button: "left" | "right" | "middle" = "left",
  clickType: "single" | "double" = "single",
): Promise<{ success: boolean; screenX: number; screenY: number }> {
  await loadBackend();
  return _sendMouseClick(x, y, button, clickType);
}

export async function sendMouseDrag(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  button: "left" | "right" = "left",
  steps: number = 10,
): Promise<{ success: boolean }> {
  await loadBackend();
  return _sendMouseDrag(startX, startY, endX, endY, button, steps);
}

export async function sendKeys(
  keys: string,
): Promise<{ success: boolean; keys: string }> {
  await loadBackend();
  return _sendKeys(keys);
}
