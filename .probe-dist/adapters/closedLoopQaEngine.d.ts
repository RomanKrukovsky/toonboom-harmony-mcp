import { PIRv1, PIRPatch } from '../schemas/pirV1.js';
import { CompiledSceneBundle } from './pirCompiler.js';
export interface QAAuditResult {
    passed: boolean;
    defectsFound: string[];
    maxObservedRecoilAngle: number;
    maxAllowedRecoilAngle: number;
    renderedFrames: string[];
    patchGenerated?: PIRPatch;
}
export declare class ClosedLoopQaEngine {
    private readonly compiler;
    renderPreview(bundle: CompiledSceneBundle, outputDir: string): string[];
    auditScene(pir: PIRv1, bundle: CompiledSceneBundle, renderedFrames: string[]): QAAuditResult;
    applyPatchAndRecompile(basePir: PIRv1, patch: PIRPatch, outputDir: string): {
        updatedPir: PIRv1;
        newBundle: CompiledSceneBundle;
        newAudit: QAAuditResult;
    };
}
