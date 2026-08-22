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
export declare function startKeepAlive(): Promise<void>;
/**
 * Stop the keep-alive child and delete its temp script.
 * Safe to call multiple times and safe to call when never started.
 */
export declare function stopKeepAlive(): void;
/** True while a keep-alive child is being tracked. For diagnostics and tests. */
export declare function isKeepAliveRunning(): boolean;
