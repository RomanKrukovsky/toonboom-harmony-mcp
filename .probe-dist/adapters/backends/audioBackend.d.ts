export interface AudioGenerationResult {
    status: 'success' | 'error' | 'placeholder';
    origin: 'real' | 'placeholder';
    outputPath?: string;
    text: string;
    error?: string;
}
/**
 * Synthesize spoken dialogue audio.
 * Honors HARMONY_BACKEND_AUDIO / OPENAI_API_KEY feature flags.
 * Falls back to a silent marker file when no backend is enabled.
 */
export declare function synthesizeDialogue(text: string, voice?: string, outputPath?: string): Promise<AudioGenerationResult>;
export interface PhonemeTiming {
    startFrame: number;
    endFrame: number;
    mouthShape: 'A' | 'E' | 'I' | 'O' | 'U' | 'M' | 'F' | 'L' | 'S' | 'rest';
}
/**
 * Generate automatic lip-sync mouth shape exposures for dialogue.
 */
export declare function generatePhonemeTimings(text: string, fps?: number): PhonemeTiming[];
