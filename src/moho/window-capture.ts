/**
 * Captures the MOHO application window using the Win32 PrintWindow API
 * via PowerShell. Returns the dimensions of the captured image.
 *
 * Security model (defense in depth):
 *  - The destination path is never interpolated into the PowerShell source.
 *    It is handed to the child process as an environment variable and read
 *    back with $env:, so no quoting rule has to hold for safety.
 *  - The path is validated as an absolute .png path before use.
 *  - Capture is refused unless screenshots are explicitly enabled.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

import { config } from "./config.js";

const execFileAsync = promisify(execFile);

/** Environment variable used to hand the destination path to PowerShell. */
const OUTPUT_PATH_ENV = "MOHO_MCP_CAPTURE_OUTPUT_PATH";

/**
 * Fail closed unless screenshot capture is explicitly enabled.
 *
 * This repeats the check in tools.ts on purpose, so importing this module
 * directly cannot bypass the gate.
 */
function assertScreenshotsEnabled(): void {
  if (config.moho?.enableScreenshots !== true) {
    throw new Error(
      "SECURITY: Screenshot capture is disabled. " +
        "Set MOHO_MCP_ENABLE_SCREENSHOTS=true to enable window capture.",
    );
  }
}

/**
 * Validate the destination path.
 *
 * Directory-level authorization is enforced by the caller
 * (safetyEngine.validatePathSandbox in tools.ts). This adds the checks that
 * belong next to the write itself: an absolute, normalized, .png target with
 * no NUL byte, so the file that gets overwritten is always the intended one.
 */
function assertSafeOutputPath(outputPath: string): string {
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
  if (path.extname(resolved).toLowerCase() !== ".png") {
    throw new Error(`Invalid output path: '${resolved}' must end with .png.`);
  }
  return resolved;
}

/**
 * PowerShell program that captures the Moho window.
 *
 * Fully static: the destination arrives through $env:, so there is no string
 * interpolation of caller data anywhere in this script.
 */
const CAPTURE_SCRIPT = `
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinCapture {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")]
    public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

$outFile = $env:${OUTPUT_PATH_ENV}
if ([string]::IsNullOrWhiteSpace($outFile)) { throw "No output path supplied to capture script." }

# Make this process DPI-aware so GetWindowRect returns true pixel dimensions
[WinCapture]::SetProcessDPIAware() | Out-Null

$proc = Get-Process | Where-Object {
    $_.ProcessName -match 'Moho' -and $_.MainWindowHandle -ne [IntPtr]::Zero
} | Select-Object -First 1

if (-not $proc) { throw "MOHO process not found. Is Moho running?" }

$hwnd = $proc.MainWindowHandle
$rect = New-Object WinCapture+RECT
[WinCapture]::GetWindowRect($hwnd, [ref]$rect) | Out-Null

$w = $rect.Right - $rect.Left
$h = $rect.Bottom - $rect.Top

if ($w -le 0 -or $h -le 0) {
    throw ("Invalid window dimensions: " + $w + "x" + $h)
}

$bmp = New-Object System.Drawing.Bitmap($w, $h)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $gfx.GetHdc()
# PW_RENDERFULLCONTENT = 2 (works with DWM composition on Win10/11)
[WinCapture]::PrintWindow($hwnd, $hdc, 2) | Out-Null
$gfx.ReleaseHdc($hdc)

$bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
$gfx.Dispose()
$bmp.Dispose()

Write-Output "$w,$h"
`;

/**
 * Capture the MOHO application window to a PNG file.
 *
 * Uses PowerShell to call Win32 `PrintWindow` with `PW_RENDERFULLCONTENT`
 * flag (2), which works even when the window is partially occluded and
 * handles DWM composition on modern Windows.
 *
 * @param outputPath - Absolute path where the PNG will be saved
 * @returns The pixel dimensions of the captured image
 */
export async function captureAppWindow(
  outputPath: string,
): Promise<{ width: number; height: number }> {
  assertScreenshotsEnabled();
  const destination = assertSafeOutputPath(outputPath);

  const { stdout, stderr } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", CAPTURE_SCRIPT],
    {
      timeout: 15_000,
      env: { ...process.env, [OUTPUT_PATH_ENV]: destination },
    },
  );

  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error(
      `Window capture failed: ${stderr?.trim() || "no output from PowerShell"}`,
    );
  }

  const [wStr, hStr] = trimmed.split(",");
  const width = Number.parseInt(wStr, 10);
  const height = Number.parseInt(hStr, 10);

  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error(`Failed to parse window dimensions from: ${trimmed}`);
  }

  return { width, height };
}
