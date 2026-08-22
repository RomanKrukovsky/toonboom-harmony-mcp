import type { AnalysisResult, OnePromptInput } from '../../schemas/onePrompt.js';
import type { EpisodePlan } from '../../schemas/episodePlan.js';
/**
 * EpisodePlanner — splits the episode into N scenes.
 */
export declare class EpisodePlanner {
    createEpisodePlan(analysis: AnalysisResult, input: OnePromptInput): EpisodePlan;
    private sceneNameFor;
}
