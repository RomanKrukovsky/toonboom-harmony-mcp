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
 * @param keys - Shortcut string like "ctrl+z", "ctrl+shift+z", "space", "f5", "a"
 */
export declare function sendKeys(keys: string): Promise<{
    success: boolean;
    keys: string;
}>;
