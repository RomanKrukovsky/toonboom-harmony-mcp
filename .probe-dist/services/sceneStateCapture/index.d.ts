/**
 * Scene state capture contract.
 *
 * A provider reads a Harmony scene and returns a raw, unordered description. This module
 * normalizes it: applies canonical ordering, enforces size limits, validates against the
 * schema and computes an order-independent structural hash.
 *
 * The v1 contract intentionally covers only what can be read reliably: node graph,
 * static attributes, columns, keyframes, drawing exposures, camera and scene settings.
 * Everything else is declared in `notCaptured` rather than invented.
 */
import { HarmonySceneState, CaptureMode, CaptureSource, NotCapturedV1, SceneNode, SceneConnection, SceneNodeAttribute, SceneColumn, SceneKeyframe, SceneExposure } from '../../schemas/harmonyActionDataset.js';
import { HarmonyRecorderConfig } from '../harmonyActionRecorder/config.js';
/** Categories the v1 capture contract knowingly does not read from Harmony. */
export declare const NOT_CAPTURED_V1: NotCapturedV1[];
/** Provider output before normalization. */
export interface RawSceneState {
    nodes: SceneNode[];
    connections: SceneConnection[];
    nodeAttributes: SceneNodeAttribute[];
    columns: SceneColumn[];
    keyframes: SceneKeyframe[];
    exposures: SceneExposure[];
    camera?: HarmonySceneState['camera'];
    sceneSettings: HarmonySceneState['sceneSettings'];
    warnings?: string[];
    errors?: string[];
}
export interface SceneStateProviderContext {
    sessionId: string;
    sceneId: string;
    /** Canonical, allowlist-checked absolute scene path. Never embedded in artifacts. */
    scenePath: string;
    harmonyVersion: string;
}
export interface ProviderAvailability {
    source: CaptureSource;
    available: boolean;
    /** Exact reason the provider cannot read a real scene, verbatim from the runtime. */
    blockingReason?: string;
}
export interface SceneStateProvider {
    readonly source: CaptureSource;
    /** Probe the runtime. Must report honestly; never claim availability it has not verified. */
    describe(): Promise<ProviderAvailability>;
    captureFull(ctx: SceneStateProviderContext): Promise<RawSceneState>;
    /**
     * Optional incremental read of the given node paths / column names. Providers that cannot
     * scope a read return undefined and the recorder falls back to a full read.
     */
    captureEntities?(ctx: SceneStateProviderContext, targets: string[]): Promise<RawSceneState | undefined>;
}
export interface NormalizeOptions {
    sessionId: string;
    sceneId: string;
    scenePath: string;
    harmonyVersion: string;
    platform: string;
    source: CaptureSource;
    captureMode: CaptureMode;
    config: HarmonyRecorderConfig;
    capturedAt?: string;
    notCaptured?: NotCapturedV1[];
}
/**
 * Normalize a raw provider read into a validated, canonically ordered, hashed scene state.
 *
 * Disabled capture categories are emptied and recorded as a warning, so a consumer can tell
 * "this scene has no keyframes" apart from "keyframes were not captured".
 */
export declare function normalizeSceneState(raw: RawSceneState, options: NormalizeOptions): HarmonySceneState;
/** Re-validate a state read back from disk and confirm its hash still matches its content. */
export declare function verifySceneState(candidate: unknown): HarmonySceneState;
/**
 * Dirty-entity queue with debounce.
 *
 * A SceneChangeNotifier signal only says "something here may have changed". Entities are
 * queued on every signal and re-read once the scene has been quiet for `debounceMs`, so a
 * dragged handle produces one re-read instead of one per mouse move.
 */
export declare class DirtyEntityQueue {
    private readonly debounceMs;
    private readonly dirtyNodes;
    private readonly dirtyColumns;
    private lastTouchedAt;
    constructor(debounceMs: number);
    markNodes(paths: string[]): void;
    markColumns(names: string[]): void;
    get size(): number;
    snapshotCounts(): {
        dirtyNodes: number;
        dirtyColumns: number;
    };
    /** True once no signal has arrived for the debounce interval. */
    isSettled(now?: number): boolean;
    /** Milliseconds remaining before the queue settles. */
    remainingMs(now?: number): number;
    drain(): {
        nodes: string[];
        columns: string[];
    };
}
