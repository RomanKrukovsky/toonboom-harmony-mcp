import { describe, it, expect } from '@jest/globals';

import type { MohoQaThresholds } from '../src/schemas/mohoQaThresholds.js';

// ---------------------------------------------------------------------------
// Types describing the SHAPES of input data each gate helper consumes.
// These are not Zod schemas — they are the runtime payloads the retake engine
// or QA pipeline will hand to each helper in Sprint 4.
// ---------------------------------------------------------------------------

export type GateResult = { passed: boolean; violations: string[] };

export interface SwitchLayerEvent {
  /** Frame on which the switch layer change occurs (0-indexed). */
  frame: number;
  /** Identifier of the switch layer being toggled (informational only). */
  layerId: string;
}

export interface SwitchLayerInput {
  fps: number;
  events: SwitchLayerEvent[];
}

export interface BoneAngleKeyframe {
  boneName: string;
  frame: number;
  /** The angle that was actually written to the rig. */
  newValue: number;
  /** The angle the motion grammar / pose library expected. */
  expectedValue: number;
}

export interface MeshWarpInput {
  /** Total number of mesh points touched by the warp operation. */
  pointsMoved: number;
  /** Mesh identifier — included for downstream telemetry, not gating logic. */
  meshId?: string;
}

export interface BoneRecord {
  boneId: string;
  /** Null/undefined = root bone (no parent). */
  parentBoneId: string | null;
}

export interface OrphanBoneInput {
  bones: BoneRecord[];
}

export interface ApprovalItem {
  /** Category of action — e.g. "key_pose", "camera_move", "dialogue_timing". */
  category: string;
  description: string;
}

export interface HumanApprovalInput {
  items: ApprovalItem[];
}

// ---------------------------------------------------------------------------
// Pure helpers. Each takes (input, thresholds) and returns { passed, violations }.
// They are intentionally framework-agnostic so the retake engine and QA
// pipeline can call them directly without pulling in Zod or any test infra.
// ---------------------------------------------------------------------------

function formatAngle(value: number): string {
  // Render a number with up to 3 decimal places, stripping trailing zeros so
  // that "2.5" stays "2.5" (not "2.500") while preserving fractional precision.
  const fixed = value.toFixed(3);
  return fixed.replace(/\.?0+$/, '');
}

export function checkSwitchRate(
  input: SwitchLayerInput,
  thresholds: MohoQaThresholds
): GateResult {
  const violations: string[] = [];

  if (!Number.isFinite(input.fps) || input.fps <= 0) {
    violations.push(`invalid fps: ${input.fps}`);
    return { passed: false, violations };
  }

  const maxPerSecond = thresholds.switchLayerMaxChangesPerSecond;
  const maxPerFrame = maxPerSecond / input.fps;

  // Bucket events into 1-second windows based on floor(frame / fps).
  const buckets = new Map<number, number>();
  for (const ev of input.events) {
    const window = Math.floor(ev.frame / input.fps);
    buckets.set(window, (buckets.get(window) ?? 0) + 1);
  }

  for (const [window, count] of buckets.entries()) {
    if (count > maxPerSecond) {
      const startFrame = window * input.fps;
      const endFrame = startFrame + input.fps - 1;
      violations.push(
        `switch rate exceeded: ${count} changes in window ` +
          `frames ${startFrame}-${endFrame} (max ${maxPerSecond}/s)`
      );
    }
  }

  // Also flag any individual frame whose density exceeds the per-frame allowance.
  // Trigger threshold is maxPerSecond: a single frame carrying that many changes
  // is "stuffed" beyond what a one-second window can absorb at this fps.
  const perFrameCounts = new Map<number, number>();
  for (const ev of input.events) {
    perFrameCounts.set(ev.frame, (perFrameCounts.get(ev.frame) ?? 0) + 1);
  }
  for (const [frame, count] of perFrameCounts.entries()) {
    if (count >= maxPerSecond) {
      violations.push(
        `switch rate exceeded: ${count} changes on frame ${frame} ` +
          `(max ${maxPerFrame.toFixed(3)} changes per frame @ ${input.fps}fps)`
      );
    }
  }

  return { passed: violations.length === 0, violations };
}

