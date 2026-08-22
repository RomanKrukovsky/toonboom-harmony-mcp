import { type HarmonyCommandPlanV4 } from '../../schemas/harmonyCommandPlanV4.js';
export declare class HarmonyCommandPlanV4Compiler {
    compile(raw: unknown, source?: string): HarmonyCommandPlanV4;
    verifyOffline(plan: HarmonyCommandPlanV4): {
        status: string;
        executed: boolean;
        verified: boolean;
        artifactCreated: boolean;
        requiresRealHarmony: boolean;
        errors: string[];
        checks: {
            commandCount: number;
            uniqueIdempotencyKeys: number;
            acceptanceGateCount: number;
            offlineContractValid: boolean;
        };
        warnings: string[];
    };
    exportBundle(plan: HarmonyCommandPlanV4, manifest: unknown, directory: string): {
        status: string;
        executed: boolean;
        verified: boolean;
        artifactCreated: boolean;
        bundlePath: string;
        files: {
            name: string;
            sha256: string;
            size: number;
        }[];
        warnings: string[];
    };
}
