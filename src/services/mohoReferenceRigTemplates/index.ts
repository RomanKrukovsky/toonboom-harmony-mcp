import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import {
  type MohoCommand,
  type MohoCommandPlan,
  MOHO_COMMAND_PLAN_SCHEMA,
  mohoCommandPlanSchema
} from '../../schemas/mohoCommandPlan.js';
import { type MohoCharacterBible } from '../../schemas/mohoCharacterBible.js';

export interface RigTemplateBone {
  id: number;
  name: string;
  parentId: number | null;
  x: number;
  y: number;
  angleDeg: number;
  lengthPx: number;
  constraints?: { minAngleDeg: number; maxAngleDeg: number };
}

export interface RigTemplateSwitchLayer {
  name: string;
  choices: string[];
}

export interface RigTemplateSmartBone {
  name: string;
  targetBone: string;
  minAngleDeg: number;
  maxAngleDeg: number;
}

export interface RigTemplateMeshLayer {
  name: string;
  targetLayerName: string;
  pointCount: number;
}

export interface RigTemplateVitruvianGroup {
  groupName: string;
  defaultActiveBone: string;
  bones: string[];
}

export interface RigTemplateProjectedShadow {
  layerName: string;
  rootBone: string;
  scaleY: number;
}

export interface RigTemplate {
  rigType: 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical';
  templateId: string;
  description: string;
  bones: RigTemplateBone[];
  switchLayers: RigTemplateSwitchLayer[];
  smartBones: RigTemplateSmartBone[];
  mouthShapes: string[];
  meshLayers: RigTemplateMeshLayer[];
  vitruvianGroups: RigTemplateVitruvianGroup[];
  projectedShadow: RigTemplateProjectedShadow;
  fingerprint: string;
}

const PRESTON_BLAIR_MOUTH: string[] = [
  'Rest', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'L', 'O', 'Smile', 'Frown'
];

function templateFingerprint(t: Omit<RigTemplate, 'fingerprint'>): string {
  return crypto
    .createHash('sha256')
    .update(stringify({
      rigType: t.rigType,
      templateId: t.templateId,
      description: t.description,
      bones: t.bones,
      switchLayers: t.switchLayers,
      smartBones: t.smartBones,
      mouthShapes: t.mouthShapes,
      meshLayers: t.meshLayers,
      vitruvianGroups: t.vitruvianGroups,
      projectedShadow: t.projectedShadow
    }) || '')
    .digest('hex');
}

function canonicalBone(
  id: number,
  name: string,
  parentId: number | null,
  x: number,
  y: number,
  angleDeg: number,
  lengthPx: number,
  constraints?: { minAngleDeg: number; maxAngleDeg: number }
): RigTemplateBone {
  return { id, name, parentId, x, y, angleDeg, lengthPx, constraints };
}

function humanAnatomyBones(): RigTemplateBone[] {
  return [
    canonicalBone(0,  'Root',        null,    0,    0,   90, 40),
    canonicalBone(1,  'Pelvis',      0,       0,    60,  90, 30),
    canonicalBone(2,  'Spine',       1,       0,    85,  90, 40),
    canonicalBone(3,  'Chest',       2,       0,    120, 90, 35),
    canonicalBone(4,  'Neck',        3,       0,    150, 90, 18),
    canonicalBone(5,  'Head',        4,       0,    170, 90, 45),
    canonicalBone(6,  'Shoulder_L',  3,       -18,  155, 180, 22, { minAngleDeg: -90, maxAngleDeg: 180 }),
    canonicalBone(7,  'Elbow_L',     6,       -42,  155, 270, 45, { minAngleDeg: 0,   maxAngleDeg: 150 }),
    canonicalBone(8,  'Wrist_L',     7,       -42,  115, 270, 35),
    canonicalBone(9,  'Shoulder_R',  3,       18,   155, 0,   22, { minAngleDeg: -180, maxAngleDeg: 90 }),
    canonicalBone(10, 'Elbow_R',     9,       42,   155, 270, 45, { minAngleDeg: 0,   maxAngleDeg: 150 }),
    canonicalBone(11, 'Wrist_R',     10,      42,   115, 270, 35),
    canonicalBone(12, 'Hip_L',       1,       -18,  58,  270, 20),
    canonicalBone(13, 'Knee_L',      12,      -18,  10,  270, 50, { minAngleDeg: 0,   maxAngleDeg: 160 }),
    canonicalBone(14, 'Ankle_L',     13,      -18,  -40, 0,   28),
    canonicalBone(15, 'Hip_R',       1,       18,   58,  270, 20),
    canonicalBone(16, 'Knee_R',      15,      18,   10,  270, 50, { minAngleDeg: 0,   maxAngleDeg: 160 }),
    canonicalBone(17, 'Ankle_R',     16,      18,   -40, 0,   28),
    canonicalBone(18, 'Jaw',         5,       0,    195, 90, 18, { minAngleDeg: -10, maxAngleDeg: 35 })
  ];
}

