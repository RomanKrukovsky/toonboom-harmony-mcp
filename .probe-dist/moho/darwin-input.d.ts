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
/**
 * Send a mouse click at (x, y) relative to the MOHO window top-left.
 */
export declare function sendMouseClick(x: number, y: number, button?: "left" | "right" | "middle", clickType?: "single" | "double"): Promise<{
    success: boolean;
    screenX: number;
    screenY: number;
}>;
/**
 * Drag from (startX, startY) to (endX, endY) relative to the MOHO window.
 */
export declare function sendMouseDrag(startX: number, startY: number, endX: number, endY: number, button?: "left" | "right", steps?: number): Promise<{
    success: boolean;
}>;
/**
 * Send a keyboard shortcut to the MOHO window.
 * On macOS, "ctrl" maps to Command (as Moho uses Cmd for shortcuts).
 */
export declare function sendKeys(keys: string): Promise<{
    success: boolean;
    keys: string;
}>;
