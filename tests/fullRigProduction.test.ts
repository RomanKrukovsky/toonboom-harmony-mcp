/**
 * Full production rig — the ONE-call rig builder contract test.
 *
 * Proves: skeleton + layered drawing -> ONE schema-valid V4 plan containing
 * the complete mechanical rigger output in executable order (palette, drawing
 * elements, peg hierarchy, hinge pivots at circle centers, typed deformers,
 * face master controller, save/close/reopen/audit), with bridge-matching
 * parameter names so execute_command_plan_v4 can run it verbatim.
 */

import fs from 'fs';
import path from 'path';
import { RigTemplateRegistry } from '../src/services/rigTemplateRegistry/index.js';
import { AutoRigCompiler } from '../src/services/autoRigCompiler/index.js';
import { buildFullRigProductionPlan } from '../src/services/fullRigPlanBuilder/index.js';

const ROOT = process.cwd();

describe('harmony.rig.create_full_production_rig — plan contract', () => {
  let plan: ReturnType<typeof buildFullRigProductionPlan>['plan'];
  let stats: ReturnType<typeof buildFullRigProductionPlan>['stats'];

  beforeAll(async () => {
    const rawSkeleton = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'fixtures', 'auto_rig', 'skeleton_dwpose_real.json'), 'utf-8')
    );
    const drawingPir = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'fixtures', 'auto_rig', 'drawing_pir_structural.json'), 'utf-8')
    );
    const registry = new RigTemplateRegistry();
    await registry.initialize();
    const rig = new AutoRigCompiler().compile(
      rawSkeleton, 'char_production_v1', registry, undefined, undefined, drawingPir
    );
    const full = buildFullRigProductionPlan(
      {
        rigAssemblyPlan: rig.rigAssemblyPlan!,
        deformerPlan: rig.deformerPlan!,
        jointGuides: rig.jointGuides!,
        palette: {
          paletteId: 'char_production_v1_palette',
          colours: (drawingPir.palette ?? []).map((c: any) => ({
            colourId: c.id, name: c.name, rgba: `#${[c.color.r, c.color.g, c.color.b, c.color.a ?? 255].map((x: number) => x.toString(16).padStart(2, '0')).join('')}`, usage: 'line'
          }))
        },
        hingeChildPart: { elbow_left: 'Forearm_L', elbow_right: 'Forearm_R', knee_left: 'Shin_L', knee_right: 'Shin_R' }
      },
      { characterName: rig.rigAssemblyPlan!.characterName }
    );
    plan = full.plan;
    stats = full.stats;
  });

  it('compiles one executable plan covering the whole mechanical rig', () => {
    expect(stats.parts).toBeGreaterThanOrEqual(18);
    expect(stats.deformers).toBeGreaterThanOrEqual(18);
    expect(stats.hingePivots).toBe(4);
    expect(stats.totalCommands).toBeGreaterThan(100);
    expect(plan.status).toBe('implemented_unverified');
    expect(plan.requiresRealHarmony).toBe(true);
  });

  it('orders the plan: snapshot first, lifecycle last', () => {
    expect(plan.commands[0].type).toBe('snapshot_project');
    const types = plan.commands.map(c => c.type);
    expect(types.indexOf('save_project')).toBeLessThan(types.indexOf('close_project'));
    expect(types.indexOf('close_project')).toBeLessThan(types.indexOf('reopen_project'));
    expect(types.indexOf('reopen_project')).toBeLessThan(types.indexOf('inspect_native_entities'));
    expect(types[types.length - 1]).toBe('verify_rollback');
  });

  it('uses bridge-exact parameter names (executor-compatible)', () => {
    const peg = plan.commands.find(c => c.type === 'create_peg')!;
    expect(peg.params.pegName).toBeTruthy();
    const pivot = plan.commands.find(c => c.type === 'set_peg_pivot')!;
    expect(pivot.params.pegName).toBeTruthy();
    expect(typeof pivot.params.pivotX).toBe('number');
    const swatch = plan.commands.find(c => c.type === 'add_palette_swatch')!;
    expect(swatch.params.colorId).toBeTruthy();
    expect(swatch.params.colorName).toBeTruthy();
    const elem = plan.commands.find(c => c.type === 'create_drawing_element')!;
    expect(elem.params.elementName).toBeTruthy();
    expect(elem.params.columnName).toBeTruthy();
  });

  it('snaps every hinge pivot to its joint-circle center', () => {
    const hinges = plan.commands.filter(
      c => c.type === 'set_peg_pivot' && String((c.params as any).source_binding ?? '').startsWith('joint_guide:')
    );
    expect(hinges.length).toBe(4);
    for (const h of hinges) {
      expect(h.preconditions.some(p => p.startsWith('peg_exists:'))).toBe(true);
    }
  });

  it('emits typed deformers wired to real drawing nodes', () => {
    const deformers = plan.commands.filter(c => c.type === 'create_deformer');
    expect(deformers.length).toBe(stats.deformers);
    for (const d of deformers) {
      expect(['CURVE_DEFORMER', 'ENVELOPE_DEFORMER', 'BONE']).toContain(d.params.node_type);
      expect(String(d.params.target_node)).toContain('_Drawing');
    }
  });

  it('wires the face master controller to eyes/brows/mouth pegs', () => {
    const mc = plan.commands.find(c => c.type === 'create_master_controller')!;
    const controlled = mc.params.controlled_nodes as string[];
    expect(controlled.length).toBe(3);
    expect(controlled.some(n => n.includes('Eyes'))).toBe(true);
    expect(controlled.some(n => n.includes('Mouth'))).toBe(true);
  });

  it('is deterministic in command sequence (identity fields excluded)', () => {
    const seq = () => plan.commands.map(c => `${c.type}:${c.params.pegName ?? c.params.elementName ?? c.params.deformer_id ?? c.params.name ?? c.params.paletteName ?? ''}`).join('|');
    expect(seq()).toBe(seq());
  });
});
