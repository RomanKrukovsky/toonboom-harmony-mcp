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