import {
  partDecompositionSchema,
  partTrackSchema,
  occlusionEdgeSchema,
  PART_DECOMPOSITION_SCHEMA_VERSION,
  type PartDecomposition,
  type PartTrack,
  type PartFrameState,
  type OcclusionEdge,
  type MaskRegion
} from '../../schemas/partDecomposition.js';

export interface DecompositionInput {
  characterId: string;
  frameCount: number;
  fps?: number;
  bodyType?: 'humanoid' | 'quadruped' | 'creature' | 'object' | 'unknown';
  frameRegions?: FrameRegion[];
  motionHints?: MotionHint[];
}

export interface FrameRegion {
  frame: number;
  regions: {
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence?: number;
  }[];
}

export interface MotionHint {
  partId: string;
  motionType: 'rigid' | 'articulated' | 'deformable' | 'static';
  confidence: number;
}

const HUMANOID_PARTS: { partId: string; label: string; parent: string | null; depth: number }[] = [
  { partId: 'torso', label: 'Torso', parent: null, depth: 0 },
  { partId: 'head', label: 'Head', parent: 'torso', depth: 10 },
  { partId: 'hair', label: 'Hair', parent: 'head', depth: 11 },
  { partId: 'face', label: 'Face', parent: 'head', depth: 12 },
  { partId: 'eyes', label: 'Eyes', parent: 'face', depth: 13 },
  { partId: 'brows', label: 'Brows', parent: 'face', depth: 14 },
  { partId: 'mouth', label: 'Mouth', parent: 'face', depth: 15 },
  { partId: 'upper_arm_left', label: 'Upper Arm L', parent: 'torso', depth: 5 },
  { partId: 'upper_arm_right', label: 'Upper Arm R', parent: 'torso', depth: 5 },
  { partId: 'forearm_left', label: 'Forearm L', parent: 'upper_arm_left', depth: 6 },
  { partId: 'forearm_right', label: 'Forearm R', parent: 'upper_arm_right', depth: 6 },
  { partId: 'hand_left', label: 'Hand L', parent: 'forearm_left', depth: 7 },
  { partId: 'hand_right', label: 'Hand R', parent: 'forearm_right', depth: 7 },
  { partId: 'upper_leg_left', label: 'Upper Leg L', parent: 'torso', depth: -1 },
  { partId: 'upper_leg_right', label: 'Upper Leg R', parent: 'torso', depth: -1 },
  { partId: 'lower_leg_left', label: 'Lower Leg L', parent: 'upper_leg_left', depth: -2 },
  { partId: 'lower_leg_right', label: 'Lower Leg R', parent: 'upper_leg_right', depth: -2 },
  { partId: 'foot_left', label: 'Foot L', parent: 'lower_leg_left', depth: -3 },
  { partId: 'foot_right', label: 'Foot R', parent: 'lower_leg_right', depth: -3 },
  { partId: 'clothing', label: 'Clothing', parent: 'torso', depth: 1 },
  { partId: 'accessories', label: 'Accessories', parent: null, depth: 20 },
  { partId: 'props', label: 'Props', parent: null, depth: 25 }
];

function buildHumanoidParts(
  input: DecompositionInput
): PartTrack[] {
  const { frameCount, frameRegions, motionHints } = input;
  const frames = Array.from({ length: frameCount }, (_, i) => i + 1);

  return HUMANOID_PARTS.map(({ partId, label, parent, depth }) => {
    const motionHint = motionHints?.find(h => h.partId === partId);
    const motionCluster = motionHint?.motionType ?? inferMotionCluster(partId);

    const frameStates: PartFrameState[] = frames.map(frame => {
      const region = frameRegions
        ?.find(fr => fr.frame === frame)
        ?.regions.find(r => r.label === partId || r.label === label);

      const cx = region ? region.x + region.width / 2 : estimateCenterX(partId);
      const cy = region ? region.y + region.height / 2 : estimateCenterY(partId);

      const prevRegion = frame > 1
        ? frameRegions?.find(fr => fr.frame === frame - 1)?.regions.find(r => r.label === partId || r.label === label)
        : undefined;
      const prevCx = prevRegion ? prevRegion.x + prevRegion.width / 2 : cx;
      const prevCy = prevRegion ? prevRegion.y + prevRegion.height / 2 : cy;

      const visibleMask: MaskRegion | undefined = region ? {
        contourPoints: [
          { x: region.x, y: region.y },
          { x: region.x + region.width, y: region.y },
          { x: region.x + region.width, y: region.y + region.height },
          { x: region.x, y: region.y + region.height }
        ],
        boundingBox: { x: region.x, y: region.y, width: region.width, height: region.height },
        area: region.width * region.height,
        confidence: region.confidence ?? 0.6
      } : undefined;

      return {
        frame,
        visibleMask,
        center: { x: cx, y: cy },
        motionDelta: { dx: cx - prevCx, dy: cy - prevCy },
        occluded: !region && frame > 1,
        confidence: region?.confidence ?? 0.4
      };
    });

    const problemRanges = detectProblemRanges(frameStates, partId);

    return partTrackSchema.parse({
      partId,
      identity: {
        partId,
        label,
        isHumanoidPart: true,
        parentPartId: parent,
        depthOrder: depth,
        inferred: !frameRegions?.some(fr => fr.regions.some(r => r.label === partId))
      },
      frameStates,
      motionCluster,
      articulationHints: detectArticulationHints(frameStates, partId),
      problemRanges
    });
  });
}

