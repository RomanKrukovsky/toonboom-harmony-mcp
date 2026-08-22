/**
 * Tests for rig360GenerationTools — 360 rig synthesis.
 *
 * Two real defects are pinned here:
 *
 *  1. Every tool declared `characterSpec: z.any()`, so `characterSpecSchema`'s
 *     defaults (requiredViews, layerPlan, …) never applied and the synthesizer
 *     crashed with "character.requiredViews is not iterable" on a plausible spec.
 *
 *  2. `buildFromAssets()` looks `assetPaths` up by a `view_layer` key
 *     ("front_skull") but only returned humanised prose ("front skull drawing").
 *     The gap list was therefore unsatisfiable and `realRigCreated` could never
 *     become true. `missingAssetKeys` closes that loop.
 */

import { characterSpecSchema } from '../src/schemas/characterSpec.js';
import { rig360GenerationTools } from '../src/tools/rig360GenerationTools.js';
import { requireTool } from './helpers/toolInvocation.js';

const generateSpec = requireTool(rig360GenerationTools, 'harmony.rig360.generate_spec');
const turnaround = requireTool(rig360GenerationTools, 'harmony.rig360.generate_turnaround_plan');
const layeredPlan = requireTool(rig360GenerationTools, 'harmony.rig360.generate_layered_asset_plan');
const buildPlaceholder = requireTool(rig360GenerationTools, 'harmony.rig360.build_placeholder_rig');
const validateRig = requireTool(rig360GenerationTools, 'harmony.rig360.validate_full_rig');
const testTurn = requireTool(rig360GenerationTools, 'harmony.rig360.generate_test_turn_animation');
const buildFromAssets = requireTool(rig360GenerationTools, 'harmony.rig360.build_from_assets');

/** Parsed the way the MCP dispatcher does, so schema defaults are applied. */
function spec(overrides: Record<string, unknown> = {}) {
  return characterSpecSchema.parse({
    name: 'Hero',
    role: 'protagonist',
    personality: 'brave',
    visualStyle: 'cartoon',
    bodyType: 'humanoid',
    ...overrides
  });
}

/** Minimal spec: one view, one layer each — small enough to fully satisfy. */
function minimalSpec() {
  return spec({
    requiredViews: ['front'],
    requiredExpressions: ['neutral'],
    requiredMouthShapes: ['rest'],
    requiredHandPoses: ['open'],
    layerPlan: { head: ['skull'], body: ['torso'] }
  });
}

describe('schema defaults reach the synthesizer', () => {
  it('applies requiredViews from the schema instead of crashing', () => {
    // z.any() let a spec through without requiredViews; the synthesizer then
    // threw "character.requiredViews is not iterable".
    const parsed = spec();
    expect(parsed.requiredViews.length).toBe(8);
    expect(parsed.layerPlan.head.length).toBeGreaterThan(0);
  });

  it('generates a spec for a partially specified character', async () => {
    const result: any = await generateSpec.handler({ characterSpec: spec() });
    expect(result.status).toBe('success');
    expect(result.rig360Spec.requiredAssets.length).toBeGreaterThan(0);
  });

  it('scales required assets with views and layers', async () => {
    const small: any = await generateSpec.handler({ characterSpec: minimalSpec() });
    const full: any = await generateSpec.handler({ characterSpec: spec() });
    // Eight views over seven head layers demands far more than one view.
    expect(full.rig360Spec.requiredAssets.length)
      .toBeGreaterThan(small.rig360Spec.requiredAssets.length);
  });
});

describe('generate_spec honesty', () => {
  it('never claims a real rig without drawn assets', async () => {
    const result: any = await generateSpec.handler({ characterSpec: spec() });
    expect(result.rig360Spec.realRigCreated).toBe(false);
    expect(result.rig360Spec.placeholderRigCreated).toBe(true);
    expect(result.rig360Spec.origin).toBe('placeholder');
  });

  it('reports gaps both as prose and as machine-readable keys', async () => {
    const result: any = await generateSpec.handler({ characterSpec: minimalSpec() });
    expect(result.rig360Spec.missingAssets.length).toBeGreaterThan(0);
    expect(result.rig360Spec.missingAssetKeys.length).toBeGreaterThan(0);
    // Keys must be view_layer, never the prose form.
    for (const key of result.rig360Spec.missingAssetKeys) {
      expect(key).not.toContain(' ');
      expect(key).toMatch(/^front_/);
    }
  });
});

