/**
 * onePromptEngine — the orchestrator that turns one creative prompt
 * into a complete production package (ACTOR §1–§5).
 *
 * It does NOT pretend to produce final Pixar-quality output. It produces
 * a structured production intelligence package; the "what really
 * happened" truth is in every result's `whatWasReal` log.
 */
import type { OnePromptInput, AnalysisResult } from '../../schemas/onePrompt.js';
import type { SeriesBible } from '../../schemas/seriesBible.js';
import type { EpisodePlan } from '../../schemas/episodePlan.js';
import type { CharacterSpec } from '../../schemas/characterSpec.js';
import type { Rig360Spec } from '../../schemas/rig360Spec.js';
export interface ProductionPackage {
    prompt: string;
    mode: string;
    analysis: AnalysisResult;
    seriesBible: SeriesBible;
    episodePlan: EpisodePlan;
    shotList: EpisodePlan['shots'];
    characterSpecs: CharacterSpec[];
    rig360Specs: Rig360Spec[];
    assetRequirements: EpisodePlan['assetRequirements'];
    actingPlans: any[];
    lipsyncPlans: any[];
    cameraPlans: any[];
    fxPlans: any[];
    backgroundPlans: any[];
    renderPlan: any;
    reviewReports: any[];
    scenePlans?: any[];
    finalPackage: any;
    whatWasReal: WhatWasRealLog[];
}
export interface WhatWasRealLog {
    module: string;
    whatWasDone: string;
    classification: 'generated' | 'assembled' | 'simulated' | 'planned' | 'placeholder' | 'requires_human' | 'requires_external_model' | 'requires_real_harmony';
}
export declare class OnePromptEngine {
    analyzePrompt(input: OnePromptInput): AnalysisResult;
    generateProductionPackage(input: OnePromptInput): Promise<ProductionPackage>;
}
