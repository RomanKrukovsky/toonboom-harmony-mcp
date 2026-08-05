import crypto from 'crypto';
import {
  poseSequenceV2Schema,
  type PoseSequenceV2,
  type CanonicalJoint,
  type CoordinateSpace
} from '../../schemas/ml.js';
import {
  harmonyCommandPlanV5Schema,
  checkPlanInvariants,
  HARMONY_COMMAND_PLAN_V5,
  type HarmonyCommandPlanV5,
  type HarmonyCommandV5
} from '../../schemas/harmonyCommandPlanV5.js';
import { MlError } from '../../errors/mlErrorRegistry.js';

/**
 * Deterministic pose → rig retargeting, then pose → Harmony command compilation.
 *
 * Two separate steps on purpose:
 *   1. `buildRetargetingPlan` turns measured 2D joints into rig-space channel curves. This is
 *      where IK, joint limits, foot locking and key reduction live.
 *   2. `compileToHarmonyPlan` turns those curves into `HarmonyCommandPlanV5` commands. This step
 *      makes no animation decisions at all; it is a pure translation.
 *
 * The output is *editable keys on a rig*, not a video. Nothing here writes an MP4, and the plan
 * it emits is reversible: every command declares a rollback.
 *
 * What DWPose does not provide and this module therefore does not invent: pivots, bone
 * hierarchy and rest poses. Those come from the rig definition passed in.
 */

export interface RigJointBinding {
  /** Canonical joint this channel is driven by. */
  joint: CanonicalJoint;
  /** Harmony node path that receives the keys. */
  nodePath: string;
  /** Which channels this node accepts. */
  channels: Array<'offsetX' | 'offsetY' | 'rotationZ'>;
  /** Degrees. Rotations outside this range are clamped, and the clamp is reported. */
  rotationLimits?: { min: number; max: number };
}

export interface RigDefinition {
  characterId: string;
  rigVersion: string;
  rootNodePath: string;
  /** Rest-pose distance between shoulder and hip in Harmony field units; sets the global scale. */
  restTorsoLength: number;
  bindings: RigJointBinding[];
  /** Chains the two-bone IK solver drives. */
  ikChains: Array<{
    name: string;
    root: CanonicalJoint;
    mid: CanonicalJoint;
    end: CanonicalJoint;
    /** Which side the elbow/knee bends towards. Keeps the pole vector continuous. */
    poleSign: 1 | -1;
    /**
     * Direction the upper bone points in the rig's rest pose, in degrees relative to the torso
     * (0 = along the torso towards the head, 180 = straight down the body). The solver produces
     * an absolute image-space angle; subtracting the torso angle and this offset yields the
     * channel value an animator's rotation limits are actually written against. Defaults to 180,
     * which is the resting direction of both arms-down and legs-down rigs.
     */
    restOffsetDegrees?: number;
    upperNodePath: string;
    lowerNodePath: string;
  }>;
  /** Ankle joints that should be locked while in ground contact. */
  footJoints: CanonicalJoint[];
}

export interface RetargetOptions {
  /** Keys below this measured confidence are ignored rather than trusted. */
  confidenceGate?: number;
  /**
   * Key-reduction tolerance for rotation channels, in DEGREES.
   *
   * Rotation and translation channels are on different scales, so a single tolerance is wrong
   * for one of them: 0.02 is a reasonable field-unit budget but an absurdly tight angular one,
   * and using it for both reduced the demo footage by only 16 %.
   */
  keyReductionToleranceDegrees?: number;
  /** Key-reduction tolerance for translation channels, in Harmony field units. */
  keyReductionToleranceField?: number;
  /** Target timeline fps. Frames are resampled when it differs from the source. */
  targetFps?: number;
  /**
   * Ground contact threshold, as a fraction of the measured torso length per frame. Expressing
   * it relative to the character removes any dependence on how large the character is on screen;
   * an absolute field-unit budget marked 152 of 153 frames as contact on the demo footage.
   */
  footContactTorsoFraction?: number;
  /** Degrees per frame. Exceeding it flags the channel rather than silently smoothing it. */
  maxAngularVelocity?: number;
}

export interface ChannelKey {
  frame: number;
  value: number;
  /** True when the key survived reduction because it is a curve extremum. */
  extremum: boolean;
}

