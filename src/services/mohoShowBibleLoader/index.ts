import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { validatePath } from '../../config.js';
import { HarmonyError } from '../../security.js';
import {
  mohoShowBibleSchema,
  assertMohoShowBibleVersion,
  type MohoShowBible
} from '../../schemas/mohoShowBible.js';
import { mohoCharacterBibleSchema, type MohoCharacterBible } from '../../schemas/mohoCharacterBible.js';
import { mohoCameraRulesSchema, type MohoCameraRules } from '../../schemas/mohoCameraRules.js';
import { mohoMotionGrammarSchema, type MohoMotionGrammar } from '../../schemas/mohoMotionGrammar.js';
import { mohoPaletteManifestSchema, type MohoPaletteManifest } from '../../schemas/mohoPaletteManifest.js';
import { mohoQaThresholdsSchema, type MohoQaThresholds } from '../../schemas/mohoQaThresholds.js';
import { assetLicenseSchema, assertLicenseAllowed, type AssetLicense } from '../../schemas/assetLicense.js';

/**
 * MohoShowBibleLoader — loads the six ShowBible family documents (Moho
 * variants) from disk, validates each against its schema, cross-links them,
 * and produces the `MohoShowBibleCrossRefs` object consumed downstream by
 * the Moho command-plan / production-rig compilers.
 *
 * All paths must be inside `config.allowedRoots`. The loader refuses any
 * document whose schemaVersion major is not 1. The fingerprint is a
 * SHA-256 of the canonicalised bundle (sorted keys) so two loads of the
 * same on-disk set always produce the same hash.
 *
 * Note: Zod v3 `.default()` does not propagate into `z.output` as required
 * fields, so we cast the parsed-and-validated data back to the exported
 * `z.infer` types at the call boundary. The data is guaranteed valid by
 * `safeParse` at runtime.
 */

export interface MohoShowBibleCrossRefs {
  characterIds: string[];
  allowedRigTypes: string[];
  cameraRules: { allowedShotSizes: string[]; allowedCameraMoves: string[] };
  motionGrammar: { allowedEmotions: string[]; allowedGestures: string[] };
}

export interface LoadedMohoShowBible {
  mohoShowBible: MohoShowBible;
  characterBibles: MohoCharacterBible[];
  cameraRules: MohoCameraRules;
  motionGrammar: MohoMotionGrammar;
  paletteManifest: MohoPaletteManifest;
  qaThresholds: MohoQaThresholds;
  fingerprint: string;
  crossRefs: MohoShowBibleCrossRefs;
}