describe('build_from_assets', () => {
  it('returns a placeholder when nothing is supplied', async () => {
    const result: any = await buildFromAssets.handler({
      characterSpec: minimalSpec(), assetPaths: {}
    });
    expect(result.status).toBe('partial_success');
    expect(result.realRigCreated).toBe(false);
    expect(result.placeholderRigCreated).toBe(true);
    expect(result.missingAssetKeys.length).toBeGreaterThan(0);
  });

  it('builds a real rig once every advertised key is satisfied', async () => {
    const character = minimalSpec();
    const gaps: any = await buildFromAssets.handler({ characterSpec: character, assetPaths: {} });

    // Satisfy exactly what the tool asked for, by key.
    const assetPaths: Record<string, string> = {};
    for (const key of gaps.missingAssetKeys) assetPaths[key] = `/tmp/${key}.png`;

    const result: any = await buildFromAssets.handler({ characterSpec: character, assetPaths });
    // Before missingAssetKeys existed this could never reach true.
    expect(result.realRigCreated).toBe(true);
    expect(result.placeholderRigCreated).toBe(false);
    expect(result.status).toBe('success');
    expect(result.missingAssetKeys).toEqual([]);
    expect(result.providedAssets.length).toBe(gaps.missingAssetKeys.length);
  });

  it('ignores prose names supplied as keys', async () => {
    const character = minimalSpec();
    const gaps: any = await buildFromAssets.handler({ characterSpec: character, assetPaths: {} });

    // Using the humanised list as keys must NOT be mistaken for satisfying it.
    const wrong: Record<string, string> = {};
    for (const name of gaps.missingAssets) wrong[name] = '/tmp/x.png';

    const result: any = await buildFromAssets.handler({ characterSpec: character, assetPaths: wrong });
    expect(result.realRigCreated).toBe(false);
  });

  it('counts partial delivery honestly', async () => {
    const character = minimalSpec();
    const gaps: any = await buildFromAssets.handler({ characterSpec: character, assetPaths: {} });

    const half = gaps.missingAssetKeys.slice(0, 2);
    const assetPaths: Record<string, string> = {};
    for (const key of half) assetPaths[key] = `/tmp/${key}.png`;

    const result: any = await buildFromAssets.handler({ characterSpec: character, assetPaths });
    expect(result.realRigCreated).toBe(false);
    expect(result.providedAssets.length).toBe(half.length);
    expect(result.missingAssetKeys.length).toBe(gaps.missingAssetKeys.length - half.length);
  });

  it('points the caller at keys, not prose, in nextBestAction', async () => {
    const result: any = await buildFromAssets.handler({
      characterSpec: minimalSpec(), assetPaths: {}
    });
    expect(result.nextBestAction).toMatch(/missingAssetKeys/);
  });
});

describe('validate_full_rig', () => {
  it('rejects a placeholder-only rig', async () => {
    const built: any = await buildFromAssets.handler({
      characterSpec: minimalSpec(), assetPaths: {}
    });
    const result: any = await validateRig.handler({ rig360Spec: built.rig360Spec });
    expect(result.valid).toBe(false);
    expect(result.status).toBe('partial_success');
    expect(result.issues.join(' ')).toMatch(/placeholder/i);
  });

  it('accepts a rig whose assets are all present', async () => {
    const character = minimalSpec();
    const gaps: any = await buildFromAssets.handler({ characterSpec: character, assetPaths: {} });
    const assetPaths: Record<string, string> = {};
    for (const key of gaps.missingAssetKeys) assetPaths[key] = `/tmp/${key}.png`;

    const built: any = await buildFromAssets.handler({ characterSpec: character, assetPaths });
    const result: any = await validateRig.handler({ rig360Spec: built.rig360Spec });
    expect(result.valid).toBe(true);
    expect(result.status).toBe('success');
  });
});

describe('supporting plans', () => {
  it('covers every requested view in the turnaround plan', async () => {
    const character = spec({ requiredViews: ['front', 'side_left', 'back'] });
    const result: any = await turnaround.handler({ characterSpec: character });
    expect(result.turnaroundPlan.views).toEqual(['front', 'side_left', 'back']);
  });

  it('plans one layer entry per layer per view', async () => {
    const character = spec({
      requiredViews: ['front', 'back'],
      layerPlan: { head: ['skull', 'eyes'], body: ['torso'] }
    });
    const result: any = await layeredPlan.handler({ characterSpec: character });
    // 3 layers, each needed in both views.
    expect(result.layeredAssetPlan.layers.length).toBe(3);
    for (const layer of result.layeredAssetPlan.layers) {
      expect(layer.views).toEqual(['front', 'back']);
    }
  });

  it('reports placeholder rig node count and missing assets', async () => {
    const result: any = await buildPlaceholder.handler({ characterSpec: minimalSpec() });
    expect(result.placeholder.nodeCount).toBeGreaterThan(0);
    expect(result.placeholder.templatePath).toContain('placeholder_rig_hero');
    expect(result.placeholder.missingAssets.length).toBeGreaterThan(0);
  });

  it('produces a 360-degree test turn with matching frames and angles', async () => {
    const built: any = await buildFromAssets.handler({
      characterSpec: minimalSpec(), assetPaths: {}
    });
    const result: any = await testTurn.handler({ rig360Spec: built.rig360Spec });
    const anim = result.testTurnAnimation;
    expect(anim.type).toBe('360_turn_test');
    expect(anim.frames.length).toBe(anim.angles.length);
    expect(anim.angles[0]).toBe(0);
    expect(anim.angles[anim.angles.length - 1]).toBe(360);
  });
});