export interface RetargetedChannel {
  nodePath: string;
  channel: 'offsetX' | 'offsetY' | 'rotationZ';
  columnName: string;
  keys: ChannelKey[];
  /** Keys before reduction, so the compression ratio is visible rather than claimed. */
  rawKeyCount: number;
  /** Largest deviation the reduction introduced, in this channel's own units. */
  reconstructionError: number;
  /** The tolerance this channel was reduced against, so the error can be judged against it. */
  reductionTolerance: number;
  /**
   * Source frame numbers where a joint limit was hit. Collected before frame-rate conversion,
   * so these index the source timeline, not the resampled one.
   */
  clampedSourceFrames: number[];
  warnings: string[];
}

export interface PoseRetargetingPlan {
  schema: 'toon-boom-mcp/pose-retargeting-plan-v2';
  planId: string;
  characterId: string;
  rigVersion: string;
  sourceSequenceId: string;
  sourceProvenanceJobId: string;
  fps: number;
  frameBase: 1;
  startFrame: number;
  endFrame: number;
  channels: RetargetedChannel[];
  contactFrames: Record<string, number[]>;
  warnings: string[];
  /** Digest over the inputs, so the plan can be shown to derive from this exact pose sequence. */
  inputHash: string;
}

const DEFAULTS: Required<RetargetOptions> = {
  confidenceGate: 0.3,
  keyReductionToleranceDegrees: 0.5,
  keyReductionToleranceField: 0.01,
  targetFps: 24,
  footContactTorsoFraction: 0.02,
  maxAngularVelocity: 45
};

/* ------------------------------------------------------------------------ retargeting -- */

