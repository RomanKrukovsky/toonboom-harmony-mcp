export type HarmonyEngineMode = 'real' | 'simulation' | 'hybrid' | 'moonshot';
export interface OnePromptIterationConfig {
    maxIterations: number;
    targetScore: number;
    stopIfNoImprovement: boolean;
    requireHumanApprovalForFinal: boolean;
}
export interface BackendConfig {
    image: 'none' | 'openai' | 'stability' | 'mock';
    audio: 'none' | 'openai' | 'elevenlabs' | 'mock';
    llm: 'none' | 'openai' | 'anthropic' | 'openrouter' | 'mock';
    apiKeys: {
        openai?: string;
        stability?: string;
        elevenlabs?: string;
        anthropic?: string;
        openrouter?: string;
    };
    openrouterModel?: string;
}
export interface HarmonyConfig {
    harmonyInstall: string;
    harmonyCcBin: string;
    harmonyBin: string;
    harmonyPythonPackages: string;
    harmonyCcHost: string;
    harmonyCcPort: number;
    harmonyCcUser: string;
    scriptTimeoutMs: number;
    dryRunDefault: boolean;
    allowDestructive: boolean;
    allowRawScripts: boolean;
    allowedRoots: string[];
    logDir: string;
    engineMode: HarmonyEngineMode;
    onePromptIteration: OnePromptIterationConfig;
    backends: BackendConfig;
    reconstruction: {
        coreUrl: string;
        mlCoreUrl: string;
        cacheRoot: string;
        modelRoot: string;
        device: string;
        maxConcurrentJobs: number;
        requestTimeoutMs: number;
        maxDurationSeconds: number;
        maxWidth: number;
        maxHeight: number;
        ffmpegPath: string;
        ffprobePath: string;
    };
}
export declare function getProjectRoot(): string;
export declare const config: HarmonyConfig;
export declare const DEFAULT_MOUTH_SHAPES: readonly ["A", "E", "I", "O", "U", "M", "F", "L", "S", "rest"];
export declare const REQUIRED_VIEWS_360: readonly ["front", "front_3q_left", "side_left", "back_3q_left", "back", "back_3q_right", "side_right", "front_3q_right"];
export declare function validatePath(filePath: string): boolean;
