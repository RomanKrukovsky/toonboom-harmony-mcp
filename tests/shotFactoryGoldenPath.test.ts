/**
 * Shot Factory golden path — code-vs-evidence drift guard.
 *
 * Re-runs the deterministic factory pipeline in-process from the committed
 * fixture family and requires byte-identical (canonical JSON) agreement with
 * the committed evidence bundle docs/evidence/shot-factory-golden-path/.
 *
 * If this test fails, either the compiler chain drifted after the evidence was
 * recorded or the bundle was hand-edited. In both cases the registry claim for
 * `production.shot_factory` is stale and must be re-recorded via
 * `npm run shotfactory:golden` — never patched by hand.
 *
 * Volatile plan identity fields (planId, manifestId, createdAt) are excluded:
 * HarmonyCommandBuilder derives them from crypto.randomBytes / new Date() by
 * design; content determinism is asserted on everything else.
 */

import fs from 'fs';
import path from 'path';
import stringify from 'fast-json-stable-stringify';
import { ShowBibleLoader } from '../src/services/showBibleLoader/index.js';
import { ShotManifestCompiler } from '../src/services/shotManifestCompiler/index.js';
import { MotionValueResolver } from '../src/services/motionValueResolver/index.js';
import { RetargetingResolver } from '../src/services/retargetingResolver/index.js';
import { HarmonyCommandBuilder } from '../src/services/harmonyCommandBuilder/index.js';
import { gestureTrackLibrarySchema } from '../src/schemas/gestureTracks.js';

const ROOT = process.cwd();
const BUNDLE = path.join(ROOT, 'docs', 'evidence', 'shot-factory-golden-path');

const canon = (x: unknown): string => stringify(x) ?? '';
const stripVolatile = (plan: Record<string, unknown>) => {
  const { planId, manifestId, createdAt, ...rest } = plan;
  return rest;
};

const readBundle = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(BUNDLE, name), 'utf-8'));

describe('shot factory golden path — committed evidence matches a fresh compile', () => {
  const manifest = readBundle('shot_manifest.json');
  const bindingPlan = readBundle('rig_binding_plan.json');

  const loader = new ShowBibleLoader();
  const loaded = loader.load(path.join(ROOT, manifest.showBibleRef));
  const controllerMaps = loader.buildControllerMaps(loaded);
  const gestureLibrary = gestureTrackLibrarySchema.parse(
    JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', 'show_bible', 'gesture_tracks_mira.json'), 'utf-8'))
  );

  const compiled = new ShotManifestCompiler().compile(
    manifest,
    loaded.crossRefs,
    { controllerMaps }
  );
  expect(compiled.violations).toEqual([]);
  const motion = new MotionValueResolver().apply(manifest, compiled.performance, {
    gestureLibraries: [gestureLibrary],
    controllerMaps
  });
  const performance = motion.performance;
  const retargetingPlan = new RetargetingResolver().resolve(performance, bindingPlan);
  const commandPlan = new HarmonyCommandBuilder().buildAnimationPlan(retargetingPlan);

  it('compiles without cross-reference violations', () => {
    expect(compiled.violations).toEqual([]);
  });

  it('reproduces the committed PerformancePIR exactly', () => {
    expect(canon(performance)).toBe(canon(readBundle('performance_pir.json')));
  });

  it('reproduces the committed RetargetingPlan exactly', () => {
    expect(canon(retargetingPlan)).toBe(canon(readBundle('retargeting_plan.json')));
  });

  it('reproduces the committed command plan content (volatile fields excluded)', () => {
    const committed = stripVolatile(readBundle('harmony_command_plan_v4.json'));
    expect(canon(stripVolatile(commandPlan))).toBe(canon(committed));
  });
});
