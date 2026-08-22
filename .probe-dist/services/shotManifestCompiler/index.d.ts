import { type ShotManifest, type ShowBibleCrossRefs, CrossReferenceViolation } from '../../schemas/shotManifest.js';
import { type PerformancePIR } from '../../schemas/performancePir.js';
/**
 * ShotManifestCompiler — deterministic bridge from a ShotManifest to a
 * PerformancePIR that the RetargetingResolver + HarmonyCommandBuilder can
 * consume.
 *
 * Roadmap contract (ROADMAP §"Компилятор шота"):
 *   Сценарий -> ShotManifest -> постановка и тайминг -> PerformancePIR
 *   -> HarmonyCommandPlan -> редактируемая сцена Harmony
 *
 * Rules:
 *   1. The compiler MUST refuse any ShotManifest that violates the ShowBible
 *      cross-reference. Unknown shot sizes / camera moves / emotions / characters
 *      are hard rejections. The LLM is never allowed to invent moves.
 *   2. Output is deterministic: the same (manifest, showBibleRef) always
 *      produces the same PerformancePIR, including a stable performanceId
 *      derived from a SHA-256 of the manifest.
 *   3. Keys are placed ONLY on beat boundaries declared in the manifest. The
 *      compiler does not invent acting — it maps declared beats to transform
 *      tracks using the controller map from the CharacterBible.
 */
export interface ShotManifestCompilerOptions {
    /**
     * Map from `characterId` to a list of controller bindings (from
     * CharacterBible.controllers). The compiler uses this to decide which peg
     * nodes receive keyframes for each beat. If a beat references a gestureId
     * or poseLibraryRef that is not in this map, the beat is emitted as a HOLD
     * rather than a guessed motion.
     */
    controllerMaps?: Record<string, Array<{
        controllerId: string;
        nodePath: string;
    }>>;
}
export interface ShotManifestCompilerResult {
    performance: PerformancePIR;
    violations: CrossReferenceViolation[];
    warnings: string[];
}
export declare class ShotManifestCompiler {
    compile(manifest: ShotManifest, refs: ShowBibleCrossRefs, options?: ShotManifestCompilerOptions): ShotManifestCompilerResult;
    private applyBeat;
    private emptyPerformance;
    private derivePerformanceId;
}
