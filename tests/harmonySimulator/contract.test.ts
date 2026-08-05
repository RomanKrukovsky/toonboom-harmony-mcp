import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  HarmonyContractSimulator,
  SUPPORTED_COMMAND_TYPES,
  UNSUPPORTED_COMMAND_REASONS
} from '../../src/services/harmonyContractSimulator/index.js';
import { RigCompatibilityValidator } from '../../src/services/rigCompatibilityValidator/index.js';
import { loadRigFixture, loadRigFixtureRaw } from '../../src/services/rigFixtureLoader/index.js';
import { HARMONY_V5_COMMAND_TYPES, type HarmonyCommandPayload } from '../../src/schemas/harmonyCommandPlanV5.js';
import { MlError } from '../../src/errors/mlErrorRegistry.js';
import { harness, plan, command, transformKey, nodeOf, resetCommandCounter } from './helpers.js';

beforeEach(resetCommandCounter);

/** Every V5 command type is either handled or has a stated refusal reason. No third option. */
describe('command coverage is total and explicit', () => {
  it('classifies every V5 command type', () => {
    const supported = new Set<string>(SUPPORTED_COMMAND_TYPES);
    const refused = new Set(Object.keys(UNSUPPORTED_COMMAND_REASONS));
    for (const type of HARMONY_V5_COMMAND_TYPES) {
      const classified = supported.has(type) || refused.has(type);
      expect(classified).toBe(true);
    }
    expect(supported.size + refused.size).toBe(HARMONY_V5_COMMAND_TYPES.length);
  });

  it('gives every refusal a stated reason rather than a silent skip', () => {
    for (const [type, reason] of Object.entries(UNSUPPORTED_COMMAND_REASONS)) {
      expect(reason.length).toBeGreaterThan(20);
      expect(SUPPORTED_COMMAND_TYPES as readonly string[]).not.toContain(type);
    }
  });
});

