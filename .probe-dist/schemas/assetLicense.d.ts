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
export declare const ASSET_LICENSE_SCHEMA_VERSION = "1.0";
export declare const assetLicenseSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    assetId: z.ZodString;
    creator: z.ZodString;
    source: z.ZodEnum<["commission", "self_recorded", "toonboom_learn_fixture", "pexels", "freesound_cc0", "freesound_cc_by", "wikimedia_cc_by", "wikimedia_cc_by_sa", "wikimedia_public_domain", "other"]>;
    license: z.ZodString;
    commercialUse: z.ZodBoolean;
    modificationAllowed: z.ZodBoolean;
    datasetUseAllowed: z.ZodBoolean;
    redistributionAllowed: z.ZodBoolean;
    contractPath: z.ZodString;
    forbiddenTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    sha256: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    source: "commission" | "self_recorded" | "toonboom_learn_fixture" | "pexels" | "freesound_cc0" | "freesound_cc_by" | "wikimedia_cc_by" | "wikimedia_cc_by_sa" | "wikimedia_public_domain" | "other";
    schemaVersion: "1.0";
    assetId: string;
    creator: string;
    license: string;
    commercialUse: boolean;
    modificationAllowed: boolean;
    datasetUseAllowed: boolean;
    redistributionAllowed: boolean;
    contractPath: string;
    forbiddenTags: string[];
    sha256?: string | undefined;
    notes?: string | undefined;
}, {
    source: "commission" | "self_recorded" | "toonboom_learn_fixture" | "pexels" | "freesound_cc0" | "freesound_cc_by" | "wikimedia_cc_by" | "wikimedia_cc_by_sa" | "wikimedia_public_domain" | "other";
    schemaVersion: "1.0";
    assetId: string;
    creator: string;
    license: string;
    commercialUse: boolean;
    modificationAllowed: boolean;
    datasetUseAllowed: boolean;
    redistributionAllowed: boolean;
    contractPath: string;
    sha256?: string | undefined;
    notes?: string | undefined;
    forbiddenTags?: string[] | undefined;
}>;
export type AssetLicense = z.infer<typeof assetLicenseSchema>;
/**
 * Reject a licence whose tags intersect the ShowBible's forbiddenSources list.
 * NC and CC BY-SA are the two most common reasons to reject a file in the
 * commercial core.
 */
export declare function assertLicenseAllowed(license: AssetLicense, forbiddenSources: string[]): {
    allowed: boolean;
    reason?: string;
};
