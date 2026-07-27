import { SemanticSceneDiffEngine } from '../src/services/sceneDiffEngine/semantic.js';
import { HarmonySemanticOperation } from '../src/schemas/harmonyActionDataset.js';
import { makeSceneState, node, keyframe } from './helpers/harmonySceneStateFactory.js';

function opsOfType(operations: HarmonySemanticOperation[], type: string) {
  return operations.filter(o => o.type === type);
}

describe('SemanticSceneDiffEngine', () => {
  const engine = new SemanticSceneDiffEngine();

  it('produces an empty patch for identical states', () => {
    const state = makeSceneState({
      nodes: [node('Top/RIG/Arm_R-P', 'PEG')],
      keyframes: [keyframe('col', 1, 0), keyframe('col', 12, -35)]
    });
    const patch = engine.diff(state, state);

    expect(patch.operations).toHaveLength(0);
    expect(patch.summary.nodesChanged).toEqual([]);
    expect(patch.fullyReversible).toBe(true);
    expect(patch.beforeStateHash).toBe(patch.afterStateHash);
  });

  it('refuses to diff two different scenes', () => {
    const a = makeSceneState({ scenePath: '/scenes/a.xstage' });
    const b = makeSceneState({ scenePath: '/scenes/b.xstage' });
    expect(() => engine.diff(a, b)).toThrow(/different scenes/i);
  });

  it('detects node additions and removals', () => {
    const before = makeSceneState({ nodes: [node('Top/A', 'PEG'), node('Top/B', 'READ')] });
    const after = makeSceneState({ nodes: [node('Top/A', 'PEG'), node('Top/C', 'PEG')] });
    const patch = engine.diff(before, after);

    expect(opsOfType(patch.operations, 'add_node').map(o => o.target.nodePath)).toEqual(['Top/C']);
    expect(opsOfType(patch.operations, 'remove_node').map(o => o.target.nodePath)).toEqual(['Top/B']);
    expect(patch.operations.every(o => o.origin === 'harmony_manual')).toBe(true);
  });

  it('detects connection changes', () => {
    const before = makeSceneState({
      connections: [{ fromNode: 'Top/A', fromPort: 0, toNode: 'Top/C', toPort: 0 }]
    });
    const after = makeSceneState({
      connections: [{ fromNode: 'Top/B', fromPort: 0, toNode: 'Top/C', toPort: 0 }]
    });
    const patch = engine.diff(before, after);

    expect(opsOfType(patch.operations, 'connect_nodes')).toHaveLength(1);
    expect(opsOfType(patch.operations, 'disconnect_nodes')).toHaveLength(1);
    expect(patch.summary.nodesChanged).toEqual(['Top/A', 'Top/B', 'Top/C']);
  });

  it('classifies a peg transform change separately from a plain attribute change', () => {
    const nodes = [node('Top/RIG/Arm_R-P', 'PEG'), node('Top/RIG/Arm_R', 'READ')];
    const before = makeSceneState({
      nodes,
      nodeAttributes: [
        { nodePath: 'Top/RIG/Arm_R-P', attribute: 'OFFSET.X', value: 0, animated: false },
        { nodePath: 'Top/RIG/Arm_R', attribute: 'DRAWING.ELEMENT', value: 'Arm_R', animated: false }
      ]
    });
    const after = makeSceneState({
      nodes,
      nodeAttributes: [
        { nodePath: 'Top/RIG/Arm_R-P', attribute: 'OFFSET.X', value: 0.05, animated: false },
        { nodePath: 'Top/RIG/Arm_R', attribute: 'DRAWING.ELEMENT', value: 'Arm_R_v2', animated: false }
      ]
    });
    const patch = engine.diff(before, after);

    expect(opsOfType(patch.operations, 'change_peg_transform')).toHaveLength(1);
    expect(opsOfType(patch.operations, 'change_peg_transform')[0].before).toBe(0);
    expect(opsOfType(patch.operations, 'change_peg_transform')[0].after).toBe(0.05);
    expect(opsOfType(patch.operations, 'change_node_attribute')).toHaveLength(1);
  });

  it('does not double-report attributes of a node that was just added', () => {
    const before = makeSceneState({ nodes: [] });
    const after = makeSceneState({
      nodes: [node('Top/New-P', 'PEG')],
      nodeAttributes: [{ nodePath: 'Top/New-P', attribute: 'OFFSET.X', value: 3, animated: false }]
    });
    const patch = engine.diff(before, after);

    expect(opsOfType(patch.operations, 'add_node')).toHaveLength(1);
    expect(opsOfType(patch.operations, 'change_peg_transform')).toHaveLength(0);
  });

  it('detects keyframe addition and removal', () => {
    const before = makeSceneState({ keyframes: [keyframe('col', 1, 0)] });
    const after = makeSceneState({ keyframes: [keyframe('col', 1, 0), keyframe('col', 12, -35)] });
    const patch = engine.diff(before, after);

    const added = opsOfType(patch.operations, 'add_keyframe');
    expect(added).toHaveLength(1);
    expect(added[0].frame).toBe(12);
    expect(added[0].origin).toBe('harmony_manual');
    expect(added[0].confidence).toBe(1);
  });

  it('merges an unambiguous removal+addition of equal value into move_keyframe', () => {
    const before = makeSceneState({ keyframes: [keyframe('col', 1, 0), keyframe('col', 12, -35)] });
    const after = makeSceneState({ keyframes: [keyframe('col', 1, 0), keyframe('col', 18, -35)] });
    const patch = engine.diff(before, after);

    const moves = opsOfType(patch.operations, 'move_keyframe');
    expect(moves).toHaveLength(1);
    expect(moves[0].before).toEqual({ frame: 12, value: -35 });
    expect(moves[0].after).toEqual({ frame: 18, value: -35 });
    // A merged reading is inferred, never presented as an exactly known command.
    expect(moves[0].origin).toBe('inferred');
    expect(moves[0].confidence).toBeLessThan(1);
    expect(opsOfType(patch.operations, 'add_keyframe')).toHaveLength(0);
    expect(opsOfType(patch.operations, 'remove_keyframe')).toHaveLength(0);
  });

  it('does not guess a move when the value is ambiguous', () => {
    const before = makeSceneState({ keyframes: [keyframe('col', 8, -35), keyframe('col', 12, -35)] });
    const after = makeSceneState({ keyframes: [keyframe('col', 14, -35), keyframe('col', 18, -35)] });
    const patch = engine.diff(before, after);

    expect(opsOfType(patch.operations, 'move_keyframe')).toHaveLength(0);
    expect(opsOfType(patch.operations, 'add_keyframe')).toHaveLength(2);
    expect(opsOfType(patch.operations, 'remove_keyframe')).toHaveLength(2);
  });

  it('separates a value change from a curve segment change on the same keyframe', () => {
    const before = makeSceneState({ keyframes: [keyframe('col', 24, 15, { easeIn: 0, easeOut: 0 })] });
    const after = makeSceneState({ keyframes: [keyframe('col', 24, 22, { easeIn: 6, easeOut: 6 })] });
    const patch = engine.diff(before, after);

    expect(opsOfType(patch.operations, 'change_keyframe_value')).toHaveLength(1);
    expect(opsOfType(patch.operations, 'change_curve_segment')).toHaveLength(1);
  });

  it('treats a sub-epsilon value difference as no change', () => {
    const before = makeSceneState({ keyframes: [keyframe('col', 24, 15)] });
    const after = makeSceneState({ keyframes: [keyframe('col', 24, 15 + 1e-9)] });
    expect(engine.diff(before, after).operations).toHaveLength(0);
  });

  it('detects a constant-offset exposure rewrite as one shift_exposure', () => {
    const before = makeSceneState({
      exposures: [
        { nodePath: 'Top/Hand', frame: 1, drawing: 'a-1' },
        { nodePath: 'Top/Hand', frame: 2, drawing: 'a-1' },
        { nodePath: 'Top/Hand', frame: 3, drawing: 'a-2' },
        { nodePath: 'Top/Hand', frame: 4, drawing: 'a-2' }
      ]
    });
    const after = makeSceneState({
      exposures: [
        { nodePath: 'Top/Hand', frame: 3, drawing: 'a-1' },
        { nodePath: 'Top/Hand', frame: 4, drawing: 'a-1' },
        { nodePath: 'Top/Hand', frame: 5, drawing: 'a-2' },
        { nodePath: 'Top/Hand', frame: 6, drawing: 'a-2' }
      ]
    });
    const patch = engine.diff(before, after);

    const shifts = opsOfType(patch.operations, 'shift_exposure');
    expect(shifts).toHaveLength(1);
    expect(shifts[0].after).toEqual({ delta: 2 });
    expect(shifts[0].origin).toBe('inferred');
    expect(opsOfType(patch.operations, 'set_drawing_substitution')).toHaveLength(0);
  });

  it('reports a single changed frame as a substitution, not a shift', () => {
    const before = makeSceneState({ exposures: [{ nodePath: 'Top/Hand', frame: 5, drawing: 'a-3' }] });
    const after = makeSceneState({ exposures: [{ nodePath: 'Top/Hand', frame: 5, drawing: 'a-7' }] });
    const patch = engine.diff(before, after);

    expect(opsOfType(patch.operations, 'shift_exposure')).toHaveLength(0);
    const subs = opsOfType(patch.operations, 'set_drawing_substitution');
    expect(subs).toHaveLength(1);
    expect(subs[0].before).toBe('a-3');
    expect(subs[0].after).toBe('a-7');
  });

  it('detects camera property changes', () => {
    const before = makeSceneState({ camera: { nodePath: 'Top/Camera', properties: { fov: 41.11 } } });
    const after = makeSceneState({ camera: { nodePath: 'Top/Camera', properties: { fov: 38 } } });
    const patch = engine.diff(before, after);

    const cam = opsOfType(patch.operations, 'change_camera_property');
    expect(cam).toHaveLength(1);
    expect(cam[0].property).toBe('fov');
  });

  it('ignores current-frame scrubbing but records a frame-count change', () => {
    const before = makeSceneState({ sceneSettings: { currentFrame: 1, frameCount: 24 } });
    const after = makeSceneState({ sceneSettings: { currentFrame: 18, frameCount: 36 } });
    const patch = engine.diff(before, after);

    const unknown = opsOfType(patch.operations, 'unknown_structural_change');
    expect(unknown).toHaveLength(1);
    expect(unknown[0].property).toBe('sceneSettings.frameCount');
    expect(unknown[0].reversible).toBe(false);
    expect(patch.requiresHumanReview).toBe(true);
  });

  it('emits operations in a deterministic order regardless of input ordering', () => {
    const beforeNodes = [node('Top/A', 'PEG'), node('Top/B', 'READ'), node('Top/C', 'PEG')];
    const before = makeSceneState({ nodes: beforeNodes, keyframes: [keyframe('z', 1, 0), keyframe('a', 1, 0)] });
    const after = makeSceneState({
      nodes: [node('Top/A', 'PEG')],
      keyframes: [keyframe('a', 1, 5), keyframe('z', 1, 9)]
    });
    const shuffledBefore = makeSceneState({
      nodes: [...beforeNodes].reverse(),
      keyframes: [keyframe('a', 1, 0), keyframe('z', 1, 0)]
    });

    const first = engine.diff(before, after);
    const second = engine.diff(shuffledBefore, after);

    expect(second.operations.map(o => o.opId)).toEqual(first.operations.map(o => o.opId));
    expect(second.deterministicHash).toBe(first.deterministicHash);
  });

  describe('provenance', () => {
    const before = makeSceneState({
      nodes: [node('Top/RIG/Arm_R-P', 'PEG')],
      nodeAttributes: [{ nodePath: 'Top/RIG/Arm_R-P', attribute: 'OFFSET.X', value: 0, animated: false }]
    });
    const after = makeSceneState({
      nodes: [node('Top/RIG/Arm_R-P', 'PEG')],
      nodeAttributes: [{ nodePath: 'Top/RIG/Arm_R-P', attribute: 'OFFSET.X', value: 0.05, animated: false }]
    });

    it('labels a diff-derived change as harmony_manual, not as an exact MCP action', () => {
      const patch = engine.diff(before, after);
      expect(patch.operations).toHaveLength(1);
      expect(patch.operations[0].origin).toBe('harmony_manual');
      expect(patch.operations[0].evidenceRefs.some(r => r.startsWith('tool:'))).toBe(false);
    });

    it('upgrades to mcp_tool only when a claim matches target and property', () => {
      const patch = engine.diff(before, after, {
        mcpClaims: [
          {
            correlationId: 'corr-1',
            toolName: 'harmony.node.set_attribute',
            targets: ['Top/RIG/Arm_R-P'],
            properties: ['OFFSET.X']
          }
        ]
      });
      expect(patch.operations[0].origin).toBe('mcp_tool');
      expect(patch.operations[0].evidenceRefs).toContain('tool:corr-1');
    });

    it('does not upgrade when the claimed property differs', () => {
      const patch = engine.diff(before, after, {
        mcpClaims: [
          {
            correlationId: 'corr-2',
            toolName: 'harmony.node.set_attribute',
            targets: ['Top/RIG/Arm_R-P'],
            properties: ['ROTATION.ANGLEZ']
          }
        ]
      });
      expect(patch.operations[0].origin).toBe('harmony_manual');
    });

    it('never upgrades an inferred operation to an exact MCP action', () => {
      const b = makeSceneState({ keyframes: [keyframe('col', 12, -35)] });
      const a = makeSceneState({ keyframes: [keyframe('col', 18, -35)] });
      const patch = engine.diff(b, a, {
        mcpClaims: [{ correlationId: 'corr-3', toolName: 'harmony.timeline.move_key', targets: ['col'] }]
      });
      expect(patch.operations[0].type).toBe('move_keyframe');
      expect(patch.operations[0].origin).toBe('inferred');
    });
  });

  describe('inverse patch', () => {
    it('inverts add/remove, connections, values and exposure shifts', () => {
      const before = makeSceneState({
        nodes: [node('Top/A', 'PEG')],
        keyframes: [keyframe('col', 24, 15)],
        exposures: [
          { nodePath: 'Top/Hand', frame: 1, drawing: 'a-1' },
          { nodePath: 'Top/Hand', frame: 2, drawing: 'a-2' }
        ]
      });
      const after = makeSceneState({
        nodes: [node('Top/A', 'PEG'), node('Top/B', 'PEG')],
        keyframes: [keyframe('col', 24, 22)],
        exposures: [
          { nodePath: 'Top/Hand', frame: 3, drawing: 'a-1' },
          { nodePath: 'Top/Hand', frame: 4, drawing: 'a-2' }
        ]
      });

      const patch = engine.diff(before, after);
      const inverse = engine.invert(patch);

      expect(inverse.beforeStateHash).toBe(patch.afterStateHash);
      expect(inverse.afterStateHash).toBe(patch.beforeStateHash);
      expect(opsOfType(inverse.operations, 'remove_node').map(o => o.target.nodePath)).toEqual(['Top/B']);
      expect(opsOfType(inverse.operations, 'change_keyframe_value')[0].before).toBe(22);
      expect(opsOfType(inverse.operations, 'change_keyframe_value')[0].after).toBe(15);
      expect(opsOfType(inverse.operations, 'shift_exposure')[0].after).toEqual({ delta: -2 });
      expect(inverse.fullyReversible).toBe(true);
    });

    it('drops non-invertible operations and flags the result for review', () => {
      const before = makeSceneState({ sceneSettings: { frameCount: 24 } });
      const after = makeSceneState({ sceneSettings: { frameCount: 36 } });
      const patch = engine.diff(before, after);
      const inverse = engine.invert(patch);

      expect(patch.operations).toHaveLength(1);
      expect(inverse.operations).toHaveLength(0);
      expect(inverse.requiresHumanReview).toBe(true);
      expect(inverse.warnings.some(w => w.includes('not invertible'))).toBe(true);
    });
  });
});