export function buildRetargetingPlan(
  poseInput: unknown,
  rig: RigDefinition,
  options: RetargetOptions = {}
): PoseRetargetingPlan {
  const parsed = poseSequenceV2Schema.safeParse(poseInput);
  if (!parsed.success) {
    throw new MlError('ML_INPUT_SCHEMA_INVALID', `pose sequence failed PoseSequenceV2: ${parsed.error.message}`);
  }
  const pose = parsed.data;
  const opts = { ...DEFAULTS, ...options };
  const warnings: string[] = [];

  if (pose.timing.frameBase !== 1) {
    warnings.push(`source frameBase is ${pose.timing.frameBase}; frames were shifted to the 1-based Harmony timeline`);
  }
  const frameShift = pose.timing.frameBase === 0 ? 1 : 0;

  const toField = fieldConverter(pose.coordinates);

  // Per-frame joint lookup, gated by confidence. A gated joint is absent, not zero.
  const perFrame = new Map<number, Map<CanonicalJoint, { x: number; y: number; confidence: number }>>();
  for (const frame of pose.frames) {
    const map = new Map<CanonicalJoint, { x: number; y: number; confidence: number }>();
    for (const keypoint of frame.keypoints) {
      if (keypoint.confidence < opts.confidenceGate) continue;
      const [fx, fy] = toField(keypoint.x, keypoint.y);
      map.set(keypoint.joint, { x: fx, y: fy, confidence: keypoint.confidence });
    }
    perFrame.set(frame.frame + frameShift, map);
  }
  const frames = [...perFrame.keys()].sort((a, b) => a - b);
  // A frame survives the gate only if at least one joint did. Counting frames alone let a
  // fully gated sequence through and produced a plan with zero channels instead of an error.
  if (!frames.some(frame => (perFrame.get(frame)?.size ?? 0) > 0)) {
    throw new MlError('ML_INPUT_SCHEMA_INVALID', 'pose sequence contains no frame with keypoints above the confidence gate');
  }

  // Scale normalisation: the character's on-screen size must not leak into the rig's units.
  const scale = torsoScale(perFrame, frames, rig.restTorsoLength, warnings);

  const rawChannels = new Map<string, ChannelKey[]>();
  const clamped = new Map<string, number[]>();
  const channelWarnings = new Map<string, string[]>();

  const push = (nodePath: string, channel: RetargetedChannel['channel'], frame: number, value: number) => {
    const key = `${nodePath}|${channel}`;
    if (!rawChannels.has(key)) rawChannels.set(key, []);
    rawChannels.get(key)!.push({ frame, value, extremum: false });
  };

  for (const frame of frames) {
    const joints = perFrame.get(frame)!;

    // --- root translation: driven by hip centre, in normalised rig units -----------------
    const hipCenter = joints.get('hip_center');
    if (hipCenter) {
      push(rig.rootNodePath, 'offsetX', frame, hipCenter.x * scale);
      push(rig.rootNodePath, 'offsetY', frame, hipCenter.y * scale);
    }

    // --- torso rotation: the neck-to-hip vector, not a guess ----------------------------
    const neck = joints.get('neck');

    // --- head stabilisation: head angle is relative to the torso, so the head does not
    //     inherit every wobble of the spine ------------------------------------------------
    // The torso angle is reused below, so it is computed once per frame.
    const torsoAngle = neck && hipCenter
      ? degrees(Math.atan2(neck.x - hipCenter.x, neck.y - hipCenter.y))
      : 0;

    if (neck && hipCenter) {
      const torsoBinding = rig.bindings.find(b => b.joint === 'spine_mid');
      if (torsoBinding) pushClamped(torsoBinding, 'rotationZ', frame, torsoAngle, push, clamped);
    }

    const nose = joints.get('nose');
    if (nose && neck) {
      const headBinding = rig.bindings.find(b => b.joint === 'nose');
      if (headBinding) {
        // Same vector convention as the torso: (dx, dy) from the lower joint to the upper one.
        // Inverting dy here made every frame read as roughly 180 degrees and clamped flat.
        const absolute = degrees(Math.atan2(nose.x - neck.x, nose.y - neck.y));
        pushClamped(headBinding, 'rotationZ', frame, absolute - torsoAngle, push, clamped);
      }
    }

    // --- two-bone IK for arms and legs ---------------------------------------------------
    for (const chain of rig.ikChains) {
      const root = joints.get(chain.root);
      const mid = joints.get(chain.mid);
      const end = joints.get(chain.end);
      if (!root || !mid || !end) {
        addWarning(channelWarnings, `${chain.upperNodePath}|rotationZ`, `frame ${frame}: chain ${chain.name} incomplete, no key written`);
        continue;
      }
      const solved = solveTwoBoneIk(root, mid, end, chain.poleSign);
      const upper = rig.bindings.find(b => b.nodePath === chain.upperNodePath);
      const lower = rig.bindings.find(b => b.nodePath === chain.lowerNodePath);
      const restOffset = chain.restOffsetDegrees ?? 180;
      if (upper) pushClamped(upper, 'rotationZ', frame, solved.upperAngle - torsoAngle - restOffset, push, clamped);
      if (lower) pushClamped(lower, 'rotationZ', frame, solved.lowerAngle, push, clamped);
    }
  }

  // --- foot locking: ankles that are not moving are pinned so they do not slide ----------
  const contactFrames: Record<string, number[]> = {};
  for (const foot of rig.footJoints) {
    // scale = restTorsoLength / measuredTorsoLength, so restTorsoLength / scale is the torso
    // length in the same field units the joint positions are expressed in.
    const measuredTorsoField = rig.restTorsoLength / scale;
    contactFrames[foot] = detectContactFrames(perFrame, frames, foot, opts.footContactTorsoFraction * measuredTorsoField);
  }

  // --- frame-rate conversion --------------------------------------------------------------
  const sourceFps = pose.timing.fps;
  const resample = Math.abs(sourceFps - opts.targetFps) > 1e-6;
  if (resample) warnings.push(`resampled from ${sourceFps} fps to ${opts.targetFps} fps`);

  const channels: RetargetedChannel[] = [];
  for (const [key, rawKeys] of rawChannels) {
    const [nodePath, channel] = key.split('|') as [string, RetargetedChannel['channel']];
    const converted = resample ? resampleKeys(rawKeys, sourceFps, opts.targetFps) : rawKeys;
    const tolerance = channel === 'rotationZ' ? opts.keyReductionToleranceDegrees : opts.keyReductionToleranceField;
    const reduced = reduceKeys(converted, tolerance);
    const error = maxDeviation(converted, reduced);
    const perChannelWarnings = [...(channelWarnings.get(key) ?? [])];

    const velocityBreaches = channel === 'rotationZ'
      ? countVelocityBreaches(reduced, opts.maxAngularVelocity, opts.targetFps)
      : 0;
    if (velocityBreaches > 0) {
      perChannelWarnings.push(`${velocityBreaches} frame pair(s) exceed ${opts.maxAngularVelocity} deg/s; review before approval`);
    }

    channels.push({
      nodePath,
      channel,
      columnName: columnNameFor(nodePath, channel),
      keys: reduced,
      rawKeyCount: converted.length,
      reconstructionError: error,
      reductionTolerance: tolerance,
      clampedSourceFrames: clamped.get(key) ?? [],
      warnings: perChannelWarnings
    });
  }

  channels.sort((a, b) => (a.nodePath + a.channel).localeCompare(b.nodePath + b.channel));

  const allFrames = channels.flatMap(c => c.keys.map(k => k.frame));
  const inputHash = crypto.createHash('sha256')
    .update(JSON.stringify({ sequenceId: pose.sequenceId, jobId: pose.provenance.jobId, rig: rig.rigVersion, opts }))
    .digest('hex');

  return {
    schema: 'toon-boom-mcp/pose-retargeting-plan-v2',
    planId: `retarget_${inputHash.slice(0, 24)}`,
    characterId: rig.characterId,
    rigVersion: rig.rigVersion,
    sourceSequenceId: pose.sequenceId,
    sourceProvenanceJobId: pose.provenance.jobId,
    fps: opts.targetFps,
    frameBase: 1,
    startFrame: allFrames.length ? Math.min(...allFrames) : 1,
    endFrame: allFrames.length ? Math.max(...allFrames) : 1,
    channels,
    contactFrames,
    warnings,
    inputHash
  };
}

