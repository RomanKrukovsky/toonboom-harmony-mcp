import type { CharacterSpec } from '../../schemas/characterSpec.js';
export interface RigPart {
    name: string;
    nodeType: 'peg' | 'drawing' | 'group' | 'controller';
    parent?: string;
    notes?: string;
}
export interface SimpleRigSpec {
    characterName: string;
    rigType: 'front_only' | 'three_quarter' | 'symmetrical';
    parts: RigPart[];
    placeholderRigCreated: boolean;
    realRigCreated: boolean;
    missingAssets: string[];
    providedAssets: string[];
    nextBestAction: string;
    origin: 'placeholder' | 'assembled' | 'planned';
}
/**
 * RigSynthesizer — non-360 simple rig fallback.
 *
 * For productions that don't need a full 360 turnaround, this builds a
 * lighter front-facing or symmetrical rig plan. It follows the same
 * honesty rules as Rig360Synthesizer: no real rig without assets.
 */
export declare class RigSynthesizer {
    generateSpec(character: CharacterSpec): SimpleRigSpec;
    buildFromAssets(character: CharacterSpec, assetPaths: Record<string, string>): SimpleRigSpec;
    private detectRigType;
    private buildParts;
    private requiredAssets;
}
