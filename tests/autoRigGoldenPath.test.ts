/**
 * Auto-rigger golden path — code-vs-evidence drift guard.
 *
 * Re-runs the auto-rig chain in-process from the committed real-model fixture
 * and requires canonical-JSON agreement with the committed evidence bundle
 * docs/evidence/auto-rigger-golden-path/.
 *
 * If this fails, the rigging chain drifted after recording or the bundle was
 * hand-edited. Re-record via `npm run autorig:golden` — never patch by hand.
 *
 * Volatile plan identity fields (planId, manifestId, createdAt) are excluded:
 * HarmonyCommandBuilder derives them from crypto.randomBytes / new Date() by
 * design.
 */

import fs from 'fs';
import path from 'path';
import stringify from 'fast-json-stable-stringify';
import { RigTemplateRegistry } from '../src/services/rigTemplateRegistry/index.js';
import {
  AutoRigCompiler,
  stripVolatilePlanFields
} from '../src/services/autoRigCompiler/index.js';

const ROOT = process.cwd();
const BUNDLE = path.join(ROOT, 'docs', 'evidence', 'auto-rigger-golden-path');
const CHARACTER_ID = 'char_sprint0_photo_v1';

const canon = (x: unknown): string => stringify(x) ?? '';
/** planId/createdAt are Date.now()-stamped and planHash derives from them. */
const stripRigVolatile = (obj: Record<string, unknown>) => {
  const { planId, createdAt, planHash, ...rest } = obj;
  return rest;
};
const readBundle = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(BUNDLE, name), 'utf-8'));

describe('auto-rigger golden path — committed evidence matches a fresh compile', () => {
  const rawSkeleton = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'fixtures', 'auto_rig', 'skeleton_dwpose_real.json'), 'utf-8')
  );
  const drawingPir = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'fixtures', 'auto_rig', 'drawing_pir_structural.json'), 'utf-8')
  );

  let result: ReturnType<AutoRigCompiler['compile']>;

  beforeAll(async () => {
    const registry = new RigTemplateRegistry();
    await registry.initialize();
    result = new AutoRigCompiler().compile(rawSkeleton, CHARACTER_ID, registry, undefined, undefined, drawingPir);
  });

  it('resolves template bindings without unresolved slots', () => {
    expect(result.bindingPlan.bindings.length).toBeGreaterThan(0);
    expect(result.bindingPlan.unresolved).toEqual([]);
  });

  it('plans the full cut-out package: parts, deformers and a face master controller', () => {
    expect(result.rigAssemblyPlan).toBeTruthy();
    expect(result.attachments.length).toBeGreaterThan(0);
    // Two-segment hinge technique: forearms and shins must exist as parts.
    const partIds = result.attachments.map(a => a.partId);
    for (const required of ['Forearm_L', 'Forearm_R', 'Shin_L', 'Shin_R', 'Leg_L', 'Leg_R']) {
      expect(partIds).toContain(required);
    }
    expect(result.deformerPlan!.deformers.length).toBeGreaterThan(0);
    expect(result.deformerPlan!.masterControllers.length).toBeGreaterThan(0);
  });

  it('snaps hinge pivots to the joint-circle centers in the command plan', () => {
    const hingePivots = result.commandPlan.commands.filter(
      c => c.type === 'set_peg_pivot' && String((c.params as any).source_binding ?? '').startsWith('joint_guide:')
    );
    expect(hingePivots.length).toBe(4);
    const bySource = Object.fromEntries(
      hingePivots.map(c => [String((c.params as any).source_binding), c.params as any])
    );
    for (const guide of result.jointGuides!.guides) {
      const key = `joint_guide:${guide.jointName}`;
      const pivot = bySource[key];
      expect(pivot).toBeDefined();
      expect(pivot.pivot.x).toBeCloseTo(guide.centerX, 6);
      expect(pivot.pivot.y).toBeCloseTo(guide.centerY, 6);
    }
  });

  it('reproduces the committed CharacterTopologyPIR exactly', () => {
    expect(canon(result.topologyPir)).toBe(canon(readBundle('character_topology_pir.json')));
  });

  it('reproduces the committed RigBindingPlan exactly', () => {
    expect(canon(result.bindingPlan)).toBe(canon(readBundle('rig_binding_plan.json')));
  });

  it('reproduces the committed command plan content (volatile fields excluded)', () => {
    const committed = stripVolatilePlanFields(readBundle('harmony_command_plan_v4.json'));
    expect(canon(stripVolatilePlanFields(result.commandPlan))).toBe(canon(committed));
  });

  it('reproduces the committed rig assembly plan content (volatile fields excluded)', () => {
    const committed = stripRigVolatile(readBundle('rig_assembly_plan.json'));
    expect(canon(stripRigVolatile(result.rigAssemblyPlan! as unknown as Record<string, unknown>))).toBe(canon(committed));
  });

  it('reproduces the committed deformer/master-controller plan content (volatile fields excluded)', () => {
    const { planId, ...committed } = readBundle('deformer_master_controller_plan.json');
    expect(canon(stripRigVolatile(result.deformerPlan! as unknown as Record<string, unknown>))).toBe(canon(committed));
  });

  it('reproduces the committed joint guides exactly (hinge circles)', () => {
    expect(result.jointGuides).toBeTruthy();
    expect(canon(result.jointGuides!)).toBe(canon(readBundle('joint_guides.json')));
    expect(result.jointGuides!.guides.length).toBeGreaterThan(0);
  });
});
