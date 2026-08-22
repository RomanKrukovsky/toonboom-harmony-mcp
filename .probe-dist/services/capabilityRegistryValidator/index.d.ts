/**
 * Capability registry + evidence promotion gate.
 *
 * `docs/capability_registry.json` is the machine-readable source of truth for what this
 * system can actually do. Unenforced, it is just another document that drifts ahead of
 * reality — the exact failure mode this repository has already hit: fabricated keypoint
 * confidence reported as `verified_real`, 71 non-decodable "preview" MP4s, and a weight
 * downloader whose declared SHA-256 values were never compared.
 *
 * This module encodes the evidence each verification level requires and refuses a level
 * that is not backed by artifacts on disk.
 *
 * Distinct from `src/services/capabilityRegistry`, which is an unrelated in-memory matrix
 * of Harmony operation backends consumed by `capabilityTools.ts`.
 *
 * Run via `npm run test:registry` and `npm run test:evidence`.
 */
import { z } from 'zod';
export declare const REGISTRY_PATH = "docs/capability_registry.json";
/** Ordered weakest to strongest; evidence requirements are cumulative. */
export declare const VERIFICATION_LEVELS: readonly ["not_implemented", "unaudited", "contract_verified", "offline_verified", "simulator_verified", "real_model_verified", "real_harmony_smoke_verified", "real_harmony_repeatably_verified", "shot_verified", "episode_verified"];
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];
/** At or above this level, evidence paths must exist on disk. */
export declare const EVIDENCE_REQUIRED_FROM: VerificationLevel;
/** At or above this level, the models used must be named with hashes, plus measurements. */
export declare const MODEL_EVIDENCE_REQUIRED_FROM: VerificationLevel;
export declare function levelRank(level: string): number;
export declare function atOrAbove(level: string, floor: VerificationLevel): boolean;
export declare const capabilitySchema: z.ZodObject<{
    capabilityId: z.ZodString;
    productionStage: z.ZodString;
    implementationFiles: z.ZodArray<z.ZodString, "many">;
    publicTools: z.ZodArray<z.ZodString, "many">;
    backendType: z.ZodString;
    verificationLevel: z.ZodEnum<["not_implemented", "unaudited", "contract_verified", "offline_verified", "simulator_verified", "real_model_verified", "real_harmony_smoke_verified", "real_harmony_repeatably_verified", "shot_verified", "episode_verified"]>;
    evidencePaths: z.ZodArray<z.ZodString, "many">;
    knownFailures: z.ZodArray<z.ZodString, "many">;
    blockingReason: z.ZodNullable<z.ZodString>;
    lastVerifiedAt: z.ZodString;
    nextRequiredProof: z.ZodString;
    models: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        role: z.ZodString;
        sha256: z.ZodString;
        sizeBytes: z.ZodOptional<z.ZodNumber>;
        hashVerified: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        sha256: string;
        role: string;
        sizeBytes?: number | undefined;
        hashVerified?: boolean | undefined;
    }, {
        name: string;
        sha256: string;
        role: string;
        sizeBytes?: number | undefined;
        hashVerified?: boolean | undefined;
    }>, "many">>;
    measured: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    blockingReason: string | null;
    capabilityId: string;
    productionStage: string;
    implementationFiles: string[];
    publicTools: string[];
    backendType: string;
    verificationLevel: "not_implemented" | "unaudited" | "contract_verified" | "offline_verified" | "simulator_verified" | "real_model_verified" | "real_harmony_smoke_verified" | "real_harmony_repeatably_verified" | "shot_verified" | "episode_verified";
    evidencePaths: string[];
    knownFailures: string[];
    lastVerifiedAt: string;
    nextRequiredProof: string;
    models?: {
        name: string;
        sha256: string;
        role: string;
        sizeBytes?: number | undefined;
        hashVerified?: boolean | undefined;
    }[] | undefined;
    measured?: Record<string, any> | undefined;
}, {
    blockingReason: string | null;
    capabilityId: string;
    productionStage: string;
    implementationFiles: string[];
    publicTools: string[];
    backendType: string;
    verificationLevel: "not_implemented" | "unaudited" | "contract_verified" | "offline_verified" | "simulator_verified" | "real_model_verified" | "real_harmony_smoke_verified" | "real_harmony_repeatably_verified" | "shot_verified" | "episode_verified";
    evidencePaths: string[];
    knownFailures: string[];
    lastVerifiedAt: string;
    nextRequiredProof: string;
    models?: {
        name: string;
        sha256: string;
        role: string;
        sizeBytes?: number | undefined;
        hashVerified?: boolean | undefined;
    }[] | undefined;
    measured?: Record<string, any> | undefined;
}>;
export declare const registrySchema: z.ZodObject<{
    schemaVersion: z.ZodString;
    generatedAt: z.ZodString;
    verificationLevels: z.ZodArray<z.ZodString, "many">;
    capabilities: z.ZodArray<z.ZodObject<{
        capabilityId: z.ZodString;
        productionStage: z.ZodString;
        implementationFiles: z.ZodArray<z.ZodString, "many">;
        publicTools: z.ZodArray<z.ZodString, "many">;
        backendType: z.ZodString;
        verificationLevel: z.ZodEnum<["not_implemented", "unaudited", "contract_verified", "offline_verified", "simulator_verified", "real_model_verified", "real_harmony_smoke_verified", "real_harmony_repeatably_verified", "shot_verified", "episode_verified"]>;
        evidencePaths: z.ZodArray<z.ZodString, "many">;
        knownFailures: z.ZodArray<z.ZodString, "many">;
        blockingReason: z.ZodNullable<z.ZodString>;
        lastVerifiedAt: z.ZodString;
        nextRequiredProof: z.ZodString;
        models: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            role: z.ZodString;
            sha256: z.ZodString;
            sizeBytes: z.ZodOptional<z.ZodNumber>;
            hashVerified: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            sha256: string;
            role: string;
            sizeBytes?: number | undefined;
            hashVerified?: boolean | undefined;
        }, {
            name: string;
            sha256: string;
            role: string;
            sizeBytes?: number | undefined;
            hashVerified?: boolean | undefined;
        }>, "many">>;
        measured: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        blockingReason: string | null;
        capabilityId: string;
        productionStage: string;
        implementationFiles: string[];
        publicTools: string[];
        backendType: string;
        verificationLevel: "not_implemented" | "unaudited" | "contract_verified" | "offline_verified" | "simulator_verified" | "real_model_verified" | "real_harmony_smoke_verified" | "real_harmony_repeatably_verified" | "shot_verified" | "episode_verified";
        evidencePaths: string[];
        knownFailures: string[];
        lastVerifiedAt: string;
        nextRequiredProof: string;
        models?: {
            name: string;
            sha256: string;
            role: string;
            sizeBytes?: number | undefined;
            hashVerified?: boolean | undefined;
        }[] | undefined;
        measured?: Record<string, any> | undefined;
    }, {
        blockingReason: string | null;
        capabilityId: string;
        productionStage: string;
        implementationFiles: string[];
        publicTools: string[];
        backendType: string;
        verificationLevel: "not_implemented" | "unaudited" | "contract_verified" | "offline_verified" | "simulator_verified" | "real_model_verified" | "real_harmony_smoke_verified" | "real_harmony_repeatably_verified" | "shot_verified" | "episode_verified";
        evidencePaths: string[];
        knownFailures: string[];
        lastVerifiedAt: string;
        nextRequiredProof: string;
        models?: {
            name: string;
            sha256: string;
            role: string;
            sizeBytes?: number | undefined;
            hashVerified?: boolean | undefined;
        }[] | undefined;
        measured?: Record<string, any> | undefined;
    }>, "many">;
    fixtureNotes: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>, "many">>;
}, "strip", z.ZodTypeAny, {
    schemaVersion: string;
    capabilities: {
        blockingReason: string | null;
        capabilityId: string;
        productionStage: string;
        implementationFiles: string[];
        publicTools: string[];
        backendType: string;
        verificationLevel: "not_implemented" | "unaudited" | "contract_verified" | "offline_verified" | "simulator_verified" | "real_model_verified" | "real_harmony_smoke_verified" | "real_harmony_repeatably_verified" | "shot_verified" | "episode_verified";
        evidencePaths: string[];
        knownFailures: string[];
        lastVerifiedAt: string;
        nextRequiredProof: string;
        models?: {
            name: string;
            sha256: string;
            role: string;
            sizeBytes?: number | undefined;
            hashVerified?: boolean | undefined;
        }[] | undefined;
        measured?: Record<string, any> | undefined;
    }[];
    generatedAt: string;
    verificationLevels: string[];
    fixtureNotes?: Record<string, any>[] | undefined;
}, {
    schemaVersion: string;
    capabilities: {
        blockingReason: string | null;
        capabilityId: string;
        productionStage: string;
        implementationFiles: string[];
        publicTools: string[];
        backendType: string;
        verificationLevel: "not_implemented" | "unaudited" | "contract_verified" | "offline_verified" | "simulator_verified" | "real_model_verified" | "real_harmony_smoke_verified" | "real_harmony_repeatably_verified" | "shot_verified" | "episode_verified";
        evidencePaths: string[];
        knownFailures: string[];
        lastVerifiedAt: string;
        nextRequiredProof: string;
        models?: {
            name: string;
            sha256: string;
            role: string;
            sizeBytes?: number | undefined;
            hashVerified?: boolean | undefined;
        }[] | undefined;
        measured?: Record<string, any> | undefined;
    }[];
    generatedAt: string;
    verificationLevels: string[];
    fixtureNotes?: Record<string, any>[] | undefined;
}>;
export type Capability = z.infer<typeof capabilitySchema>;
export type CapabilityRegistry = z.infer<typeof registrySchema>;
export interface RegistryViolation {
    capabilityId: string;
    rule: string;
    detail: string;
}
/** Evidence entries may carry a trailing note; only the leading token is a path. */
export declare function evidencePathOf(entry: string): string;
/** True when an entry is explicitly declared as not committed to the repository. */
export declare function isLocalOnlyEvidence(entry: string): boolean;
export declare function loadRegistry(repoRoot?: string): CapabilityRegistry;
/**
 * Apply the promotion rules. Collects every violation rather than throwing on the first,
 * so one run reports the whole picture.
 */
