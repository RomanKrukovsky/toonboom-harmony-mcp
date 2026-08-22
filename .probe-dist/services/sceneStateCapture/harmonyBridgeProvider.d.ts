/**
 * Real scene state provider backed by the headless Harmony Python bridge
 * (`scripts/python/harmony_bridge.py`, module `ToonBoom.harmony`).
 *
 * Read-only: it issues only `detect`, `inspect_project`, `list_nodes`, `get_node_attrs`,
 * `list_timeline` and `list_drawings`. It never writes to the scene.
 *
 * When the runtime refuses (no license, Harmony not running, module missing) the provider
 * reports the runtime's own message verbatim as the blocking reason instead of degrading
 * to synthetic data.
 */
import { ProviderAvailability, RawSceneState, SceneStateProvider, SceneStateProviderContext } from './index.js';
/** Attribute keywords treated as peg/transformation attributes when classifying operations. */
export declare const TRANSFORM_ATTRIBUTE_PREFIXES: string[];
export declare class HarmonyBridgeSceneStateProvider implements SceneStateProvider {
    private readonly timeoutMs;
    private readonly probeScenePath?;
    readonly source: "harmony_python_bridge";
    /**
     * @param probeScenePath when given, `describe()` asks the bridge to actually open this
     *        scene, so availability reflects the code path `captureFull` will take rather than
     *        the weaker question of whether a Harmony GUI session happens to be running.
     */
    constructor(timeoutMs?: number, probeScenePath?: string | undefined);
    describe(): Promise<ProviderAvailability>;
    captureFull(ctx: SceneStateProviderContext): Promise<RawSceneState>;
    private call;
}
/** True when an attribute keyword denotes a peg/transformation channel. */
export declare function isTransformAttribute(attribute: string): boolean;
