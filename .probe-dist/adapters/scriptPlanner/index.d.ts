import type { EpisodePlan } from '../../schemas/episodePlan.js';
/**
 * ScriptPlanner — produces a lightweight script structure sufficient
 * for the ActingPlanner and Lipsync. NOT final literary script.
 */
export declare class ScriptPlanner {
    generateScript(episodePlan: EpisodePlan, analysis: any): any;
    private generateSceneBeats;
    private generateDialogue;
    private buildCharacterProfiles;
    private lineForBeat;
    private emotionForBeat;
    private voiceForBeat;
}
