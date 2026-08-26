/**
 * Moho Pro compatibility — same neutral rig inputs, Moho dialect out.
 *
 * Proves: skeleton + layers -> MohoCommandPlan (bones/hierarchy/switch/smart
 * bones) -> deterministic Lua script with idempotent primitives, ready to run
 * inside Moho Pro. No Harmony-specific ops may leak into the Moho plan.
 */

import fs from 'fs';
import path from 'path';
import { RigTemplateRegistry } from '../src/services/rigTemplateRegistry/index.js';
import { AutoRigCompiler } from '../src/services/autoRigCompiler/index.js';
import { buildMohoRigPlan } from '../src/services/mohoPlanBuilder/index.js';
import { emitMohoLua } from '../src/services/mohoLuaEmitter/index.js';
import { mohoCommandPlanSchema } from '../src/schemas/mohoCommandPlan.js';

const ROOT = process.cwd();
const HINGE_CHILD = { elbow_left: 'Forearm_L', elbow_right: 'Forearm_R', knee_left: 'Shin_L', knee_right: 'Shin_R' };

describe('Moho rig pipeline — neutral core, Moho dialect', () => {
  let rig: ReturnType<AutoRigCompiler['compile']>;

  beforeAll(async () => {
    const rawSkeleton = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'fixtures', 'auto_rig', 'skeleton_dwpose_real.json'), 'utf-8')
    );
    const drawingPir = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'fixtures', 'auto_rig', 'drawing_pir_structural.json'), 'utf-8')
    );
    const registry = new RigTemplateRegistry();
    await registry.initialize();
    rig = new AutoRigCompiler().compile(
      rawSkeleton, 'char_moho_v1', registry, undefined, undefined, drawingPir
    );
  });

  function build() {
    return buildMohoRigPlan(
      {
        topologyPir: rig.topologyPir,
        rigAssemblyPlan: rig.rigAssemblyPlan!,
        deformerPlan: rig.deformerPlan!,
        jointGuides: rig.jointGuides!,
        mouthChoices: [],
        hingeChildPart: HINGE_CHILD
      },
      { characterName: rig.rigAssemblyPlan!.characterName }
    );
  }

  it('compiles a schema-valid Moho plan from the neutral rig package', () => {
    const { plan, stats } = build();
    expect(mohoCommandPlanSchema.safeParse(plan).success).toBe(true);
    expect(stats.bones).toBeGreaterThanOrEqual(15);
    expect(stats.smartBones).toBeGreaterThan(0);
    expect(stats.totalOperations).toBeGreaterThan(50);
  });

  it('maps the two-segment hinge hierarchy onto bones', () => {
    const { plan } = build();
    const bones = plan.operations.filter(o => o.type === 'add_bone').map(o => o.params.boneId);
    for (const required of ['Master', 'Torso', 'Arm_L', 'Forearm_L', 'Hand_L', 'Leg_L', 'Shin_L', 'Foot_L']) {
      expect(bones).toContain(required);
    }
    const parents = plan.operations.filter(o => o.type === 'set_bone_parent');
    const elbow = parents.find(o => o.params.boneId === 'Forearm_L')!;
    expect(elbow.params.parentBoneId).toBe('Arm_L');
    const knee = parents.find(o => o.params.boneId === 'Shin_L')!;
    expect(knee.params.parentBoneId).toBe('Leg_L');
  });

  it('places limb bones on real landmark geometry (hinge centers)', () => {
    const { plan } = build();
    const elbowBone = plan.operations.find(o => o.type === 'add_bone' && o.params.boneId === 'Forearm_L')!;
    const elbowPoint = rig.topologyPir.points.find(p => p.name === 'elbow_left')!;
    expect(Number(elbowBone.params.x)).toBeCloseTo(elbowPoint.x, 1);
    expect(Number(elbowBone.params.y)).toBeCloseTo(elbowPoint.y, 1);
  });

  it('makes the mouth a switch layer with an honest default choice', () => {
    const { plan } = build();
    expect(plan.operations.some(o => o.type === 'create_switch_layer' && o.params.layerName === 'Mouth_Switch')).toBe(true);
    expect(plan.operations.some(o => o.type === 'add_switch_choice' && o.params.choiceName === 'MB_A')).toBe(true);
  });

  it('emits deterministic, Harmony-free Lua with idempotent primitives', () => {
    const { plan } = build();
    const luaA = emitMohoLua(plan, 'char_moho_v1');
    const luaB = emitMohoLua(plan, 'char_moho_v1');
    expect(luaA).toBe(luaB);
    expect(luaA).toContain('Run Lua Script');
    expect(luaA).toContain('local function addBone(');
    expect(luaA).not.toContain('set_peg_pivot');
    expect(luaA).not.toContain('CURVE_DEFORMER');
    expect(luaA).toContain(`[SUMMARY]`);
  });
});
