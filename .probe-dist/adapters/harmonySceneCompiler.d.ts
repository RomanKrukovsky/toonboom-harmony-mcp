import { ReconstructionClient } from './reconstructionClient.js';
import { type HarmonyReconstructionManifest, type HarmonyCommandPlan } from '../schemas/reconstruction.js';
export interface CompileOptions {
    targetProjectPath: string;
    outputProjectPath: string;
    dryRun: boolean;
}
export declare class HarmonySceneCompiler {
    private readonly comparisonClient;
    constructor(comparisonClient?: Pick<ReconstructionClient, 'compareRender'>);
    compile(rawManifest: unknown, options: CompileOptions): Promise<{
        status: string;
        execution: string;
        realSceneCreated: boolean;
        editableNativeDrawings: boolean;
        targetProjectPath: string;
        outputProjectPath: string;
        manifestId: string;
        planned: {
            drawingElements: number;
            drawings: number;
            paletteColors: number;
            exposureFrames: number;
        };
        note: string;
    } | {
        status: string;
        execution: string;
        realSceneCreated: boolean;
        editableNativeDrawings: boolean;
        outputProjectPath: string;
        manifestId: string;
        nativeAudit: any;
        backupPath: string;
        previewPaths: string[];
        renderComparison: Record<string, any>;
    }>;
    generateCommandPlan(manifest: HarmonyReconstructionManifest): HarmonyCommandPlan;
    private dryRunReport;
    private prepareTransactionalCopy;
    private sourceDrawingForFrame;
    private verifyPng;
}