export declare function validateRegistry(registry: CapabilityRegistry, repoRoot?: string): RegistryViolation[];
export interface EvidenceViolation {
    bundle: string;
    rule: string;
    detail: string;
}
/** Markers left behind by generators that fabricate media instead of encoding it. */
export declare const FABRICATION_MARKERS: string[];
export declare function sha256OfFile(target: string): string;
/**
 * A media file is fabricated when it is tiny and its bytes are printable ASCII containing a
 * placeholder marker. Real encoded media is binary and far larger.
 */
export declare function isFabricatedMedia(target: string): {
    fabricated: boolean;
    reason?: string;
};
/**
 * Validate one evidence bundle: hashes.json matches the bytes on disk, no absolute user
 * paths leak into JSON, and no fabricated media masquerades as a produced artifact.
 */
export declare function validateEvidenceBundle(bundleDir: string): EvidenceViolation[];
/** Committed evidence bundles: immediate subdirectories of docs/evidence. */
export declare function listCommittedEvidenceBundles(repoRoot?: string): string[];
/**
 * Scan a directory tree for fabricated media. Used to report — not silently tolerate —
 * placeholder artifacts left in local output directories.
 */
export declare function scanForFabricatedMedia(root: string, options?: {
    maxFiles?: number;
}): Array<{
    file: string;
    reason: string;
}>;