export function checkAngleTolerance(
  keyframes: BoneAngleKeyframe[],
  thresholds: MohoQaThresholds
): GateResult {
  const violations: string[] = [];
  const tolerance = thresholds.boneAngleToleranceDeg;

  for (const kf of keyframes) {
    const delta = Math.abs(kf.newValue - kf.expectedValue);
    if (delta > tolerance) {
      violations.push(
        `bone "${kf.boneName}" frame ${kf.frame}: |${kf.newValue} - ${kf.expectedValue}| ` +
          `= ${formatAngle(delta)}° exceeds tolerance ${tolerance}°`
      );
    }
  }

  return { passed: violations.length === 0, violations };
}

export function checkMeshWarp(
  input: MeshWarpInput,
  thresholds: MohoQaThresholds
): GateResult {
  const violations: string[] = [];

  if (!Number.isInteger(input.pointsMoved) || input.pointsMoved < 0) {
    violations.push(`invalid pointsMoved: ${input.pointsMoved}`);
    return { passed: false, violations };
  }

  if (input.pointsMoved > thresholds.meshWarpMaxPointsMoved) {
    violations.push(
      `mesh warp "${input.meshId ?? '<unnamed>'}" moved ${input.pointsMoved} points ` +
        `(max ${thresholds.meshWarpMaxPointsMoved})`
    );
  }

  return { passed: violations.length === 0, violations };
}

export function checkOrphanBones(
  input: OrphanBoneInput,
  thresholds: MohoQaThresholds
): GateResult {
  const violations: string[] = [];

  if (!thresholds.forbidOrphanBones) {
    return { passed: true, violations };
  }

  const seen = new Set(input.bones.map((b) => b.boneId));
  const nullParentCount = input.bones.reduce(
    (n, b) => (b.parentBoneId === null || b.parentBoneId === undefined ? n + 1 : n),
    0
  );
  let nullParentsSeen = 0;
  for (const bone of input.bones) {
    if (bone.parentBoneId === null || bone.parentBoneId === undefined) {
      nullParentsSeen += 1;
      // Allow exactly one root bone with no parent; anything beyond that is
      // an orphan that cannot be attached to the rig hierarchy.
      if (nullParentsSeen > 1 || nullParentCount > 1) {
        violations.push(`bone "${bone.boneId}" has no parent (orphan root)`);
      }
      continue;
    }
    if (!seen.has(bone.parentBoneId)) {
      violations.push(
        `bone "${bone.boneId}" references missing parent "${bone.parentBoneId}"`
      );
    }
  }

  return { passed: violations.length === 0, violations };
}

