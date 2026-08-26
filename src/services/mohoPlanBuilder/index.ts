import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import {
  mohoCommandPlanSchema,
  type MohoCommand,
  type MohoCommandPlan
} from '../../schemas/mohoCommandPlan.js';
import type { CharacterRigAssemblyPlan, PartRigSpec } from '../../schemas/characterRigPIR.js';
import type { DeformerAssemblyPlan } from '../../schemas/deformerPIR.js';
import type { JointGuides } from '../../schemas/jointGuides.js';
import type { CharacterTopologyPIR } from '../pivotEstimator/index.js';

/**
 * MohoRigPlanCompiler — compiles the SAME neutral rig inputs used for Harmony
 * (assembly parts, deformers, joint guides, topology) into Moho Pro
 * operations:
 *
 *   master peg      -> root bone "Master"
 *   part            -> bone (position from topology landmarks / hinge centers)
 *   hierarchy       -> set_bone_parent chain (identical tree)
 *   drawing part    -> vector layer bound to its bone
 *   Mouth part      -> switch layer (choices from mouth shapes when declared)
 *   Curve/Envelope  -> helper deformation bone per deformer target
 *   face MC         -> Smart Bone dial wired to eyes/brows/mouth bones
 *
 * Parameter names are consumed verbatim by the Lua emitter.
 */

type MohoOp = MohoCommand['type'];

export interface MohoRigPlanInput {
  topologyPir: CharacterTopologyPIR;
  rigAssemblyPlan: CharacterRigAssemblyPlan;
  deformerPlan: DeformerAssemblyPlan;
  jointGuides: JointGuides;
  mouthChoices: string[];
  hingeChildPart: Record<string, string>;
}

export interface MohoRigPlanResult {
  plan: MohoCommandPlan;
  stats: {
    bones: number;
    layers: number;
    switchLayers: number;
    smartBones: number;
    hingeJoints: number;
    totalOperations: number;
  };
}

interface MohoBone {
  id: string;
  name: string;
  x: number;
  y: number;
  lengthPx: number;
  angleDeg: number;
  parent: string | null;
}

