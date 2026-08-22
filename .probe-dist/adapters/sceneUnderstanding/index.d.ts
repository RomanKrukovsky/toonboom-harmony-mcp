import { type SceneUnderstanding, type CharacterIntent } from '../../schemas/sceneIntelligence.js';
/**
 * SceneUnderstandingEngine — Rule-based scene understanding baseline.
 *
 * Iteration 1 of AI Animation Studio (Master Prompt §1).
 * Produces a fully Zod-validated SceneUnderstanding from:
 *   - script text (natural language / screenplay-like fragment)
 *   - dialogue lines attributed to characters
 *   - characters list with optional role/stance hints
 *   - target fps & duration
 *
 * The engine uses deterministic lexical cues (Russian + English), punctuation,
 * attribution, and structural patterns to derive:
 *   - scene intent (one-line dramatic task)
 *   - characters with goals, emotional arcs and stances
 *   - dramatic beats (one beat per dialogue line + pauses between phases)
 *   - action beats (energy per line) and reaction beats (next speaker listens)
 *   - emotion curve samples (valence/arousal)
 *   - attention targets (one per beat — primary speaker except pre-pause)
 *   - continuity constraints (eyeline, screen direction)
 *   - assumptions and uncertainty markers (every inference is tagged)
 *
 * LLM adapter may refine later — see Master Prompt: "LLM backend может улучшать
 * анализ, но не должен быть единственным рабочим путём."
 */
export interface DialogueLine {
    speaker: string;
    text: string;
    startSec?: number;
    endSec?: number;
}
export interface SceneUnderstandingInput {
    script: string;
    sceneName?: string;
    sceneId?: string;
    fps?: number;
    durationSeconds?: number;
    characters?: Array<{
        characterId?: string;
        name: string;
        role?: CharacterIntent['role'];
        stance?: CharacterIntent['stance'];
        visibleOnScreen?: boolean;
    }>;
    dialogue?: DialogueLine[];
    location?: string;
    directorConstraints?: string[];
}
export declare class SceneUnderstandingEngine {
    /**
     * Build a Zod-validated SceneUnderstanding from natural-language input.
     * Doesn't throw; returns an object that always passes schema — but it
     * surfaces computed assumptions and uncertainties for downstream review.
     */
    analyze(input: SceneUnderstandingInput): SceneUnderstanding;
}
