import { describe, expect, it } from '@jest/globals';
import { harmonyCommandPlanV4Schema } from '../../src/schemas/harmonyCommandPlanV4.js';
import {
  harmonyCommandPlanV5Schema,
  harmonyCommandPayloadSchema,
  checkPlanInvariants,
  HARMONY_V5_COMMAND_TYPES,
  type HarmonyCommandPlanV5
} from '../../src/schemas/harmonyCommandPlanV5.js';

const sourceSha = 'b'.repeat(64);

function command(overrides: Record<string, unknown> = {}) {
  return {
    commandId: 'cmd_1',
    payload: { type: 'create_peg', params: { parentPath: 'Top', pegName: 'Peg_Root', position: { x: 0, y: 0 } } },
    preconditions: [{ kind: 'scene_open' }],
    expectedPostconditions: [{ kind: 'node_exists', nodePath: 'Top/Peg_Root' }],
    destructiveLevel: 'none',
    idempotencyKey: 'idem_create_peg_root',
    rollback: { strategy: 'delete_created', nodePaths: ['Top/Peg_Root'] },
    verification: { method: 'native_entity_inspection', required: true, acceptance: ['peg exists'] },
    sourcePirId: 'pir_rig_1',
    sourcePirKind: 'CharacterRigPIR',
    ...overrides
  };
}

function plan(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    schemaVersion: '5.0',
    planId: 'plan_00000001',
    manifestId: 'manifest_1',
    shotId: 'sh010',
    createdAt: '2026-07-28T00:00:00.000Z',
    status: 'compiled',
    requiresRealHarmony: true,
    executionMode: 'real_harmony',
    sourceManifestSha256: sourceSha,
    commands: [command()],
    acceptanceGates: ['peg created'],
    provenance: { compiler: 'HarmonyCommandPlanV5Compiler', compilerVersion: '1.0.0', source: 'test', contributingMlJobIds: [] },
    ...overrides
  };
}

describe('V4 remains readable', () => {
  it('still parses a V4 plan unchanged, so committed evidence keeps validating', () => {
    const v4 = {
      schemaVersion: '4.0',
      planId: 'plan_000000001',
      manifestId: 'manifest1',
      createdAt: '2026-07-01T00:00:00.000Z',
      status: 'implemented_unverified',
      requiresRealHarmony: true,
      sourceManifestSha256: 'c'.repeat(64),
      commands: Array.from({ length: 10 }, (_, i) => ({
        commandId: `cmd_${i}`,
        type: 'create_node',
        params: { anything: 'goes in v4' },
        preconditions: ['scene open'],
        destructiveLevel: 'none',
        idempotencyKey: 'idempotency-key',
        rollback: { strategy: 'none', snapshotRequired: false },
        expectedArtifact: { kind: 'node', path: null, nonempty: true },
        verification: { method: 'inspect', required: true, acceptance: ['ok'] }
      })),
      acceptanceGates: ['a', 'b', 'c', 'd', 'e', 'f'],
      provenance: { compiler: 'HarmonyCommandPlanV4Compiler v1', source: 'legacy' }
    };
    expect(harmonyCommandPlanV4Schema.safeParse(v4).success).toBe(true);
  });
});

