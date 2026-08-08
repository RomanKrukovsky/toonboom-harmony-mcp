/**
 * Win32 input simulation for the MOHO application window.
 * Sends mouse clicks, drags, and keyboard shortcuts via PowerShell + P/Invoke.
 *
 * Security model (defense in depth — this module must be safe even if a
 * caller forgets the gate in tools.ts):
 *  - All PowerShell source is composed from constants in this file plus
 *    integers that have been validated with Number.isInteger and range checks.
 *    No caller-supplied string is ever interpolated into the script text.
 *  - Input is bounded by the Moho window (boundedByMohoWindow) and requires
 *    Moho to be foreground (enforceForeground): bounds are checked inside the
 *    same script that moves the cursor, so the check cannot go stale.
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
 * "1e+21". Interpolating either into PowerShell produces a broken or
 * surprising expression, so reject them before they reach the script.
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
 * Common C# declarations for Win32 input functions.
 * Shared across all input scripts to avoid duplication.
 */
const WIN32_INPUT_TYPES = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinInput {
    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    public const uint MOUSEEVENTF_LEFTDOWN   = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP     = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN  = 0x0008;
    public const uint MOUSEEVENTF_RIGHTUP    = 0x0010;
    public const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
    public const uint MOUSEEVENTF_MIDDLEUP   = 0x0040;

    public const uint KEYEVENTF_KEYUP = 0x0002;
}
'@
`;

/**
 * PowerShell snippet to find the MOHO window and set it as foreground.
 * Defines $hwnd and $rect for coordinate conversion.
 */
const FIND_MOHO_WINDOW = `
[WinInput]::SetProcessDPIAware() | Out-Null

$proc = Get-Process | Where-Object {
    $_.ProcessName -match 'Moho' -and $_.MainWindowHandle -ne [IntPtr]::Zero
} | Select-Object -First 1

if (-not $proc) { throw "MOHO process not found. Is Moho running?" }

$hwnd = $proc.MainWindowHandle
[WinInput]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 50

$rect = New-Object WinInput+RECT
[WinInput]::GetWindowRect($hwnd, [ref]$rect) | Out-Null

$winW = $rect.Right - $rect.Left
$winH = $rect.Bottom - $rect.Top
if ($winW -le 0 -or $winH -le 0) {
    throw ("Moho window has no usable area: " + $winW + "x" + $winH)
}
`;

/**
 * Verify Moho actually reached the foreground (config.uiAutomation.enforceForeground).
 *
 * SetForegroundWindow is advisory: Windows refuses it when the calling process
 * does not own the current foreground window. Without this check, input would
 * be delivered to whatever window is actually in front.
 */
const ENFORCE_FOREGROUND = `
if ([WinInput]::GetForegroundWindow() -ne $hwnd) {
    throw "Refusing to send input: Moho could not be brought to the foreground. Focus Moho manually and retry."
}
`;

/**
 * PowerShell guard that keeps a window-relative point inside the Moho window
 * (config.uiAutomation.boundedByMohoWindow). Checked in-script so the window
 * cannot move between measurement and use.
 */
function boundsGuard(xVar: string, yVar: string, label: string): string {
  return `
if (${xVar} -lt 0 -or ${yVar} -lt 0 -or ${xVar} -ge $winW -or ${yVar} -ge $winH) {
    throw ("Refusing to send input: ${label} (" + ${xVar} + ", " + ${yVar} + ") is outside the Moho window content area (" + $winW + "x" + $winH + "). Coordinates are relative to the Moho window's top-left corner.")
}
`;
}

/** Whether window bounds enforcement is active. */
function boundsEnforced(): boolean {
  return config.uiAutomation?.boundedByMohoWindow === true;
}

/** Whether foreground enforcement is active. */
function foregroundEnforced(): boolean {
  return config.uiAutomation?.enforceForeground === true;
}

/**
 * Execute a PowerShell script and return stdout.
 */
async function runPowerShell(script: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { timeout: 15_000 },
  );

  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error(
      `Input command failed: ${stderr?.trim() || "no output from PowerShell"}`,
    );
  }
  return trimmed;
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

  // Flag names are selected from fixed literals, never taken from the caller.
  const downFlag =
    button === "right"
      ? "MOUSEEVENTF_RIGHTDOWN"
      : button === "middle"
        ? "MOUSEEVENTF_MIDDLEDOWN"
        : button === "left"
          ? "MOUSEEVENTF_LEFTDOWN"
          : null;
  const upFlag =
    button === "right"
      ? "MOUSEEVENTF_RIGHTUP"
      : button === "middle"
        ? "MOUSEEVENTF_MIDDLEUP"
        : button === "left"
          ? "MOUSEEVENTF_LEFTUP"
          : null;
  if (downFlag === null || upFlag === null) {
    throw new Error(`Invalid button: ${String(button)}. Expected left, right, or middle.`);
  }
  if (clickType !== "single" && clickType !== "double") {
    throw new Error(`Invalid clickType: ${String(clickType)}. Expected single or double.`);
  }

  const clickCount = clickType === "double" ? 2 : 1;

  const psScript = `