describe('supported command handlers each mutate the state', () => {
  const cases: Array<{ name: string; build: (h: ReturnType<typeof harness>) => HarmonyCommandPayload; assert: (before: number, after: number) => void; count: (s: ReturnType<typeof harness>['scene']) => number }> = [
    {
      name: 'create_node',
      build: () => ({ type: 'create_node', params: { parentPath: 'Top', nodeName: 'New_Node', nodeType: 'PEG', position: { x: 1, y: 2 } } }),
      count: s => s.nodes.length,
      assert: (before, after) => expect(after).toBe(before + 1)
    },
    {
      name: 'create_peg',
      build: () => ({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'New_Peg', position: { x: 0, y: 0 } } }),
      count: s => s.nodes.length,
      assert: (before, after) => expect(after).toBe(before + 1)
    },
    {
      name: 'create_camera',
      build: () => ({ type: 'create_camera', params: { parentPath: 'Top', cameraName: 'Cam', setAsDefault: true } }),
      count: s => s.cameras.length,
      assert: (before, after) => expect(after).toBe(before + 1)
    },
    {
      name: 'create_drawing_element',
      build: () => ({ type: 'create_drawing_element', params: { elementName: 'NewElement', fieldGuide: 12, scanType: 'COLOR', vectorType: 'BITMAP' } }),
      count: s => s.drawingElements.length,
      assert: (before, after) => expect(after).toBe(before + 1)
    },
    {
      name: 'create_sound_column',
      build: () => ({ type: 'create_sound_column', params: { columnName: 'Dialogue' } }),
      count: s => s.columns.length,
      assert: (before, after) => expect(after).toBe(before + 1)
    },
    {
      name: 'create_palette',
      build: () => ({ type: 'create_palette', params: { paletteName: 'Extra_Palette', location: 'scene', elementName: null } }),
      count: s => s.palettes.length,
      assert: (before, after) => expect(after).toBe(before + 1)
    }
  ];

  it.each(cases)('$name changes the scene', ({ build, count, assert }) => {
    const h = harness();
    const before = count(h.scene);
    const { state, result } = h.simulator.execute(h.scene, plan([command(build(h))]));
    expect(result.status).toBe('succeeded');
    assert(before, count(state));
  });

  it('set_transform_keyframe creates a column, a key and a controller binding', () => {
    const h = harness();
    const node = nodeOf(h.manifest, 'head');
    const { state, result } = h.simulator.execute(h.scene, plan([transformKey(node, 7, { rotationZ: 12.5 })]));
    expect(result.status).toBe('succeeded');
    expect(state.columns.some(c => c.linkedNodePath === node && c.linkedChannel === 'rotationZ')).toBe(true);
    expect(state.keyframes.some(k => k.frame === 7 && Math.abs(k.value - 12.5) < 1e-9)).toBe(true);
    expect(state.controllerBindings.some(b => b.controllerId === 'head')).toBe(true);
  });

  it('set_function_point replaces rather than duplicates a key at the same frame', () => {
    const h = harness();
    const fp = (value: number) => command({
      type: 'set_function_point',
      params: { columnName: 'Manual_Col', frame: 3, value, handleLeftX: -1, handleLeftY: 0, handleRightX: 1, handleRightY: 0, constSeg: false, continuity: 'SMOOTH' }
    });
    const { state } = h.simulator.execute(h.scene, plan([fp(1), fp(2)]));
    const keys = state.keyframes.filter(k => k.columnName === 'Manual_Col' && k.frame === 3);
    expect(keys).toHaveLength(1);
    expect(keys[0].value).toBe(2);
  });

  it('set_function_interpolation edits an existing key', () => {
    const h = harness();
    const { state } = h.simulator.execute(h.scene, plan([
      command({ type: 'set_function_point', params: { columnName: 'Col_A', frame: 2, value: 1, handleLeftX: -1, handleLeftY: 0, handleRightX: 1, handleRightY: 0, constSeg: false, continuity: 'SMOOTH' } }),
      command({ type: 'set_function_interpolation', params: { columnName: 'Col_A', frame: 2, interpolation: 'constant' } })
    ]));
    expect(state.keyframes.find(k => k.columnName === 'Col_A')?.interpolation).toBe('constant');
  });

  it('connect_nodes and disconnect_nodes are inverses', () => {
    const h = harness();
    const connected = h.simulator.execute(h.scene, plan([
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'A', position: { x: 0, y: 0 } } }),
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'B', position: { x: 0, y: 0 } } }),
      command({ type: 'connect_nodes', params: { sourcePath: 'Top/A', sourcePort: 0, targetPath: 'Top/B', targetPort: 3 } })
    ])).state;
    expect(connected.connections.some(c => c.toNode === 'Top/B' && c.toPort === 3)).toBe(true);

    const disconnected = h.simulator.execute(connected, plan([
      command({ type: 'disconnect_nodes', params: { targetPath: 'Top/B', targetPort: 3 } })
    ])).state;
    expect(disconnected.connections.some(c => c.toNode === 'Top/B' && c.toPort === 3)).toBe(false);
  });

  it('rename_node moves the whole subtree and rewires references', () => {
    const h = harness();
    const built = h.simulator.execute(h.scene, plan([
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'Parent', position: { x: 0, y: 0 } } }),
      command({ type: 'create_peg', params: { parentPath: 'Top/Parent', pegName: 'Child', position: { x: 0, y: 0 } } }),
      command({ type: 'connect_nodes', params: { sourcePath: 'Top/Parent', sourcePort: 0, targetPath: 'Top/Parent/Child', targetPort: 0 } })
    ])).state;

    const renamed = h.simulator.execute(built, plan([
      command({ type: 'rename_node', params: { nodePath: 'Top/Parent', newName: 'Renamed' } }, {
        preconditions: [{ kind: 'node_exists', nodePath: 'Top/Parent' }],
        expectedPostconditions: [{ kind: 'node_exists', nodePath: 'Top/Renamed' }]
      })
    ])).state;

    expect(renamed.nodes.some(n => n.path === 'Top/Renamed')).toBe(true);
    expect(renamed.nodes.some(n => n.path === 'Top/Renamed/Child')).toBe(true);
    expect(renamed.nodes.some(n => n.path.startsWith('Top/Parent'))).toBe(false);
    expect(renamed.connections.some(c => c.fromNode === 'Top/Renamed' && c.toNode === 'Top/Renamed/Child')).toBe(true);
  });

  it('delete_node removes the subtree and everything referencing it', () => {
    const h = harness();
    const built = h.simulator.execute(h.scene, plan([
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'Doomed', position: { x: 0, y: 0 } } }),
      command({ type: 'create_peg', params: { parentPath: 'Top/Doomed', pegName: 'Inner', position: { x: 0, y: 0 } } }),
      command({ type: 'connect_nodes', params: { sourcePath: 'Top/Doomed', sourcePort: 0, targetPath: 'Top/Doomed/Inner', targetPort: 0 } })
    ])).state;

    const deleted = h.simulator.execute(built, plan([
      // A destructive command requires the plan to take a snapshot first; checkPlanInvariants
      // enforces that, so the snapshot marker is part of what makes this plan legal.
      command({ type: 'snapshot_project', params: { snapshotId: 'snap_test', includeRenders: false } }, { destructiveLevel: 'none' }),
      command({ type: 'delete_node', params: { nodePath: 'Top/Doomed' } }, {
        destructiveLevel: 'destructive',
        preconditions: [{ kind: 'node_exists', nodePath: 'Top/Doomed' }],
        expectedPostconditions: [{ kind: 'node_absent', nodePath: 'Top/Doomed' }],
        rollback: { strategy: 'restore_snapshot', snapshotId: 'snap_test' }
      })
    ])).state;

    expect(deleted.nodes.some(n => n.path.startsWith('Top/Doomed'))).toBe(false);
    expect(deleted.connections.some(c => c.fromNode.startsWith('Top/Doomed') || c.toNode.startsWith('Top/Doomed'))).toBe(false);
  });

  it('set_exposure fills the requested frame range', () => {
    const h = harness();
    const { state } = h.simulator.execute(h.scene, plan([
      command({ type: 'create_sound_column', params: { columnName: 'Hand_L_col' } }),
      command({ type: 'set_exposure', params: { columnName: 'Hand_L_col', startFrame: 3, endFrame: 7, drawingName: 'fist' } })
    ]));
    const exposures = state.exposures.filter(e => e.columnName === 'Hand_L_col');
    expect(exposures).toHaveLength(5);
    expect(exposures.every(e => e.drawingName === 'fist')).toBe(true);
  });

  it('set_switch_selection accepts only drawings the rig declares', () => {
    const h = harness();
    const ok = h.simulator.execute(h.scene, plan([
      command({ type: 'set_switch_selection', params: { controllerId: 'mouth', elementName: 'Mouth', frame: 4, drawingName: 'AI' } })
    ]));
    expect(ok.result.status).toBe('succeeded');
    expect(ok.state.switchSelections).toHaveLength(1);

    const bad = h.simulator.execute(h.scene, plan([
      command({ type: 'set_switch_selection', params: { controllerId: 'mouth', elementName: 'Mouth', frame: 4, drawingName: 'NOT_A_VISEME' } })
    ]));
    expect(bad.result.status).toBe('rolled_back');
    expect(bad.result.errors[0].code).toBe('SIMULATOR_DRAWING_NOT_FOUND');
    expect(bad.result.commandOutcomes[0].availableCandidates).toEqual(expect.arrayContaining(['REST', 'AI']));
  });

  it('set_pivot and set_attribute record their values', () => {
    const h = harness();
    const node = nodeOf(h.manifest, 'root');
    const { state } = h.simulator.execute(h.scene, plan([
      command({ type: 'set_pivot', params: { nodePath: node, pivot: { x: 1.5, y: -2 }, pivotSource: 'pivot_estimator' } }, { preconditions: [{ kind: 'node_exists', nodePath: node }] }),
      command({ type: 'set_attribute', params: { nodePath: node, attributeName: 'SHOT', value: 'sh010' } }, { preconditions: [{ kind: 'node_exists', nodePath: node }] })
    ]));
    const binding = state.controllerBindings.find(b => b.nodePath === node)!;
    expect(binding.pivotX).toBe(1.5);
    expect(binding.pivotSource).toBe('pivot_estimator');
    expect(state.attributes.find(a => a.attribute === 'SHOT')?.value).toBe('sh010');
  });

  it('add_palette_swatch requires the palette to exist and reports candidates when it does not', () => {
    const h = harness();
    const { result } = h.simulator.execute(h.scene, plan([
      command({ type: 'add_palette_swatch', params: { paletteName: 'Ghost_Palette', colorId: '0x000000000000000f', colorName: 'X', rgba: { r: 1, g: 2, b: 3, a: 255 }, colorType: 'solid' } })
    ]));
    expect(result.errors[0].code).toBe('SIMULATOR_PALETTE_NOT_FOUND');
    expect(result.commandOutcomes[0].availableCandidates).toContain('simple_humanoid_v1_palette');
  });

  it('snapshot_project and inspect_native_entities are recognised but do not mutate', () => {
    const h = harness();
    const { state, result } = h.simulator.execute(h.scene, plan([
      command({ type: 'snapshot_project', params: { snapshotId: 'snap_x', includeRenders: false } }, { destructiveLevel: 'none' }),
      command({ type: 'inspect_native_entities', params: { entityKinds: ['nodes', 'columns'], rootPath: 'Top' } }, { destructiveLevel: 'none' })
    ]));
    expect(result.commandOutcomes.every(o => o.outcome === 'skipped')).toBe(true);
    expect(state.contentHash).toBe(h.scene.contentHash);
    expect(state.revision).toBe(h.scene.revision);
  });
});

