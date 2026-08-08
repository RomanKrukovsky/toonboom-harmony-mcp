/**
 * macOS input simulation for the MOHO application window.
 * Sends mouse clicks, drags, and keyboard shortcuts via osascript / cliclick.
 *
 * Security model (defense in depth — this module must be safe even if a
 * caller forgets the gate in tools.ts):
 *  - No request-supplied value is ever concatenated into an AppleScript or
 *    JXA source string. Values reach JXA through `run(argv)` arguments and
 *    reach CLI tools through argv arrays, never through a shell.
 *  - Coordinates are validated as finite integers before use, so the few
 *    remaining numeric interpolations cannot carry script syntax.
 *  - Input is bounded by the Moho window (boundedByMohoWindow) and requires
 *    Moho to be frontmost (enforceForeground).
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { config } from "./config.js";

const execFileAsync = promisify(execFile);

/** Largest coordinate we will accept. Far beyond any real display geometry. */
const MAX_COORDINATE = 100_000;

/**
 * Fail closed unless UI automation is explicitly enabled.
 *
 * This repeats the check in tools.ts on purpose: these exported functions
 * simulate OS-level input, so they must not be executable merely because a
 * caller imported this module directly and skipped the tool layer.
 */
function assertUiAutomationEnabled(): void {
  const enabled =
    config.uiAutomation?.enabled === true && config.moho?.enableUiAutomation === true;
  if (!enabled) {
    throw new Error(
      "SECURITY: Level 2 UI Automation is disabled. " +
        "Set MOHO_MCP_ENABLE_UI_AUTOMATION=true to allow mouse/keyboard input simulation. " +
        "Always prefer deterministic Lua API tools over UI automation.",
    );
  }
}

/**
 * Validate a coordinate or count as a plain finite integer.
 *
 * `z.number()` accepts Infinity and 1e21, which stringify to "Infinity" and
 * "1e+21" — neither is a valid coordinate, and both would corrupt any script
 * or argv they were written into. Reject them here.
 */
function assertInteger(value: number, name: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${name}: expected a finite number, received ${String(value)}.`);
  }
  if (!Number.isInteger(value)) {
    throw new Error(`Invalid ${name}: expected an integer, received ${value}.`);
  }
  if (value < min || value > max) {
    throw new Error(`Invalid ${name}: ${value} is outside the allowed range ${min}..${max}.`);
  }
  return value;
}

/**
 * Run a JXA script, passing every dynamic value as a `run(argv)` argument.
 *
 * The script text is a fixed constant in this file; `args` travel as separate
 * argv entries and are therefore inert data inside the script. This is the
 * only way dynamic values are allowed to reach JXA here.
 */
async function runJXAWithArgs(script: string, args: string[]): Promise<string> {
  const { stdout, stderr } = await execFileAsync(
    "osascript",
    ["-l", "JavaScript", "-e", script, "--", ...args],
    { timeout: 15_000 },
  );
  const trimmed = stdout.trim();
  if (!trimmed && stderr?.trim()) {
    throw new Error(`JXA error: ${stderr.trim()}`);
  }
  return trimmed;
}

/**
 * Fixed JXA program that reports the Moho window geometry and which
 * application is currently frontmost. Takes no arguments.
 */
const WINDOW_STATE_SCRIPT = `
  function run() {
    const se = Application("System Events");
    const frontmost = se.processes.whose({ frontmost: true })[0].name();
    const proc = se.processes.byName("Moho");
    const win = proc.windows[0];
    const pos = win.position();
    const size = win.size();
    return JSON.stringify({
      x: pos[0], y: pos[1], width: size[0], height: size[1], frontmost: frontmost
    });
  }
`;

interface MohoWindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  frontmost: string;
}

/**
 * Read the Moho window geometry and the frontmost application name.
 *
 * This deliberately does NOT activate Moho. Stealing focus and then clicking
 * would defeat the purpose of enforceForeground: the user must already have
 * Moho in front, so a click cannot be redirected into another application.
 */
async function getMohoWindowState(): Promise<MohoWindowState> {
  let raw: string;
  try {
    raw = await runJXAWithArgs(WINDOW_STATE_SCRIPT, []);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Unable to read the Moho window. Is Moho running and is Accessibility ` +
        `permission granted to this process? Underlying error: ${message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Unable to parse Moho window state from JXA output: ${raw}`);
  }

  const state = parsed as Partial<MohoWindowState>;
  if (
    typeof state.x !== "number" ||
    typeof state.y !== "number" ||
    typeof state.width !== "number" ||
    typeof state.height !== "number"
  ) {
    throw new Error(`Incomplete Moho window state from JXA output: ${raw}`);
  }
  if (state.width <= 0 || state.height <= 0) {
    throw new Error(
      `Moho window has no usable area (${state.width}x${state.height}); it may be minimized.`,
    );
  }

  return {
    x: Math.trunc(state.x),
    y: Math.trunc(state.y),
    width: Math.trunc(state.width),
    height: Math.trunc(state.height),
    frontmost: typeof state.frontmost === "string" ? state.frontmost : "",
  };
}

