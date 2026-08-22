import { CharacterDrawingPIR } from '../schemas/vectorizationPIR.js';
import { HarmonyNativeCommandPlan } from './nativeDrawingCompiler.js';
export interface VectorizationEvidenceBundleInput {
    runId: string;
    request: Record<string, any>;
    inputImagePath: string;
    preprocessingImagePath?: string;
    rawProviderOutput?: Record<string, any>;
    pir: CharacterDrawingPIR;
    commandPlan: HarmonyNativeCommandPlan;
    beforeSceneState?: Record<string, any>;
    afterSceneState?: Record<string, any>;
    harmonyStdout?: string;
    harmonyStderr?: string;
    renderedOutputPath?: string;
    renderComparison?: Record<string, any>;
    provenance: Record<string, any>;
}
export declare class VectorizationEvidenceBundle {
    static createBundle(input: VectorizationEvidenceBundleInput, outputBaseDir?: string): string;
}
