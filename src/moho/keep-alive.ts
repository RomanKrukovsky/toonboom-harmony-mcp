/**
 * Cross-platform keep-alive for Moho's request polling.
 *
 * WHY THIS EXISTS. The Moho-side Lua plugin polls its request queue from
 * `DrawMe` callbacks, which only fire while the Moho viewport is repainting
 * (~4 Hz). When Moho sits idle and unfocused the viewport stops repainting,
 * polling stalls, and requests are never picked up. This module pokes Moho's
 * UI thread from the outside so polling keeps ticking.
 *
 * ===================================================================
 * READ THIS BEFORE ENABLING: THIS INTERFERES WITH THE USER'S MACHINE
 * ===================================================================
 * This is not a passive timer. It drives OS-level input/window APIs against
 * a window the user may be working in, so it is OPT-IN
 * (`MOHO_MCP_ENABLE_KEEP_ALIVE=true`) and off by default.
 *
 * Windows: spawns a hidden PowerShell process that calls Win32
 * `RedrawWindow` on the Moho window and posts synthetic `WM_MOUSEMOVE`
 * messages to its child windows (~4 Hz). It posts messages directly to
 * those windows; it does NOT move the physical cursor, and it does not
 * take focus. Synthetic mouse-move messages can still make Moho update
 * hover highlights and cursor-position readouts.
 *
 * macOS: spawns an `osascript` process that repeatedly sets Moho to
 * `frontmost`, i.e. IT STEALS WINDOW FOCUS roughly four times a second for
 * as long as it runs. If the user is typing in another application while
 * this is active, focus is yanked to Moho and keystrokes land in the wrong
 * app. This requires macOS Accessibility permission for the host process.
 * There is no known way to force a Moho repaint on macOS without this, so
 * the honest options are "opt in and accept focus stealing" or "leave it
 * off and keep Moho's window visible/active yourself"; the default is off.
 *
 * NO SIDE EFFECTS ON IMPORT. Importing this module starts nothing. The
 * child process is spawned only by an explicit `startKeepAlive()` call,
 * which `MohoClient.connect()` makes. With `ANIM_HOST=harmony` the Moho
 * client never connects, so nothing here ever runs.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { promises as fsp, existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";

let keepAliveProcess: ChildProcess | null = null;
let scriptPath: string | null = null;
let stopHandlerInstalled = false;
let starting = false;

/**
 * Bumped by every `stopKeepAlive()`. `startKeepAlive()` awaits I/O before it
 * can adopt its child, so a `stop()` landing inside that window would
 * otherwise be overwritten by the late assignment and leave a child running
 * after an explicit stop (verified: `isKeepAliveRunning()` was still true).
 * The starter captures this counter and, if it changed while awaiting, kills
 * the child it just spawned instead of adopting it.
 */
let stopGeneration = 0;