/** Require Moho to be the frontmost application (config.uiAutomation.enforceForeground). */
function assertForeground(state: MohoWindowState): void {
  if (config.uiAutomation?.enforceForeground !== true) return;
  if (!/moho/i.test(state.frontmost)) {
    throw new Error(
      `Refusing to send input: Moho is not the frontmost application ` +
        `(frontmost is "${state.frontmost || "unknown"}"). ` +
        `Bring Moho to the front before using UI automation, so input cannot ` +
        `be delivered to another application.`,
    );
  }
}

/**
 * Translate a window-relative point to absolute screen coordinates, refusing
 * anything outside the Moho window (config.uiAutomation.boundedByMohoWindow).
 */
function toScreenPoint(
  state: MohoWindowState,
  x: number,
  y: number,
  label: string,
): { screenX: number; screenY: number } {
  if (config.uiAutomation?.boundedByMohoWindow === true) {
    if (x < 0 || y < 0 || x >= state.width || y >= state.height) {
      throw new Error(
        `Refusing to send input: ${label} (${x}, ${y}) is outside the Moho ` +
          `window content area (${state.width}x${state.height}). ` +
          `Coordinates are relative to the Moho window's top-left corner.`,
      );
    }
  }
  return { screenX: state.x + x, screenY: state.y + y };
}

/**
 * Send a mouse click at (x, y) relative to the MOHO window top-left.
 */
