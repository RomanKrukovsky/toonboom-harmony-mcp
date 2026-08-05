import { z } from 'zod';
import {
  canonicaliseSceneState,
  type SimulatedSceneStateV1
} from '../../schemas/simulatedSceneStateV1.js';

/**
 * Structural diff between two simulated scene states.
 *
 * Order-independent by construction: every collection is keyed by its semantic identity
 * (node path, `to:port` for a connection, `column@frame` for a keyframe) rather than by array
 * position, so two states built by different command orders diff as identical.
 *
 * Floating-point comparison uses a configurable tolerance. Exact equality would report a diff
 * for values that are the same number reached by two different arithmetic routes.
 *
 * This complements the existing `SceneDiffEngine`, which compares `SceneSnapshotPIR` documents
 * captured from a real Harmony. Different input contract, same idea; neither replaces the other.
 */

export interface DiffOptions {
  /** Absolute tolerance for keyframe values, pivots and camera transforms. */
  tolerance?: number;
}

export const DEFAULT_TOLERANCE = 1e-6;

export const fieldChangeSchema = z.object({
  key: z.string().min(1),
  field: z.string().min(1),
  before: z.union([z.number(), z.string(), z.boolean(), z.null()]),
  after: z.union([z.number(), z.string(), z.boolean(), z.null()])
}).strict();
export type FieldChange = z.infer<typeof fieldChangeSchema>;

export const sceneDiffSchema = z.object({
  schemaVersion: z.literal('1.0'),
  kind: z.literal('SimulatedSceneDiffV1'),
  tolerance: z.number().nonnegative(),
  identical: z.boolean(),
  beforeHash: z.string().min(1),
  afterHash: z.string().min(1),
  nodes: z.object({ added: z.array(z.string()), removed: z.array(z.string()), changed: z.array(fieldChangeSchema) }).strict(),
  connections: z.object({ added: z.array(z.string()), removed: z.array(z.string()) }).strict(),
  columns: z.object({ added: z.array(z.string()), removed: z.array(z.string()), changed: z.array(fieldChangeSchema) }).strict(),
  keyframes: z.object({ added: z.array(z.string()), removed: z.array(z.string()), changed: z.array(fieldChangeSchema) }).strict(),
  exposures: z.object({ added: z.array(z.string()), removed: z.array(z.string()), changed: z.array(fieldChangeSchema) }).strict(),
  drawingSubstitutions: z.object({ added: z.array(z.string()), removed: z.array(z.string()), changed: z.array(fieldChangeSchema) }).strict(),
  drawingElements: z.object({ added: z.array(z.string()), removed: z.array(z.string()), changed: z.array(fieldChangeSchema) }).strict(),
  switchSelections: z.object({ added: z.array(z.string()), removed: z.array(z.string()), changed: z.array(fieldChangeSchema) }).strict(),
  palettes: z.object({ added: z.array(z.string()), removed: z.array(z.string()), changed: z.array(fieldChangeSchema) }).strict(),
  cameras: z.object({ added: z.array(z.string()), removed: z.array(z.string()), changed: z.array(fieldChangeSchema) }).strict(),
  controllers: z.object({ added: z.array(z.string()), removed: z.array(z.string()), changed: z.array(fieldChangeSchema) }).strict(),
  attributes: z.object({ added: z.array(z.string()), removed: z.array(z.string()), changed: z.array(fieldChangeSchema) }).strict(),
  metadata: z.object({ added: z.array(z.string()), removed: z.array(z.string()), changed: z.array(fieldChangeSchema) }).strict(),
  totalChanges: z.number().int().nonnegative()
}).strict();
export type SceneDiff = z.infer<typeof sceneDiffSchema>;

type Bucket = { added: string[]; removed: string[]; changed: FieldChange[] };