/** True when the operator has explicitly opted in to UI poking. */
function keepAliveEnabled(): boolean {
  const raw = process.env.MOHO_MCP_ENABLE_KEEP_ALIVE;
  if (raw === undefined) return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

// PowerShell script that forces Moho viewport repaints via Win32 API.
// NOTE: the `Add-Type -TypeDefinition @"` here-string MUST be closed by a
// `"@` at column 0 on its own line. A bare `"` does not close it, and
// PowerShell then swallows the rest of the script as string content and the
// loop never runs.
const PS_SCRIPT = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public class MohoKeepAlive {
    [DllImport("user32.dll")]
    public static extern bool RedrawWindow(IntPtr hWnd, IntPtr lprcUpdate, IntPtr hrgnUpdate, uint flags);

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumChildWindows(IntPtr hWndParent, EnumChildProc lpEnumFunc, IntPtr lParam);

    public delegate bool EnumChildProc(IntPtr hWnd, IntPtr lParam);

    private static List<IntPtr> childWindows = new List<IntPtr>();

    private static bool EnumCallback(IntPtr hWnd, IntPtr lParam) {
        childWindows.Add(hWnd);
        return true;
    }

    public static IntPtr[] GetChildWindows(IntPtr parent) {
        childWindows.Clear();
        EnumChildWindows(parent, EnumCallback, IntPtr.Zero);
        return childWindows.ToArray();
    }
}
"@

$WM_MOUSEMOVE = 0x0200
$RDW_INVALIDATE = 0x0001
$RDW_UPDATENOW  = 0x0100
$RDW_ALLCHILDREN = 0x0080
$rdwFlags = $RDW_INVALIDATE -bor $RDW_UPDATENOW -bor $RDW_ALLCHILDREN

while ($true) {
    $procs = Get-Process -Name "Moho*" -ErrorAction SilentlyContinue
    if (-not $procs) {
        Start-Sleep -Seconds 2
        continue
    }
    foreach ($p in $procs) {
        $hwnd = $p.MainWindowHandle
        if ($hwnd -ne [IntPtr]::Zero) {
            [MohoKeepAlive]::RedrawWindow($hwnd, [IntPtr]::Zero, [IntPtr]::Zero, $rdwFlags) | Out-Null
            $children = [MohoKeepAlive]::GetChildWindows($hwnd)
            foreach ($child in $children) {
                [MohoKeepAlive]::PostMessage($child, $WM_MOUSEMOVE, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
            }
        }
    }
    Start-Sleep -Milliseconds 250
}
`;

// AppleScript that forces Moho viewport repaints by raising the app.
//
// NOTE: an `on idle` handler is ONLY honoured by a stay-open AppleScript
// applet. Under plain `osascript` a script whose sole handler is `on idle`
// runs nothing and exits immediately (verified: exits in ~0.1s), so the
// keep-alive silently did nothing. An explicit `repeat` loop with `delay`
// is what actually keeps the process ticking under `osascript`.
//
// BEHAVIOUR WARNING: `set frontmost to true` steals window focus, ~4x per
// second, for as long as this runs. See the module header.
const APPLESCRIPT_KEEPALIVE = `
repeat
  try
    tell application "System Events"
      if exists process "Moho" then
        tell process "Moho" to set frontmost to true
      end if
    end tell
  end try
  delay 0.25
end repeat
`;

/**
 * Remove the temp script from disk.
 *
 * Synchronous on purpose: this also runs from a `process.on("exit")` handler,
 * where the event loop is already closed and a promise-based `unlink` is not
 * guaranteed to be flushed before the process dies.
 */
function removeScriptFile(): void {
  if (!scriptPath) return;
  const target = scriptPath;
  scriptPath = null;
  try {
    if (existsSync(target)) unlinkSync(target);
  } catch {
    /* best effort: temp file, tmpdir is reaped by the OS anyway */
  }
}

function installStopHandler(): void {
  if (stopHandlerInstalled) return;
  stopHandlerInstalled = true;

  // `exit` alone is enough to reap on a normal shutdown, but Node's default
  // SIGINT/SIGTERM disposition is to terminate, and merely attaching a
  // listener replaces that default. So a listener that only cleans up would
  // make Ctrl-C stop killing the server (verified: process stayed alive after
  // SIGTERM). Re-raise the signal after cleanup so the default behaviour is
  // preserved, and keep these listeners from holding the process open.
  process.once("exit", () => {
    stopKeepAlive();
  });

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.once(sig, () => {
      stopKeepAlive();
      // Re-raise with the handler removed so the OS default applies and the
      // exit code correctly reflects the signal.
      process.kill(process.pid, sig);
    });
  }
}

/**
 * Start the keep-alive child process.
 *
 * No-op unless `MOHO_MCP_ENABLE_KEEP_ALIVE` is truthy, and no-op on
 * platforms other than Windows and macOS or if already running.
 *
 * Async because the temp script must be fully written to disk before the
 * interpreter is told to execute it. Rejections are handled internally: this
 * never rejects, and a failure to start keep-alive never fails a request.
 */
export async function startKeepAlive(): Promise<void> {
  if (keepAliveProcess || starting) return;

  if (!keepAliveEnabled()) return;

  const platform = os.platform();
  if (platform !== "win32" && platform !== "darwin") {
    process.stderr.write(
      `[moho-mcp] Keep-alive requested but unsupported on platform '${platform}'; skipping.\n`,
    );
    return;
  }

  starting = true;
  const generation = stopGeneration;
  try {
    const dir = path.join(os.tmpdir(), "moho-mcp");
    // Both awaited: previously mkdir and writeFile were fired without await,
    // so writeFile could lose the race against mkdir and reject. That
    // rejection was unhandled and killed the whole Node process
    // (verified: ERR unhandled ENOENT terminated the process).
    await fsp.mkdir(dir, { recursive: true, mode: 0o700 });

    const isWin = platform === "win32";
    const file = path.join(dir, isWin ? "keep-alive.ps1" : "keep-alive.scpt");
    await fsp.writeFile(file, isWin ? PS_SCRIPT : APPLESCRIPT_KEEPALIVE, {
      encoding: "utf-8",
      mode: 0o600,
    });
    scriptPath = file;

    // A stop() landed while we were writing the script: honour it and do not
    // spawn anything at all.
    if (generation !== stopGeneration) {
      removeScriptFile();
      return;
    }

    const child = isWin
      ? spawn("powershell", ["-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-File", file], {
          stdio: "ignore",
          detached: false,
          windowsHide: true,
        })
      : spawn("osascript", [file], { stdio: "ignore", detached: false });

    // A child that fails to spawn (interpreter missing, Accessibility denied)
    // emits 'error'. Without a listener that is an unhandled 'error' event,
    // which throws and takes the server down.
    child.on("error", (err) => {
      if (keepAliveProcess === child) keepAliveProcess = null;
      process.stderr.write(`[moho-mcp] Keep-alive failed to start: ${err.message}\n`);
      removeScriptFile();
    });

    child.on("exit", (code, signal) => {
      // Only clear if this is still the tracked child, so a late exit from a
      // previous child cannot detach a newer one.
      if (keepAliveProcess === child) keepAliveProcess = null;
      if (signal === null && code !== 0 && code !== null) {
        process.stderr.write(`[moho-mcp] Keep-alive exited with code ${code}\n`);
      }
    });

    // Don't let the keep-alive child keep the Node event loop alive; the
    // server's lifetime must not depend on it.
    child.unref();

    // Last chance: a stop() may have landed between the spawn call and here.
    // Adopting the child now would resurrect a stopped keep-alive.
    if (generation !== stopGeneration) {
      try {
        child.kill("SIGTERM");
      } catch {
        /* already exited */
      }
      removeScriptFile();
      return;
    }

    keepAliveProcess = child;
    installStopHandler();
    process.stderr.write(
      platform === "darwin"
        ? "[moho-mcp] Keep-alive started: raising Moho to front ~4x/sec (STEALS WINDOW FOCUS)\n"
        : "[moho-mcp] Keep-alive started: redrawing Moho window ~4x/sec (no cursor movement)\n",
    );
  } catch (err) {
    process.stderr.write(
      `[moho-mcp] Keep-alive spawn failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    keepAliveProcess = null;
    removeScriptFile();
  } finally {
    starting = false;
  }
}

/**
 * Stop the keep-alive child and delete its temp script.
 * Safe to call multiple times and safe to call when never started.
 */
export function stopKeepAlive(): void {
  // Invalidate any start() currently awaiting its script write / spawn.
  stopGeneration++;

  const proc = keepAliveProcess;
  keepAliveProcess = null;

  if (proc) {
    try {
      proc.kill("SIGTERM");
    } catch {
      /* already exited */
    }
    process.stderr.write("[moho-mcp] Keep-alive stopped\n");
  }

  removeScriptFile();
}

/** True while a keep-alive child is being tracked. For diagnostics and tests. */
export function isKeepAliveRunning(): boolean {
  return keepAliveProcess !== null;
}