export async function sendMouseClick(
  x: number,
  y: number,
  button: "left" | "right" | "middle" = "left",
  clickType: "single" | "double" = "single",
): Promise<{ success: boolean; screenX: number; screenY: number }> {
  assertUiAutomationEnabled();
  assertInteger(x, "x", -MAX_COORDINATE, MAX_COORDINATE);
  assertInteger(y, "y", -MAX_COORDINATE, MAX_COORDINATE);
  if (button !== "left" && button !== "right" && button !== "middle") {
    throw new Error(`Invalid button: ${String(button)}. Expected left, right, or middle.`);
  }
  if (clickType !== "single" && clickType !== "double") {
    throw new Error(`Invalid clickType: ${String(clickType)}. Expected single or double.`);
  }

  const state = await getMohoWindowState();
  assertForeground(state);
  const { screenX, screenY } = toScreenPoint(state, x, y, "click point");

  const clickCount = clickType === "double" ? 2 : 1;

  // cliclick receives coordinates as argv entries, never through a shell.
  // Both values are validated integers, so the "c:X,Y" form cannot carry
  // anything but digits.
  const cmd = button === "right" ? "rc" : "c";
  const args: string[] = [];
  for (let i = 0; i < clickCount; i++) {
    args.push(`${cmd}:${screenX},${screenY}`);
  }

  try {
    await execFileAsync("cliclick", args, { timeout: 10_000 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // The previous AppleScript fallback ("click at {x, y}") is intentionally
    // gone: System Events clicks at absolute screen coordinates without any
    // window association, so a stale or mis-measured point could land in
    // another application. Failing loudly is the safer outcome.
    throw new Error(
      `Mouse click failed. The 'cliclick' utility is required for macOS mouse ` +
        `input (install with: brew install cliclick). Underlying error: ${message}`,
    );
  }

  return { success: true, screenX, screenY };
}

/**
 * Fixed JXA program that performs a drag using CoreGraphics events.
 * All five numbers arrive as argv entries, so none of them is ever parsed
 * as JXA source.
 */
const DRAG_SCRIPT = `
  function run(argv) {
    ObjC.import('CoreGraphics');
    const sx = parseInt(argv[0], 10);
    const sy = parseInt(argv[1], 10);
    const ex = parseInt(argv[2], 10);
    const ey = parseInt(argv[3], 10);
    const steps = parseInt(argv[4], 10);
    if ([sx, sy, ex, ey, steps].some(isNaN)) {
      throw new Error("drag received a non-numeric argument");
    }

    $.CGEventPost($.kCGHIDEventTap,
      $.CGEventCreateMouseEvent(null, $.kCGEventMouseMoved,
        $.CGPointMake(sx, sy), $.kCGMouseButtonLeft));
    delay(0.05);

    $.CGEventPost($.kCGHIDEventTap,
      $.CGEventCreateMouseEvent(null, $.kCGEventLeftMouseDown,
        $.CGPointMake(sx, sy), $.kCGMouseButtonLeft));
    delay(0.05);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const cx = sx + (ex - sx) * t;
      const cy = sy + (ey - sy) * t;
      $.CGEventPost($.kCGHIDEventTap,
        $.CGEventCreateMouseEvent(null, $.kCGEventLeftMouseDragged,
          $.CGPointMake(cx, cy), $.kCGMouseButtonLeft));
      delay(0.015);
    }

    $.CGEventPost($.kCGHIDEventTap,
      $.CGEventCreateMouseEvent(null, $.kCGEventLeftMouseUp,
        $.CGPointMake(ex, ey), $.kCGMouseButtonLeft));
    return "OK";
  }
`;

/**
 * Drag from (startX, startY) to (endX, endY) relative to the MOHO window.
 */
export async function sendMouseDrag(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  button: "left" | "right" = "left",
  steps: number = 10,
): Promise<{ success: boolean }> {
  assertUiAutomationEnabled();
  assertInteger(startX, "startX", -MAX_COORDINATE, MAX_COORDINATE);
  assertInteger(startY, "startY", -MAX_COORDINATE, MAX_COORDINATE);
  assertInteger(endX, "endX", -MAX_COORDINATE, MAX_COORDINATE);
  assertInteger(endY, "endY", -MAX_COORDINATE, MAX_COORDINATE);
  assertInteger(steps, "steps", 1, 100);
  if (button !== "left" && button !== "right") {
    throw new Error(`Invalid button: ${String(button)}. Expected left or right.`);
  }

  const state = await getMohoWindowState();
  assertForeground(state);
  // Both endpoints must be inside the window: a drag that starts inside Moho
  // but ends elsewhere would release the button over another application.
  const start = toScreenPoint(state, startX, startY, "drag start");
  const end = toScreenPoint(state, endX, endY, "drag end");

  try {
    await execFileAsync(
      "cliclick",
      [`dd:${start.screenX},${start.screenY}`, `du:${end.screenX},${end.screenY}`],
      { timeout: 10_000 },
    );
  } catch {
    // CoreGraphics fallback. Values are passed as argv, not interpolated.
    await runJXAWithArgs(DRAG_SCRIPT, [
      String(start.screenX),
      String(start.screenY),
      String(end.screenX),
      String(end.screenY),
      String(steps),
    ]);
  }

  return { success: true };
}

/**
 * macOS key code mapping for common keys.
 * These are macOS virtual key codes (CGKeyCode values).
 *
 * Built with a null prototype so that a lookup like MAC_KEY_MAP["constructor"]
 * resolves to undefined instead of walking up to Object.prototype. With a plain
 * object literal, "constructor" and "__proto__" pass the allowlist check and
 * inject non-numeric text into the generated script.
 */
const MAC_KEY_MAP: Record<string, number> = Object.assign(Object.create(null), {
  // Letters a-z
  a: 0, s: 1, d: 2, f: 3, h: 4, g: 5, z: 6, x: 7, c: 8, v: 9,
  b: 11, q: 12, w: 13, e: 14, r: 15, y: 16, t: 17, "1": 18, "2": 19,
  "3": 20, "4": 21, "6": 22, "5": 23, "=": 24, "9": 25, "7": 26,
  "-": 27, "8": 28, "0": 29, "]": 30, o: 31, u: 32, "[": 33, i: 34,
  p: 35, l: 37, j: 38, "'": 39, k: 40, ";": 41, "\\": 42, ",": 43,
  "/": 44, n: 45, m: 46, ".": 47, "`": 50,
  // Special keys
  enter: 36, return: 36,
  tab: 48,
  space: 49,
  delete: 51, backspace: 51,
  escape: 53, esc: 53,
  // Function keys
  f1: 122, f2: 120, f3: 99, f4: 118,
  f5: 96, f6: 97, f7: 98, f8: 100,
  f9: 101, f10: 109, f11: 103, f12: 111,
  // Arrow keys
  left: 123, right: 124, down: 125, up: 126,
  // Navigation
  home: 115, end: 119, pageup: 116, pagedown: 121,
  del: 117, // forward delete
  insert: 114, // help key on Mac
});

const MODIFIER_KEYS = new Set(["ctrl", "control", "shift", "alt", "cmd", "command"]);

/** Maximum number of "+"-separated segments accepted in a shortcut string. */
const MAX_SHORTCUT_PARTS = 6;

/**
 * Fixed JXA program that presses one key code with optional modifiers.
 *
 * The key code and the modifier list arrive as argv entries and are converted
 * to numbers inside the script, so the caller's shortcut string never becomes
 * executable text. The previous implementation built an AppleScript string by
 * concatenation, which is exactly the pattern that turns a key name into code.
 */
const KEYSTROKE_SCRIPT = `
  function run(argv) {
    const keyCode = parseInt(argv[0], 10);
    if (isNaN(keyCode)) throw new Error("keystroke received a non-numeric key code");
    const modifiers = argv.slice(1).filter(function (m) { return m.length > 0; });

    const se = Application("System Events");
    const frontmost = se.processes.whose({ frontmost: true })[0].name();
    if (!/moho/i.test(frontmost)) {
      throw new Error("Moho is not frontmost (frontmost is " + frontmost + ")");
    }

    if (modifiers.length > 0) {
      se.keyCode(keyCode, { using: modifiers });
    } else {
      se.keyCode(keyCode);
    }
    return "OK";
  }
`;

/**
 * Send a keyboard shortcut to the MOHO window.
 * On macOS, "ctrl" maps to Command (as Moho uses Cmd for shortcuts).
 */
export async function sendKeys(
  keys: string,
): Promise<{ success: boolean; keys: string }> {
  assertUiAutomationEnabled();
  if (typeof keys !== "string" || keys.trim().length === 0) {
    throw new Error("Invalid keys: expected a non-empty shortcut string such as 'ctrl+z'.");
  }

  const parts = keys.toLowerCase().split("+").map((s) => s.trim());
  if (parts.length > MAX_SHORTCUT_PARTS) {
    throw new Error(
      `Invalid shortcut "${keys}": at most ${MAX_SHORTCUT_PARTS} "+"-separated parts are allowed.`,
    );
  }

  const modifiers: string[] = [];
  let mainKeyName: string | undefined;

  for (const part of parts) {
    if (MODIFIER_KEYS.has(part)) {
      modifiers.push(part);
      continue;
    }
    // Own-property check: a null-prototype map already blocks inherited keys,
    // and this makes the intent explicit and independent of how the map is built.
    if (!Object.prototype.hasOwnProperty.call(MAC_KEY_MAP, part)) {
      throw new Error(
        `Unknown key: "${part}". Supported keys: ${Object.keys(MAC_KEY_MAP)
          .filter((k) => !MODIFIER_KEYS.has(k))
          .join(", ")}`,
      );
    }
    if (mainKeyName !== undefined) {
      throw new Error(
        `Invalid shortcut "${keys}": found more than one non-modifier key ` +
          `("${mainKeyName}" and "${part}"). Send one key at a time.`,
      );
    }
    mainKeyName = part;
  }

  if (!mainKeyName) {
    throw new Error(
      `No main key found in shortcut "${keys}". Need at least one non-modifier key.`,
    );
  }

  // Map "ctrl" to "command" for macOS (Moho uses Cmd instead of Ctrl).
  // The result is a fixed set of literals, never caller text.
  const jxaModifiers = new Set<string>();
  for (const mod of modifiers) {
    if (mod === "ctrl" || mod === "control" || mod === "cmd" || mod === "command") {
      jxaModifiers.add("command down");
    } else if (mod === "shift") {
      jxaModifiers.add("shift down");
    } else if (mod === "alt") {
      jxaModifiers.add("option down");
    }
  }

  const keyCode = MAC_KEY_MAP[mainKeyName];
  if (typeof keyCode !== "number" || !Number.isInteger(keyCode)) {
    throw new Error(`Internal error: key "${mainKeyName}" has no valid key code.`);
  }

  // Keystrokes go to whichever application is frontmost, so requiring Moho to
  // already be in front is the only thing that keeps them out of other apps.
  // The script re-checks this immediately before pressing the key, closing the
  // gap between our check and the keypress.
  const state = await getMohoWindowState();
  assertForeground(state);

  await runJXAWithArgs(KEYSTROKE_SCRIPT, [String(keyCode), ...jxaModifiers]);
  return { success: true, keys };
}
