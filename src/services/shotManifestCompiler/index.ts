import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import {
  type ShotManifest,
  type ShotBeat,
  type ShowBibleCrossRefs,
  crossReferenceShotManifest,
  CrossReferenceViolation
} from '../../schemas/shotManifest.js';
import {
  type PerformancePIR,
  type TransformTrack
} from '../../schemas/performancePir.js';

/**
 * ShotManifestCompiler — deterministic bridge from a ShotManifest to a
 * PerformancePIR that the RetargetingResolver + HarmonyCommandBuilder can
 * consume.
 *
 * Roadmap contract (ROADMAP §"Компилятор шота"):
 *   Сценарий -> ShotManifest -> постановка и тайминг -> PerformancePIR
 *   -> HarmonyCommandPlan -> редактируемая сцена Harmony
 *
 * Rules:
 *   1. The compiler MUST refuse any ShotManifest that violates the ShowBible
 *      cross-reference. Unknown shot sizes / camera moves / emotions / characters
 *      are hard rejections. The LLM is never allowed to invent moves.
 *   2. Output is deterministic: the same (manifest, showBibleRef) always
 *      produces the same PerformancePIR, including a stable performanceId
 *      derived from a SHA-256 of the manifest.
 *   3. Keys are placed ONLY on beat boundaries declared in the manifest. The
 *      compiler does not invent acting — it maps declared beats to transform
 *      tracks using the controller map from the CharacterBible.
 */

export interface ShotManifestCompilerOptions {
  /**
   * Map from `characterId` to a list of controller bindings (from
   * CharacterBible.controllers). The compiler uses this to decide which peg
   * nodes receive keyframes for each beat. If a beat references a gestureId
   * or poseLibraryRef that is not in this map, the beat is emitted as a HOLD
   * rather than a guessed motion.
   */
  controllerMaps?: Record<string, Array<{ controllerId: string; nodePath: string }>>;
}

export interface ShotManifestCompilerResult {
  performance: PerformancePIR;
  violations: CrossReferenceViolation[];
  warnings: string[];
}

type CameraKeyValues = Pick<
  TransformTrack['keys'][number],
  'rotation' | 'x' | 'y' | 'scaleX' | 'scaleY'
>;

type NonStaticCameraMove = Exclude<ShotManifest['staging']['cameraMove'], 'static'>;

/**
 * Deterministic start -> end transform deltas per declared camera move.
 * Values live in the RigTemplate's normalized coordinate space, mirroring
 * how beat tracks declare WHERE keys go while deferring absolute rig-space
 * resolution to downstream resolvers.
 */
const CAMERA_MOVE_ENDPOINTS: Record<NonStaticCameraMove, { from: CameraKeyValues; to: CameraKeyValues }> = {
  pan_left: { from: { x: 0 }, to: { x: -100 } },
  pan_right: { from: { x: 0 }, to: { x: 100 } },
  tilt_up: { from: { y: 0 }, to: { y: 80 } },
  tilt_down: { from: { y: 0 }, to: { y: -80 } },
  dolly_in: { from: { scaleX: 1, scaleY: 1 }, to: { scaleX: 1.15, scaleY: 1.15 } },
  dolly_out: { from: { scaleX: 1, scaleY: 1 }, to: { scaleX: 0.87, scaleY: 0.87 } },
  truck_left: { from: { x: 0 }, to: { x: -80 } },
  truck_right: { from: { x: 0 }, to: { x: 80 } },
  pedestal_up: { from: { y: 0 }, to: { y: 60 } },
  pedestal_down: { from: { y: 0 }, to: { y: -60 } },
  zoom_in: { from: { scaleX: 1, scaleY: 1 }, to: { scaleX: 1.2, scaleY: 1.2 } },
  zoom_out: { from: { scaleX: 1, scaleY: 1 }, to: { scaleX: 0.83, scaleY: 0.83 } },
  arc_left: { from: { x: 0, rotation: 0 }, to: { x: 60, rotation: -5 } },
  arc_right: { from: { x: 0, rotation: 0 }, to: { x: -60, rotation: 5 } },
  crane_up: { from: { y: 0 }, to: { y: 100 } },
  crane_down: { from: { y: 0 }, to: { y: -100 } }
};

