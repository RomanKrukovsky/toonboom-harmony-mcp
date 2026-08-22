import fs from 'fs';
import path from 'path';
import { validatePath } from '../../config.js';
import { HarmonyError } from '../../security.js';
import { showBibleSchema, characterBibleSchema, cameraRulesSchema, motionGrammarSchema, paletteManifestSchema, qaThresholdsSchema, assertShowBibleVersion } from '../../schemas/showBible.js';
import { assetLicenseSchema, assertLicenseAllowed } from '../../schemas/assetLicense.js';
export class ShowBibleLoader {
    load(showBiblePath) {
        this.assertAllowed(showBiblePath);
        const showBible = this.parseAndValidate(showBiblePath, showBibleSchema, 'show_bible');
        assertShowBibleVersion(showBible);
        const baseDir = path.dirname(showBiblePath);
        const characterBibles = showBible.characterBibles.map((entry) => {
            const p = this.resolveRef(baseDir, entry.ref);
            return this.parseAndValidate(p, characterBibleSchema, 'character_bible');
        });
        const cameraRules = this.parseAndValidate(this.resolveRef(baseDir, showBible.cameraRulesRef), cameraRulesSchema, 'camera_rules');
        const motionGrammar = this.parseAndValidate(this.resolveRef(baseDir, showBible.motionGrammarRef), motionGrammarSchema, 'motion_grammar');
        const paletteManifest = this.parseAndValidate(this.resolveRef(baseDir, showBible.paletteManifestRef), paletteManifestSchema, 'palette_manifest');
        const qaThresholds = this.parseAndValidate(this.resolveRef(baseDir, showBible.qaThresholdsRef), qaThresholdsSchema, 'qa_thresholds');
        this.assertPaletteRefs(showBible, paletteManifest);
        for (const cb of characterBibles) {
            if (cb.paletteRef !== paletteManifest.paletteId) {
                throw new HarmonyError('INVALID_HARMONY_OBJECT', `character_bible "${cb.characterId}" references paletteRef "${cb.paletteRef}" which does not match palette_manifest id "${paletteManifest.paletteId}"`);
            }
            // Legal cleanliness: every commissioned rig must carry an asset_license.json
            // whose contract path is inside allowedRoots and whose licence is allowed
            // by the ShowBible's forbiddenSources list.
            const licensePath = this.resolveRef(baseDir, cb.provenance.licensePath);
            const license = this.parseAndValidate(licensePath, assetLicenseSchema, 'asset_license');
            const verdict = assertLicenseAllowed(license, showBible.forbiddenSources);
            if (!verdict.allowed) {
                throw new HarmonyError('INVALID_HARMONY_OBJECT', `character_bible "${cb.characterId}" asset_license rejected: ${verdict.reason}`);
            }
        }
        const crossRefs = {
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
    buildControllerMaps(loaded) {
        const out = {};
        for (const cb of loaded.characterBibles) {
            out[cb.characterId] = cb.controllers.map(c => ({
                controllerId: c.controllerId,
                nodePath: c.nodePath
            }));
        }
        return out;
    }
    parseAndValidate(filePath, schema, label) {
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
        return result.data;
    }
    resolveRef(baseDir, ref) {
        if (path.isAbsolute(ref)) {
            this.assertAllowed(ref);
            return ref;
        }
        const resolved = path.resolve(baseDir, ref);
        this.assertAllowed(resolved);
        return resolved;
    }
    assertAllowed(filePath) {
        if (!validatePath(filePath)) {
            throw new HarmonyError('PATH_NOT_ALLOWED', `ShowBible path outside allowedRoots: ${filePath}`);
        }
    }
    assertPaletteRefs(showBible, palette) {
        const ids = new Set(palette.colours.map(c => c.colourId));
        const required = [
            showBible.lineRules.lineColourId,
            showBible.lineRules.fillColourId,
            showBible.lighting.shadowColourId
        ];
        for (const id of required) {
            if (!ids.has(id)) {
                throw new HarmonyError('INVALID_HARMONY_OBJECT', `show_bible references colourId "${id}" not present in palette_manifest "${palette.paletteId}"`);
            }
        }
    }
    collectAllowedEmotions(grammar) {
        const set = new Set();
        for (const rule of grammar.rules) {
            for (const e of rule.allowedEmotions)
                set.add(e);
        }
        return Array.from(set);
    }
    collectAllowedGestures(grammar) {
        const set = new Set();
        for (const rule of grammar.rules) {
            for (const g of rule.allowedGestures)
                set.add(g);
        }
        return Array.from(set);
    }
}