describe('V5 removes the escape hatches V4 had', () => {
  it('accepts a plan with a single command (V4 demanded ten)', () => {
    expect(harmonyCommandPlanV5Schema.safeParse(plan()).success).toBe(true);
  });

  it('rejects unknown keys in command params, so raw model output cannot be splatted in', () => {
    const bad = plan({
      commands: [command({
        payload: { type: 'create_peg', params: { parentPath: 'Top', pegName: 'P', position: { x: 0, y: 0 }, llmRationale: 'because' } }
      })]
    });
    expect(harmonyCommandPlanV5Schema.safeParse(bad).success).toBe(false);
  });

  it('rejects a params object that is missing a required field', () => {
    const bad = plan({ commands: [command({ payload: { type: 'create_peg', params: { parentPath: 'Top' } } })] });
    expect(harmonyCommandPlanV5Schema.safeParse(bad).success).toBe(false);
  });

  it('allows requiresRealHarmony=false for a genuinely offline plan', () => {
    const offline = plan({ requiresRealHarmony: false, executionMode: 'offline_deterministic' });
    expect(harmonyCommandPlanV5Schema.safeParse(offline).success).toBe(true);
  });

  it('supports the full status lifecycle rather than one literal', () => {
    for (const status of ['planned', 'validated', 'approved', 'verified', 'rolled_back', 'blocked']) {
      expect(harmonyCommandPlanV5Schema.safeParse(plan({ status })).success).toBe(true);
    }
  });

  it('declares a contract for every command type the compiler is expected to emit', () => {
    expect(HARMONY_V5_COMMAND_TYPES).toHaveLength(41);
    for (const type of HARMONY_V5_COMMAND_TYPES) {
      const options = harmonyCommandPayloadSchema.options.map(o => o.shape.type.value);
      expect(options).toContain(type);
    }
  });

  it('still declares every command type the original 5.0 union carried', () => {
    // The union grew by rename_node and set_switch_selection during the simulator sprint.
    // Growing a discriminated union is backward compatible; removing or re-typing a member
    // would not be, so the original set is asserted explicitly rather than by count.
    const ORIGINAL_5_0 = [
      'snapshot_project', 'create_palette', 'add_palette_swatch', 'create_drawing_element',
      'create_drawing', 'import_bitmap_drawing', 'write_vector_path', 'set_exposure',
      'set_drawing_substitution', 'create_node', 'delete_node', 'connect_nodes', 'disconnect_nodes',
      'create_group', 'create_peg', 'create_deformation_chain', 'create_bone_deformer',
      'create_curve_deformer', 'attach_drawing_to_peg', 'set_pivot', 'set_attribute',
      'set_transform_keyframe', 'set_deformer_keyframe', 'set_function_point',
      'set_function_interpolation', 'create_sound_column', 'import_audio', 'create_camera',
      'set_camera_keyframe', 'configure_write_node', 'save_project', 'close_project',
      'reopen_project', 'inspect_native_entities', 'render_preview', 'render_final',
      'compare_render', 'rollback_snapshot', 'verify_rollback'
    ];
    expect(ORIGINAL_5_0).toHaveLength(39);
    for (const type of ORIGINAL_5_0) {
      expect(HARMONY_V5_COMMAND_TYPES as readonly string[]).toContain(type);
    }
  });

  it('validates the two additive command types', () => {
    expect(harmonyCommandPayloadSchema.safeParse({
      type: 'rename_node', params: { nodePath: 'Top/Character/Old', newName: 'New' }
    }).success).toBe(true);
    expect(harmonyCommandPayloadSchema.safeParse({
      type: 'set_switch_selection',
      params: { controllerId: 'mouth', elementName: 'Mouth', frame: 1, drawingName: 'AI' }
    }).success).toBe(true);
    // Frame 0 is still refused on a 1-based timeline.
    expect(harmonyCommandPayloadSchema.safeParse({
      type: 'set_switch_selection',
      params: { controllerId: 'mouth', elementName: 'Mouth', frame: 0, drawingName: 'AI' }
    }).success).toBe(false);
  });
});

describe('V5 command validation details', () => {
  it('rejects frame 0 on a Harmony timeline', () => {
    const result = harmonyCommandPayloadSchema.safeParse({
      type: 'set_exposure', params: { columnName: 'c', startFrame: 0, endFrame: 5, drawingName: 'd' }
    });
    expect(result.success).toBe(false);
  });

  it('rejects an inverted frame range', () => {
    const result = harmonyCommandPayloadSchema.safeParse({
      type: 'set_exposure', params: { columnName: 'c', startFrame: 10, endFrame: 5, drawingName: 'd' }
    });
    expect(result.success).toBe(false);
  });

  it('rejects a node path that does not start at Top', () => {
    const result = harmonyCommandPayloadSchema.safeParse({
      type: 'delete_node', params: { nodePath: 'Somewhere/Else' }
    });
    expect(result.success).toBe(false);
  });

  it('rejects an absolute or traversing export directory', () => {
    const build = (exportDirectory: string) => harmonyCommandPayloadSchema.safeParse({
      type: 'configure_write_node',
      params: { nodePath: 'Top/Write', exportPrefix: 'p', exportDirectory, format: 'PNG4', resolutionX: 1920, resolutionY: 1080 }
    });
    expect(build('/tmp/out').success).toBe(false);
    expect(build('../../out').success).toBe(false);
    expect(build('renders/preview').success).toBe(true);
  });

  it('rejects NaN in a transform keyframe', () => {
    const result = harmonyCommandPayloadSchema.safeParse({
      type: 'set_transform_keyframe',
      params: { nodePath: 'Top/Peg', frame: 1, offset: { x: Number.NaN, y: 0, z: 0 }, rotationZ: null, scale: null, skew: null, interpolation: 'linear' }
    });
    expect(result.success).toBe(false);
  });

  it('forces a destructive command to declare a real rollback', () => {
    const bad = plan({
      commands: [command({
        destructiveLevel: 'destructive',
        rollback: { strategy: 'none', reason: 'none needed' }
      })]
    });
    expect(harmonyCommandPlanV5Schema.safeParse(bad).success).toBe(false);
  });

  it('rejects duplicate command ids and duplicate idempotency keys', () => {
    const dupIds = plan({ commands: [command(), command()] });
    expect(harmonyCommandPlanV5Schema.safeParse(dupIds).success).toBe(false);
  });

  it('refuses to call a simulated plan executed or verified', () => {
    const bad = plan({ status: 'verified', executionMode: 'simulation', requiresRealHarmony: false });
    expect(harmonyCommandPlanV5Schema.safeParse(bad).success).toBe(false);
  });
});

