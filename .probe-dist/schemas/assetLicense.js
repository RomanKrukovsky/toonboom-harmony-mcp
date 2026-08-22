import { z } from 'zod';
/**
 * assetLicense.ts — per-asset legal manifest.
 *
 * Roadmap contract (ROADMAP §"Asset licensing"): every external file that
 * enters the project gets an `asset_license.json` next to it. The field set
 * is taken verbatim from the plan:
 *
 *   assetId, creator, source, license, commercialUse, modificationAllowed,
 *   datasetUseAllowed, redistributionAllowed, contractPath.
 *
 * The ShowBible's `forbiddenSources` list (e.g. ["NC", "third_party_series"])
 * is checked by `assertLicenseAllowed()` so the loader can refuse NC-licensed
 * material in the commercial core.
 */
export const ASSET_LICENSE_SCHEMA_VERSION = '1.0';
export const assetLicenseSchema = z.object({
    schemaVersion: z.literal(ASSET_LICENSE_SCHEMA_VERSION),
    assetId: z.string().min(1),
    creator: z.string().min(1),
    source: z.enum([
        'commission',
        'self_recorded',
        'toonboom_learn_fixture',
        'pexels',
        'freesound_cc0',
        'freesound_cc_by',
        'wikimedia_cc_by',
        'wikimedia_cc_by_sa',
        'wikimedia_public_domain',
        'other'
    ]).describe('Origin of the file. NC-licensed sources are rejected in the commercial core.'),
    license: z.string().min(1).describe('Human-readable licence label, e.g. "exclusive commercial assignment", "CC0", "CC BY 4.0".'),
    commercialUse: z.boolean(),
    modificationAllowed: z.boolean(),
    datasetUseAllowed: z.boolean().describe('May be stored, versioned, and used to train/evaluate the factory pipeline.'),
    redistributionAllowed: z.boolean().describe('May the original file be redistributed (usually false for commissioned rigs).'),
    contractPath: z.string().min(1).describe('Path to the signed contract / permission document (PDF).'),
    forbiddenTags: z.array(z.string()).default([]).describe('Licence tags that must NOT be present, e.g. ["NC", "SA"].'),
    sha256: z.string().regex(/^[a-f0-9]{64}$/).optional().describe('SHA-256 of the asset file, for integrity tracking.'),
    notes: z.string().optional()
}).strict();
/**
 * Reject a licence whose tags intersect the ShowBible's forbiddenSources list.
 * NC and CC BY-SA are the two most common reasons to reject a file in the
 * commercial core.
 */
export function assertLicenseAllowed(license, forbiddenSources) {
    // Hard reject NC / NonCommercial in the commercial core.
    const tag = license.license.toUpperCase();
    if (tag.includes('NC') || tag.includes('NONCOMMERCIAL')) {
        return { allowed: false, reason: 'Licence is NonCommercial (NC) — rejected in the commercial core.' };
    }
    for (const forbidden of forbiddenSources) {
        const up = forbidden.toUpperCase();
        if (tag.includes(up)) {
            return { allowed: false, reason: `Licence tag "${forbidden}" is in ShowBible.forbiddenSources.` };
        }
        if (license.forbiddenTags.some(t => t.toUpperCase() === up)) {
            return { allowed: false, reason: `Asset declares forbidden tag "${forbidden}".` };
        }
    }
    if (!license.commercialUse) {
        return { allowed: false, reason: 'commercialUse is false.' };
    }
    if (!license.modificationAllowed) {
        return { allowed: false, reason: 'modificationAllowed is false — factory pipeline needs to modify assets.' };
    }
    return { allowed: true };
}