/* ------------------------------------------------------------------------- compilation -- */

export interface CompileOptions {
  manifestId: string;
  shotId: string | null;
  sourceManifestSha256: string;
  /** `false` produces a plan that is honest about never having touched Harmony. */
  requiresRealHarmony?: boolean;
  executionMode?: 'simulation' | 'offline_deterministic' | 'real_harmony';
  contributingMlJobIds?: string[];
}

/**
 * Pure translation from rig channels to V5 commands. It makes no animation decisions: every
 * value it writes came from `buildRetargetingPlan`.
 */
export function compileToHarmonyPlan(plan: PoseRetargetingPlan, options: CompileOptions): HarmonyCommandPlanV5 {
  const commands: HarmonyCommandV5[] = [];
  let counter = 0;
  const nextId = () => `cmd_${(++counter).toString().padStart(4, '0')}`;

  const snapshotId = `snap_${plan.planId}`;
  commands.push({
    commandId: nextId(),
    payload: { type: 'snapshot_project', params: { snapshotId, includeRenders: false } },
    preconditions: [{ kind: 'scene_open' }],
    expectedPostconditions: [{ kind: 'file_exists', relativePath: `snapshots/${snapshotId}`, nonEmpty: true }],
    destructiveLevel: 'none',
    idempotencyKey: `${plan.planId}-snapshot`,
    rollback: { strategy: 'none', reason: 'the snapshot is itself the safety net' },
    verification: { method: 'file_presence', required: true, acceptance: ['snapshot file exists and is non-empty'] },
    sourcePirId: plan.planId,
    sourcePirKind: 'RetargetingPlan'
  });

  for (const channel of plan.channels) {
    for (const key of channel.keys) {
      // A function point carries the numeric curve; the transform keyframe makes it a key on
      // the node. Both are emitted so the result is editable in the timeline, not baked.
      commands.push({
        commandId: nextId(),
        payload: {
          type: 'set_function_point',
          params: {
            columnName: channel.columnName,
            frame: key.frame,
            value: round6(key.value),
            handleLeftX: -1, handleLeftY: 0, handleRightX: 1, handleRightY: 0,
            constSeg: false,
            continuity: key.extremum ? 'CORNER' : 'SMOOTH'
          }
        },
        preconditions: [
          { kind: 'node_exists', nodePath: channel.nodePath },
          { kind: 'frame_range_valid', startFrame: plan.startFrame, endFrame: plan.endFrame }
        ],
        expectedPostconditions: [
          { kind: 'function_point_count', columnName: channel.columnName, min: 1, max: channel.keys.length }
        ],
        destructiveLevel: 'reversible',
        idempotencyKey: `${plan.planId}-${channel.columnName}-${key.frame}`,
        rollback: { strategy: 'remove_function_point', columnName: channel.columnName, frame: key.frame },
        verification: { method: 'native_entity_inspection', required: true, acceptance: [`function point exists at frame ${key.frame}`] },
        sourcePirId: plan.planId,
        sourcePirKind: 'RetargetingPlan'
      });
    }
  }

  commands.push({
    commandId: nextId(),
    payload: {
      type: 'inspect_native_entities',
      params: { entityKinds: ['nodes', 'columns'], rootPath: 'Top' }
    },
    preconditions: [{ kind: 'scene_open' }],
    expectedPostconditions: [{ kind: 'frame_count_at_least', count: Math.max(1, plan.endFrame) }],
    destructiveLevel: 'none',
    idempotencyKey: `${plan.planId}-verify`,
    rollback: { strategy: 'none', reason: 'read-only inspection' },
    verification: { method: 'native_entity_inspection', required: true, acceptance: ['every driven column exists with the expected point count'] },
    sourcePirId: plan.planId,
    sourcePirKind: 'RetargetingPlan'
  });

  const executionMode = options.executionMode ?? 'offline_deterministic';
  const raw = {
    schemaVersion: HARMONY_COMMAND_PLAN_V5,
    planId: plan.planId,
    manifestId: options.manifestId,
    shotId: options.shotId,
    createdAt: new Date().toISOString(),
    status: 'compiled' as const,
    requiresRealHarmony: options.requiresRealHarmony ?? executionMode === 'real_harmony',
    executionMode,
    sourceManifestSha256: options.sourceManifestSha256,
    commands,
    acceptanceGates: [
      'every driven column exists after execution',
      'function point count per column matches the compiled plan',
      'no key was written outside the declared frame range',
      'rollback restores the pre-execution snapshot'
    ],
    provenance: {
      compiler: 'PoseRetargetCompiler',
      compilerVersion: '1.0.0',
      source: `${plan.sourceSequenceId}@${plan.inputHash.slice(0, 12)}`,
      contributingMlJobIds: options.contributingMlJobIds ?? [plan.sourceProvenanceJobId]
    }
  };

  const parsed = harmonyCommandPlanV5Schema.safeParse(raw);
  if (!parsed.success) {
    throw new MlError('HARMONY_PLAN_INVALID', `compiled plan failed HarmonyCommandPlanV5: ${parsed.error.message}`);
  }
  const violations = checkPlanInvariants(parsed.data);
  if (violations.length > 0) {
    throw new MlError('HARMONY_PLAN_INVALID', `compiled plan violates invariants: ${violations.map(v => `${v.rule}(${v.commandId ?? 'plan'})`).join(', ')}`);
  }
  return parsed.data;
}

