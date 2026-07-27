import {
  canonicalHash,
  canonicalSort,
  computeOperationId,
  computeSceneStateHash,
  harmonySceneStateSchema,
  hashScenePath
} from '../src/schemas/harmonyActionDataset.js';
import { makeSceneState, node, keyframe } from './helpers/harmonySceneStateFactory.js';

describe('Harmony Action Dataset schemas and canonical hashing', () => {
  it('validates a normalized scene state', () => {
    const state = makeSceneState({ nodes: [node('Top/Camera', 'CAMERA')] });
    expect(harmonySceneStateSchema.safeParse(state).success).toBe(true);
  });

  it('produces the same hash regardless of API traversal order', () => {
    const nodes = [node('Top/B', 'PEG'), node('Top/A', 'READ'), node('Top/C', 'COMPOSITE')];
    const keyframes = [keyframe('col', 12, -35), keyframe('col', 1, 0), keyframe('col', 24, 15)];

    const forward = makeSceneState({ nodes, keyframes });
    const reversed = makeSceneState({ nodes: [...nodes].reverse(), keyframes: [...keyframes].reverse() });

    expect(reversed.deterministicHash).toBe(forward.deterministicHash);
  });

  it('ignores capture metadata when hashing structure', () => {
    const a = makeSceneState({ nodes: [node('Top/A', 'PEG')], capturedAt: '2026-07-27T10:00:00.000Z' });
    const b = makeSceneState({ nodes: [node('Top/A', 'PEG')], capturedAt: '2026-07-27T23:59:59.000Z' });
    expect(b.deterministicHash).toBe(a.deterministicHash);
  });

  it('changes the hash when structure changes', () => {
    const a = makeSceneState({ keyframes: [keyframe('col', 12, -35)] });
    const b = makeSceneState({ keyframes: [keyframe('col', 12, -36)] });
    expect(b.deterministicHash).not.toBe(a.deterministicHash);
  });

  it('recomputing the hash of a state reproduces the stored value', () => {
    const state = makeSceneState({ nodes: [node('Top/A', 'PEG')] });
    expect(computeSceneStateHash(state)).toBe(state.deterministicHash);
  });

  it('never embeds the raw scene path, only its hash', () => {
    const scenePath = '/Users/someone/private/Show/scene.xstage';
    const state = makeSceneState({ scenePath });
    expect(JSON.stringify(state)).not.toContain(scenePath);
    expect(state.scenePathHash).toBe(hashScenePath(scenePath));
  });

  it('gives identical operations identical ids and different operations different ids', () => {
    const draft = {
      type: 'change_keyframe_value' as const,
      origin: 'harmony_manual' as const,
      target: { kind: 'column' as const, columnName: 'col' },
      property: 'value',
      frame: 24,
      before: 15,
      after: 22,
      confidence: 1,
      evidenceRefs: ['state:keyframes[col@24].value'],
      reversible: true
    };
    expect(computeOperationId(draft)).toBe(computeOperationId({ ...draft }));
    expect(computeOperationId(draft)).not.toBe(computeOperationId({ ...draft, after: 23 }));
    // The id must not depend on volatile fields such as evidence ordering.
    expect(computeOperationId(draft)).toBe(computeOperationId({ ...draft, evidenceRefs: [] }));
  });

  it('sorts operations into a stable total order', () => {
    const ops = [
      { opId: 'b', type: 'add_keyframe', origin: 'harmony_manual', target: { kind: 'column', columnName: 'z' }, frame: 2, confidence: 1, evidenceRefs: [], reversible: true },
      { opId: 'a', type: 'add_keyframe', origin: 'harmony_manual', target: { kind: 'column', columnName: 'a' }, frame: 1, confidence: 1, evidenceRefs: [], reversible: true }
    ] as any;
    const once = canonicalSort.operations(ops).map((o: any) => o.opId);
    const twice = canonicalSort.operations([...ops].reverse()).map((o: any) => o.opId);
    expect(once).toEqual(['a', 'b']);
    expect(twice).toEqual(once);
  });

  it('hashes values, not object key order', () => {
    expect(canonicalHash({ a: 1, b: 2 })).toBe(canonicalHash({ b: 2, a: 1 }));
  });
});
