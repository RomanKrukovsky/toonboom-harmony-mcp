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
import { HARMONY_ACTION_SCHEMA_VERSION, canonicalSort, computeSceneStateHash, harmonySceneStateSchema, hashScenePath } from '../../schemas/harmonyActionDataset.js';
import { HarmonyError } from '../../security.js';
/** Categories the v1 capture contract knowingly does not read from Harmony. */
export const NOT_CAPTURED_V1 = [
    'palettes',
    'deformer_chains',
    'master_controllers',
    'drawing_strokes',
    'art_layers',
    'sound_columns',
    'node_view_groups'
];
function enforceLimit(actual, limit, what) {
    if (actual > limit) {
        throw new HarmonyError('CAPTURE_LIMIT_EXCEEDED', `Scene exceeds the configured capture limit for ${what}: ${actual} > ${limit}.`, { what, actual, limit });
    }
}
/**
 * Normalize a raw provider read into a validated, canonically ordered, hashed scene state.
 *
 * Disabled capture categories are emptied and recorded as a warning, so a consumer can tell
 * "this scene has no keyframes" apart from "keyframes were not captured".
 */
export function normalizeSceneState(raw, options) {
    const { config } = options;
    const warnings = [...(raw.warnings ?? [])];
    const errors = [...(raw.errors ?? [])];
    const categories = config.categories;
    const nodes = categories.nodes ? raw.nodes : [];
    const connections = categories.connections ? raw.connections : [];
    const nodeAttributes = categories.nodeAttributes ? raw.nodeAttributes : [];
    const columns = categories.columns ? raw.columns : [];
    const keyframes = categories.keyframes ? raw.keyframes : [];
    const exposures = categories.exposures ? raw.exposures : [];
    const camera = categories.camera ? raw.camera : undefined;
    for (const [name, enabled] of Object.entries(categories)) {
        if (!enabled)
            warnings.push(`capture category "${name}" is disabled by configuration`);
    }
    enforceLimit(nodes.length, config.maxNodes, 'nodes');
    enforceLimit(columns.length, config.maxColumns, 'columns');
    enforceLimit(keyframes.length, config.maxKeyframes, 'keyframes');
    const base = {
        schemaVersion: HARMONY_ACTION_SCHEMA_VERSION,
        kind: 'HarmonySceneState',
        sessionId: options.sessionId,
        sceneId: options.sceneId,
        scenePathHash: hashScenePath(options.scenePath),
        harmonyVersion: options.harmonyVersion,
        platform: options.platform,
        capturedAt: options.capturedAt ?? new Date().toISOString(),
        source: options.source,
        captureMode: options.captureMode,
        nodes: canonicalSort.nodes(nodes),
        connections: canonicalSort.connections(connections),
        nodeAttributes: canonicalSort.nodeAttributes(nodeAttributes),
        columns: canonicalSort.columns(columns),
        keyframes: canonicalSort.keyframes(keyframes),
        exposures: canonicalSort.exposures(exposures),
        camera,
        sceneSettings: raw.sceneSettings,
        notCaptured: options.notCaptured ?? NOT_CAPTURED_V1,
        warnings,
        errors,
        requiresHumanReview: errors.length > 0
    };
    const state = {
        ...base,
        deterministicHash: computeSceneStateHash(base)
    };
    const parsed = harmonySceneStateSchema.safeParse(state);
    if (!parsed.success) {
        throw new HarmonyError('INVALID_INPUT', `Captured scene state failed schema validation: ${parsed.error.message}`, { issues: parsed.error.issues.slice(0, 20) });
    }
    return parsed.data;
}
/** Re-validate a state read back from disk and confirm its hash still matches its content. */
export function verifySceneState(candidate) {
    const parsed = harmonySceneStateSchema.safeParse(candidate);
    if (!parsed.success) {
        throw new HarmonyError('INVALID_INPUT', `Scene state failed schema validation: ${parsed.error.message}`);
    }
    const recomputed = computeSceneStateHash(parsed.data);
    if (recomputed !== parsed.data.deterministicHash) {
        throw new HarmonyError('CAPTURE_SESSION_INVALID_STATE', 'Scene state hash does not match its content; the artifact was modified after capture.', { expected: parsed.data.deterministicHash, recomputed });
    }
    return parsed.data;
}
/**
 * Dirty-entity queue with debounce.
 *
 * A SceneChangeNotifier signal only says "something here may have changed". Entities are
 * queued on every signal and re-read once the scene has been quiet for `debounceMs`, so a
 * dragged handle produces one re-read instead of one per mouse move.
 */
export class DirtyEntityQueue {
    debounceMs;
    dirtyNodes = new Set();
    dirtyColumns = new Set();
    lastTouchedAt = 0;
    constructor(debounceMs) {
        this.debounceMs = debounceMs;
    }
    markNodes(paths) {
        for (const p of paths)
            if (p)
                this.dirtyNodes.add(p);
        this.lastTouchedAt = Date.now();
    }
    markColumns(names) {
        for (const n of names)
            if (n)
                this.dirtyColumns.add(n);
        this.lastTouchedAt = Date.now();
    }
    get size() {
        return this.dirtyNodes.size + this.dirtyColumns.size;
    }
    snapshotCounts() {
        return { dirtyNodes: this.dirtyNodes.size, dirtyColumns: this.dirtyColumns.size };
    }
    /** True once no signal has arrived for the debounce interval. */
    isSettled(now = Date.now()) {
        if (this.size === 0)
            return true;
        return now - this.lastTouchedAt >= this.debounceMs;
    }
    /** Milliseconds remaining before the queue settles. */
    remainingMs(now = Date.now()) {
        if (this.size === 0)
            return 0;
        return Math.max(0, this.debounceMs - (now - this.lastTouchedAt));
    }
    drain() {
        const nodes = [...this.dirtyNodes].sort();
        const columns = [...this.dirtyColumns].sort();
        this.dirtyNodes.clear();
        this.dirtyColumns.clear();
        return { nodes, columns };
    }
}