${WIN32_INPUT_TYPES}
${FIND_MOHO_WINDOW}
${foregroundEnforced() ? ENFORCE_FOREGROUND : ""}
$relX = ${x}
$relY = ${y}
${boundsEnforced() ? boundsGuard("$relX", "$relY", "click point") : ""}
$screenX = $rect.Left + $relX
$screenY = $rect.Top + $relY

[WinInput]::SetCursorPos($screenX, $screenY) | Out-Null
Start-Sleep -Milliseconds 50

for ($i = 0; $i -lt ${clickCount}; $i++) {
    [WinInput]::mouse_event([WinInput]::${downFlag}, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 50
    [WinInput]::mouse_event([WinInput]::${upFlag}, 0, 0, 0, [UIntPtr]::Zero)
    if ($i -lt ${clickCount - 1}) {
        Start-Sleep -Milliseconds 50
    }
}

Write-Output "$screenX,$screenY"
`;

  const output = await runPowerShell(psScript);
  const [sxStr, syStr] = output.split(",");
  return {
    success: true,
    screenX: Number.parseInt(sxStr, 10),
    screenY: Number.parseInt(syStr, 10),
  };
}

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

  const downFlag =
    button === "right"
      ? "MOUSEEVENTF_RIGHTDOWN"
      : button === "left"
        ? "MOUSEEVENTF_LEFTDOWN"
        : null;
  const upFlag =
    button === "right"
      ? "MOUSEEVENTF_RIGHTUP"
      : button === "left"
        ? "MOUSEEVENTF_LEFTUP"
        : null;
  if (downFlag === null || upFlag === null) {
    throw new Error(`Invalid button: ${String(button)}. Expected left or right.`);
  }

  const psScript = `
${WIN32_INPUT_TYPES}
${FIND_MOHO_WINDOW}
${foregroundEnforced() ? ENFORCE_FOREGROUND : ""}
$relStartX = ${startX}
$relStartY = ${startY}
$relEndX = ${endX}
$relEndY = ${endY}
${boundsEnforced() ? boundsGuard("$relStartX", "$relStartY", "drag start") : ""}
${boundsEnforced() ? boundsGuard("$relEndX", "$relEndY", "drag end") : ""}
$startScreenX = $rect.Left + $relStartX
$startScreenY = $rect.Top + $relStartY
$endScreenX = $rect.Left + $relEndX
$endScreenY = $rect.Top + $relEndY

# Move to start and press
[WinInput]::SetCursorPos($startScreenX, $startScreenY) | Out-Null
Start-Sleep -Milliseconds 50
[WinInput]::mouse_event([WinInput]::${downFlag}, 0, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 50

# Interpolate intermediate positions
$steps = ${steps}
for ($i = 1; $i -le $steps; $i++) {
    $t = $i / $steps
    $cx = [int]($startScreenX + ($endScreenX - $startScreenX) * $t)
    $cy = [int]($startScreenY + ($endScreenY - $startScreenY) * $t)
    [WinInput]::SetCursorPos($cx, $cy) | Out-Null
    Start-Sleep -Milliseconds 15
}

# Release at end position
[WinInput]::SetCursorPos($endScreenX, $endScreenY) | Out-Null
Start-Sleep -Milliseconds 50
[WinInput]::mouse_event([WinInput]::${upFlag}, 0, 0, 0, [UIntPtr]::Zero)

Write-Output "OK"
`;

  await runPowerShell(psScript);
  return { success: true };
}

/**
 * Virtual key code mapping for common keys.
 *
 * Built with a null prototype so that a lookup like VK_MAP["constructor"]
 * resolves to undefined instead of walking up to Object.prototype. With a plain
 * object literal, "constructor" and "__proto__" pass the allowlist check and
 * inject non-numeric text into the generated PowerShell.
 */
const VK_MAP: Record<string, number> = Object.assign(Object.create(null), {
  // Modifiers
  ctrl: 0x11,
  control: 0x11,
  shift: 0x10,
  alt: 0x12,
  // Function keys
  f1: 0x70, f2: 0x71, f3: 0x72, f4: 0x73,
  f5: 0x74, f6: 0x75, f7: 0x76, f8: 0x77,
  f9: 0x78, f10: 0x79, f11: 0x7a, f12: 0x7b,
  // Special keys
  enter: 0x0d, return: 0x0d,
  tab: 0x09,
  escape: 0x1b, esc: 0x1b,
  space: 0x20,
  backspace: 0x08,
  delete: 0x2e, del: 0x2e,
  insert: 0x2d,
  home: 0x24,
  end: 0x23,
  pageup: 0x21,
  pagedown: 0x22,
  up: 0x26,
  down: 0x28,
  left: 0x25,
  right: 0x27,
  // Punctuation / symbols
  ",": 0xbc, ".": 0xbe, "/": 0xbf,
  ";": 0xba, "'": 0xde,
  "[": 0xdb, "]": 0xdd, "\\": 0xdc,
  "-": 0xbd, "=": 0xbb,
  "`": 0xc0,
  // Number keys 0-9
  "0": 0x30, "1": 0x31, "2": 0x32, "3": 0x33, "4": 0x34,
  "5": 0x35, "6": 0x36, "7": 0x37, "8": 0x38, "9": 0x39,
});

