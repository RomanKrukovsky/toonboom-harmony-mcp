/**
 * Harmony Action Recorder configuration.
 *
 * Every limit exists to stop a long animator session from producing an unbounded artifact,
 * and to stop a huge scene from being fully re-snapshotted on every notifier signal.
 */
export interface RecorderCaptureCategories {
    nodes: boolean;
    connections: boolean;
    nodeAttributes: boolean;
    columns: boolean;
    keyframes: boolean;
    exposures: boolean;
    camera: boolean;
}
export interface HarmonyRecorderConfig {
    /** Root of immutable per-session evidence directories. */
    artifactRoot: string;
    /** Quiet period after the last notifier signal before dirty entities are re-read. */
    debounceMs: number;
    maxNodes: number;
    maxColumns: number;
    maxKeyframes: number;
    maxEvents: number;
    /** Scene files must live under one of these roots. Empty means "use config.allowedRoots". */
    allowedSceneRoots: string[];
    /** Replace absolute scene paths with hashes in exported dataset entries. */
    redactScenePaths: boolean;
    /** Additional substrings that must never appear in an exported dataset entry. */
    redactPatterns: string[];
    categories: RecorderCaptureCategories;
}
export declare function loadRecorderConfig(overrides?: Partial<HarmonyRecorderConfig>): HarmonyRecorderConfig;
/**
 * Canonical-resolve a scene path and require it to sit under an allowed root.
 * Falls back to the server-wide allowlist when no recorder-specific roots are configured.
 */
export declare function resolveAllowedScenePath(scenePath: string, cfg: HarmonyRecorderConfig): string;