describe('cross-command invariants', () => {
  const parse = (raw: Record<string, unknown>): HarmonyCommandPlanV5 => {
    const result = harmonyCommandPlanV5Schema.safeParse(raw);
    if (!result.success) throw new Error(result.error.message);
    return result.data;
  };

  it('flags a swatch added before its palette is created', () => {
    const raw = plan({
      commands: [
        command({
          commandId: 'cmd_1', idempotencyKey: 'idem_swatch_first',
          payload: { type: 'add_palette_swatch', params: { paletteName: 'Main', colorId: '0x0123456789abcdef', colorName: 'Skin', rgba: { r: 1, g: 2, b: 3, a: 255 }, colorType: 'solid' } },
          expectedPostconditions: [{ kind: 'palette_contains', paletteName: 'Main', colorId: '0x0123456789abcdef' }],
          rollback: { strategy: 'none', reason: 'additive' }
        }),
        command({
          commandId: 'cmd_2', idempotencyKey: 'idem_palette_after',
          payload: { type: 'create_palette', params: { paletteName: 'Main', location: 'scene', elementName: null } },
          expectedPostconditions: [{ kind: 'palette_contains', paletteName: 'Main', colorId: '0x0123456789abcdef' }],
          rollback: { strategy: 'none', reason: 'additive' }
        })
      ]
    });
    const violations = checkPlanInvariants(parse(raw));
    expect(violations.map(v => v.rule)).toContain('palette_ordering');
  });

  it('flags a rollback that references a snapshot the plan never takes', () => {
    const raw = plan({
      commands: [command({
        payload: { type: 'rollback_snapshot', params: { snapshotId: 'snap_missing' } },
        expectedPostconditions: [{ kind: 'frame_count_at_least', count: 1 }],
        rollback: { strategy: 'none', reason: 'is itself a rollback' }
      })]
    });
    const violations = checkPlanInvariants(parse(raw));
    expect(violations.map(v => v.rule)).toContain('snapshot_ordering');
  });

  it('refuses to claim TVG authoring outside a real Harmony', () => {
    const raw = plan({
      requiresRealHarmony: false,
      executionMode: 'offline_deterministic',
      commands: [command({
        payload: { type: 'create_drawing_element', params: { elementName: 'Head', fieldGuide: 12, scanType: 'COLOR', vectorType: 'TVG' } },
        expectedPostconditions: [{ kind: 'node_exists', nodePath: 'Top/Head' }],
        rollback: { strategy: 'delete_created', nodePaths: ['Top/Head'] }
      })]
    });
    const violations = checkPlanInvariants(parse(raw));
    expect(violations.map(v => v.rule)).toContain('tvg_requires_harmony');
  });

  it('requires a snapshot before any destructive command', () => {
    const raw = plan({
      commands: [command({
        destructiveLevel: 'destructive',
        payload: { type: 'delete_node', params: { nodePath: 'Top/Old' } },
        expectedPostconditions: [{ kind: 'node_absent', nodePath: 'Top/Old' }],
        rollback: { strategy: 'restore_snapshot', snapshotId: 'snap_1' }
      })]
    });
    const violations = checkPlanInvariants(parse(raw));
    expect(violations.map(v => v.rule)).toContain('destructive_needs_snapshot');
  });

  it('passes a well-ordered plan with no violations', () => {
    const raw = plan({
      commands: [
        command({
          commandId: 'cmd_1', idempotencyKey: 'idem_snapshot',
          payload: { type: 'snapshot_project', params: { snapshotId: 'snap_1', includeRenders: false } },
          expectedPostconditions: [{ kind: 'file_exists', relativePath: 'snapshots/snap_1', nonEmpty: true }],
          rollback: { strategy: 'none', reason: 'snapshot is itself the safety net' }
        }),
        command({ commandId: 'cmd_2', idempotencyKey: 'idem_create_peg_root_2' })
      ]
    });
    expect(checkPlanInvariants(parse(raw))).toEqual([]);
  });
});
