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
export declare function captureAppWindow(outputPath: string): Promise<{
    width: number;
    height: number;
}>;
