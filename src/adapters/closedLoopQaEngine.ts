import fs from 'fs';
import path from 'path';
import { PIRv1, PIRPatch, pirPatchSchema } from '../schemas/pirV1.js';
import { CompiledSceneBundle, PIRCompiler } from './pirCompiler.js';

export interface QAAuditResult {
  passed: boolean;
  defectsFound: string[];
  maxObservedRecoilAngle: number;
  maxAllowedRecoilAngle: number;
  renderedFrames: string[];
  patchGenerated?: PIRPatch;
}

export class ClosedLoopQaEngine {
  private readonly compiler = new PIRCompiler();

  renderPreview(bundle: CompiledSceneBundle, outputDir: string): string[] {
    const previewDir = path.join(outputDir, 'preview');
    if (!fs.existsSync(previewDir)) {
      fs.mkdirSync(previewDir, { recursive: true });
    }

    const renderedFiles: string[] = [];
    const sampleFrames = [1, 24, 48, 72, 120];

    for (const frame of sampleFrames) {
      const framePath = path.join(previewDir, `frame_${String(frame).padStart(4, '0')}.png`);
      fs.writeFileSync(framePath, Buffer.from(`MOCK_PNG_DATA_FRAME_${frame}`));
      renderedFiles.push(framePath);
    }

    return renderedFiles;
  }

  auditScene(pir: PIRv1, bundle: CompiledSceneBundle, renderedFrames: string[]): QAAuditResult {
    const maxAllowedAngle = 25.0; // Rule: max recoil angle threshold
    const observedAngle = bundle.performance.maxPeakRecoilAngle;
    const defectsFound: string[] = [];

    if (observedAngle > maxAllowedAngle) {
      defectsFound.push(`RECOIL_OVERSHOOT_CLIPPING: Peak recoil angle ${observedAngle}° exceeds maximum allowed ${maxAllowedAngle}°`);
    }

    if (defectsFound.length === 0) {
      return {
        passed: true,
        defectsFound: [],
        maxObservedRecoilAngle: observedAngle,
        maxAllowedRecoilAngle: maxAllowedAngle,
        renderedFrames
      };
    }

    // Generate automated PIR patch to fix defect
    const recoilIndex = pir.actingPrimitives.findIndex(p => p.type === 'recoil');
    const patchData: PIRPatch = {
      patchId: `patch_${Date.now()}`,
      targetShotId: pir.shotId,
      defectReason: defectsFound[0],
      primitiveModifications: recoilIndex !== -1 ? [
        {
          primitiveIndex: recoilIndex,
          updatedIntensity: 0.55 // Reduce recoil intensity to bring angle below 25.0°
        }
      ] : []
    };

    const parsedPatch = pirPatchSchema.parse(patchData);

    return {
      passed: false,
      defectsFound,
      maxObservedRecoilAngle: observedAngle,
      maxAllowedRecoilAngle: maxAllowedAngle,
      renderedFrames,
      patchGenerated: parsedPatch
    };
  }

  applyPatchAndRecompile(basePir: PIRv1, patch: PIRPatch, outputDir: string): {
    updatedPir: PIRv1;
    newBundle: CompiledSceneBundle;
    newAudit: QAAuditResult;
  } {
    const updatedPir: PIRv1 = JSON.parse(JSON.stringify(basePir));

    for (const mod of patch.primitiveModifications) {
      if (updatedPir.actingPrimitives[mod.primitiveIndex]) {
        if (mod.updatedIntensity !== undefined) {
          updatedPir.actingPrimitives[mod.primitiveIndex].intensity = mod.updatedIntensity;
        }
        if (mod.updatedStartFrame !== undefined) {
          updatedPir.actingPrimitives[mod.primitiveIndex].startFrame = mod.updatedStartFrame;
        }
        if (mod.updatedEndFrame !== undefined) {
          updatedPir.actingPrimitives[mod.primitiveIndex].endFrame = mod.updatedEndFrame;
        }
      }
    }

    const newBundle = this.compiler.compileToHarmonyScene(updatedPir, outputDir);
    const newFrames = this.renderPreview(newBundle, outputDir);
    const newAudit = this.auditScene(updatedPir, newBundle, newFrames);

    return {
      updatedPir,
      newBundle,
      newAudit
    };
  }
}
