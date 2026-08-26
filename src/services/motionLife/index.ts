import type {
  PerformancePIR,
  TransformTrack
} from '../../schemas/performancePir.js';
import type { ShotManifest } from '../../schemas/shotManifest.js';

/**
 * MotionLifeService — deterministic "life" pass over a compiled performance.
 *
 * Beat-boundary HOLDs are dead by construction (see ShotManifestCompiler /
 * MotionValueResolver honesty contract). This service adds the micro-motion
 * that keeps long holds alive without inventing new intent:
 *
 *   applyHoldLife   — head oscillation ±2deg + CONSTANT blink dips inside
 *                     every beat span longer than minHoldFrames
 *   generateWalkCycle — pure sinusoid locomotion tracks (hip/knee/foot)
 *
 * Honesty contract:
 *   - Pure functions: same inputs -> byte-identical output. No RNG, no Date,
 *     no ambient state.
 *   - Existing keys are never overwritten; only absent frames gain keys.
 *   - Micro-motion respects manifest.timing anticipation/followThrough zones
 *     when present, sampling only inside the interior of each span.
 */

export interface HoldLifeOptions {
  /** Node that carries blink dips (e.g. NODE_EYES_PEG). */
  blinkNodeId?: string;
  /** Node that carries head oscillation keys (e.g. NODE_HEAD_PEG). */
  headNodeId?: string;
  /** Beats with span frames <= this stay untouched. Default 12. */
  minHoldFrames?: number;
}

export interface HoldLifeResult {
  performance: PerformancePIR;
  beatsEnlivened: string[];
  addedKeys: number;
}

export interface WalkNodeIdMap {
  hipNodeId: string;
  kneeNodeId: string;
  footNodeId: string;
}

export const MOTION_LIFE_CONSTANTS = Object.freeze({
  HEAD_OSCILLATION_AMPLITUDE_DEG: 2,
  HEAD_OSCILLATION_KEYS_PER_SPAN: 3,
  BLINK_DIP_ROTATION_DEG: 10,
  BLINKS_PER_SPAN: 2,
  WALK_HIP_AMPLITUDE_DEG: 25,
  WALK_KNEE_MAX_DEG: 45,
  WALK_FOOT_AMPLITUDE_DEG: 15
} as const);

const TWO_PI = Math.PI * 2;

function round(value: number, precision = 4): number {
  const factor = 10 ** precision;
  const result = Math.round(value * factor) / factor;
  return result === 0 ? 0 : result; // never leak -0 into serialized keys
}

