import type {
  ShotManifest,
  ShotBeat
} from '../../schemas/shotManifest.js';
import type {
  PerformancePIR,
  TransformTrack
} from '../../schemas/performancePir.js';
import type {
  GestureTrackLibrary,
  GestureTrackSet,
  GestureKey
} from '../../schemas/gestureTracks.js';

/**
 * MotionValueResolver — fills the value half of compiled keys.
 *
 * ShotManifestCompiler places keys ONLY on beat boundaries and deliberately
 * leaves their transforms empty ("WHERE keys live, not WHAT they do"). This
 * resolver applies declared gesture curves from a GestureTrackLibrary:
 *
 *   beat.gestureId + library curve  ->  real rotation/x/y/scale keyframes
 *                                      resampled onto the beat span
 *
 * Honesty contract:
 *   - A beat whose gestureId is absent from the library keeps its bare HOLD
 *     boundary keys and produces a warning. Nothing is guessed.
 *   - A controller not present in the character's controller map produces a
 *     warning and is skipped.
 *   - Pure deterministic function: same inputs -> byte-identical output.
 */

export interface ControllerBinding {
  controllerId: string;
  nodePath: string;
}

export interface MotionValueResolverOptions {
  /** Per-character gesture libraries; first matching characterId wins. */
  gestureLibraries?: GestureTrackLibrary[];
  /**
   * controllerMaps as produced by ShowBibleLoader.buildControllerMaps():
   * characterId -> bindings. Required to translate controllerId -> nodePath.
   */
  controllerMaps?: Record<string, ControllerBinding[]>;
  /**
   * Overshoot factor (0 = off, classic follow-through). When > 0, the FIRST
   * interior key of each gesture track overshoots by (1+overshoot)× toward
   * its target, then the curve settles at the boundary value — the
   * anticipation/follow-through principle, deterministically.
   */
  overshoot?: number;
}

export interface AppliedGesture {
  beatId: string;
  gestureId: string;
  nodesTouched: string[];
}

export interface MotionValueResult {
  performance: PerformancePIR;
  warnings: string[];
  appliedGestures: AppliedGesture[];
}

type KeyValues = Partial<{
  rotation: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  interpolation: 'LINEAR' | 'CONSTANT' | 'BEZIER';
}>;

function valuesOf(key: GestureKey): KeyValues {
  const out: KeyValues = {};
  if (key.rotation !== undefined) out.rotation = key.rotation;
  if (key.x !== undefined) out.x = key.x;
  if (key.y !== undefined) out.y = key.y;
  if (key.scaleX !== undefined) out.scaleX = key.scaleX;
  if (key.scaleY !== undefined) out.scaleY = key.scaleY;
  out.interpolation = key.interpolation ?? 'LINEAR';
  return out;
}

