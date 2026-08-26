import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import {
  type EpisodeBatch,
  type EpisodeShotSpec
} from '../../schemas/episodeBatch.js';
import {
  type ShotManifest,
  type CrossReferenceViolation,
  SHOT_MANIFEST_SCHEMA_VERSION
} from '../../schemas/shotManifest.js';
import { type PerformancePIR } from '../../schemas/performancePir.js';
import { type RetargetingPlan } from '../../schemas/retargetingPlan.js';
import { type HarmonyCommandPlanV4 } from '../../schemas/harmonyCommandPlanV4.js';
import { type RigBindingPlanV1 } from '../../schemas/rigBinding.js';
import { ShotManifestCompiler, type ShotManifestCompilerOptions } from '../shotManifestCompiler/index.js';
import { RetargetingResolver } from '../retargetingResolver/index.js';
import { HarmonyCommandBuilder } from '../harmonyCommandBuilder/index.js';
import { MotionValueResolver } from '../motionValueResolver/index.js';
import { type GestureTrackLibrary } from '../../schemas/gestureTracks.js';

/**
 * EpisodeBatchCompiler — deterministic batch front-end for the factory.
 *
 * Compiles every shot of an episode through the same ShowBible-gated chain as
 * the single-shot path (ShotManifestCompiler -> RetargetingResolver ->
 * HarmonyCommandBuilder). Rules inherited from the single-shot contract:
 *
 *   1. Any cross-reference violation rejects the offending shot — and marks
 *      the whole batch `rejected`. A factory must never silently drop a shot.
 *   2. Same input -> byte-identical output. Identity fields of the command
 *      plan (planId/manifestId/createdAt) are random per run by design;
 *      determinism is asserted on everything else via content digests.
 *   3. The compiler invents nothing: keys land only on declared beat
 *      boundaries, gesture values stay deferred to the retargeting layer.
 */

export interface EpisodeBatchShotResult {
  spec: EpisodeShotSpec;
  manifest: ShotManifest;
  performance: PerformancePIR;
  retargetingPlan: RetargetingPlan;
  commandPlan: HarmonyCommandPlanV4;
  warnings: string[];
}

export interface EpisodeBatchRejection {
  shotId: string;
  violations: CrossReferenceViolation[];
}

export interface EpisodeBatchTotals {
  shots: number;
  beats: number;
  keyframes: number;
  commands: number;
  totalFrames: number;
}

export interface EpisodeBatchResult {
  status: 'compiled' | 'rejected';
  shots: EpisodeBatchShotResult[];
  rejections: EpisodeBatchRejection[];
  totals: EpisodeBatchTotals;
  /** SHA-256 over all volatile-stripped artifacts; stable across runs. */
  episodeContentDigest: string;
}

/**
 * Shared structural binding-plan stub used until a commissioned rig exists
 * (fixtures/show_bible/README.md). Zero bindings by design; hashed honestly
 * so downstream bindingHash values stay deterministic and traceable.
 */
export function buildStructuralBindingPlan(
  characterId: string,
  performance: PerformancePIR
): RigBindingPlanV1 {
  const hash = crypto.createHash('sha256');
  return {
    schema: 'toon-boom-mcp/rig-binding-plan-v1',
    character_id: characterId,
    template: {
      template_id: 'biped_standard_structural_stub',
      version: '0.0.0',
      content_hash: `sha256:${hash.copy().update('structural-stub-no-commissioned-rig').digest('hex')}`
    },
    source: {
      pir_id: performance.performanceId,
      pir_hash: `sha256:${hash.update(stringify(performance) ?? '').digest('hex')}`
    },
    bindings: [],
    unresolved: ['all_controller_bindings'],
    warnings: ['Structural stub: no commissioned rig; bindings empty by design.']
  };
}

/** Command-plan fields derived from crypto.randomBytes / new Date(). */
export function stripVolatilePlanFields(plan: HarmonyCommandPlanV4): Record<string, unknown> {
  const { planId, manifestId, createdAt, ...rest } = plan;
  return rest;
}

