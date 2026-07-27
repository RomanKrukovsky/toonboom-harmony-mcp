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

import {
  HarmonySceneState,
  HARMONY_ACTION_SCHEMA_VERSION,
  CaptureMode,
  CaptureSource,
  NotCapturedV1,
  SceneNode,
  SceneConnection,
  SceneNodeAttribute,
  SceneColumn,
  SceneKeyframe,
  SceneExposure,
  canonicalSort,
  computeSceneStateHash,
  harmonySceneStateSchema,
  hashScenePath
} from '../../schemas/harmonyActionDataset.js';
import { HarmonyError } from '../../security.js';
import { HarmonyRecorderConfig } from '../harmonyActionRecorder/config.js';

/** Categories the v1 capture contract knowingly does not read from Harmony. */
export const NOT_CAPTURED_V1: NotCapturedV1[] = [
  'palettes',
  'deformer_chains',
  'master_controllers',
  'drawing_strokes',
  'art_layers',
  'sound_columns',
  'node_view_groups'
];

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

function enforceLimit(actual: number, limit: number, what: string): void {
  if (actual > limit) {
    throw new HarmonyError(
      'CAPTURE_LIMIT_EXCEEDED',
      `Scene exceeds the configured capture limit for ${what}: ${actual} > ${limit}.`,
      { what, actual, limit }
    );
  }
}

/**
 * Normalize a raw provider read into a validated, canonically ordered, hashed scene state.
 *
 * Disabled capture categories are emptied and recorded as a warning, so a consumer can tell
 * "this scene has no keyframes" apart from "keyframes were not captured".
 */
export function normalizeSceneState(raw: RawSceneState, options: NormalizeOptions): HarmonySceneState {
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
    if (!enabled) warnings.push(`capture category "${name}" is disabled by configuration`);
  }

  enforceLimit(nodes.length, config.maxNodes, 'nodes');
  enforceLimit(columns.length, config.maxColumns, 'columns');
  enforceLimit(keyframes.length, config.maxKeyframes, 'keyframes');

  const base = {
    schemaVersion: HARMONY_ACTION_SCHEMA_VERSION,
    kind: 'HarmonySceneState' as const,
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

  const state: HarmonySceneState = {
    ...base,
    deterministicHash: computeSceneStateHash(base)
  };

  const parsed = harmonySceneStateSchema.safeParse(state);
  if (!parsed.success) {
    throw new HarmonyError(
      'INVALID_INPUT',
      `Captured scene state failed schema validation: ${parsed.error.message}`,
      { issues: parsed.error.issues.slice(0, 20) }
    );
  }
  return parsed.data;
}

/** Re-validate a state read back from disk and confirm its hash still matches its content. */
export function verifySceneState(candidate: unknown): HarmonySceneState {
  const parsed = harmonySceneStateSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new HarmonyError('INVALID_INPUT', `Scene state failed schema validation: ${parsed.error.message}`);
  }
  const recomputed = computeSceneStateHash(parsed.data);
  if (recomputed !== parsed.data.deterministicHash) {
    throw new HarmonyError(
      'CAPTURE_SESSION_INVALID_STATE',
      'Scene state hash does not match its content; the artifact was modified after capture.',
      { expected: parsed.data.deterministicHash, recomputed }
    );
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
  private readonly dirtyNodes = new Set<string>();
  private readonly dirtyColumns = new Set<string>();
  private lastTouchedAt = 0;

  constructor(private readonly debounceMs: number) {}

  markNodes(paths: string[]): void {
    for (const p of paths) if (p) this.dirtyNodes.add(p);
    this.lastTouchedAt = Date.now();
  }

  markColumns(names: string[]): void {
    for (const n of names) if (n) this.dirtyColumns.add(n);
    this.lastTouchedAt = Date.now();
  }

  get size(): number {
    return this.dirtyNodes.size + this.dirtyColumns.size;
  }

  snapshotCounts(): { dirtyNodes: number; dirtyColumns: number } {
    return { dirtyNodes: this.dirtyNodes.size, dirtyColumns: this.dirtyColumns.size };
  }

  /** True once no signal has arrived for the debounce interval. */
  isSettled(now: number = Date.now()): boolean {
    if (this.size === 0) return true;
    return now - this.lastTouchedAt >= this.debounceMs;
  }

  /** Milliseconds remaining before the queue settles. */
  remainingMs(now: number = Date.now()): number {
    if (this.size === 0) return 0;
    return Math.max(0, this.debounceMs - (now - this.lastTouchedAt));
  }

  drain(): { nodes: string[]; columns: string[] } {
    const nodes = [...this.dirtyNodes].sort();
    const columns = [...this.dirtyColumns].sort();
    this.dirtyNodes.clear();
    this.dirtyColumns.clear();
    return { nodes, columns };
  }
}
