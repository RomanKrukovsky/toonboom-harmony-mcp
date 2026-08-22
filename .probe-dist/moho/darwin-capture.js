/**
 * macOS window capture for the MOHO application.
 * Uses the `screencapture` CLI tool to capture a specific window.
 *
 * Security model (defense in depth):
 *  - The output path is validated as an absolute .png path and is rejected if
 *    it could be mistaken for a command-line flag. It is passed as an argv
 *    entry, never through a shell.
 *  - Capture is refused unless screenshots are explicitly enabled.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { config } from "./config.js";
const execFileAsync = promisify(execFile);
/**
 * Fail closed unless screenshot capture is explicitly enabled.
 *
 * This repeats the check in tools.ts on purpose, so importing this module
 * directly cannot bypass the gate.
 */
function assertScreenshotsEnabled() {
    if (config.moho?.enableScreenshots !== true) {
        throw new Error("SECURITY: Screenshot capture is disabled. " +
            "Set MOHO_MCP_ENABLE_SCREENSHOTS=true to enable window capture.");
    }
}
/**
 * Validate the destination path.
 *
 * `execFile` prevents shell interpretation, but it does not stop a value from
 * being read as an option: a path beginning with "-" is consumed by
 * `screencapture` and `sips` as a flag rather than a filename, which silently
 * changes what those tools do. Requiring an absolute, normalized .png path
 * removes that class of surprise and keeps the write target explicit.
 *
 * Directory-level authorization is enforced by the caller
 * (safetyEngine.validatePathSandbox in tools.ts); this is the argv-safety layer.
 */
function assertSafeOutputPath(outputPath) {
    if (typeof outputPath !== "string" || outputPath.trim().length === 0) {
        throw new Error("Invalid output path: expected a non-empty string.");
    }
    if (outputPath.includes("\0")) {
        throw new Error("Invalid output path: contains a NUL byte.");
    }
    if (!path.isAbsolute(outputPath)) {
        throw new Error(`Invalid output path: '${outputPath}' must be absolute.`);
    }
    const resolved = path.resolve(outputPath);
    if (path.basename(resolved).startsWith("-")) {
        throw new Error(`Invalid output path: '${resolved}' has a filename starting with '-', ` +
            `which command-line tools would interpret as an option.`);
    }
    if (path.extname(resolved).toLowerCase() !== ".png") {
        throw new Error(`Invalid output path: '${resolved}' must end with .png.`);
    }
    return resolved;
}
/**
 * Fixed JXA program returning the CGWindowID of Moho's main on-screen window.
 *
 * Uses an explicit `run()` with a `return` rather than relying on the
 * completion value of a loop, so the result does not depend on subtle
 * statement-value semantics.
 */
const WINDOW_ID_SCRIPT = `
  function run() {
    ObjC.import('CoreGraphics');
    ObjC.import('Foundation');
    const windows = $.CGWindowListCopyWindowInfo(
      $.kCGWindowListOptionOnScreenOnly, $.kCGNullWindowID);
    const count = $.CFArrayGetCount(windows);
    for (let i = 0; i < count; i++) {
      const win = ObjC.castRefToObject($.CFArrayGetValueAtIndex(windows, i));
      const owner = ObjC.unwrap(win.valueForKey('kCGWindowOwnerName'));
      if (owner && /moho/i.test(owner)) {
        const layer = ObjC.unwrap(win.valueForKey('kCGWindowLayer'));
        if (layer === 0) {
          return String(ObjC.unwrap(win.valueForKey('kCGWindowNumber')));
        }
      }
    }
    return "";
  }
`;
/**
 * Get the Moho window ID using JXA (JavaScript for Automation).
 * We need the CGWindowID for screencapture -l flag.
 */
async function getMohoWindowId() {
    const { stdout } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", WINDOW_ID_SCRIPT], { timeout: 10_000 });
    const windowId = Number.parseInt(stdout.trim(), 10);
    if (!Number.isInteger(windowId) || windowId <= 0) {
        throw new Error("MOHO process not found. Is Moho running?");
    }
    return windowId;
}
/**
 * Capture the MOHO application window to a PNG file.
 *
 * Uses macOS `screencapture` with the `-l` flag to capture a specific
 * window by its CGWindowID. This captures the exact window contents
 * without requiring it to be frontmost.
 *
 * @param outputPath - Absolute path where the PNG will be saved
 * @returns The pixel dimensions of the captured image
 */
export async function captureAppWindow(outputPath) {
    assertScreenshotsEnabled();
    const destination = assertSafeOutputPath(outputPath);
    const windowId = await getMohoWindowId();
    // screencapture -l <windowId> -o (no shadow) -x (no sound) <path>
    await execFileAsync("screencapture", ["-l", String(windowId), "-o", "-x", destination], { timeout: 15_000 });
    // Read the image to get dimensions using sips (built into macOS)
    const { stdout } = await execFileAsync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", destination], { timeout: 5_000 });
    let width = 0;
    let height = 0;
    const widthMatch = stdout.match(/pixelWidth:\s*(\d+)/);
    const heightMatch = stdout.match(/pixelHeight:\s*(\d+)/);
    if (widthMatch)
        width = Number.parseInt(widthMatch[1], 10);
    if (heightMatch)
        height = Number.parseInt(heightMatch[1], 10);
    if (width <= 0 || height <= 0) {
        throw new Error(`Failed to parse window dimensions from captured image`);
    }
    return { width, height };
}