function quadrupedAnatomyBones(): RigTemplateBone[] {
  return [
    canonicalBone(0,  'Root',        null,    0,    40,  90, 40),
    canonicalBone(1,  'Spine_Base',  0,       0,    40,  0,  50),
    canonicalBone(2,  'Spine_Mid',   1,       50,   40,  0,  50),
    canonicalBone(3,  'Neck',        2,       100,  40,  60, 35),
    canonicalBone(4,  'Head',        3,       125,  70,  20, 40),
    canonicalBone(5,  'Jaw',         4,       162,  80,  -30, 22, { minAngleDeg: -10, maxAngleDeg: 30 }),
    canonicalBone(6,  'Tail_Base',   0,       0,    40,  180, 25),
    canonicalBone(7,  'Tail_Mid',    6,       -25,  40,  180, 25),
    canonicalBone(8,  'Tail_Tip',    7,       -50,  40,  180, 25),
    canonicalBone(9,  'Ear_L',       4,       130,  95,  120, 20, { minAngleDeg: -45, maxAngleDeg: 90 }),
    canonicalBone(10, 'Ear_R',       4,       130,  95,  60,  20, { minAngleDeg: -90, maxAngleDeg: 45 }),
    canonicalBone(11, 'FL_Shoulder', 2,       85,   30,  -100, 30, { minAngleDeg: -150, maxAngleDeg: 30 }),
    canonicalBone(12, 'FL_Elbow',    11,      70,   0,   270, 40, { minAngleDeg: 0, maxAngleDeg: 150 }),
    canonicalBone(13, 'FL_Paw',      12,      70,   -40, 0,  22),
    canonicalBone(14, 'FR_Shoulder', 2,       115,  30,  -80, 30, { minAngleDeg: -30, maxAngleDeg: 150 }),
    canonicalBone(15, 'FR_Elbow',    14,      140,  0,   270, 40, { minAngleDeg: 0, maxAngleDeg: 150 }),
    canonicalBone(16, 'FR_Paw',      15,      140,  -40, 0,  22),
    canonicalBone(17, 'BL_Hip',      1,       15,   30,  260, 32, { minAngleDeg: -150, maxAngleDeg: 30 }),
    canonicalBone(18, 'BL_Knee',     17,      35,   0,   270, 45, { minAngleDeg: 0, maxAngleDeg: 160 }),
    canonicalBone(19, 'BL_Paw',      18,      35,   -45, 0,  24),
    canonicalBone(20, 'BR_Hip',      1,       35,   30,  280, 32, { minAngleDeg: -30, maxAngleDeg: 150 }),
    canonicalBone(21, 'BR_Knee',     20,      65,   0,   270, 45, { minAngleDeg: 0, maxAngleDeg: 160 }),
    canonicalBone(22, 'BR_Paw',      21,      65,   -45, 0,  24)
  ];
}

