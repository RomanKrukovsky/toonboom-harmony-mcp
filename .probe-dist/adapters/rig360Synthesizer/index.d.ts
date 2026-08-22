import type { CharacterSpec } from '../../schemas/characterSpec.js';
import type { Rig360Spec, DeformerPlan, MasterControllerPlan, FaceControlPlan, BodyTurnPlan } from '../../schemas/rig360Spec.js';
/**
 * Rig360Synthesizer — produces a full rig plan from a character spec.
 *
 * Per ACTOR §7: cannot build a real 360 rig without drawn layered
 * assets. Always produces:
 *  - rig360_spec.json (full plan)
 *  - placeholder rig structure
 *  - test turn animation
 *  - marked missing assets
 *
 * Never falsely claims "full rig generated". The status field is
 * `partial_success` with `realRigCreated=false, placeholderRigCreated=true`.
 */
export declare class Rig360Synthesizer {
    generateSpec(character: CharacterSpec): Rig360Spec;
    generateTurnaroundPlan(character: CharacterSpec): {
        views: string[];
        layerPlan: any;
        notes: string;
    };
    generateLayeredAssetPlan(character: CharacterSpec): {
        layers: {
            group: string;
            layer: string;
            views: string[];
        }[];
    };
    generateMasterControllerPlan(character: CharacterSpec): MasterControllerPlan[];
    generateDeformerPlan(character: CharacterSpec): DeformerPlan[];
    generateFaceControlPlan(character: CharacterSpec): FaceControlPlan[];
    generateBodyTurnPlan(character: CharacterSpec): BodyTurnPlan[];
    buildPlaceholderRig(character: CharacterSpec): {
        templatePath: string;
        nodeCount: number;
        missingAssets: string[];
    };
    validateFullRig(spec: Rig360Spec): {
        valid: boolean;
        issues: string[];
    };
    generateTestTurnAnimation(spec: Rig360Spec): {
        frames: number[];
        angles: number[];
        type: string;
    };
    /**
     * Attempt to build a real 360 rig from supplied asset paths.
     * If assets are missing, falls back to placeholder with an honest report.
     */
    buildFromAssets(character: CharacterSpec, assetPaths: Record<string, string>): Rig360Spec;
    private humanizeMissingAssets;
    private buildRequiredAssets;
    private buildMasterControllers;
    private buildDeformers;
    private buildFaceControls;
    private buildBodyTurn;
}
