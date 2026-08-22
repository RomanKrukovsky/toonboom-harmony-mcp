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
export declare function sendMouseClick(x: number, y: number, button?: "left" | "right" | "middle", clickType?: "single" | "double"): Promise<{
    success: boolean;
    screenX: number;
    screenY: number;
}>;
export declare function sendMouseDrag(startX: number, startY: number, endX: number, endY: number, button?: "left" | "right", steps?: number): Promise<{
    success: boolean;
}>;
export declare function sendKeys(keys: string): Promise<{
    success: boolean;
    keys: string;
}>;