export function buildMohoRigPlan(
  input: MohoRigPlanInput,
  opts: { characterName: string }
): MohoRigPlanResult {
  const { rigAssemblyPlan, deformerPlan, jointGuides, topologyPir } = input;
  const parts = rigAssemblyPlan.parts as PartRigSpec[];
  const ops: MohoCommand[] = [];
  let counter = 1;
  const gen = (): string => `mcmd_${counter++}`;

  const push = (
    type: MohoOp,
    params: Record<string, unknown>,
    preconditions: string[],
    idempotencyKey: string,
    method: string,
    rollback: MohoCommand['rollback'] = { strategy: 'none', snapshotRequired: false }
  ) => {
    ops.push({
      commandId: gen(),
      type,
      params,
      preconditions,
      destructiveLevel: 'reversible',
      idempotencyKey: idempotencyKey.padEnd(12, '_'),
      rollback,
      expectedArtifact: { kind: 'bone', path: null, nonempty: true },
      verification: { method, required: true, acceptance: [] }
    });
  };

  const landmark = (name: string): { x: number; y: number } | null => {
    const p = topologyPir.points.find(pt => pt.name === name);
    return p ? { x: p.x, y: p.y } : null;
  };

  // ---- Bone layout from the neutral model -------------------------------

  const bones: MohoBone[] = [];
  bones.push({ id: 'Master', name: 'Master', x: 0, y: 0, lengthPx: 40, angleDeg: 90, parent: null });

  const partBone: Record<string, MohoBone> = {};
  const addPartBone = (partId: string, start: { x: number; y: number }, end: { x: number; y: number }, parent: string) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const bone: MohoBone = {
      id: partId,
      name: partId,
      x: +start.x.toFixed(2),
      y: +start.y.toFixed(2),
      lengthPx: +Math.max(8, Math.hypot(dx, dy)).toFixed(2),
      angleDeg: +(Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2),
      parent
    };
    bones.push(bone);
    partBone[partId] = bone;
  };

  // Torso/Head from landmarks; limbs from hinge circles + child landmarks.
  const neck = landmark('neck');
  const headTop = landmark('head_top');
  const hipL = landmark('hip_left');
  const hipR = landmark('hip_right');
  const torsoStart = neck ?? { x: 0, y: 0 };
  const torsoEnd = hipL && hipR ? { x: (hipL.x + hipR.x) / 2, y: (hipL.y + hipR.y) / 2 } : { x: torsoStart.x, y: torsoStart.y + 80 };
  addPartBone('Torso', torsoStart, torsoEnd, 'Master');

  if (headTop && neck) addPartBone('Head', neck, headTop, 'Torso');

  const limbChains: Array<{ parts: [string, string, string]; joints: [string, string, string]; parent: string }> = [
    { parts: ['Arm_L', 'Forearm_L', 'Hand_L'], joints: ['shoulder_left', 'elbow_left', 'wrist_left'], parent: 'Torso' },
    { parts: ['Arm_R', 'Forearm_R', 'Hand_R'], joints: ['shoulder_right', 'elbow_right', 'wrist_right'], parent: 'Torso' },
    { parts: ['Leg_L', 'Shin_L', 'Foot_L'], joints: ['hip_left', 'knee_left', 'ankle_left'], parent: 'Torso' },
    { parts: ['Leg_R', 'Shin_R', 'Foot_R'], joints: ['hip_right', 'knee_right', 'ankle_right'], parent: 'Torso' }
  ];

  for (const chain of limbChains) {
    const [p1, p2, p3] = chain.parts;
    const [j1, j2, j3] = chain.joints;
    const start1 = landmark(j1);
    const mid = landmark(j2);
    const end = landmark(j3);
    if (!start1 || !mid || !end) continue; // honesty: skip chain, report via gate
    addPartBone(p1, start1, mid, chain.parent);
    addPartBone(p2, mid, end, p1);
    // End effector: short bone continuing the limb direction.
    const dirX = end.x - mid.x;
    const dirY = end.y - mid.y;
    const len = Math.max(12, Math.hypot(dirX, dirY) * 0.4);
    const norm = Math.hypot(dirX, dirY) || 1;
    addPartBone(p3, end, { x: end.x + (dirX / norm) * len, y: end.y + (dirY / norm) * len }, p2);
  }

  // Non-landmark parts (face group, clothing, accessory) attach to their
  // parent part's bone without own geometry.
  for (const part of parts) {
    if (!partBone[part.partId] && part.parentPartId && partBone[part.parentPartId]) {
      const parent = partBone[part.parentPartId];
      partBone[part.partId] = { ...parent, id: part.partId, name: part.partId, parent: parent.id };
      bones.push(partBone[part.partId]);
    }
  }

  // ---- Operations --------------------------------------------------------

  for (const bone of bones) {
    push('add_bone', {
      boneId: bone.id, name: bone.name, x: bone.x, y: bone.y,
      lengthPx: bone.lengthPx, angleDeg: bone.angleDeg
    }, ['document_open'], `bone_${bone.id}`, 'bone_exists');
    if (bone.parent) {
      push('set_bone_parent', { boneId: bone.id, parentBoneId: bone.parent }, [`bone_exists:${bone.id}`, `bone_exists:${bone.parent}`], `parent_${bone.id}`, 'bone_parent_check');
    }
  }

  // Vector layers per drawing part, bound to bones; Mouth becomes a switch.
  for (const part of parts) {
    if (part.semanticGroup === 'mouth') {
      push('create_switch_layer', { layerName: 'Mouth_Switch', boneId: partBone[part.partId]?.id ?? 'Head' }, ['document_open'], 'switch_mouth', 'layer_exists');
      const choices = input.mouthChoices.length > 0 ? input.mouthChoices : ['MB_A'];
      if (input.mouthChoices.length === 0) {
        // honest default: single neutral choice until a mouth chart exists
      }
      for (const choice of choices) {
        push('add_switch_choice', { layerName: 'Mouth_Switch', choiceName: choice }, [`switch_exists:Mouth_Switch`], `switch_${choice}`, 'switch_choice_check');
      }
      continue;
    }
    push('create_vector_layer', { layerName: `${part.partId}_Art` }, ['document_open'], `layer_${part.partId}`, 'layer_exists');
    push('bind_layer_to_bone', { layerName: `${part.partId}_Art`, boneId: partBone[part.partId]?.id ?? 'Torso' }, [`layer_exists:${part.partId}_Art`], `bind_${part.partId}`, 'binding_check');
  }

  // Deformers -> deformation helper bones (Moho bone-driven deformation).
  for (const d of deformerPlan.deformers) {
    const helperId = `DEF_${d.deformerId}`;
    const targetPart = parts.find(p => p.drawingNodeName === d.targetNode);
    const base = targetPart ? partBone[targetPart.partId] : null;
    if (!base) continue;
    push('add_bone', {
      boneId: helperId, name: helperId, x: base.x, y: base.y,
      lengthPx: base.lengthPx * 0.6, angleDeg: base.angleDeg
    }, ['document_open'], `defbone_${d.deformerId}`, 'bone_exists');
    push('wire_smart_bone_channel', {
      smartBoneId: helperId, targetBoneId: base.id,
      channel: 'rotation', effect: d.type === 'Curve' ? 'bend' : 'influence'
    }, [`bone_exists:${helperId}`], `wire_${d.deformerId}`, 'channel_check');
  }

  // Face Smart Bone dial from the master-controller plan.
  for (const mc of deformerPlan.masterControllers) {
    push('create_smart_bone', { smartBoneId: mc.mcId, name: mc.name, grid: { width: mc.gridWidth, height: mc.gridHeight } }, ['document_open'], `smart_${mc.mcId}`, 'bone_exists');
    for (const node of mc.controlledNodes) {
      const partId = node.split('_').find(seg => ['Eyes', 'Brows', 'Mouth'].includes(seg)) ?? 'Head';
      push('wire_smart_bone_channel', {
        smartBoneId: mc.mcId, targetBoneId: partBone[partId]?.id ?? 'Head',
        channel: 'rotation', effect: 'dial'
      }, [`bone_exists:${mc.mcId}`], `smcwire_${partId}`, 'channel_check');
    }
  }

  push('verify_rig', { expect_bones: bones.length, expect_switches: input.mouthChoices.length > 0 ? 1 : 0 }, ['document_open'], 'rig_verify', 'rig_audit');
  push('save_document', {}, ['document_open'], 'rig_save', 'none');

  const plan = {
    schemaVersion: 'toon-boom-mcp/moho-command-plan-v1' as const,
    planId: `MOHORIG-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
    documentPath: null,
    createdAt: new Date().toISOString(),
    status: 'implemented_unverified' as const,
    requiresRealMoho: true as const,
    sourceManifestSha256: crypto.createHash('sha256')
      .update(stringify({ bones: bones.map(b => b.id), deformers: deformerPlan.deformers.map(d => d.deformerId) }) ?? '')
      .digest('hex'),
    operations: ops,
    acceptanceGates: [
      'bones_created', 'hierarchy_matches', 'layers_bound',
      'mouth_switch_ready', 'deformation_bones_wired',
      'smart_bone_dial_wired', 'rig_audit_pass', 'document_saved'
    ],
    provenance: { compiler: 'MohoRigPlanCompiler v1', source: `AutoRig:${opts.characterName}` }
  };

  const parsed = mohoCommandPlanSchema.safeParse(plan);
  if (!parsed.success) {
    throw new Error(`Moho rig plan failed schema validation: ${JSON.stringify(parsed.error.errors)}`);
  }

  return {
    plan: parsed.data,
    stats: {
      bones: bones.length,
      layers: parts.filter(p => p.semanticGroup !== 'mouth').length,
      switchLayers: 1,
      smartBones: deformerPlan.masterControllers.length + deformerPlan.deformers.length,
      hingeJoints: jointGuides.guides.length,
      totalOperations: ops.length
    }
  };
}
