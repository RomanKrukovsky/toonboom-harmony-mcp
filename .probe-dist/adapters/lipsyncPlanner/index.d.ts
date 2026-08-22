import type { EpisodePlan } from '../../schemas/episodePlan.js';
export interface DialogueLine {
    character: string;
    text: string;
    startFrame: number;
    endFrame: number;
    audioFile?: string;
}
export interface PhonemeKeyframe {
    frame: number;
    shape: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'X';
    character: string;
}
export interface LipsyncDialogue {
    character: string;
    text: string;
    startFrame: number;
    endFrame: number;
    audioFile?: string;
    phonemes: PhonemeKeyframe[];
}
export interface LipsyncPlan {
    sceneId: string;
    totalFrames: number;
    fps: number;
    engine: 'placeholder' | 'rhubarb' | 'papagayo';
    dialogues: LipsyncDialogue[];
    mouthLayerPattern: string;
    generatedAt: string;
    quality: 'draft' | 'production';
    origin: 'planned' | 'placeholder' | 'requires_external_model';
    missingAssets: string[];
}
/**
 * LipsyncPlanner — generates lipsync timing plans from scene dialogue.
 *
 * Per ACTOR §2.14: without real audio we produce a placeholder phoneme
 * timing table that a human or Rhubarb can refine later. The plan is
 * honest about being heuristic/placeholder.
 */
export declare class LipsyncPlanner {
    generatePlans(script: any, episodePlan: EpisodePlan): LipsyncPlan[];
    generatePlanForScene(scene: any, fps?: number): LipsyncPlan;
    private buildPlan;
    private extractDialogueLines;
    private generatePhonemes;
    private shapeForChar;
}
