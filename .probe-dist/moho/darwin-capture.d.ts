/**
 * macOS window capture for the MOHO application.
 * Uses the `screencapture` CLI tool to capture a specific window.
 *
 * Security model (defense in depth):
 *  - The output path is validated as an absolute .png path and is rejected if
 *    it could be mistaken for a command-line flag. It is passed as an argv
 *    entry, never through a shell.
 *  - Capture is refused unless screenshots are explicitly enabled.
 */
/**
 * Capture the MOHO application window to a PNG file.
 *
 * Uses macOS `screencapture` with the `-l` flag to capture a specific
 * window by its CGWindowID. This captures the exact window contents
 * without requiring it to be frontmost.
 *
 * @param outputPath - Absolute path where the PNG will be saved
 * @returns The pixel dimensions of the captured image
 */
export declare function captureAppWindow(outputPath: string): Promise<{
    width: number;
    height: number;
}>;