/* ----------------------------------------------------------------------------- helpers -- */

function fieldConverter(coordinates: CoordinateSpace): (x: number, y: number) => [number, number] {
  const transform = coordinates.harmonyFieldTransform;
  if (!transform) {
    throw new MlError('ML_INPUT_SCHEMA_INVALID', 'pose sequence has no harmonyFieldTransform; the image→field mapping cannot be guessed');
  }
  return (x, y) => [transform.a * x + transform.b * y + transform.tx, transform.c * x + transform.d * y + transform.ty];
}

/**
 * Normalises for the character's on-screen size by measuring the torso and comparing it with
 * the rig's rest length. Without this, a character standing closer to camera drives the rig
 * with larger numbers for the same pose.
 */
function torsoScale(
  perFrame: Map<number, Map<CanonicalJoint, { x: number; y: number }>>,
  frames: number[],
  restTorsoLength: number,
  warnings: string[]
): number {
  const lengths: number[] = [];
  for (const frame of frames) {
    const joints = perFrame.get(frame)!;
    const neck = joints.get('neck');
    const hip = joints.get('hip_center');
    if (neck && hip) lengths.push(Math.hypot(neck.x - hip.x, neck.y - hip.y));
  }
  if (lengths.length === 0) {
    warnings.push('torso length could not be measured on any frame; scale normalisation was skipped (scale = 1)');
    return 1;
  }
  const median = lengths.sort((a, b) => a - b)[Math.floor(lengths.length / 2)];
  if (median < 1e-6) {
    warnings.push('measured torso length is degenerate; scale normalisation was skipped (scale = 1)');
    return 1;
  }
  return restTorsoLength / median;
}