export class MotionLifeService {
  /**
   * Adds life to every beat span longer than minHoldFrames.
   * Head track gains ~3 sine-sampled oscillation keys (±2deg); the blink
   * track gains two CONSTANT dip patterns (0 -> 10 -> 0 over 3 frames).
   */
  applyHoldLife(
    manifest: ShotManifest,
    performance: PerformancePIR,
    options: HoldLifeOptions = {}
  ): HoldLifeResult {
    const minHoldFrames = options.minHoldFrames ?? 12;
    const headNodeId = options.headNodeId;
    const blinkNodeId = options.blinkNodeId;

    // Deep-copy so the input PIR stays untouched.
    const tracksByKey = new Map<string, TransformTrack>();
    for (const t of performance.tracks) {
      tracksByKey.set(t.nodeId, { nodeId: t.nodeId, keys: t.keys.map(k => ({ ...k })) });
    }
    const occupiedByNode = new Map<string, Set<number>>();
    for (const [nodeId, track] of tracksByKey) {
      occupiedByNode.set(nodeId, new Set(track.keys.map(k => k.frame)));
    }

    const getTrack = (nodeId: string): TransformTrack => {
      let track = tracksByKey.get(nodeId);
      if (!track) {
        track = { nodeId, keys: [] };
        tracksByKey.set(nodeId, track);
        occupiedByNode.set(nodeId, new Set());
      }
      return track;
    };

    const addKeyIfFree = (
      nodeId: string,
      frame: number,
      rotation: number,
      interpolation: 'LINEAR' | 'CONSTANT'
    ): boolean => {
      const occupied = occupiedByNode.get(nodeId)!;
      if (occupied.has(frame)) return false;
      occupied.add(frame);
      getTrack(nodeId).keys.push({ frame, rotation, interpolation });
      return true;
    };

    const anticipation = manifest.timing?.anticipationFrames ?? 0;
    const followThrough = manifest.timing?.followThroughFrames ?? 0;

    let addedKeys = 0;
    const beatsEnlivened: string[] = [];

    for (const beat of manifest.beats) {
      const spanFrames = beat.endFrame - beat.startFrame + 1;
      if (spanFrames <= minHoldFrames) continue;

      // Interior zone keeps clear of anticipation/follow-through staging.
      let zoneStart = beat.startFrame + anticipation;
      let zoneEnd = beat.endFrame - followThrough;
      if (zoneEnd - zoneStart < MOTION_LIFE_CONSTANTS.HEAD_OSCILLATION_KEYS_PER_SPAN) {
        zoneStart = beat.startFrame;
        zoneEnd = beat.endFrame;
      }
      const zoneSpan = zoneEnd - zoneStart;

      if (headNodeId) {
        let addedForBeat = 0;
        // Deterministic sine sampling: phases at 1/6, 3/6, 5/6 of the zone.
        for (let i = 0; i < MOTION_LIFE_CONSTANTS.HEAD_OSCILLATION_KEYS_PER_SPAN; i++) {
          const u = (i + 0.5) / MOTION_LIFE_CONSTANTS.HEAD_OSCILLATION_KEYS_PER_SPAN;
          const frame = zoneStart + Math.round(u * zoneSpan);
          if (frame <= beat.startFrame || frame >= beat.endFrame) continue;
          const rotation =
            round(MOTION_LIFE_CONSTANTS.HEAD_OSCILLATION_AMPLITUDE_DEG * Math.sin(TWO_PI * u));
          if (addKeyIfFree(headNodeId, frame, rotation, 'LINEAR')) addedForBeat++;
        }

        if (blinkNodeId) {
          // Two CONSTANT dips (0 -> 10 -> 0), placed at quarter points of the
          // zone, nudged forward until an unoccupied 3-frame slot fits.
          for (let b = 0; b < MOTION_LIFE_CONSTANTS.BLINKS_PER_SPAN; b++) {
            const anchor =
              zoneStart + Math.floor(((b + 0.5) / MOTION_LIFE_CONSTANTS.BLINKS_PER_SPAN) * zoneSpan);
            const occupied = occupiedByNode.get(blinkNodeId) ?? new Set<number>();
            let start = anchor;
            while (
              start + 2 <= zoneEnd &&
              (occupied.has(start) || occupied.has(start + 1) || occupied.has(start + 2))
            ) {
              start++;
            }
            if (start < zoneStart || start + 2 > zoneEnd) continue;
            const dipRotation = MOTION_LIFE_CONSTANTS.BLINK_DIP_ROTATION_DEG;
            let addedDip = 0;
            if (addKeyIfFree(blinkNodeId, start, 0, 'CONSTANT')) addedDip++;
            if (addKeyIfFree(blinkNodeId, start + 1, dipRotation, 'CONSTANT')) addedDip++;
            if (addKeyIfFree(blinkNodeId, start + 2, 0, 'CONSTANT')) addedDip++;
            addedForBeat += addedDip;
          }
        }

        if (addedForBeat > 0) {
          addedKeys += addedForBeat;
          beatsEnlivened.push(beat.beatId);
        }
      }
    }

    const outPerformance: PerformancePIR = {
      ...performance,
      tracks: Array.from(tracksByKey.values()).map(t => ({
        nodeId: t.nodeId,
        keys: [...t.keys].sort((a, b) => a.frame - b.frame)
      }))
    };
    return { performance: outPerformance, beatsEnlivened, addedKeys };
  }

  /**
   * Builds one walk cycle loop as pure sinusoid rotation keys, LINEAR:
   *   hip  ±25deg, sin(phase)
   *   knee  0..-45deg, opposite phase (half-cycle offset)
   *   foot ±15deg, quarter-cycle lead (cos)
   * Each track gets exactly cycles * framesPerCycle keys starting at
   * startFrame. Same inputs -> identical output.
   */
  generateWalkCycle(
    characterId: string,
    nodeIdMap: WalkNodeIdMap,
    startFrame: number,
    cycles: number,
    framesPerCycle = 12
  ): TransformTrack[] {
    if (!characterId || !characterId.trim()) {
      throw new Error('generateWalkCycle requires a non-empty characterId');
    }
    if (!Number.isInteger(cycles) || cycles < 1) {
      throw new Error('generateWalkCycle requires integer cycles >= 1');
    }
    if (!Number.isInteger(framesPerCycle) || framesPerCycle < 4) {
      throw new Error('generateWalkCycle requires integer framesPerCycle >= 4');
    }

    const hipKeys: TransformTrack['keys'] = [];
    const kneeKeys: TransformTrack['keys'] = [];
    const footKeys: TransformTrack['keys'] = [];

    for (let c = 0; c < cycles; c++) {
      for (let k = 0; k < framesPerCycle; k++) {
        const frame = startFrame + c * framesPerCycle + k;
        const phase = (TWO_PI * k) / framesPerCycle;

        hipKeys.push({
          frame,
          rotation: round(MOTION_LIFE_CONSTANTS.WALK_HIP_AMPLITUDE_DEG * Math.sin(phase)),
          interpolation: 'LINEAR'
        });
        kneeKeys.push({
          frame,
          rotation: round(
            -(MOTION_LIFE_CONSTANTS.WALK_KNEE_MAX_DEG / 2) * (1 + Math.sin(phase + Math.PI))
          ),
          interpolation: 'LINEAR'
        });
        footKeys.push({
          frame,
          rotation: round(MOTION_LIFE_CONSTANTS.WALK_FOOT_AMPLITUDE_DEG * Math.cos(phase)),
          interpolation: 'LINEAR'
        });
      }
    }

    return [
      { nodeId: nodeIdMap.hipNodeId, keys: hipKeys },
      { nodeId: nodeIdMap.kneeNodeId, keys: kneeKeys },
      { nodeId: nodeIdMap.footNodeId, keys: footKeys }
    ];
  }
}
