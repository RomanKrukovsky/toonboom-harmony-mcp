import { type CommandPlanV3 } from '../../schemas/harmonyCommandPlanV3.js';
import type { HarmonyManifestV3 } from '../../schemas/harmonyManifestV3.js';
export declare class HarmonyCommandPlanV3Generator {
    generate(manifest: HarmonyManifestV3): CommandPlanV3;
    private createOperation;
}