export class MohoShowBibleLoader {
  load(mohoShowBiblePath: string): LoadedMohoShowBible {
    this.assertAllowed(mohoShowBiblePath);
    const mohoShowBible = this.parseAndValidate<MohoShowBible>(
      mohoShowBiblePath,
      mohoShowBibleSchema,
      'moho_show_bible'
    );
    assertMohoShowBibleVersion(mohoShowBible);

    const baseDir = path.dirname(mohoShowBiblePath);

    const characterBibles = mohoShowBible.characterBibles.map((entry: { characterId: string; ref: string }) => {
      const p = this.resolveRef(baseDir, entry.ref);
      return this.parseAndValidate<MohoCharacterBible>(p, mohoCharacterBibleSchema, 'character_bible');
    });

    const cameraRules = this.parseAndValidate<MohoCameraRules>(
      this.resolveRef(baseDir, mohoShowBible.cameraRulesRef),
      mohoCameraRulesSchema,
      'camera_rules'
    );
    const motionGrammar = this.parseAndValidate<MohoMotionGrammar>(
      this.resolveRef(baseDir, mohoShowBible.motionGrammarRef),
      mohoMotionGrammarSchema,
      'motion_grammar'
    );
    const paletteManifest = this.parseAndValidate<MohoPaletteManifest>(
      this.resolveRef(baseDir, mohoShowBible.paletteManifestRef),
      mohoPaletteManifestSchema,
      'palette_manifest'
    );
    const qaThresholds = this.parseAndValidate<MohoQaThresholds>(
      this.resolveRef(baseDir, mohoShowBible.qaThresholdsRef),
      mohoQaThresholdsSchema,
      'qa_thresholds'
    );

    this.assertPaletteRefs(mohoShowBible, paletteManifest);
    this.assertRigTypeRefs(mohoShowBible, characterBibles);

    for (const cb of characterBibles) {
      if (cb.paletteRef !== paletteManifest.paletteId) {
        throw new HarmonyError(
          'INVALID_HARMONY_OBJECT',
          `character_bible "${cb.characterId}" references paletteRef "${cb.paletteRef}" which does not match palette_manifest id "${paletteManifest.paletteId}"`
        );
      }
      const licensePath = this.resolveRef(baseDir, cb.provenance.licensePath);
      const license = this.parseAndValidate<AssetLicense>(licensePath, assetLicenseSchema, 'asset_license');
      const verdict = assertLicenseAllowed(license, mohoShowBible.forbiddenSources);
      if (!verdict.allowed) {
        throw new HarmonyError(
          'INVALID_HARMONY_OBJECT',
          `character_bible "${cb.characterId}" asset_license rejected: ${verdict.reason}`
        );
      }
    }

    const crossRefs: MohoShowBibleCrossRefs = {
      characterIds: characterBibles.map(cb => cb.characterId),
      allowedRigTypes: mohoShowBible.allowedRigTypes,
      cameraRules: {
        allowedShotSizes: cameraRules.allowedShotSizes,
        allowedCameraMoves: cameraRules.allowedCameraMoves
      },
      motionGrammar: {
        allowedEmotions: this.collectAllowedEmotions(motionGrammar),
        allowedGestures: this.collectAllowedGestures(motionGrammar)
      }
    };

    const fingerprint = this.computeFingerprint({
      mohoShowBible,
      characterBibles,
      cameraRules,
      motionGrammar,
      paletteManifest,
      qaThresholds
    });

    return {
      mohoShowBible,
      characterBibles,
      cameraRules,
      motionGrammar,
      paletteManifest,
      qaThresholds,
      fingerprint,
      crossRefs
    };
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
      throw new HarmonyError('PATH_NOT_ALLOWED', `MohoShowBible path outside allowedRoots: ${filePath}`);
    }
  }

  private assertPaletteRefs(show: MohoShowBible, palette: MohoPaletteManifest): void {
    const ids = new Set(palette.colours.map(c => c.colourId));
    const required = [
      show.lineRules.lineColourId,
      show.lineRules.fillColourId,
      show.lighting.shadowColourId
    ];
    for (const id of required) {
      if (!ids.has(id)) {
        throw new HarmonyError(
          'INVALID_HARMONY_OBJECT',
          `moho_show_bible references colourId "${id}" not present in palette_manifest "${palette.paletteId}"`
        );
      }
    }
  }

  private assertRigTypeRefs(show: MohoShowBible, characters: MohoCharacterBible[]): void {
    const allowed = new Set(show.allowedRigTypes);
    for (const cb of characters) {
      if (!allowed.has(cb.rigType)) {
        throw new HarmonyError(
          'INVALID_HARMONY_OBJECT',
          `character_bible "${cb.characterId}" declares rigType "${cb.rigType}" which is not in moho_show_bible.allowedRigTypes [${Array.from(allowed).join(', ')}]`
        );
      }
    }
  }

  private collectAllowedEmotions(grammar: MohoMotionGrammar): string[] {
    const set = new Set<string>();
    for (const rule of grammar.rules) {
      for (const e of rule.allowedEmotions) set.add(e);
    }
    return Array.from(set);
  }

  private collectAllowedGestures(grammar: MohoMotionGrammar): string[] {
    const set = new Set<string>();
    for (const rule of grammar.rules) {
      for (const g of rule.allowedGestures) set.add(g);
    }
    return Array.from(set);
  }

  private computeFingerprint(bundle: {
    mohoShowBible: MohoShowBible;
    characterBibles: MohoCharacterBible[];
    cameraRules: MohoCameraRules;
    motionGrammar: MohoMotionGrammar;
    paletteManifest: MohoPaletteManifest;
    qaThresholds: MohoQaThresholds;
  }): string {
    const canonical = JSON.stringify(bundle, (_key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const sorted: Record<string, unknown> = {};
        for (const k of Object.keys(value).sort()) sorted[k] = (value as Record<string, unknown>)[k];
        return sorted;
      }
      return value;
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }
}