export class ShotManifestCompiler {
  compile(
    manifest: ShotManifest,
    refs: ShowBibleCrossRefs,
    options: ShotManifestCompilerOptions = {}
  ): ShotManifestCompilerResult {
    const violations = crossReferenceShotManifest(manifest, refs);
    const warnings: string[] = [];

    if (violations.length > 0) {
      return {
        performance: this.emptyPerformance(manifest),
        violations,
        warnings
      };
    }

    const tracksByNode = new Map<string, TransformTrack>();
    const ensureTrack = (nodeId: string): TransformTrack => {
      let t = tracksByNode.get(nodeId);
      if (!t) {
        t = { nodeId, keys: [] };
        tracksByNode.set(nodeId, t);
      }
      return t;
    };

    for (const beat of manifest.beats) {
      this.applyBeat(beat, manifest, options, ensureTrack, warnings);
    }

    // Camera move: a declared non-static camera move becomes a deterministic
    // TransformTrack on the camera peg so downstream consumers key real motion
    // instead of silently dropping the director's intent.
    this.applyCameraMove(manifest, ensureTrack, warnings);

    // Multi-character staging: characters that are staged (on stage) but have
    // no beats still need controller tracks, otherwise they would disappear
    // from the compiled performance.
    this.applyHoldsForUnbeatenCharacters(manifest, options, ensureTrack, warnings);

    // FX honesty: declared effects are recorded as warnings until a real FX
    // executor exists. Silent dropping would fabricate a clean shot.
    for (const fx of manifest.fx) {
      warnings.push(
        `fx "${fx.type}" on "${fx.target}" (${fx.startFrame}-${fx.endFrame}) declared but FX execution is not implemented — skipped`
      );
    }

    const performanceId = this.derivePerformanceId(manifest);
    const performance: PerformancePIR = {
      schema: 'toon-boom-mcp/performance-pir-v1',
      performanceId,
      characterId: manifest.beats[0]?.characterId ?? 'unknown',
      durationFrames: manifest.timing.totalFrames,
      fps: manifest.timing.fps,
      tracks: Array.from(tracksByNode.values()).map(t => ({
        nodeId: t.nodeId,
        keys: t.keys.sort((a, b) => a.frame - b.frame)
      })),
      holds: [],
      shotManifestRef: manifest.shotId,
      staging: {
        shotSize: manifest.staging.shotSize,
        cameraMove: manifest.staging.cameraMove,
        backgroundRef: manifest.staging.backgroundRef
      },
      timing: {
        totalFrames: manifest.timing.totalFrames,
        minBeatFrames: manifest.timing.minBeatFrames,
        maxBeatFrames: manifest.timing.maxBeatFrames,
        anticipationFrames: manifest.timing.anticipationFrames,
        followThroughFrames: manifest.timing.followThroughFrames
      },
      beatFrameMap: manifest.beats.map(b => ({
        beatId: b.beatId,
        startFrame: b.startFrame,
        endFrame: b.endFrame
      }))
    };

    return { performance, violations, warnings };
  }