function creatureAnatomyBones(): RigTemplateBone[] {
  const bones: RigTemplateBone[] = [
    canonicalBone(0,  'Root',         null,    0,    0,   90, 40),
    canonicalBone(1,  'Body_Core',    0,       0,    60,  90, 45),
    canonicalBone(2,  'Spine_Top',    1,       0,    100, 90, 35),
    canonicalBone(3,  'Spine_Mid',    1,       -30,  70,  180, 30),
    canonicalBone(4,  'Spine_Bottom', 1,       30,   70,  0,   30),
    canonicalBone(5,  'Head',         2,       0,    135, 90, 38),
    canonicalBone(6,  'Eye_L',        5,       -12,  140, 90, 8),
    canonicalBone(7,  'Eye_R',        5,       12,   140, 90, 8),
    canonicalBone(8,  'Mouth',        5,       0,    160, 90, 12, { minAngleDeg: -10, maxAngleDeg: 25 })
  ];
  for (let t = 1; t <= 4; t++) {
    const baseId = 9 + (t - 1) * 3;
    const rootX = t <= 2 ? -45 + (t - 1) * 30 : 15 + (t - 3) * 30;
    const rootY = 60;
    const segLen = 28;
    bones.push(canonicalBone(baseId,     `Tentacle_${t}_Base`, 1, rootX,            rootY,          180, segLen));
    bones.push(canonicalBone(baseId + 1, `Tentacle_${t}_Mid`,  baseId, rootX - segLen, rootY,          180, segLen, { minAngleDeg: -45, maxAngleDeg: 45 }));
    bones.push(canonicalBone(baseId + 2, `Tentacle_${t}_Tip`,  baseId + 1, rootX - segLen * 2, rootY,    180, segLen * 0.85, { minAngleDeg: -60, maxAngleDeg: 60 }));
  }
  return bones;
}

function mechanicalAnatomyBones(): RigTemplateBone[] {
  return [
    canonicalBone(0,  'Body',         null,    0,    80,  90, 60),
    canonicalBone(1,  'Head',         0,       0,    140, 90, 40),
    canonicalBone(2,  'Antenna_Base', 1,       0,    175, 90, 14),
    canonicalBone(3,  'Antenna_Tip',  2,       0,    188, 90, 14, { minAngleDeg: -30, maxAngleDeg: 30 }),
    canonicalBone(4,  'Shoulder_L',   0,       -32,  135, 180, 22, { minAngleDeg: -180, maxAngleDeg: 0 }),
    canonicalBone(5,  'UpperArm_L',   4,       -55,  135, 250, 38, { minAngleDeg: -150, maxAngleDeg: 30 }),
    canonicalBone(6,  'Forearm_L',    5,       -55,  100, 270, 36, { minAngleDeg: 0, maxAngleDeg: 150 }),
    canonicalBone(7,  'Hand_L',       6,       -55,  65,  270, 22),
    canonicalBone(8,  'Shoulder_R',   0,       32,   135, 0,   22, { minAngleDeg: 0, maxAngleDeg: 180 }),
    canonicalBone(9,  'UpperArm_R',   8,       55,   135, 290, 38, { minAngleDeg: -30, maxAngleDeg: 150 }),
    canonicalBone(10, 'Forearm_R',    9,       55,   100, 270, 36, { minAngleDeg: 0, maxAngleDeg: 150 }),
    canonicalBone(11, 'Hand_R',       10,      55,   65,  270, 22),
    canonicalBone(12, 'Hip_L',        0,       -18,  75,  270, 20),
    canonicalBone(13, 'Leg_L',        12,      -18,  35,  270, 45, { minAngleDeg: -160, maxAngleDeg: 20 }),
    canonicalBone(14, 'Foot_L',       13,      -18,  -10, 0,   28),
    canonicalBone(15, 'Hip_R',        0,       18,   75,  270, 20),
    canonicalBone(16, 'Leg_R',        15,      18,   35,  270, 45, { minAngleDeg: -160, maxAngleDeg: 20 }),
    canonicalBone(17, 'Foot_R',       16,      18,   -10, 0,   28),
    canonicalBone(18, 'Cable_Front',  0,       0,    40,  180, 35, { minAngleDeg: -25, maxAngleDeg: 25 }),
    canonicalBone(19, 'Cable_Back',   0,       0,    80,  0,   35, { minAngleDeg: -25, maxAngleDeg: 25 })
  ];
}

const HUMANOID_BONES = humanAnatomyBones();
const QUADRUPED_BONES = quadrupedAnatomyBones();
const CREATURE_BONES = creatureAnatomyBones();
const MECHANICAL_BONES = mechanicalAnatomyBones();