function sha256Of(value: unknown): string {
  return crypto.createHash('sha256').update(stringify(value) ?? '').digest('hex');
}

export interface EpisodeBatchOptions extends ShotManifestCompilerOptions {
  /**
   * Per-character gesture libraries. When provided, MotionValueResolver fills
   * real transform values into the compiled beat keys (unknown gestures stay
   * HOLD with honest warnings).
   */
  gestureLibraries?: GestureTrackLibrary[];
}

export class EpisodeBatchCompiler {
  private readonly shotCompiler = new ShotManifestCompiler();
  private readonly resolver = new RetargetingResolver();
  private readonly planBuilder = new HarmonyCommandBuilder();
  private readonly motionResolver = new MotionValueResolver();

  compile(
    batch: EpisodeBatch,
    crossRefs: Parameters<ShotManifestCompiler['compile']>[1],
    options: EpisodeBatchOptions = {}
  ): EpisodeBatchResult {
    const shots: EpisodeBatchShotResult[] = [];
    const rejections: EpisodeBatchRejection[] = [];

    for (const spec of batch.shots) {
      const manifest = this.buildManifest(batch, spec);
      const { performance, violations, warnings } = this.shotCompiler.compile(
        manifest,
        crossRefs,
        options
      );

      if (violations.length > 0) {
        rejections.push({ shotId: spec.shotId, violations });
        continue;
      }

      const motion = this.motionResolver.apply(manifest, performance, {
        gestureLibraries: options.gestureLibraries,
        controllerMaps: options.controllerMaps
      });
      warnings.push(...motion.warnings);
      const valuedPerformance = motion.performance;

      const bindingPlan = buildStructuralBindingPlan(valuedPerformance.characterId, valuedPerformance);
      const retargetingPlan = this.resolver.resolve(valuedPerformance, bindingPlan);
      const commandPlan = this.planBuilder.buildAnimationPlan(retargetingPlan);

      shots.push({ spec, manifest, performance: valuedPerformance, retargetingPlan, commandPlan, warnings });
    }

    const totals: EpisodeBatchTotals = {
      shots: shots.length,
      beats: shots.reduce((n, s) => n + s.spec.beats.length, 0),
      keyframes: shots.reduce((n, s) => n + s.performance.tracks.reduce((k, t) => k + t.keys.length, 0), 0),
      commands: shots.reduce((n, s) => n + s.commandPlan.commands.length, 0),
      totalFrames: shots.reduce((n, s) => n + s.spec.timing.totalFrames, 0)
    };

    // Content digest excludes volatile identity fields so two runs agree.
    const digest = sha256Of({
      episodeId: batch.episodeId,
      showBibleRef: batch.showBibleRef,
      shots: shots.map(s => ({
        shotId: s.spec.shotId,
        performance: s.performance,
        retargetingPlan: s.retargetingPlan,
        commandPlan: stripVolatilePlanFields(s.commandPlan)
      }))
    });

    return {
      status: rejections.length === 0 && shots.length === batch.shots.length ? 'compiled' : 'rejected',
      shots,
      rejections,
      totals,
      episodeContentDigest: `sha256:${digest}`
    };
  }

  /** Materialise the full single-shot manifest the gated compiler consumes. */
  buildManifest(batch: EpisodeBatch, spec: EpisodeShotSpec): ShotManifest {
    return {
      schemaVersion: SHOT_MANIFEST_SCHEMA_VERSION,
      shotId: spec.shotId,
      showBibleRef: batch.showBibleRef,
      production: batch.production,
      episode: batch.episodeId,
      sceneName: spec.sceneName,
      description: spec.description,
      staging: spec.staging,
      timing: spec.timing,
      beats: spec.beats,
      fx: spec.fx,
      render: spec.render,
      provenance: {
        director: batch.director,
        createdAt: batch.createdAt,
        sourceScriptRef: spec.sourceScriptRef
      }
    };
  }
}
