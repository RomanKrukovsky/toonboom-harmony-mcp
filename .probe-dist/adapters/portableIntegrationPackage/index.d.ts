import type { HarmonyManifestV3 } from '../../schemas/harmonyManifestV3.js';
import type { CommandPlanV3 } from '../../schemas/harmonyCommandPlanV3.js';
export interface PackageInput {
    manifest: HarmonyManifestV3;
    commandPlan: CommandPlanV3;
    outputDir: string;
    packageName?: string;
}
export interface PackageResult {
    packagePath: string;
    files: string[];
    totalSize: number;
    manifest: any;
    readme: string;
}
export declare class PortableIntegrationPackageGenerator {
    generate(input: PackageInput): Promise<PackageResult>;
    private generateReadme;
    private generateIntegrationScript;
    private generateSchemaDoc;
    private summarizeManifest;
    private summarizeLimitations;
}