  private applyBeat(
    beat: ShotBeat,
    manifest: ShotManifest,
    options: ShotManifestCompilerOptions,
    ensureTrack: (nodeId: string) => TransformTrack,
    warnings: string[]
  ): void {
    const controllerMap = options.controllerMaps?.[beat.characterId] ?? [];
    if (controllerMap.length === 0) {
      warnings.push(
        `beat "${beat.beatId}": no controller map for character "${beat.characterId}" — emitting HOLD`
      );
      return;
    }

    // Place a HOLD-style key at the beat start frame on every known controller.
    // The actual motion values come from the gesture/pose library, which is
    // resolved later by RetargetingResolver against the RigBindingPlan. Here
    // we only declare WHERE keys live (on beat boundaries), not WHAT they do.
    for (const ctrl of controllerMap) {
      const track = ensureTrack(ctrl.nodePath);
      track.keys.push({ frame: beat.startFrame, interpolation: 'LINEAR' });
      if (beat.endFrame > beat.startFrame) {
        track.keys.push({ frame: beat.endFrame, interpolation: 'LINEAR' });
      }
    }

    if (beat.gestureId) {
      warnings.push(
        `beat "${beat.beatId}": gestureId "${beat.gestureId}" declared but gesture track resolution is deferred to RetargetingResolver`
      );
    }
    if (beat.poseLibraryRef) {
      warnings.push(
        `beat "${beat.beatId}": poseLibraryRef "${beat.poseLibraryRef}" declared but pose binding is deferred to RetargetingResolver`
      );
    }
  }

  private applyCameraMove(
    manifest: ShotManifest,
    ensureTrack: (nodeId: string) => TransformTrack,
    warnings: string[]
  ): void {
    const move = manifest.staging.cameraMove;
    if (move === 'static') return;

    const endpoints = CAMERA_MOVE_ENDPOINTS[move];
    if (!endpoints) return; // unreachable for schema-valid moves

    const startFrame = manifest.staging.cameraStartFrame ?? 1;
    const endFrame = manifest.staging.cameraEndFrame ?? manifest.timing.totalFrames;
    const track = ensureTrack('NODE_CAMERA_PEG');
    track.keys.push({
      frame: startFrame,
      interpolation: 'LINEAR',
      ...endpoints.from
    });
    if (endFrame > startFrame) {
      track.keys.push({
        frame: endFrame,
        interpolation: 'LINEAR',
        ...endpoints.to
      });
    }
    warnings.push(`camera "${move}" compiled to NODE_CAMERA_PEG keyframes`);
  }

  private applyHoldsForUnbeatenCharacters(
    manifest: ShotManifest,
    options: ShotManifestCompilerOptions,
    ensureTrack: (nodeId: string) => TransformTrack,
    warnings: string[]
  ): void {
    if (manifest.staging.positions.length <= 1) return;

    const beatCharacterIds = new Set(manifest.beats.map(b => b.characterId));
    const emitted = new Set<string>();
    for (const position of manifest.staging.positions) {
      if (beatCharacterIds.has(position.characterId)) continue;
      if (emitted.has(position.characterId)) continue;
      emitted.add(position.characterId);

      const controllerMap = options.controllerMaps?.[position.characterId] ?? [];
      for (const ctrl of controllerMap) {
        const track = ensureTrack(ctrl.nodePath);
        track.keys.push({ frame: 1, interpolation: 'LINEAR' });
        if (manifest.timing.totalFrames > 1) {
          track.keys.push({ frame: manifest.timing.totalFrames, interpolation: 'LINEAR' });
        }
      }
      warnings.push(
        `character "${position.characterId}" staged without beats — HOLD track emitted`
      );
    }
  }

  private emptyPerformance(manifest: ShotManifest): PerformancePIR {
    return {
      schema: 'toon-boom-mcp/performance-pir-v1',
      performanceId: this.derivePerformanceId(manifest),
      characterId: manifest.beats[0]?.characterId ?? 'unknown',
      durationFrames: manifest.timing.totalFrames,
      fps: manifest.timing.fps,
      tracks: [],
      holds: [],
      shotManifestRef: manifest.shotId
    };
  }

  private derivePerformanceId(manifest: ShotManifest): string {
    const stable = stringify({
      shotId: manifest.shotId,
      showBibleRef: manifest.showBibleRef,
      staging: manifest.staging,
      timing: manifest.timing,
      beats: manifest.beats
    });
    const hash = crypto.createHash('sha256').update(stable ?? '').digest('hex');
    return `PERF-${hash.slice(0, 16)}`;
  }
}