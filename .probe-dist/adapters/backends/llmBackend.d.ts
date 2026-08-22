export interface DialogueLine {
    speaker: string;
    text: string;
}
export interface LlmResult {
    status: 'success' | 'error' | 'placeholder';
    origin: 'real' | 'placeholder';
    dialogue: DialogueLine[];
    error?: string;
}
/**
 * Generate scene dialogue from a creative brief using a configured LLM backend.
 * Honors HARMONY_BACKEND_LLM / OPENAI_API_KEY / ANTHROPIC_API_KEY feature flags.
 * Falls back to deterministic placeholder lines when no backend is enabled.
 */
export declare function generateDialogue(prompt: string, characters: string[], context?: {
    location?: string;
    mood?: string;
    durationFrames?: number;
    fps?: number;
}): Promise<LlmResult>;
