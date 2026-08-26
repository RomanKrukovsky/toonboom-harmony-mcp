/**
 * Episode batch golden path — code-vs-evidence drift guard.
 *
 * Re-runs the whole-episode factory pipeline in-process from the committed
 * fixture batch and requires canonical-JSON agreement with the committed
 * evidence bundle docs/evidence/episode-batch-golden-path/.
 *
 * If this test fails, either the compiler chain drifted after the evidence was
 * recorded or the bundle was hand-edited. Re-record via
 * `npm run episodebatch:golden` — never patch by hand.
 *
 * Volatile plan identity fields (planId, manifestId, createdAt) are excluded:
 * HarmonyCommandBuilder derives them from crypto.randomBytes / new Date() by
 * design; content determinism is asserted on everything else.
 */

import fs from 'fs';
import path from 'path';
import stringify from 'fast-json-stable-stringify';
import { ShowBibleLoader } from '../src/services/showBibleLoader/index.js';
import { EpisodeBatchCompiler, stripVolatilePlanFields } from '../src/services/episodeBatchCompiler/index.js';
import { episodeBatchSchema } from '../src/schemas/episodeBatch.js';
import { gestureTrackLibrarySchema } from '../src/schemas/gestureTracks.js';

const ROOT = process.cwd();
const BUNDLE = path.join(ROOT, 'docs', 'evidence', 'episode-batch-golden-path');

const canon = (x: unknown): string => stringify(x) ?? '';

const readBundle = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(BUNDLE, name), 'utf-8'));

const safeShotId = (id: string): string => id.toLowerCase().replace(/[^a-z0-9]+/g, '_');

describe('episode batch golden path — committed evidence matches a fresh compile', () => {
  const batchInput = readBundle('episode_batch_input.json');
  const batchParse = episodeBatchSchema.safeParse(batchInput);
  if (!batchParse.success) {
    throw new Error(`committed episode_batch_input.json no longer validates: ${batchParse.error.message}`);
  }
  const batch = batchParse.data;

  const loader = new ShowBibleLoader();
  const loaded = loader.load(path.join(ROOT, batch.showBibleRef));
  const controllerMaps = loader.buildControllerMaps(loaded);
  const gestureLibrary = gestureTrackLibrarySchema.parse(
    JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', 'show_bible', 'gesture_tracks_mira.json'), 'utf-8'))
  );

  const result = new EpisodeBatchCompiler().compile(batch, loaded.crossRefs, {
    controllerMaps,
    gestureLibraries: [gestureLibrary]
  });

  it('compiles every shot without cross-reference violations', () => {
    expect(result.status).toBe('compiled');
    expect(result.rejections).toEqual([]);
    expect(result.shots.length).toBe(batch.shots.length);
  });

  for (const shot of result.shots) {
    const base = `shot_${safeShotId(shot.spec.shotId)}`;

    it(`reproduces ${shot.spec.shotId} PerformancePIR exactly`, () => {
      expect(canon(shot.performance)).toBe(
        canon(readBundle(`${base}_performance_pir.json`))
      );
    });

    it(`reproduces ${shot.spec.shotId} RetargetingPlan exactly`, () => {
      expect(canon(shot.retargetingPlan)).toBe(
        canon(readBundle(`${base}_retargeting_plan.json`))
      );
    });

    it(`reproduces ${shot.spec.shotId} command plan content (volatile fields excluded)`, () => {
      const committed = stripVolatilePlanFields(readBundle(`${base}_command_plan_v4.json`));
      expect(canon(stripVolatilePlanFields(shot.commandPlan))).toBe(canon(committed));
    });
  }

  it('matches the aggregate totals recorded in the execution report', () => {
    const report = readBundle('execution-report.json');
    expect(report.totals).toEqual(result.totals);
  });
});
