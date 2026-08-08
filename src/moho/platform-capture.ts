/**
 * Platform-dispatch wrapper for window capture.
 * Routes to window-capture.ts on Windows or darwin-capture.ts on macOS.
 *
 * Capture is gated on MOHO_MCP_ENABLE_SCREENSHOTS, which is the flag that
 * documents and controls this feature. The previous implementation gated it on
 * MOHO_MCP_ENABLE_UI_AUTOMATION, which both refused capture for users who had
 * only enabled screenshots and tied a read-only operation to the far more
 * dangerous input-simulation switch.
 *
 * The gate is checked on every call, not only when the backend is first
 * loaded, and the backends re-check it themselves.
 */

import os from "node:os";
import { config } from "./config.js";

let _captureAppWindow: typeof import("./window-capture.js").captureAppWindow;
let _loaded = false;

function checkScreenshotsEnabled(): void {
  if (config.moho?.enableScreenshots !== true) {
    throw new Error(
      "SECURITY WARNING: Window screenshot capture is disabled by default. " +
      "Set MOHO_MCP_ENABLE_SCREENSHOTS=true in your environment to allow OS-level window capture. " +
      "Always prefer deterministic Lua API tools over screen capture.",
    );
  }
}

async function loadBackend(): Promise<void> {
  checkScreenshotsEnabled();
  if (_loaded) return;
  const platform = os.platform();
  if (platform === "win32") {
    const mod = await import("./window-capture.js");
    _captureAppWindow = mod.captureAppWindow;
  } else if (platform === "darwin") {
    const mod = await import("./darwin-capture.js");
    _captureAppWindow = mod.captureAppWindow;
  } else {
    throw new Error(
      `Window capture is not supported on ${platform}. ` +
      `Supported platforms: Windows (win32), macOS (darwin).`,
    );
  }
  _loaded = true;
}

export async function captureAppWindow(
  outputPath: string,
): Promise<{ width: number; height: number }> {
  await loadBackend();
  return _captureAppWindow(outputPath);
}