function inferMotionCluster(partId: string): 'rigid' | 'articulated' | 'deformable' | 'static' | 'unknown' {
  const rigidParts = ['torso', 'head', 'upper_arm_left', 'upper_arm_right', 'upper_leg_left', 'upper_leg_right'];
  const articulatedParts = ['forearm_left', 'forearm_right', 'lower_leg_left', 'lower_leg_right', 'hand_left', 'hand_right'];
  const deformableParts = ['hair', 'clothing', 'face', 'mouth', 'brows'];
  const staticParts = ['foot_left', 'foot_right'];

  if (rigidParts.includes(partId)) return 'rigid';
  if (articulatedParts.includes(partId)) return 'articulated';
  if (deformableParts.includes(partId)) return 'deformable';
  if (staticParts.includes(partId)) return 'static';
  return 'unknown';
}

function estimateCenterX(partId: string): number {
  const map: Record<string, number> = {
    head: 0, hair: 0, face: 0, eyes: 0, brows: 0, mouth: 0,
    torso: 0,
    upper_arm_left: -80, upper_arm_right: 80,
    forearm_left: -120, forearm_right: 120,
    hand_left: -150, hand_right: 150,
    upper_leg_left: -30, upper_leg_right: 30,
    lower_leg_left: -30, lower_leg_right: 30,
    foot_left: -30, foot_right: 30,
    clothing: 0, accessories: 0, props: 100
  };
  return map[partId] ?? 0;
}

function estimateCenterY(partId: string): number {
  const map: Record<string, number> = {
    head: -180, hair: -200, face: -170, eyes: -180, brows: -190, mouth: -160,
    torso: -60,
    upper_arm_left: -100, upper_arm_right: -100,
    forearm_left: -40, forearm_right: -40,
    hand_left: 10, hand_right: 10,
    upper_leg_left: 60, upper_leg_right: 60,
    lower_leg_left: 140, lower_leg_right: 140,
    foot_left: 200, foot_right: 200,
    clothing: -60, accessories: -120, props: 0
  };
  return map[partId] ?? 0;
}

function detectProblemRanges(
  states: PartFrameState[],
  partId: string
): { startFrame: number; endFrame: number; reason: string; severity: 'low' | 'medium' | 'high' | 'critical' }[] {
  const problems: { startFrame: number; endFrame: number; reason: string; severity: 'low' | 'medium' | 'high' | 'critical' }[] = [];
  let occludedStart = -1;

  for (let i = 0; i < states.length; i++) {
    if (states[i].occluded && occludedStart < 0) {
      occludedStart = states[i].frame;
    } else if (!states[i].occluded && occludedStart >= 0) {
      const duration = states[i].frame - occludedStart;
      if (duration >= 3) {
        problems.push({
          startFrame: occludedStart,
          endFrame: states[i].frame - 1,
          reason: `Part ${partId} occluded for ${duration} frames`,
          severity: duration > 10 ? 'high' : 'medium'
        });
      }
      occludedStart = -1;
    }
  }

  const lowConfFrames = states.filter(s => s.confidence < 0.3);
  if (lowConfFrames.length > states.length * 0.3) {
    problems.push({
      startFrame: lowConfFrames[0].frame,
      endFrame: lowConfFrames[lowConfFrames.length - 1].frame,
      reason: `Part ${partId} has low confidence across ${lowConfFrames.length}/${states.length} frames`,
      severity: 'high'
    });
  }

  return problems;
}

function detectArticulationHints(
  states: PartFrameState[],
  partId: string
): { frame: number; hint: string; confidence: number }[] {
  const hints: { frame: number; hint: string; confidence: number }[] = [];

  for (let i = 1; i < states.length; i++) {
    const dx = states[i].motionDelta.dx;
    const dy = states[i].motionDelta.dy;
    const speed = Math.sqrt(dx * dx + dy * dy);

    if (speed > 20) {
      hints.push({
        frame: states[i].frame,
        hint: `High velocity detected for ${partId}: ${speed.toFixed(1)}px/frame`,
        confidence: Math.min(1, speed / 50)
      });
    }

    if (i >= 2) {
      const prevDx = states[i - 1].motionDelta.dx;
      const dirChange = Math.sign(dx) !== Math.sign(prevDx) && Math.abs(dx) > 5;
      if (dirChange) {
        hints.push({
          frame: states[i].frame,
          hint: `Direction reversal for ${partId}`,
          confidence: 0.7
        });
      }
    }
  }

  return hints;
}