export function checkHumanApproval(
  input: HumanApprovalInput,
  thresholds: MohoQaThresholds
): GateResult {
  const violations: string[] = [];
  const requireFor = new Set(thresholds.requireHumanApprovalFor);

  for (const item of input.items) {
    if (requireFor.has(item.category)) {
      violations.push(
        `item "${item.description}" (category=${item.category}) requires_human_approval`
      );
    }
  }

  return { passed: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Fixture: a parsed MohoQaThresholds with all defaults lifted to known values.
// Tests below use this as the canonical threshold bundle so behavioral
// expectations are independent of the Zod defaults.
// ---------------------------------------------------------------------------

function qaThresholdsFixture(): MohoQaThresholds {
  return {
    schemaVersion: '1.0',
    thresholdsId: 'qa_main_v1',
    silhouetteQualityMin: 0.7,
    lipsyncDriftMaxMs: 80,
    continuityMaxDeltaFrames: 2,
    lineThicknessTolerancePt: 0.5,
    paletteDeltaMax: 0.02,
    poseLibraryMatchMin: 0.85,
    autoFixableSeverityMax: 'medium',
    requireHumanApprovalFor: ['key_pose', 'camera_move', 'dialogue_timing'],
    boneAngleToleranceDeg: 2.0,
    meshWarpMaxPointsMoved: 8,
    switchLayerMaxChangesPerSecond: 6,
    forbidOrphanBones: true,
    provenance: { approver: 'td_lead', approvedAt: '2026-07-27T12:00:00Z' }
  };
}

// ---------------------------------------------------------------------------
// Behavioral tests
// ---------------------------------------------------------------------------

describe('checkSwitchRate — switchLayerMaxChangesPerSecond', () => {
  it('passes when no events are present', () => {
    const result = checkSwitchRate({ fps: 24, events: [] }, qaThresholdsFixture());
    expect(result).toEqual({ passed: true, violations: [] });
  });

  it('passes when total events are within budget across the timeline', () => {
    // 6 events spread across a full second of frames (24fps => 0..23).
    const events: SwitchLayerEvent[] = [
      { frame: 0, layerId: 'face' },
      { frame: 4, layerId: 'face' },
      { frame: 8, layerId: 'face' },
      { frame: 12, layerId: 'face' },
      { frame: 16, layerId: 'face' },
      { frame: 20, layerId: 'face' }
    ];
    const result = checkSwitchRate({ fps: 24, events }, qaThresholdsFixture());
    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('flags >6 events inside a single 1-second window', () => {
    // 7 events all in frames 0..23 (the first 1s window at 24fps).
    const events: SwitchLayerEvent[] = Array.from({ length: 7 }, (_, i) => ({
      frame: i * 3, // frames 0,3,6,9,12,15,18 — all inside window 0
      layerId: 'face'
    }));
    const result = checkSwitchRate({ fps: 24, events }, qaThresholdsFixture());
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes('max 6/s'))).toBe(true);
  });

  it('uses fps to compute per-frame budget (6/24 = 0.25 changes/frame)', () => {
    // 6 events on a single frame = 6 events / 1 frame = 6/sec equivalent,
    // which dwarfs the 0.25/frame budget.
    const events: SwitchLayerEvent[] = Array.from({ length: 6 }, (_, i) => ({
      frame: 10,
      layerId: `layer_${i}`
    }));
    const result = checkSwitchRate({ fps: 24, events }, qaThresholdsFixture());
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes('per frame'))).toBe(true);
  });

  it('respects different fps values (windowing is fps-aware)', () => {
    // At 30fps, frames 0..29 are the first second. 7 events inside = violation.
    const events: SwitchLayerEvent[] = Array.from({ length: 7 }, (_, i) => ({
      frame: i * 4, // 0,4,8,12,16,20,24 — all inside window 0 at 30fps
      layerId: 'face'
    }));
    const result = checkSwitchRate({ fps: 30, events }, qaThresholdsFixture());
    expect(result.passed).toBe(false);
  });

  it('reports invalid fps as a violation', () => {
    const result = checkSwitchRate(
      { fps: 0, events: [{ frame: 0, layerId: 'face' }] },
      qaThresholdsFixture()
    );
    expect(result.passed).toBe(false);
    expect(result.violations[0]).toMatch(/invalid fps/);
  });
});