export function diffScenes(before: SimulatedSceneStateV1, after: SimulatedSceneStateV1, options: DiffOptions = {}): SceneDiff {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const a = canonicaliseSceneState(before);
  const b = canonicaliseSceneState(after);

  const nodes = diffKeyed(
    a.nodes, b.nodes, n => n.path,
    ['name', 'type', 'parentPath', 'positionX', 'positionY', 'enabled', 'controllerId'], tolerance
  );
  const columns = diffKeyed(a.columns, b.columns, c => c.name, ['type', 'linkedNodePath', 'linkedChannel'], tolerance);
  const keyframes = diffKeyed(
    a.keyframes, b.keyframes, k => `${k.columnName}@${k.frame}`,
    ['value', 'interpolation', 'constSeg', 'continuity'], tolerance
  );
  const exposures = diffKeyed(a.exposures, b.exposures, e => `${e.columnName}@${e.frame}`, ['drawingName'], tolerance);
  const substitutions = diffKeyed(
    a.drawingSubstitutions, b.drawingSubstitutions, s => `${s.columnName}@${s.frame}`,
    ['drawingName', 'holdFrames'], tolerance
  );
  const elements = diffKeyed(
    a.drawingElements, b.drawingElements, e => e.elementName,
    ['fieldGuide', 'scanType', 'vectorType'], tolerance,
    // Drawing lists are compared as sets: the order a plan created them in is not meaningful.
    (x, y) => setsEqual(x.drawings, y.drawings) ? null : { field: 'drawings', before: x.drawings.join(','), after: y.drawings.join(',') }
  );
  const switches = diffKeyed(
    a.switchSelections, b.switchSelections, s => `${s.controllerId}:${s.elementName}@${s.frame}`,
    ['drawingName'], tolerance
  );
  const palettes = diffKeyed(
    a.palettes, b.palettes, p => p.paletteName, ['location', 'elementName'], tolerance,
    (x, y) => setsEqual(x.swatches.map(s => s.colorId), y.swatches.map(s => s.colorId))
      ? null
      : { field: 'swatches', before: x.swatches.length, after: y.swatches.length }
  );
  const cameras = diffKeyed(a.cameras, b.cameras, c => c.nodePath, ['isDefault', 'offsetX', 'offsetY', 'offsetZ', 'rotationZ'], tolerance);
  const controllers = diffKeyed(
    a.controllerBindings, b.controllerBindings, c => c.controllerId,
    ['nodePath', 'pivotX', 'pivotY', 'pivotSource'], tolerance,
    (x, y) => setsEqual(Object.keys(x.channelColumns), Object.keys(y.channelColumns))
      ? null
      : { field: 'channelColumns', before: Object.keys(x.channelColumns).sort().join(','), after: Object.keys(y.channelColumns).sort().join(',') }
  );
  const attributes = diffKeyed(a.attributes, b.attributes, at => `${at.nodePath}.${at.attribute}`, ['value'], tolerance);

  const connections = {
    added: b.connections.map(connectionKey).filter(k => !a.connections.map(connectionKey).includes(k)),
    removed: a.connections.map(connectionKey).filter(k => !b.connections.map(connectionKey).includes(k))
  };

  const metadataKeys = new Set([...Object.keys(a.metadata), ...Object.keys(b.metadata)]);
  const metadata: Bucket = { added: [], removed: [], changed: [] };
  for (const key of [...metadataKeys].sort()) {
    const inA = key in a.metadata;
    const inB = key in b.metadata;
    if (!inA && inB) metadata.added.push(key);
    else if (inA && !inB) metadata.removed.push(key);
    else if (!valuesEqual(a.metadata[key], b.metadata[key], tolerance)) {
      metadata.changed.push({ key, field: 'value', before: normaliseValue(a.metadata[key]), after: normaliseValue(b.metadata[key]) });
    }
  }

  const buckets = [nodes, columns, keyframes, exposures, substitutions, elements, switches, palettes, cameras, controllers, attributes, metadata];
  const totalChanges =
    buckets.reduce((sum, bucket) => sum + bucket.added.length + bucket.removed.length + bucket.changed.length, 0) +
    connections.added.length + connections.removed.length;

  return sceneDiffSchema.parse({
    schemaVersion: '1.0',
    kind: 'SimulatedSceneDiffV1',
    tolerance,
    identical: totalChanges === 0,
    beforeHash: a.contentHash,
    afterHash: b.contentHash,
    nodes, connections, columns, keyframes, exposures,
    drawingSubstitutions: substitutions,
    drawingElements: elements,
    switchSelections: switches,
    palettes, cameras, controllers, attributes, metadata,
    totalChanges
  });
}

function connectionKey(c: SimulatedSceneStateV1['connections'][number]): string {
  return `${c.fromNode}:${c.fromPort}->${c.toNode}:${c.toPort}`;
}

/**
 * Generic keyed diff. `extraCompare` handles fields that are collections and must be compared
 * as sets rather than by value equality.
 */
function diffKeyed<T>(
  before: readonly T[],
  after: readonly T[],
  keyOf: (item: T) => string,
  fields: readonly (keyof T & string)[],
  tolerance: number,
  extraCompare?: (a: T, b: T) => { field: string; before: string | number; after: string | number } | null
): Bucket {
  const beforeMap = new Map(before.map(item => [keyOf(item), item]));
  const afterMap = new Map(after.map(item => [keyOf(item), item]));
  const bucket: Bucket = { added: [], removed: [], changed: [] };

  for (const key of [...afterMap.keys()].sort()) {
    if (!beforeMap.has(key)) bucket.added.push(key);
  }
  for (const key of [...beforeMap.keys()].sort()) {
    if (!afterMap.has(key)) bucket.removed.push(key);
  }
  for (const key of [...afterMap.keys()].sort()) {
    const a = beforeMap.get(key);
    const b = afterMap.get(key);
    if (!a || !b) continue;
    for (const field of fields) {
      if (!valuesEqual(a[field], b[field], tolerance)) {
        bucket.changed.push({ key, field, before: normaliseValue(a[field]), after: normaliseValue(b[field]) });
      }
    }
    const extra = extraCompare?.(a, b);
    if (extra) bucket.changed.push({ key, field: extra.field, before: extra.before, after: extra.after });
  }
  return bucket;
}

function valuesEqual(a: unknown, b: unknown, tolerance: number): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return Math.abs(a - b) <= tolerance;
  }
  return a === b;
}

function normaliseValue(value: unknown): number | string | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;
  return JSON.stringify(value);
}

function setsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}