function buildOcclusionGraph(parts: PartTrack[]): OcclusionEdge[] {
  const edges: OcclusionEdge[] = [];
  const sortedParts = [...parts].sort((a, b) => a.identity.depthOrder - b.identity.depthOrder);

  for (let i = 0; i < sortedParts.length; i++) {
    for (let j = i + 1; j < sortedParts.length; j++) {
      const upper = sortedParts[i];
      const lower = sortedParts[j];

      if (upper.identity.depthOrder <= lower.identity.depthOrder) continue;

      let overlapFrames = 0;
      let totalFrames = 0;

      for (const fs of lower.frameStates) {
        if (!fs.visibleMask) continue;
        totalFrames++;
        const upperState = upper.frameStates.find(ufs => ufs.frame === fs.frame);
        if (!upperState?.visibleMask) continue;

        const a = fs.visibleMask.boundingBox;
        const b = upperState.visibleMask.boundingBox;
        const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
        const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
        if (overlapX > 0 && overlapY > 0) overlapFrames++;
      }

      if (overlapFrames > 0 && totalFrames > 0) {
        edges.push(occlusionEdgeSchema.parse({
          occluderPartId: upper.partId,
          occludedPartId: lower.partId,
          overlapRatio: overlapFrames / totalFrames,
          frameRange: {
            start: lower.frameStates[0]?.frame ?? 1,
            end: lower.frameStates[lower.frameStates.length - 1]?.frame ?? 1
          },
          confidence: 0.5
        }));
      }
    }
  }

  return edges;
}

export class CharacterPartDecomposer {
  decompose(input: DecompositionInput): PartDecomposition {
    const bodyType = input.bodyType ?? 'unknown';
    const parts = bodyType === 'humanoid'
      ? buildHumanoidParts(input)
      : this.buildGenericParts(input);

    const occlusionGraph = buildOcclusionGraph(parts);

    const totalProblems = parts.reduce((sum, p) => sum + p.problemRanges.length, 0);
    const avgConfidence = parts.length > 0
      ? parts.reduce((sum, p) => {
          const pConf = p.frameStates.length > 0
            ? p.frameStates.reduce((s, fs) => s + fs.confidence, 0) / p.frameStates.length
            : 0;
          return sum + pConf;
        }, 0) / parts.length
      : 0;

    return partDecompositionSchema.parse({
      schemaVersion: PART_DECOMPOSITION_SCHEMA_VERSION,
      characterId: input.characterId,
      bodyType,
      parts,
      occlusionGraph,
      identityContinuityScore: Math.min(1, avgConfidence + 0.1),
      totalProblemRanges: totalProblems,
      provenance: {
        engine: 'CharacterPartDecomposer v1',
        createdAt: new Date().toISOString(),
        method: input.frameRegions ? 'cpu_heuristic' : 'cpu_heuristic'
      }
    });
  }

  private buildGenericParts(input: DecompositionInput): PartTrack[] {
    const { frameCount, frameRegions } = input;
    const frames = Array.from({ length: frameCount }, (_, i) => i + 1);
    const labels = new Set<string>();

    frameRegions?.forEach(fr => fr.regions.forEach(r => labels.add(r.label)));

    if (labels.size === 0) {
      labels.add('body');
      labels.add('head_region');
    }

    return Array.from(labels).map((label, idx) => {
      const frameStates: PartFrameState[] = frames.map(frame => {
        const region = frameRegions?.find(fr => fr.frame === frame)?.regions.find(r => r.label === label);
        const cx = region ? region.x + region.width / 2 : idx * 100;
        const cy = region ? region.y + region.height / 2 : 0;

        return {
          frame,
          center: { x: cx, y: cy },
          motionDelta: { dx: 0, dy: 0 },
          occluded: !region,
          confidence: region?.confidence ?? 0.4
        };
      });

      return partTrackSchema.parse({
        partId: label,
        identity: {
          partId: label,
          label,
          isHumanoidPart: false,
          parentPartId: idx === 0 ? null : 'body',
          depthOrder: idx,
          inferred: true
        },
        frameStates,
        motionCluster: 'unknown',
        articulationHints: [],
        problemRanges: detectProblemRanges(frameStates, label)
      });
    });
  }
}