describe('checkAngleTolerance — boneAngleToleranceDeg', () => {
  it('passes when |delta| is within 2.0° tolerance', () => {
    const kfs: BoneAngleKeyframe[] = [
      { boneName: 'Head_Peg', frame: 12, newValue: 10.0, expectedValue: 10.5 }
    ];
    const result = checkAngleTolerance(kfs, qaThresholdsFixture());
    expect(result).toEqual({ passed: true, violations: [] });
  });

  it('passes when |delta| is exactly 2.0° (boundary, NOT flagged)', () => {
    const kfs: BoneAngleKeyframe[] = [
      { boneName: 'Head_Peg', frame: 24, newValue: 0.0, expectedValue: 2.0 }
    ];
    const result = checkAngleTolerance(kfs, qaThresholdsFixture());
    expect(result.passed).toBe(true);
  });

  it('flags a keyframe whose |delta| is greater than 2.0°', () => {
    const kfs: BoneAngleKeyframe[] = [
      { boneName: 'Head_Peg', frame: 24, newValue: 0.0, expectedValue: 2.5 }
    ];
    const result = checkAngleTolerance(kfs, qaThresholdsFixture());
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatch(/Head_Peg/);
    expect(result.violations[0]).toMatch(/2\.5°/);
  });

  it('flags multiple offenders independently and aggregates violations', () => {
    const kfs: BoneAngleKeyframe[] = [
      { boneName: 'Head_Peg', frame: 1, newValue: 5, expectedValue: 5 }, // ok
      { boneName: 'Spine_Peg', frame: 2, newValue: 0, expectedValue: 3 }, // 3 > 2
      { boneName: 'Arm_L', frame: 3, newValue: 0, expectedValue: -10 } // 10 > 2
    ];
    const result = checkAngleTolerance(kfs, qaThresholdsFixture());
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(2);
    expect(result.violations[0]).toMatch(/Spine_Peg/);
    expect(result.violations[1]).toMatch(/Arm_L/);
  });

  it('treats negative deltas symmetrically (|new - expected|)', () => {
    const kfs: BoneAngleKeyframe[] = [
      { boneName: 'Head_Peg', frame: 0, newValue: -5.0, expectedValue: -2.0 }
    ];
    const result = checkAngleTolerance(kfs, qaThresholdsFixture());
    expect(result.passed).toBe(false);
  });

  it('honors a custom tolerance (e.g. relaxed 10° rig)', () => {
    const t = { ...qaThresholdsFixture(), boneAngleToleranceDeg: 10 };
    const kfs: BoneAngleKeyframe[] = [
      { boneName: 'Head_Peg', frame: 0, newValue: 0, expectedValue: 5 }
    ];
    expect(checkAngleTolerance(kfs, t).passed).toBe(true);
  });
});

describe('checkMeshWarp — meshWarpMaxPointsMoved', () => {
  it('passes when pointsMoved is within the budget of 8', () => {
    const result = checkMeshWarp(
      { pointsMoved: 8, meshId: 'face_mesh' },
      qaThresholdsFixture()
    );
    expect(result).toEqual({ passed: true, violations: [] });
  });

  it('passes when pointsMoved is 0 (no-op warp)', () => {
    const result = checkMeshWarp(
      { pointsMoved: 0, meshId: 'face_mesh' },
      qaThresholdsFixture()
    );
    expect(result.passed).toBe(true);
  });

  it('rejects a warp that moves 9 points', () => {
    const result = checkMeshWarp(
      { pointsMoved: 9, meshId: 'face_mesh' },
      qaThresholdsFixture()
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatch(/face_mesh/);
    expect(result.violations[0]).toMatch(/9 points/);
  });

  it('rejects a warp that moves far more than 8 points', () => {
    const result = checkMeshWarp(
      { pointsMoved: 42, meshId: 'body_mesh' },
      qaThresholdsFixture()
    );
    expect(result.passed).toBe(false);
    expect(result.violations[0]).toMatch(/42 points/);
  });

  it('honors a custom budget', () => {
    const t = { ...qaThresholdsFixture(), meshWarpMaxPointsMoved: 2 };
    expect(
      checkMeshWarp({ pointsMoved: 2, meshId: 'm' }, t).passed
    ).toBe(true);
    expect(
      checkMeshWarp({ pointsMoved: 3, meshId: 'm' }, t).passed
    ).toBe(false);
  });

  it('rejects non-integer or negative pointsMoved with a clear violation', () => {
    const negative = checkMeshWarp(
      { pointsMoved: -1, meshId: 'm' },
      qaThresholdsFixture()
    );
    expect(negative.passed).toBe(false);
    expect(negative.violations[0]).toMatch(/invalid pointsMoved/);

    const fractional = checkMeshWarp(
      { pointsMoved: 4.5, meshId: 'm' },
      qaThresholdsFixture()
    );
    expect(fractional.passed).toBe(false);
  });
});

describe('checkOrphanBones — forbidOrphanBones', () => {
  it('passes a clean hierarchy (every bone has a known parent)', () => {
    const input: OrphanBoneInput = {
      bones: [
        { boneId: 'root', parentBoneId: null },
        { boneId: 'spine', parentBoneId: 'root' },
        { boneId: 'head', parentBoneId: 'spine' }
      ]
    };
    const result = checkOrphanBones(input, qaThresholdsFixture());
    expect(result).toEqual({ passed: true, violations: [] });
  });

  it('flags a bone whose parentBoneId is null (true orphan root)', () => {
    const input: OrphanBoneInput = {
      bones: [
        { boneId: 'root', parentBoneId: null },
        { boneId: 'spine', parentBoneId: 'root' },
        { boneId: 'head', parentBoneId: null } // extra orphan
      ]
    };
    const result = checkOrphanBones(input, qaThresholdsFixture());
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes('"head"'))).toBe(true);
  });

  it('flags a bone whose parentBoneId references a missing bone', () => {
    const input: OrphanBoneInput = {
      bones: [
        { boneId: 'root', parentBoneId: null },
        { boneId: 'spine', parentBoneId: 'ghost_bone' }
      ]
    };
    const result = checkOrphanBones(input, qaThresholdsFixture());
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes('ghost_bone'))).toBe(true);
  });

  it('is a no-op when forbidOrphanBones is false', () => {
    const t = { ...qaThresholdsFixture(), forbidOrphanBones: false };
    const input: OrphanBoneInput = {
      bones: [
        { boneId: 'a', parentBoneId: null },
        { boneId: 'b', parentBoneId: null }
      ]
    };
    const result = checkOrphanBones(input, t);
    expect(result).toEqual({ passed: true, violations: [] });
  });
});