const HUMANOID_DRAFT: Omit<RigTemplate, 'fingerprint'> = {
  rigType: 'humanoid_2leg',
  templateId: 'ref.humanoid.v1',
  description: '19-bone reference humanoid (Root, Pelvis, Spine, Chest, Neck, Head, dual arms, dual legs, Jaw). 12-preston-blair mouth + 3-state eye switch, 4 smart bones, 1 body mesh, 1 face vitruvian group.',
  bones: HUMANOID_BONES,
  switchLayers: [
    { name: 'Mouth', choices: PRESTON_BLAIR_MOUTH },
    { name: 'Eye',   choices: ['Open', 'Half', 'Closed'] }
  ],
  smartBones: [
    { name: 'Head_Turn',  targetBone: 'Neck',    minAngleDeg: -45, maxAngleDeg: 45 },
    { name: 'Body_Lean',  targetBone: 'Pelvis',  minAngleDeg: -25, maxAngleDeg: 25 },
    { name: 'Brow_Raise', targetBone: 'Head',    minAngleDeg: -20, maxAngleDeg: 20 },
    { name: 'Mouth_Dial', targetBone: 'Jaw',     minAngleDeg: -10, maxAngleDeg: 35 }
  ],
  mouthShapes: PRESTON_BLAIR_MOUTH,
  meshLayers: [
    { name: 'Body_Mesh', targetLayerName: 'Body_Artwork', pointCount: 16 }
  ],
  vitruvianGroups: [
    { groupName: 'face', defaultActiveBone: 'Head', bones: ['Head', 'Jaw'] }
  ],
  projectedShadow: { layerName: 'Shadow', rootBone: 'Root', scaleY: -0.25 }
};

const QUADRUPED_DRAFT: Omit<RigTemplate, 'fingerprint'> = {
  rigType: 'quadruped',
  templateId: 'ref.quadruped.v1',
  description: '23-bone reference quadruped (Root, dual spine, neck/head/jaw, 3-tail, dual ears, four 3-bone legs). Mouth/eye/tail-pose switches, 4 smart bones.',
  bones: QUADRUPED_BONES,
  switchLayers: [
    { name: 'Mouth',     choices: PRESTON_BLAIR_MOUTH },
    { name: 'Eye',       choices: ['Open', 'Half', 'Closed'] },
    { name: 'Tail_Pose', choices: ['wag_left', 'wag_right', 'straight', 'curl'] }
  ],
  smartBones: [
    { name: 'Head_Turn', targetBone: 'Neck',       minAngleDeg: -45, maxAngleDeg: 45 },
    { name: 'Tail_Wag',  targetBone: 'Tail_Base',  minAngleDeg: -90, maxAngleDeg: 90 },
    { name: 'Body_Bob',  targetBone: 'Spine_Base', minAngleDeg: -20, maxAngleDeg: 20 },
    { name: 'Ear_Flick', targetBone: 'Ear_L',      minAngleDeg: -45, maxAngleDeg: 90 }
  ],
  mouthShapes: PRESTON_BLAIR_MOUTH,
  meshLayers: [
    { name: 'Body_Mesh', targetLayerName: 'Body_Artwork', pointCount: 24 }
  ],
  vitruvianGroups: [
    { groupName: 'head', defaultActiveBone: 'Head', bones: ['Head', 'Jaw', 'Ear_L', 'Ear_R'] }
  ],
  projectedShadow: { layerName: 'Shadow', rootBone: 'Root', scaleY: -0.2 }
};