describe('typed errors', () => {
  const expectError = (h: ReturnType<typeof harness>, payload: HarmonyCommandPayload, code: string, overrides = {}) => {
    const { result } = h.simulator.execute(h.scene, plan([command(payload, overrides)]));
    expect(result.errors[0]?.code).toBe(code);
    expect(result.commandOutcomes[0].outcome).toBe('rejected');
    expect(result.commandOutcomes[0].commandId).toBe(result.errors[0].commandId);
    expect(result.errors[0].commandIndex).toBe(0);
  };

  it('SIMULATOR_COMMAND_NOT_SUPPORTED for a refused command', () => {
    expectError(harness(), {
      type: 'render_preview',
      params: { startFrame: 1, endFrame: 10, outputDirectory: 'renders', resolutionX: 1920, resolutionY: 1080 }
    }, 'SIMULATOR_COMMAND_NOT_SUPPORTED');
  });

  it('refuses TVG authoring at both the plan-invariant and the handler layer', () => {
    const tvg = command({
      type: 'create_drawing_element',
      params: { elementName: 'Vector', fieldGuide: 12, scanType: 'COLOR', vectorType: 'TVG' }
    });

    // Outer gate: checkPlanInvariants refuses TVG outside a real-Harmony plan, so the plan is
    // rejected before any handler runs.
    const outer = harness().simulator.execute(harness().scene, plan([tvg]));
    expect(outer.result.errors[0].code).toBe('SIMULATOR_PLAN_REJECTED');
    expect(outer.result.errors[0].message).toMatch(/tvg_requires_harmony/);

    // Inner gate: a plan that declares real_harmony passes the invariant, and the handler then
    // refuses on its own. Without this second layer, changing the plan's execution mode would
    // be enough to make the simulator claim it authored vector geometry.
    const claimsHarmony = harness().simulator.execute(harness().scene, plan([tvg], {
      executionMode: 'real_harmony', requiresRealHarmony: true
    }));
    expect(claimsHarmony.result.errors[0].code).toBe('SIMULATOR_COMMAND_NOT_SUPPORTED');
    expect(claimsHarmony.result.isRealHarmonyExecution).toBe(false);
  });

  it('SIMULATOR_NODE_NOT_FOUND lists candidates', () => {
    const h = harness();
    const { result } = h.simulator.execute(h.scene, plan([transformKey('Top/Character/Nope', 1, { rotationZ: 1 }, { preconditions: [{ kind: 'scene_open' }] })]));
    expect(result.errors[0].code).toBe('SIMULATOR_NODE_NOT_FOUND');
    expect(result.commandOutcomes[0].availableCandidates.length).toBeGreaterThan(0);
  });

  it('SIMULATOR_NODE_ALREADY_EXISTS', () => {
    const h = harness();
    const { result } = h.simulator.execute(h.scene, plan([
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'Dup', position: { x: 0, y: 0 } } }),
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'Dup', position: { x: 0, y: 0 } } })
    ]));
    expect(result.errors[0].code).toBe('SIMULATOR_NODE_ALREADY_EXISTS');
  });

  it('SIMULATOR_CONTROLLER_NOT_FOUND lists the rig controllers', () => {
    const h = harness();
    const { result } = h.simulator.execute(h.scene, plan([
      command({ type: 'set_switch_selection', params: { controllerId: 'ghost_controller', elementName: 'Mouth', frame: 1, drawingName: 'AI' } })
    ]));
    expect(result.errors[0].code).toBe('SIMULATOR_CONTROLLER_NOT_FOUND');
    expect(result.commandOutcomes[0].availableCandidates).toContain('mouth');
  });

  it('SIMULATOR_CHANNEL_NOT_SUPPORTED when the controller rejects the channel', () => {
    const h = harness();
    // `torso` accepts rotationZ, scaleX and scaleY — but not skew.
    const node = nodeOf(h.manifest, 'torso');
    const { result } = h.simulator.execute(h.scene, plan([
      command({ type: 'set_transform_keyframe', params: { nodePath: node, frame: 2, offset: null, rotationZ: null, scale: null, skew: 5, interpolation: 'linear' } }, {
        preconditions: [{ kind: 'node_exists', nodePath: node }]
      })
    ]));
    expect(result.errors[0].code).toBe('SIMULATOR_CHANNEL_NOT_SUPPORTED');
  });

  it('SIMULATOR_FRAME_OUT_OF_RANGE past the end of the scene', () => {
    const h = harness('simple_humanoid_v1', 'short-scene', 10);
    const { result } = h.simulator.execute(h.scene, plan([
      transformKey(nodeOf(h.manifest, 'torso'), 50, { rotationZ: 1 }, { preconditions: [{ kind: 'node_exists', nodePath: nodeOf(h.manifest, 'torso') }] })
    ]));
    expect(result.errors[0].code).toBe('SIMULATOR_FRAME_OUT_OF_RANGE');
  });

  it('SIMULATOR_CONNECTION_INVALID on an occupied port', () => {
    const h = harness();
    // Port 0 of Head_Peg already carries the rig hierarchy connection from Torso_Peg.
    const { result } = h.simulator.execute(h.scene, plan([
      command({ type: 'connect_nodes', params: { sourcePath: 'Top/Character/Hand_L', sourcePort: 0, targetPath: 'Top/Character/Head_Peg', targetPort: 0 } })
    ]));
    expect(result.errors[0].code).toBe('SIMULATOR_CONNECTION_INVALID');
    expect(result.errors[0].message).toMatch(/already fed by/);
  });

  it('SIMULATOR_CONNECTION_INVALID on a self connection', () => {
    const h = harness();
    const { result } = h.simulator.execute(h.scene, plan([
      command({ type: 'connect_nodes', params: { sourcePath: 'Top/Character/Head_Peg', sourcePort: 0, targetPath: 'Top/Character/Head_Peg', targetPort: 4 } })
    ]));
    expect(['SIMULATOR_CONNECTION_INVALID', 'SIMULATOR_CYCLE_DETECTED']).toContain(result.errors[0].code);
  });

  it('SIMULATOR_CONNECTION_INVALID when disconnecting a port that carries nothing', () => {
    const h = harness();
    const { result } = h.simulator.execute(h.scene, plan([
      command({ type: 'disconnect_nodes', params: { targetPath: 'Top/Character/Head_Peg', targetPort: 9 } })
    ]));
    expect(result.errors[0].code).toBe('SIMULATOR_CONNECTION_INVALID');
  });

  it('SIMULATOR_CYCLE_DETECTED when a connection would close a loop', () => {
    const h = harness();
    // Torso already feeds Head; feeding Head back into Torso closes the cycle.
    const { result } = h.simulator.execute(h.scene, plan([
      command({ type: 'connect_nodes', params: { sourcePath: 'Top/Character/Head_Peg', sourcePort: 0, targetPath: 'Top/Character/Torso_Peg', targetPort: 7 } })
    ]));
    expect(result.errors[0].code).toBe('SIMULATOR_CYCLE_DETECTED');
  });

  it('rejects duplicate command ids at the schema layer', () => {
    const a = command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'X', position: { x: 0, y: 0 } } }, { commandId: 'cmd_0001', idempotencyKey: 'idem_aaaaaaaaaaaa' });
    const b = command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'Y', position: { x: 0, y: 0 } } }, { commandId: 'cmd_0001', idempotencyKey: 'idem_bbbbbbbbbbbb' });
    expect(() => plan([a, b])).toThrow(/commandId values must be unique/);
  });

  it('SIMULATOR_DUPLICATE_COMMAND_ID catches an unvalidated plan object', () => {
    // A schema-valid plan cannot carry duplicate ids, so this check is defence in depth for a
    // caller that hands over an object without parsing it first.
    const h = harness();
    const valid = plan([
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'X', position: { x: 0, y: 0 } } }, { commandId: 'cmd_0001', idempotencyKey: 'idem_aaaaaaaaaaaa' })
    ]);
    const forged = { ...valid, commands: [valid.commands[0], { ...valid.commands[0], idempotencyKey: 'idem_bbbbbbbbbbbb' }] };
    const { result, state } = h.simulator.execute(h.scene, forged as typeof valid);
    // The schema re-parse inside execute() catches it first; either code proves nothing ran.
    expect(['SIMULATOR_DUPLICATE_COMMAND_ID', 'SIMULATOR_PLAN_REJECTED']).toContain(result.errors[0].code);
    expect(state.contentHash).toBe(h.scene.contentHash);
    expect(result.appliedCount).toBe(0);
  });

  it('SIMULATOR_BUDGET_EXCEEDED refuses an oversized plan up front', () => {
    const h = harness();
    const commands = Array.from({ length: 60 }, (_, i) =>
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: `P${i}`, position: { x: 0, y: 0 } } }));
    const { result, state } = h.simulator.execute(h.scene, plan(commands), { limits: { maxCommands: 10 } });
    expect(result.errors[0].code).toBe('SIMULATOR_BUDGET_EXCEEDED');
    expect(state.contentHash).toBe(h.scene.contentHash);
  });

  it('SIMULATOR_PRECONDITION_FAILED names the command and offers candidates', () => {
    const h = harness();
    const { result } = h.simulator.execute(h.scene, plan([
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'Z', position: { x: 0, y: 0 } } }, {
        preconditions: [{ kind: 'node_exists', nodePath: 'Top/Missing/Parent' }]
      })
    ]));
    expect(result.errors[0].code).toBe('SIMULATOR_PRECONDITION_FAILED');
    expect(result.commandOutcomes[0].availableCandidates.length).toBeGreaterThan(0);
  });

  it('SIMULATOR_POSTCONDITION_FAILED when the declared outcome does not hold', () => {
    const h = harness();
    const { result } = h.simulator.execute(h.scene, plan([
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'Q', position: { x: 0, y: 0 } } }, {
        expectedPostconditions: [{ kind: 'node_exists', nodePath: 'Top/Somewhere_Else' }]
      })
    ]));
    expect(result.errors[0].code).toBe('SIMULATOR_POSTCONDITION_FAILED');
  });
});

