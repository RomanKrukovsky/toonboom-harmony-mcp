import { type CameraLayoutPlan } from '../../schemas/cameraLayout.js';
import type { SceneUnderstanding } from '../../schemas/sceneIntelligence.js';
export interface CameraLayoutInput {
    sceneUnderstanding: SceneUnderstanding;
    sceneWidth?: number;
    sceneHeight?: number;
    fps?: number;
    style?: 'restrained' | 'dynamic' | 'dramatic' | 'comedic';
}
/**
 * Camera scale per shot size.
 *
 * Exported because storyboardTools and layoutCameraTools both need this ladder
 * to derive a camera Z from a framing choice. It used to be file-private, so
 * every other module kept its own copy and they were free to drift apart.
 */
export declare const SHOT_SIZE_SCALES: Record<string, number>;
/**
 * The subset of a beat that framing decisions actually read.
 *
 * Nullable fields are declared as `| null` because the sceneIntelligence beat
 * schema emits `null` (not `undefined`) for an absent reaction target.
 */
export interface ShotSizeBeatInput {
    importance?: number;
    beatKind?: string;
    emotion?: string | null;
    primaryCharacter?: string | null;
    reactionTarget?: string | null;
}
/**
 * Pick a shot size for a beat.
 *
 * Exported so the storyboard shot-list generator can reuse the same rule the
 * camera director uses, instead of hardcoding a framing per shot index.
 * `importance` is coalesced to 0: an absent importance must not be treated as
 * significant (`undefined > 0.85` was already false, so behaviour is unchanged).
 */
export declare function determineShotSize(beat: ShotSizeBeatInput, characterCount: number): string;
/**
 * Compositional rules that apply to a given framing.
 *
 * Exported so storyboard staging validation checks the same rules the camera
 * director claims to apply, rather than inventing a second rule set.
 */
export declare function generateFramingRules(shotSize: string, characterCount: number): string[];
export declare class CameraLayoutDirector {
    generate(input: CameraLayoutInput): CameraLayoutPlan;
}
