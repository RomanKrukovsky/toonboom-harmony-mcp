export interface ImageGenerationResult {
    status: 'success' | 'error' | 'placeholder';
    origin: 'real' | 'placeholder';
    outputPath?: string;
    prompt: string;
    error?: string;
}
/**
 * Generate a character turnaround drawing for a single view.
 * Honors HARMONY_BACKEND_IMAGE / OPENAI_API_KEY feature flags.
 * Falls back to a transparent placeholder PNG when no backend is enabled.
 */
export declare function generateCharacterTurnaround(characterName: string, view: string, style: string, outputPath?: string): Promise<ImageGenerationResult>;
/**
 * Generate a background illustration for a location.
 */
export declare function generateBackground(location: string, style: string, outputPath?: string): Promise<ImageGenerationResult>;
/**
 * Raster → SVG vectorization via the reconstruction-core service.
 *
 * Removed the previous "dynamic contour approximation" fallback: it never read a
 * single pixel. It summed the char codes of the *file name*, derived an ellipse
 * centre from `hash % 100` and radii from the file size, then labelled the output
 * "Vectorized contour dynamically derived from <name>". Any caller would have
 * treated that as a real trace of the artwork.
 *
 * Vectorization needs actual image decoding (OpenCV lives in the Python service),
 * so when the service is unreachable this throws instead of inventing geometry.
 */
export declare function vectorizeImageToSVG(imagePath: string, svgOutputPath?: string): Promise<string>;