// Add a-z keys (VK codes 0x41-0x5A)
for (let i = 0; i < 26; i++) {
  const letter = String.fromCharCode(97 + i); // 'a' to 'z'
  VK_MAP[letter] = 0x41 + i;
}

const MODIFIER_KEYS = new Set(["ctrl", "control", "shift", "alt"]);

/** Maximum number of "+"-separated segments accepted in a shortcut string. */
const MAX_SHORTCUT_PARTS = 6;

/**
 * Look up a key name and return a validated virtual key code.
 *
 * Returning a number that has been re-checked with Number.isInteger means the
 * value interpolated into PowerShell is provably numeric, regardless of how
 * the map was populated.
 */
function lookupVk(part: string): number {
  if (!Object.prototype.hasOwnProperty.call(VK_MAP, part)) {
    throw new Error(
      `Unknown key: "${part}". Supported keys: ${Object.keys(VK_MAP)
        .filter((k) => !MODIFIER_KEYS.has(k))
        .join(", ")}`,
    );
  }
  const vk = VK_MAP[part];
  if (typeof vk !== "number" || !Number.isInteger(vk) || vk < 0 || vk > 0xff) {
    throw new Error(`Internal error: key "${part}" has no valid virtual key code.`);
  }
  return vk;
}

/**
 * Send a keyboard shortcut to the MOHO window.
 * @param keys - Shortcut string like "ctrl+z", "ctrl+shift+z", "space", "f5", "a"
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

  const modifiers: number[] = [];
  let mainKey: number | undefined;

  for (const part of parts) {
    if (MODIFIER_KEYS.has(part)) {
      modifiers.push(lookupVk(part));
      continue;
    }
    if (mainKey !== undefined) {
      throw new Error(
        `Invalid shortcut "${keys}": found more than one non-modifier key. Send one key at a time.`,
      );
    }
    mainKey = lookupVk(part);
  }

  if (mainKey === undefined) {
    throw new Error(`No main key found in shortcut "${keys}". Need at least one non-modifier key.`);
  }

  // Every interpolated value below is a validated integer from lookupVk.
  const pressModifiers = modifiers
    .map((vk) => `[WinInput]::keybd_event(${vk}, 0, 0, [UIntPtr]::Zero)`)
    .join("\n");
  const releaseModifiers = [...modifiers]
    .reverse()
    .map((vk) => `[WinInput]::keybd_event(${vk}, 0, [WinInput]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)`)
    .join("\n");

  const psScript = `
${WIN32_INPUT_TYPES}
${FIND_MOHO_WINDOW}
${foregroundEnforced() ? ENFORCE_FOREGROUND : ""}
# Press modifiers
${pressModifiers}
Start-Sleep -Milliseconds 30

# Press and release main key
[WinInput]::keybd_event(${mainKey}, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 50
[WinInput]::keybd_event(${mainKey}, 0, [WinInput]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 30

# Release modifiers
${releaseModifiers}

Write-Output "OK"
`;

  await runPowerShell(psScript);
  return { success: true, keys };
}
