import type { AnalysisResult, OnePromptInput } from '../../schemas/onePrompt.js';
import type { SeriesBible } from '../../schemas/seriesBible.js';
/**
 * SeriesPlanner — derives a series bible from analysis.
 * Honest planning layer; not an LLM.
 */
export declare class SeriesPlanner {
    createBible(analysis: AnalysisResult, input: OnePromptInput): SeriesBible;
}