const CREATURE_DRAFT: Omit<RigTemplate, 'fingerprint'> = {
  rigType: 'creature',
  templateId: 'ref.creature.v1',
  description: '21-bone reference creature (Root, Body_Core, 3-way spine, Head/eyes/mouth, 4 three-segment tentacles). Mouth/eye + 2 tentacle-pose switches, 3 smart bones.',
  bones: CREATURE_BONES,
  switchLayers: [
    { name: 'Mouth',          choices: PRESTON_BLAIR_MOUTH },
    { name: 'Eye',            choices: ['Open', 'Half', 'Closed'] },
    { name: 'Tentacle_1_Pose', choices: ['curl', 'straight', 'raised'] },
    { name: 'Tentacle_2_Pose', choices: ['curl', 'straight', 'raised'] }
  ],
  smartBones: [
    { name: 'Head_Turn',      targetBone: 'Head',            minAngleDeg: -45, maxAngleDeg: 45 },
    { name: 'Body_Squash',    targetBone: 'Body_Core',       minAngleDeg: -15, maxAngleDeg: 15 },
    { name: 'Tentacle_Wave',  targetBone: 'Tentacle_1_Base', minAngleDeg: -60, maxAngleDeg: 60 }
  ],
  mouthShapes: PRESTON_BLAIR_MOUTH,
  meshLayers: [
    { name: 'Body_Mesh', targetLayerName: 'Body_Artwork', pointCount: 20 }
  ],
  vitruvianGroups: [
    { groupName: 'tentacles', defaultActiveBone: 'Tentacle_1_Base', bones: ['Tentacle_1_Base', 'Tentacle_2_Base', 'Tentacle_3_Base', 'Tentacle_4_Base'] }
  ],
  projectedShadow: { layerName: 'Shadow', rootBone: 'Root', scaleY: -0.18 }
};

const MECHANICAL_DRAFT: Omit<RigTemplate, 'fingerprint'> = {
  rigType: 'mechanical',
  templateId: 'ref.mechanical.v1',
  description: '20-bone reference robot (Body, Head, Antenna_Base/Tip, dual 4-bone arms, dual 3-bone legs, front/back cables). Eye/mode switches, 4 smart bones.',
  bones: MECHANICAL_BONES,
  switchLayers: [
    { name: 'Eye',  choices: ['Open', 'Closed', 'Scanning'] },
    { name: 'Mode', choices: ['Idle', 'Active', 'Error'] }
  ],
  smartBones: [
    { name: 'Antenna_Wave', targetBone: 'Antenna_Base', minAngleDeg: -30, maxAngleDeg: 30 },
    { name: 'Cable_Sway',   targetBone: 'Cable_Front',  minAngleDeg: -25, maxAngleDeg: 25 },
    { name: 'Body_Lean',    targetBone: 'Body',         minAngleDeg: -15, maxAngleDeg: 15 },
    { name: 'Eye_Scan',     targetBone: 'Head',         minAngleDeg: -60, maxAngleDeg: 60 }
  ],
  mouthShapes: [],
  meshLayers: [
    { name: 'Body_Mesh', targetLayerName: 'Body_Artwork', pointCount: 18 }
  ],
  vitruvianGroups: [
    { groupName: 'antenna', defaultActiveBone: 'Antenna_Base', bones: ['Antenna_Base', 'Antenna_Tip'] }
  ],
  projectedShadow: { layerName: 'Shadow', rootBone: 'Root', scaleY: -0.22 }
};

export const HUMANOID_TEMPLATE: RigTemplate = {
  ...HUMANOID_DRAFT,
  fingerprint: templateFingerprint(HUMANOID_DRAFT)
};

export const QUADRUPED_TEMPLATE: RigTemplate = {
  ...QUADRUPED_DRAFT,
  fingerprint: templateFingerprint(QUADRUPED_DRAFT)
};

export const CREATURE_TEMPLATE: RigTemplate = {
  ...CREATURE_DRAFT,
  fingerprint: templateFingerprint(CREATURE_DRAFT)
};

export const MECHANICAL_TEMPLATE: RigTemplate = {
  ...MECHANICAL_DRAFT,
  fingerprint: templateFingerprint(MECHANICAL_DRAFT)
};

const TEMPLATE_REGISTRY: Record<RigTemplate['rigType'], RigTemplate> = {
  humanoid_2leg: HUMANOID_TEMPLATE,
  quadruped:     QUADRUPED_TEMPLATE,
  creature:      CREATURE_TEMPLATE,
  mechanical:    MECHANICAL_TEMPLATE
};

