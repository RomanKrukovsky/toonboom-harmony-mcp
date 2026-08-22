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
export declare function captureAppWindow(outputPath: string): Promise<{
    width: number;
    height: number;
}>;
