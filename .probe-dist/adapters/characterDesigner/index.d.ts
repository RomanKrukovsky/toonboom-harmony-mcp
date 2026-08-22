import type { CharacterSpec } from '../../schemas/characterSpec.js';
/**
 * CharacterDesigner — produces a full CharacterSpec per character.
 *
 * Image backend presence is checked honestly: if no backend →
 * assetBackend=missing and full design prompts are generated as the
 * asset brief for external generation (ACTOR §6/§14).
 */
export declare class CharacterDesigner {
    generateSpecs(candidates: AnalysisResultLike['candidateCharacters'], bible: any): CharacterSpec[];
    private buildSpec;
    buildSpecFromArgs(args: {
        name: string;
        role: string;
        personality: string;
        visualStyle?: string;
        bodyType?: string;
        includeDesignPrompts?: boolean;
    }): CharacterSpec;
    generateTurnaroundPlan(characterSpec: CharacterSpec): {
        views: string[];
        layerPlan: any;
        notes: string;
    };
    generateLayeredAssetPlan(characterSpec: CharacterSpec): {
        layers: {
            group: string;
            layer: string;
            views: string[];
        }[];
    };
    private guessBodyType;
}
type CandidateLike = {
    name: string;
    role: string;
    oneLine: string;
};
interface AnalysisResultLike {
    candidateCharacters: CandidateLike[];
}
export {};
