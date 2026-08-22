import { type ShowBible, type CharacterBible, type CameraRules, type MotionGrammar, type PaletteManifest, type QaThresholds } from '../../schemas/showBible.js';
import type { ShowBibleCrossRefs } from '../../schemas/shotManifest.js';
/**
 * ShowBibleLoader — loads the six ShowBible family documents from disk,
 * validates each against its schema, cross-links them, and produces the
 * `ShowBibleCrossRefs` object consumed by `crossReferenceShotManifest()`.
 *
 * All paths must be inside `config.allowedRoots`. The loader refuses any
 * document whose schemaVersion major is not 1.
 *
 * Note: Zod v3 `.default()` does not propagate into `z.output` as required
 * fields, so we cast the parsed-and-validated data back to the exported
 * `z.infer` types at the call boundary. The data is guaranteed valid by
 * `safeParse` at runtime.
 */
export interface LoadedShowBible {
    showBible: ShowBible;
    characterBibles: CharacterBible[];
    cameraRules: CameraRules;
    motionGrammar: MotionGrammar;
    paletteManifest: PaletteManifest;
    qaThresholds: QaThresholds;
    crossRefs: ShowBibleCrossRefs;
}
export declare class ShowBibleLoader {
    load(showBiblePath: string): LoadedShowBible;
    /**
     * Build a `controllerMaps` object (consumed by ShotManifestCompiler) from
     * the loaded CharacterBibles.
     */
    buildControllerMaps(loaded: LoadedShowBible): Record<string, Array<{
        controllerId: string;
        nodePath: string;
    }>>;
    private parseAndValidate;
    private resolveRef;
    private assertAllowed;
    private assertPaletteRefs;
    private collectAllowedEmotions;
    private collectAllowedGestures;
}