export function getReferenceRigTemplate(rigType: string): RigTemplate {
  const t = TEMPLATE_REGISTRY[rigType as RigTemplate['rigType']];
  if (!t) {
    throw new Error(`No reference rig template for rigType="${rigType}". Supported: ${Object.keys(TEMPLATE_REGISTRY).join(', ')}`);
  }
  return t;
}

function parentNameLookup(t: RigTemplate): Map<number, string | null> {
  const byId = new Map<number, RigTemplateBone>();
  for (const b of t.bones) byId.set(b.id, b);
  const m = new Map<number, string | null>();
  for (const b of t.bones) {
    m.set(b.id, b.parentId == null ? null : (byId.get(b.parentId)?.name ?? null));
  }
  return m;
}

function roundPoseValue(value: number): number {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function parentLocalPose(
  bone: RigTemplateBone,
  bonesById: Map<number, RigTemplateBone>
): Pick<RigTemplateBone, 'x' | 'y' | 'angleDeg' | 'lengthPx'> {
  if (bone.parentId === null) {
    return { x: bone.x, y: bone.y, angleDeg: bone.angleDeg, lengthPx: bone.lengthPx };
  }

  const parent = bonesById.get(bone.parentId);
  if (!parent) {
    throw new Error(`Bone "${bone.name}" references unknown parent id ${bone.parentId}.`);
  }

  const parentAngleRad = parent.angleDeg * Math.PI / 180;
  const dx = bone.x - parent.x;
  const dy = bone.y - parent.y;
  let localAngle = bone.angleDeg - parent.angleDeg;
  while (localAngle > 180) localAngle -= 360;
  while (localAngle < -180) localAngle += 360;

  return {
    x: roundPoseValue(dx * Math.cos(parentAngleRad) + dy * Math.sin(parentAngleRad)),
    y: roundPoseValue(-dx * Math.sin(parentAngleRad) + dy * Math.cos(parentAngleRad)),
    angleDeg: roundPoseValue(localAngle),
    lengthPx: bone.lengthPx
  };
}

export function buildRigFromTemplate(
  template: RigTemplate,
  characterBible: MohoCharacterBible
): MohoCommandPlan {
  if (template.rigType !== characterBible.rigType) {
    throw new Error(
      `Template rigType="${template.rigType}" does not match character bible rigType="${characterBible.rigType}".`
    );
  }

  const operations: MohoCommand[] = [];
  let counter = 1;
  const gen = (): string => `mcmd_${(counter++).toString().padStart(4, '0')}`;

  const parentNames = parentNameLookup(template);
  const bonesById = new Map<number, RigTemplateBone>();
  for (const bone of template.bones) bonesById.set(bone.id, bone);

  const push = (
    type: MohoCommand['type'],
    params: Record<string, unknown>,
    preconditions: string[],
    idempotencyKey: string,
    expectedArtifact: { kind: string; path: string | null; nonempty: boolean },
    verification: { method: string; required: boolean; acceptance: string[] },
    destructiveLevel: MohoCommand['destructiveLevel'] = 'reversible',
    rollback: MohoCommand['rollback'] = { strategy: 'none', snapshotRequired: false }
  ): void => {
    operations.push({
      commandId: gen(),
      type,
      params,
      preconditions,
      destructiveLevel,
      idempotencyKey: idempotencyKey.padEnd(12, '_').slice(0, 64),
      rollback,
      expectedArtifact,
      verification
    });
  };

  for (const bone of template.bones) {
    const pose = parentLocalPose(bone, bonesById);
    push(
      'add_bone',
      {
        boneId: bone.id,
        name: bone.name,
        x: pose.x,
        y: pose.y,
        lengthPx: pose.lengthPx,
        angleDeg: pose.angleDeg
      },
      ['skeleton_layer_exists', 'rig_open'],
      `add_bone_${bone.id}_${bone.name}`,
      { kind: 'bone', path: bone.name, nonempty: true },
      { method: 'bone_exists', required: true, acceptance: ['count >= 1'] },
      'reversible',
      { strategy: 'delete_created', snapshotRequired: false }
    );

    const parentName = parentNames.get(bone.id) ?? null;
    if (parentName) {
      push(
        'set_bone_parent',
        { boneId: bone.name, parentBoneId: parentName },
        ['skeleton_layer_exists', `bone_exists:${bone.name}`, `bone_exists:${parentName}`, 'rig_open'],
        `set_parent_${bone.id}_${parentName}`,
        { kind: 'bone', path: bone.name, nonempty: true },
        { method: 'bone_parent_check', required: true, acceptance: ['parent set'] }
      );
    }

    if (bone.constraints) {
      push(
        'set_bone_constraints',
        {
          boneName: bone.name,
          minAngle: bone.constraints.minAngleDeg,
          maxAngle: bone.constraints.maxAngleDeg,
          controlBone: '',
          scaleControl: 1.0
        },
        ['skeleton_layer_exists', `bone_exists:${bone.name}`, 'rig_open'],
        `constraints_${bone.id}_${bone.name}`,
        { kind: 'bone', path: bone.name, nonempty: true },
        { method: 'bone_constraints_set', required: true, acceptance: ['min/max set'] }
      );
    }
  }

  for (const sw of template.switchLayers) {
    push(
      'create_switch_layer',
      { layerName: sw.name },
      ['rig_open'],
      `switch_layer_${sw.name}`,
      { kind: 'switch_layer', path: sw.name, nonempty: true },
      { method: 'switch_layer_exists', required: true, acceptance: ['count >= 1'] },
      'reversible',
      { strategy: 'delete_created', snapshotRequired: false }
    );
    for (const choice of sw.choices) {
      push(
        'add_switch_choice',
        { layerName: sw.name, choiceName: choice },
        ['rig_open', `switch_layer_exists:${sw.name}`],
        `switch_choice_${sw.name}_${choice}`,
        { kind: 'switch_choice', path: `${sw.name}/${choice}`, nonempty: true },
        { method: 'count_equals', required: true, acceptance: ['count >= 1'] }
      );
    }
  }

  for (const sb of template.smartBones) {
    push(
      'create_smart_bone',
      {
        smartBoneId: sb.name,
        name: sb.name,
        minAngle: sb.minAngleDeg,
        maxAngle: sb.maxAngleDeg
      },
      ['skeleton_layer_exists', 'rig_open'],
      `smart_bone_${sb.name}`,
      { kind: 'smart_bone', path: sb.name, nonempty: true },
      { method: 'bone_exists', required: true, acceptance: ['count >= 1'] },
      'reversible',
      { strategy: 'delete_created', snapshotRequired: false }
    );
    push(
      'wire_smart_bone_channel',
      {
        smartBoneId: sb.name,
        targetBoneId: sb.targetBone,
        driverMinAngle: sb.minAngleDeg,
        driverMaxAngle: sb.maxAngleDeg,
        targetMinAngle: sb.minAngleDeg,
        targetMaxAngle: sb.maxAngleDeg
      },
      ['skeleton_layer_exists', `bone_exists:${sb.name}`, `bone_exists:${sb.targetBone}`, 'rig_open'],
      `wire_${sb.name}_to_${sb.targetBone}`,
      { kind: 'channel', path: `${sb.name}->${sb.targetBone}`, nonempty: true },
      { method: 'channel_check', required: true, acceptance: ['wired'] }
    );
  }

  for (const mesh of template.meshLayers) {
    push(
      'create_vector_layer',
      { layerName: mesh.targetLayerName },
      ['rig_open'],
      `artwork_layer_${mesh.targetLayerName}`,
      { kind: 'artwork_layer', path: mesh.targetLayerName, nonempty: true },
      { method: 'layer_exists', required: true, acceptance: ['count >= 1'] }
    );
    push(
      'create_mesh_layer',
      { meshLayerName: mesh.name, pointCount: mesh.pointCount },
      ['rig_open'],
      `mesh_layer_${mesh.name}`,
      { kind: 'mesh_layer', path: mesh.name, nonempty: true },
      { method: 'layer_exists', required: true, acceptance: ['count >= 1'] }
    );
    push(
      'bind_smart_warp_mesh',
      { targetLayerName: mesh.targetLayerName, meshLayerName: mesh.name },
      ['rig_open', `layer_exists:${mesh.targetLayerName}`, `mesh_layer_exists:${mesh.name}`],
      `bind_smart_warp_${mesh.name}`,
      { kind: 'smart_warp', path: mesh.name, nonempty: true },
      { method: 'count_equals', required: true, acceptance: ['count >= 1'] }
    );
  }

  for (const group of template.vitruvianGroups) {
    push(
      'create_vitruvian_group',
      { groupName: group.groupName, defaultActiveBone: group.defaultActiveBone },
      ['skeleton_layer_exists', 'rig_open'],
      `vitruvian_group_${group.groupName}`,
      { kind: 'vitruvian_group', path: group.groupName, nonempty: true },
      { method: 'group_exists', required: true, acceptance: ['count >= 1'] }
    );
    for (const boneName of group.bones) {
      push(
        'add_vitruvian_bone',
        { groupName: group.groupName, boneName },
        ['skeleton_layer_exists', `group_exists:${group.groupName}`, `bone_exists:${boneName}`, 'rig_open'],
        `vitruvian_bone_${group.groupName}_${boneName}`,
        { kind: 'vitruvian_bone', path: `${group.groupName}/${boneName}`, nonempty: true },
        { method: 'count_equals', required: true, acceptance: ['count >= 1'] }
      );
    }
  }

  const shadow = template.projectedShadow;
  push(
    'create_projected_shadow',
    { layerName: shadow.layerName, rootBone: shadow.rootBone, scaleY: shadow.scaleY },
    ['rig_open', `bone_exists:${shadow.rootBone}`],
    `projected_shadow_${shadow.layerName}`,
    { kind: 'projected_shadow', path: shadow.layerName, nonempty: true },
    { method: 'count_equals', required: true, acceptance: ['count >= 1'] }
  );

  push(
    'verify_rig',
    {
      expect_bones: template.bones.length,
      expect_switches: template.switchLayers.length,
      expect_meshes: template.meshLayers.length,
      expect_warps: template.meshLayers.length,
      expect_actions: template.smartBones.length
    },
    ['skeleton_layer_exists', 'rig_open'],
    `verify_rig_${template.templateId}`,
    { kind: 'rig', path: null, nonempty: true },
    { method: 'rig_audit', required: true, acceptance: ['bone_count', 'switch_count', 'mesh_count', 'warp_count', 'action_count'] },
    'none'
  );

  push(
    'save_document',
    { documentPath: characterBible.rigPath },
    ['rig_open', 'document_dirty'],
    `save_document_${characterBible.characterId}`,
    { kind: 'document', path: characterBible.rigPath, nonempty: true },
    { method: 'count_equals', required: true, acceptance: ['count >= 1'] }
  );

  const sourceHash = crypto
    .createHash('sha256')
    .update(stringify({ template, characterBible }) || '')
    .digest('hex');

  const plan: MohoCommandPlan = {
    schemaVersion: MOHO_COMMAND_PLAN_SCHEMA,
    planId: `REFRIG-${sourceHash.slice(0, 12).toUpperCase()}`,
    documentPath: characterBible.rigPath,
    createdAt: '1970-01-01T00:00:00.000Z',
    status: 'implemented_unverified',
    requiresRealMoho: true,
    sourceManifestSha256: sourceHash,
    operations,
    acceptanceGates: [
      'skeleton_layer_exists',
      'all_bones_created',
      'hierarchy_matches_template',
      'all_constraints_set',
      'all_switch_layers_created',
      'all_choices_created',
      'all_smart_bones_created',
      'all_smart_bones_wired',
      'all_mesh_layers_created',
      'all_vitruvian_groups_created',
      'projected_shadow_created',
      'rig_verified',
      'document_saved'
    ],
    provenance: {
      compiler: 'MohoRigPlanCompiler v1',
      source: `ReferenceRigTemplate:${template.templateId}:${characterBible.characterId}`,
      characterName: characterBible.name
    }
  };

  return mohoCommandPlanSchema.parse(plan) as MohoCommandPlan;
}

export const REFERENCE_RIG_TEMPLATES: Record<RigTemplate['rigType'], RigTemplate> = TEMPLATE_REGISTRY;