describe('checkHumanApproval — requireHumanApprovalFor', () => {
  it('flags key_pose items', () => {
    const input: HumanApprovalInput = {
      items: [{ category: 'key_pose', description: 'hero_impact' }]
    };
    const result = checkHumanApproval(input, qaThresholdsFixture());
    expect(result.passed).toBe(false);
    expect(result.violations[0]).toMatch(/requires_human_approval/);
    expect(result.violations[0]).toMatch(/key_pose/);
  });

  it('flags all categories listed in requireHumanApprovalFor', () => {
    const input: HumanApprovalInput = {
      items: [
        { category: 'key_pose', description: 'hero_impact' },
        { category: 'camera_move', description: 'dolly_in' },
        { category: 'dialogue_timing', description: 'line_42' }
      ]
    };
    const result = checkHumanApproval(input, qaThresholdsFixture());
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(3);
  });

  it('passes items whose category is not in the approval list', () => {
    const input: HumanApprovalInput = {
      items: [
        { category: 'inbetween', description: 'frame_25' },
        { category: 'palette_swap', description: 'day_to_dusk' }
      ]
    };
    const result = checkHumanApproval(input, qaThresholdsFixture());
    expect(result).toEqual({ passed: true, violations: [] });
  });

  it('flags only the items that match — mixed list', () => {
    const input: HumanApprovalInput = {
      items: [
        { category: 'inbetween', description: 'auto' },
        { category: 'key_pose', description: 'turn_around' },
        { category: 'palette_swap', description: 'auto2' }
      ]
    };
    const result = checkHumanApproval(input, qaThresholdsFixture());
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatch(/turn_around/);
  });

  it('honors a custom approval list', () => {
    const t = { ...qaThresholdsFixture(), requireHumanApprovalFor: ['palette_swap'] };
    const input: HumanApprovalInput = {
      items: [{ category: 'palette_swap', description: 'day_to_dusk' }]
    };
    const result = checkHumanApproval(input, t);
    expect(result.passed).toBe(false);

    const keyPoseOnly: HumanApprovalInput = {
      items: [{ category: 'key_pose', description: 'hero_impact' }]
    };
    expect(checkHumanApproval(keyPoseOnly, t).passed).toBe(true);
  });
});

describe('helpers are reusable from retake engine / QA pipeline', () => {
  it('every helper accepts a thresholds bundle and a payload, and returns a GateResult', () => {
    const t = qaThresholdsFixture();
    const results: GateResult[] = [
      checkSwitchRate({ fps: 24, events: [] }, t),
      checkAngleTolerance([], t),
      checkMeshWarp({ pointsMoved: 0 }, t),
      checkOrphanBones({ bones: [] }, t),
      checkHumanApproval({ items: [] }, t)
    ];
    for (const r of results) {
      expect(typeof r.passed).toBe('boolean');
      expect(Array.isArray(r.violations)).toBe(true);
    }
  });
});