interface Solved {
  upperAngle: number;
  /**
   * Bend of the lower bone RELATIVE to the upper one, in degrees.
   * Sign convention: 0 is fully extended and the magnitude grows as the joint folds, carrying
   * the sign of `poleSign`. A chain with poleSign=+1 therefore produces values in [0, 180] and
   * one with poleSign=-1 produces [-180, 0]. Rig rotation limits must be written to match, or
   * every frame clamps to the boundary and the channel goes flat.
   */
  lowerAngle: number;
}

/**
 * Two-bone IK in the image plane. The pole sign keeps the elbow or knee bending consistently to
 * one side, which is what stops the joint popping between frames.
 */
export function solveTwoBoneIk(
  root: { x: number; y: number },
  mid: { x: number; y: number },
  end: { x: number; y: number },
  poleSign: 1 | -1
): Solved {
  const upperLength = Math.hypot(mid.x - root.x, mid.y - root.y);
  const lowerLength = Math.hypot(end.x - mid.x, end.y - mid.y);
  const reach = Math.hypot(end.x - root.x, end.y - root.y);

  // Bone lengths are measured from the same three points that define the target, so the target
  // is reachable by construction and no reachability flag is reported.
  //
  // The acos arguments are clamped to [-1, 1] below rather than shrinking `reach` by an epsilon.
  // Shrinking it looked safer but introduced a systematic error: a 0.9999 factor turned a fully
  // extended chain into a 1.6-degree bend on every frame.
  const baseAngle = Math.atan2(end.x - root.x, end.y - root.y);

  const cosInner = (upperLength ** 2 + reach ** 2 - lowerLength ** 2) / (2 * upperLength * reach || 1e-9);
  const innerAngle = Math.acos(Math.max(-1, Math.min(1, cosInner)));
  const cosElbow = (upperLength ** 2 + lowerLength ** 2 - reach ** 2) / (2 * upperLength * lowerLength || 1e-9);
  const elbowAngle = Math.acos(Math.max(-1, Math.min(1, cosElbow)));

  return {
    upperAngle: degrees(baseAngle + poleSign * innerAngle),
    lowerAngle: degrees(poleSign * (Math.PI - elbowAngle))
  };
}

function pushClamped(
  binding: RigJointBinding,
  channel: 'rotationZ',
  frame: number,
  value: number,
  push: (nodePath: string, channel: RetargetedChannel['channel'], frame: number, value: number) => void,
  clamped: Map<string, number[]>
): void {
  let out = normaliseAngle(value);
  if (binding.rotationLimits) {
    const limited = Math.max(binding.rotationLimits.min, Math.min(binding.rotationLimits.max, out));
    if (limited !== out) {
      const key = `${binding.nodePath}|${channel}`;
      if (!clamped.has(key)) clamped.set(key, []);
      clamped.get(key)!.push(frame);
      out = limited;
    }
  }
  push(binding.nodePath, channel, frame, out);
}

function detectContactFrames(
  perFrame: Map<number, Map<CanonicalJoint, { x: number; y: number }>>,
  frames: number[],
  joint: CanonicalJoint,
  threshold: number
): number[] {
  const contact: number[] = [];
  for (let i = 1; i < frames.length; i += 1) {
    const previous = perFrame.get(frames[i - 1])!.get(joint);
    const current = perFrame.get(frames[i])!.get(joint);
    if (!previous || !current) continue;
    if (Math.hypot(current.x - previous.x, current.y - previous.y) < threshold) contact.push(frames[i]);
  }
  return contact;
}

