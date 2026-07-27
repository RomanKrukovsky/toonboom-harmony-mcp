/**
 * Test helpers for building normalized HarmonySceneState objects without touching Harmony.
 */

import os from 'os';
import {
  HARMONY_ACTION_SCHEMA_VERSION,
  HarmonySceneState,
  SceneColumn,
  SceneConnection,
  SceneExposure,
  SceneKeyframe,
  SceneNode,
  SceneNodeAttribute,
  canonicalSort,
  computeSceneStateHash,
  hashScenePath
} from '../../src/schemas/harmonyActionDataset.js';

export interface SceneStateSeed {
  sessionId?: string;
  sceneId?: string;
  scenePath?: string;
  nodes?: SceneNode[];
  connections?: SceneConnection[];
  nodeAttributes?: SceneNodeAttribute[];
  columns?: SceneColumn[];
  keyframes?: SceneKeyframe[];
  exposures?: SceneExposure[];
  camera?: HarmonySceneState['camera'];
  sceneSettings?: Partial<HarmonySceneState['sceneSettings']>;
  capturedAt?: string;
  /** Skip canonical sorting so tests can prove the hash is order-independent. */
  preserveOrder?: boolean;
}

export function makeSceneState(seed: SceneStateSeed = {}): HarmonySceneState {
  const nodes = seed.nodes ?? [];
  const connections = seed.connections ?? [];
  const nodeAttributes = seed.nodeAttributes ?? [];
  const columns = seed.columns ?? [];
  const keyframes = seed.keyframes ?? [];
  const exposures = seed.exposures ?? [];

  const base = {
    schemaVersion: HARMONY_ACTION_SCHEMA_VERSION,
    kind: 'HarmonySceneState' as const,
    sessionId: seed.sessionId ?? 'test-session',
    sceneId: seed.sceneId ?? 'test-scene',
    scenePathHash: hashScenePath(seed.scenePath ?? '/scenes/test-scene.xstage'),
    harmonyVersion: 'Harmony 25 Premium',
    platform: `${os.platform()}-${os.arch()}`,
    capturedAt: seed.capturedAt ?? '2026-07-27T10:00:00.000Z',
    source: 'fixture' as const,
    captureMode: 'full' as const,
    nodes: seed.preserveOrder ? nodes : canonicalSort.nodes(nodes),
    connections: seed.preserveOrder ? connections : canonicalSort.connections(connections),
    nodeAttributes: seed.preserveOrder ? nodeAttributes : canonicalSort.nodeAttributes(nodeAttributes),
    columns: seed.preserveOrder ? columns : canonicalSort.columns(columns),
    keyframes: seed.preserveOrder ? keyframes : canonicalSort.keyframes(keyframes),
    exposures: seed.preserveOrder ? exposures : canonicalSort.exposures(exposures),
    camera: seed.camera,
    sceneSettings: {
      frameCount: 24,
      currentFrame: 1,
      frameRate: 24,
      resolutionX: 1920,
      resolutionY: 1080,
      ...(seed.sceneSettings ?? {})
    },
    notCaptured: [],
    warnings: [],
    errors: [],
    requiresHumanReview: false
  };

  return { ...base, deterministicHash: computeSceneStateHash(base) };
}

export function node(path: string, type: string, overrides: Partial<SceneNode> = {}): SceneNode {
  const segments = path.split('/').filter(Boolean);
  return {
    path,
    name: segments[segments.length - 1] ?? path,
    type,
    parentPath: segments.slice(0, -1).join('/'),
    positionX: 0,
    positionY: 0,
    enabled: true,
    ...overrides
  };
}

export function keyframe(
  columnName: string,
  frame: number,
  value: number,
  overrides: Partial<SceneKeyframe> = {}
): SceneKeyframe {
  return { columnName, frame, value, interpolation: 'BEZIER', ...overrides };
}