export class MotionValueResolver {
  apply(
    manifest: ShotManifest,
    performance: PerformancePIR,
    options: MotionValueResolverOptions = {}
  ): MotionValueResult {
    const warnings: string[] = [];
    const appliedGestures: AppliedGesture[] = [];
    if (!options.gestureLibraries || options.gestureLibraries.length === 0) {
      return { performance, warnings, appliedGestures };
    }

    // Deep-copy tracks so the input PIR stays untouched.
    const tracksByKey = new Map<string, TransformTrack>();
    for (const t of performance.tracks) {
      tracksByKey.set(t.nodeId, { nodeId: t.nodeId, keys: t.keys.map(k => ({ ...k })) });
    }

    const librariesByCharacter = new Map<string, GestureTrackLibrary[]>();
    for (const lib of options.gestureLibraries) {
      const list = librariesByCharacter.get(lib.characterId) ?? [];
      list.push(lib);
      librariesByCharacter.set(lib.characterId, list);
    }

    const findGesture = (characterId: string, gestureId: string): GestureTrackSet | undefined => {
      for (const lib of librariesByCharacter.get(characterId) ?? []) {
        const hit = lib.gestures.find(g => g.gestureId === gestureId);
        if (hit) return hit;
      }
      return undefined;
    };

    const nodePathOf = (characterId: string, controllerId: string): string | undefined =>
      options.controllerMaps?.[characterId]?.find(c => c.controllerId === controllerId)?.nodePath;

    const applyGestureToBeat = (
      beat: ShotBeat,
      gesture: GestureTrackSet
    ): AppliedGesture => {
      const touchedNodes: string[] = [];
      const span = beat.endFrame - beat.startFrame;
      const duration = gesture.durationFrames;

      for (const entry of gesture.tracks) {
        const nodePath = nodePathOf(beat.characterId, entry.controllerId);
        if (!nodePath) {
          warnings.push(
            `beat "${beat.beatId}": controller "${entry.controllerId}" of gesture "${gesture.gestureId}" ` +
              `is not mapped for character "${beat.characterId}" — skipped`
          );
          continue;
        }
        const track = tracksByKey.get(nodePath) ?? { nodeId: nodePath, keys: [] };
        const byFrame = new Map<number, KeyValues>();
        for (const k of track.keys) byFrame.set(k.frame, {});

        // Boundary values come from the curve endpoints.
        const first = entry.keys[0];
        const last = entry.keys[entry.keys.length - 1];
        byFrame.set(beat.startFrame, { ...(byFrame.get(beat.startFrame) ?? {}), ...valuesOf(first) });
        byFrame.set(beat.endFrame, { ...(byFrame.get(beat.endFrame) ?? {}), ...valuesOf(last) });

        // Interior curve control points, deterministically resampled.
        let firstInteriorPlaced = false;
        const overshoot = options.overshoot ?? 0;
        for (const k of entry.keys) {
          if (k.offsetFrame <= 0 || k.offsetFrame >= duration) continue;
          const frame =
            beat.startFrame +
            Math.round((k.offsetFrame * span) / Math.max(1, duration - 1));
          if (frame <= beat.startFrame || frame >= beat.endFrame) continue;
          const values = valuesOf(k);
          if (overshoot > 0 && !firstInteriorPlaced) {
            // Follow-through: overshoot past the first interior target, then
            // the curve settles back to the boundary value at endFrame.
            for (const field of ['rotation', 'x', 'y', 'scaleX', 'scaleY'] as const) {
              const v = values[field];
              if (typeof v === 'number') values[field] = +(v * (1 + overshoot)).toFixed(4);
            }
            firstInteriorPlaced = true;
          }
          byFrame.set(frame, { ...(byFrame.get(frame) ?? {}), ...values });
        }

        track.keys = Array.from(byFrame.entries())
          .map(([frame, values]) => ({ frame, interpolation: 'LINEAR' as const, ...values }))
          .sort((a, b) => a.frame - b.frame);

        tracksByKey.set(nodePath, track);
        touchedNodes.push(nodePath);
      }
      return { beatId: beat.beatId, gestureId: gesture.gestureId, nodesTouched: touchedNodes };
    };

    for (const beat of manifest.beats) {
      if (!beat.gestureId) continue;
      const gesture = findGesture(beat.characterId, beat.gestureId);
      if (!gesture) {
        warnings.push(
          `beat "${beat.beatId}": gestureId "${beat.gestureId}" unknown for character ` +
            `"${beat.characterId}" in provided gesture libraries — emitting HOLD`
        );
        continue;
      }
      appliedGestures.push(applyGestureToBeat(beat, gesture));
    }

    const outPerformance: PerformancePIR = {
      ...performance,
      tracks: Array.from(tracksByKey.values()).map(t => ({
        nodeId: t.nodeId,
        keys: [...t.keys].sort((a, b) => a.frame - b.frame)
      }))
    };
    return { performance: outPerformance, warnings, appliedGestures };
  }
}
