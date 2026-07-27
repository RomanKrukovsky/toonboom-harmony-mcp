import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { validatePath } from '../../config.js';
import { HarmonyError } from '../../security.js';
import {
  showBibleSchema,
  characterBibleSchema,
  cameraRulesSchema,
  motionGrammarSchema,
  paletteManifestSchema,
  qaThresholdsSchema,
  assertShowBibleVersion,
  type ShowBible,
  type CharacterBible,
  type CameraRules,
  type MotionGrammar,
  type PaletteManifest,
  type QaThresholds
} from '../../schemas/showBible.js';
import { assetLicenseSchema, assertLicenseAllowed, type AssetLicense } from '../../schemas/assetLicense.js';
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

export class ShowBibleLoader {
  load(showBiblePath: string): LoadedShowBible {
    this.assertAllowed(showBiblePath);
    const showBible = this.parseAndValidate<ShowBible>(
      showBiblePath,
      showBibleSchema,
      'show_bible'
    );
    assertShowBibleVersion(showBible);

    const baseDir = path.dirname(showBiblePath);

    const characterBibles = showBible.characterBibles.map((entry: { characterId: string; ref: string }) => {
      const p = this.resolveRef(baseDir, entry.ref);
      return this.parseAndValidate<CharacterBible>(p, characterBibleSchema, 'character_bible');
    });

    const cameraRules = this.parseAndValidate<CameraRules>(
      this.resolveRef(baseDir, showBible.cameraRulesRef),
      cameraRulesSchema,
      'camera_rules'
    );
    const motionGrammar = this.parseAndValidate<MotionGrammar>(
      this.resolveRef(baseDir, showBible.motionGrammarRef),
      motionGrammarSchema,
      'motion_grammar'
    );
    const paletteManifest = this.parseAndValidate<PaletteManifest>(
      this.resolveRef(baseDir, showBible.paletteManifestRef),
      paletteManifestSchema,
      'palette_manifest'
    );
    const qaThresholds = this.parseAndValidate<QaThresholds>(
      this.resolveRef(baseDir, showBible.qaThresholdsRef),
      qaThresholdsSchema,
      'qa_thresholds'
    );

    this.assertPaletteRefs(showBible, paletteManifest);
    for (const cb of characterBibles) {
      if (cb.paletteRef !== paletteManifest.paletteId) {
        throw new HarmonyError(
          'INVALID_HARMONY_OBJECT',
          `character_bible "${cb.characterId}" references paletteRef "${cb.paletteRef}" which does not match palette_manifest id "${paletteManifest.paletteId}"`
        );
      }
      // Legal cleanliness: every commissioned rig must carry an asset_license.json
      // whose contract path is inside allowedRoots and whose licence is allowed
      // by the ShowBible's forbiddenSources list.
      const licensePath = this.resolveRef(baseDir, cb.provenance.licensePath);
      const license = this.parseAndValidate<AssetLicense>(licensePath, assetLicenseSchema, 'asset_license');
      const verdict = assertLicenseAllowed(license, showBible.forbiddenSources);
      if (!verdict.allowed) {
        throw new HarmonyError(
          'INVALID_HARMONY_OBJECT',
          `character_bible "${cb.characterId}" asset_license rejected: ${verdict.reason}`
        );
      }
    }

    const crossRefs: ShowBibleCrossRefs = {
      characterIds: characterBibles.map(cb => cb.characterId),
      cameraRules: {
        allowedShotSizes: cameraRules.allowedShotSizes,
        allowedCameraMoves: cameraRules.allowedCameraMoves
      },
      motionGrammar: {
        allowedEmotions: this.collectAllowedEmotions(motionGrammar),
        allowedGestures: this.collectAllowedGestures(motionGrammar)
      }
    };

    return {
      showBible,
      characterBibles,
      cameraRules,
      motionGrammar,
      paletteManifest,
      qaThresholds,
      crossRefs
    };
  }

  /**
   * Build a `controllerMaps` object (consumed by ShotManifestCompiler) from
   * the loaded CharacterBibles.
   */
  buildControllerMaps(
    loaded: LoadedShowBible
  ): Record<string, Array<{ controllerId: string; nodePath: string }>> {
    const out: Record<string, Array<{ controllerId: string; nodePath: string }>> = {};
    for (const cb of loaded.characterBibles) {
      out[cb.characterId] = cb.controllers.map(c => ({
        controllerId: c.controllerId,
        nodePath: c.nodePath
      }));
    }
    return out;
  }

  private parseAndValidate<T>(
    filePath: string,
    schema: { safeParse: (x: unknown) => { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> }; data?: unknown } },
    label: string
  ): T {
    if (!fs.existsSync(filePath)) {
      throw new HarmonyError('SCENE_NOT_FOUND', `${label} not found at ${filePath}`);
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const result = schema.safeParse(raw);
    if (!result.success) {
      const issues = result.error?.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') ?? 'unknown';
      throw new HarmonyError('INVALID_HARMONY_OBJECT', `${label} at ${filePath} failed schema validation: ${issues}`);
    }
    // safeParse returns the output shape (defaults filled); cast to T which is
    // the exported z.infer type. Runtime safety comes from safeParse success.
    return result.data as T;
  }

  private resolveRef(baseDir: string, ref: string): string {
    if (path.isAbsolute(ref)) {
      this.assertAllowed(ref);
      return ref;
    }
    const resolved = path.resolve(baseDir, ref);
    this.assertAllowed(resolved);
    return resolved;
  }

  private assertAllowed(filePath: string): void {
    if (!validatePath(filePath)) {
      throw new HarmonyError('PATH_NOT_ALLOWED', `ShowBible path outside allowedRoots: ${filePath}`);
    }
  }

  private assertPaletteRefs(showBible: ShowBible, palette: PaletteManifest): void {
    const ids = new Set(palette.colours.map(c => c.colourId));
    const required = [
      showBible.lineRules.lineColourId,
      showBible.lineRules.fillColourId,
      showBible.lighting.shadowColourId
    ];
    for (const id of required) {
      if (!ids.has(id)) {
        throw new HarmonyError(
          'INVALID_HARMONY_OBJECT',
          `show_bible references colourId "${id}" not present in palette_manifest "${palette.paletteId}"`
        );
      }
    }
  }

  private collectAllowedEmotions(grammar: MotionGrammar): string[] {
    const set = new Set<string>();
    for (const rule of grammar.rules) {
      for (const e of rule.allowedEmotions) set.add(e);
    }
    return Array.from(set);
  }

  private collectAllowedGestures(grammar: MotionGrammar): string[] {
    const set = new Set<string>();
    for (const rule of grammar.rules) {
      for (const g of rule.allowedGestures) set.add(g);
    }
    return Array.from(set);
  }
}