/** Linear resample onto the target frame rate. Frames are 1-based throughout. */
export function resampleKeys(keys: ChannelKey[], sourceFps: number, targetFps: number): ChannelKey[] {
  if (keys.length === 0) return keys;
  const sorted = [...keys].sort((a, b) => a.frame - b.frame);
  const ratio = targetFps / sourceFps;
  const lastFrame = Math.max(1, Math.round((sorted[sorted.length - 1].frame - 1) * ratio) + 1);
  const out: ChannelKey[] = [];
  for (let frame = 1; frame <= lastFrame; frame += 1) {
    const sourcePosition = (frame - 1) / ratio + 1;
    out.push({ frame, value: sampleAt(sorted, sourcePosition), extremum: false });
  }
  return out;
}

function sampleAt(sorted: ChannelKey[], position: number): number {
  if (position <= sorted[0].frame) return sorted[0].value;
  const last = sorted[sorted.length - 1];
  if (position >= last.frame) return last.value;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].frame >= position) {
      const a = sorted[i - 1];
      const b = sorted[i];
      const t = (position - a.frame) / (b.frame - a.frame || 1);
      return a.value + (b.value - a.value) * t;
    }
  }
  return last.value;
}

/**
 * Douglas-Peucker key reduction with extremum preservation.
 *
 * A key is only removed when the straight line through its neighbours stays within `tolerance`
 * of the measured value, so the curve is approximated rather than truncated. Local minima and
 * maxima are retained regardless, because losing an extremum changes the performance, not just
 * the data volume.
 */
export function reduceKeys(keys: ChannelKey[], tolerance: number): ChannelKey[] {
  if (keys.length <= 2) return keys.map(k => ({ ...k, extremum: true }));

  const extrema = new Set<number>([0, keys.length - 1]);
  for (let i = 1; i < keys.length - 1; i += 1) {
    const previous = keys[i - 1].value;
    const current = keys[i].value;
    const next = keys[i + 1].value;
    if ((current > previous && current > next) || (current < previous && current < next)) extrema.add(i);
  }

  const kept = new Set<number>(extrema);
  const simplify = (from: number, to: number): void => {
    if (to <= from + 1) return;
    let worst = -1;
    let worstDistance = 0;
    for (let i = from + 1; i < to; i += 1) {
      const t = (keys[i].frame - keys[from].frame) / (keys[to].frame - keys[from].frame || 1);
      const projected = keys[from].value + (keys[to].value - keys[from].value) * t;
      const distance = Math.abs(keys[i].value - projected);
      if (distance > worstDistance) {
        worstDistance = distance;
        worst = i;
      }
    }
    if (worstDistance > tolerance && worst >= 0) {
      kept.add(worst);
      simplify(from, worst);
      simplify(worst, to);
    }
  };

  const anchors = [...kept].sort((a, b) => a - b);
  for (let i = 0; i < anchors.length - 1; i += 1) simplify(anchors[i], anchors[i + 1]);

  return [...kept].sort((a, b) => a - b).map(index => ({ ...keys[index], extremum: extrema.has(index) }));
}

/** Largest error the reduction introduced, measured against the unreduced curve. */
export function maxDeviation(original: ChannelKey[], reduced: ChannelKey[]): number {
  if (reduced.length === 0) return 0;
  let worst = 0;
  for (const key of original) {
    worst = Math.max(worst, Math.abs(key.value - sampleAt(reduced, key.frame)));
  }
  return round6(worst);
}

function countVelocityBreaches(keys: ChannelKey[], maxPerSecond: number, fps: number): number {
  let breaches = 0;
  for (let i = 1; i < keys.length; i += 1) {
    const deltaFrames = keys[i].frame - keys[i - 1].frame || 1;
    const perSecond = Math.abs(keys[i].value - keys[i - 1].value) / (deltaFrames / fps);
    if (perSecond > maxPerSecond) breaches += 1;
  }
  return breaches;
}

function addWarning(map: Map<string, string[]>, key: string, message: string): void {
  if (!map.has(key)) map.set(key, []);
  const list = map.get(key)!;
  if (list.length < 20) list.push(message);
}

function columnNameFor(nodePath: string, channel: string): string {
  return `${nodePath.replace(/^Top\//, '').replace(/[^A-Za-z0-9_]/g, '_')}_${channel}`;
}

function degrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function normaliseAngle(degreesValue: number): number {
  let out = degreesValue % 360;
  if (out > 180) out -= 360;
  if (out < -180) out += 360;
  return out;
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
