import { PIRv1 } from '../schemas/pirV1.js';
import { HumanoidStandardRigTemplate } from './rigTemplates/humanoidStandardRig.js';
import { ActingPerformanceCurves } from './actingPrimitives/actingPrimitivesEngine.js';
export interface CompiledSceneBundle {
    scenePath: string;
    commandPlanPath: string;
    rigTemplate: HumanoidStandardRigTemplate;
    performance: ActingPerformanceCurves;
    frameCount: number;
}
export declare class PIRCompiler {
    private readonly actingEngine;
    compileToHarmonyScene(pir: PIRv1, outputDir: string): CompiledSceneBundle;
    private generateXStageXml;
}