describe('rig compatibility reports', () => {
  const validator = new RigCompatibilityValidator();

  it('reports every deliberate defect in invalid_rig_v1', () => {
    const { manifest, findings } = validator.validateManifest(loadRigFixtureRaw('invalid_rig_v1'));
    expect(manifest).not.toBeNull();
    const messages = findings.map(f => f.message).join(' | ');
    expect(messages).toMatch(/controller_cycle/);
    expect(messages).toMatch(/missing_parent/);
    expect(messages).toMatch(/duplicate_alias/);
    expect(messages).toMatch(/mirror_not_reciprocal/);
    expect(messages).toMatch(/duplicate_node_path/);
    expect(messages).toMatch(/ik_missing_controller/);
    expect(messages).toMatch(/switch_unknown_drawing/);
    expect(messages).toMatch(/mapping_channel_unsupported/);
    expect(messages).toMatch(/missing_root_controller/);
    expect(findings.filter(f => f.severity === 'error').length).toBeGreaterThanOrEqual(9);
  });

  it('accepts each valid rig with no errors', () => {
    for (const rigId of ['simple_humanoid_v1', 'stylized_big_head_v1', 'asymmetric_character_v1']) {
      const { findings } = validator.validateManifest(loadRigFixtureRaw(rigId));
      expect(findings.filter(f => f.severity === 'error')).toEqual([]);
    }
  });

  it('blocks a plan that names an undeclared controller', () => {
    const manifest = loadRigFixture('simple_humanoid_v1');
    const report = validator.validate(manifest, plan([
      command({ type: 'set_switch_selection', params: { controllerId: 'nope', elementName: 'Mouth', frame: 1, drawingName: 'AI' } })
    ]));
    expect(report.compatible).toBe(false);
    expect(report.findings.some(f => f.code === 'UNKNOWN_CONTROLLER')).toBe(true);
    expect(report.coverage).toBeLessThan(1);
  });

  it('blocks a plan whose command type the simulator refuses', () => {
    const manifest = loadRigFixture('simple_humanoid_v1');
    const report = validator.validate(manifest, plan([
      command({ type: 'render_final', params: { writeNodePath: 'Top/Write', startFrame: 1, endFrame: 10 } })
    ]));
    expect(report.compatible).toBe(false);
    expect(report.findings.some(f => f.code === 'UNSUPPORTED_BY_SIMULATOR')).toBe(true);
  });

  it('flags a limit breach as an error when the rig says reject and a warning when it says clamp', () => {
    const strict = loadRigFixture('asymmetric_character_v1');
    const lenient = loadRigFixture('simple_humanoid_v1');
    const overRotate = (m: typeof strict, controllerId: string) => plan([
      transformKey(nodeOf(m, controllerId), 2, { rotationZ: 179 }, { preconditions: [{ kind: 'scene_open' }] })
    ]);
    expect(validator.validate(strict, overRotate(strict, 'shoulder_r')).findings.some(f => f.code === 'LIMIT_EXCEEDED' && f.severity === 'error')).toBe(true);
    expect(validator.validate(lenient, overRotate(lenient, 'torso')).findings.some(f => f.code === 'LIMIT_EXCEEDED' && f.severity === 'warning')).toBe(true);
  });

  it('warns on a frame rate mismatch without blocking', () => {
    const manifest = loadRigFixture('stylized_big_head_v1'); // 12 fps
    const report = validator.validate(manifest, plan([
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'P', position: { x: 0, y: 0 } } })
    ]), { sceneFps: 24 });
    expect(report.findings.some(f => f.code === 'FRAME_RATE_MISMATCH' && f.severity === 'warning')).toBe(true);
    expect(report.compatible).toBe(true);
  });

  it('requireCompatible throws RIG_INCOMPATIBLE rather than returning a warning', () => {
    const manifest = loadRigFixture('simple_humanoid_v1');
    const bad = plan([command({ type: 'render_final', params: { writeNodePath: 'Top/W', startFrame: 1, endFrame: 2 } })]);
    expect(() => validator.requireCompatible(manifest, bad)).toThrow(MlError);
  });

  it('reports per-command-type coverage', () => {
    const manifest = loadRigFixture('simple_humanoid_v1');
    const report = validator.validate(manifest, plan([
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'A', position: { x: 0, y: 0 } } }),
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'B', position: { x: 0, y: 0 } } }),
      command({ type: 'render_final', params: { writeNodePath: 'Top/W', startFrame: 1, endFrame: 2 } })
    ]));
    expect(report.commandTypeCoverage.create_peg).toEqual({ total: 2, supported: 2 });
    expect(report.commandTypeCoverage.render_final).toEqual({ total: 1, supported: 0 });
  });
});

describe('simulator instances hold no shared mutable state', () => {
  it('two simulators over the same rig do not observe each other', () => {
    const manifest = loadRigFixture('simple_humanoid_v1');
    const a = new HarmonyContractSimulator(manifest);
    const b = new HarmonyContractSimulator(manifest);
    const sceneA = a.createScene('iso-a');
    const sceneB = b.createScene('iso-b');
    const mutated = a.execute(sceneA, plan([command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'OnlyInA', position: { x: 0, y: 0 } } })])).state;
    expect(mutated.nodes.some(n => n.path === 'Top/OnlyInA')).toBe(true);
    expect(sceneB.nodes.some(n => n.path === 'Top/OnlyInA')).toBe(false);
    expect(sceneA.nodes.some(n => n.path === 'Top/OnlyInA')).toBe(false);
  });
});
