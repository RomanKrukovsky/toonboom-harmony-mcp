import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import {
  MohoCharacterBible,
  MohoControllerBinding
} from '../../schemas/mohoCharacterBible.js';
import {
  MohoBoneKey,
  MohoPerformancePir
} from '../../schemas/mohoPerformancePir.js';

export type MohoRigType =
  | 'humanoid_2leg'
  | 'quadruped'
  | 'creature'
  | 'mechanical';

export interface MohoLandmark {
  name: string;
  x: number;
  y: number;
  confidence: number;
}

export interface MohoRetargetingInput {
  landmarks: MohoLandmark[];
  characterBible: MohoCharacterBible;
  rigType: MohoRigType;
  normalizeToCharacterSpace?: boolean;
  frame?: number;
}

export interface MohoBoneBinding {
  boneId: number;
  boneName: string;
  source: string;
}

export interface MohoRetargetingResult {
  pir: MohoPerformancePir;
  boneBindings: MohoBoneBinding[];
  warnings: string[];
  unmappedLandmarks: string[];
}

type Channel = 'rotation' | 'translation' | 'scale' | 'opacity';

interface LandmarkBinding {
  boneName: string;
  channel: Channel;
  referenceLandmarks?: string[];
}

export const HUMANOID_LANDMARK_MAP: Record<string, LandmarkBinding> = {
  nose: { boneName: 'Head', channel: 'rotation', referenceLandmarks: ['left_shoulder', 'right_shoulder'] },
  left_eye: { boneName: 'Eye_L', channel: 'rotation', referenceLandmarks: ['nose', 'right_eye'] },
  right_eye: { boneName: 'Eye_R', channel: 'rotation', referenceLandmarks: ['nose', 'left_eye'] },
  left_shoulder: { boneName: 'Shoulder_L', channel: 'rotation', referenceLandmarks: ['left_elbow', 'left_hip'] },
  right_shoulder: { boneName: 'Shoulder_R', channel: 'rotation', referenceLandmarks: ['right_elbow', 'right_hip'] },
  left_elbow: { boneName: 'Elbow_L', channel: 'rotation', referenceLandmarks: ['left_shoulder', 'left_wrist'] },
  right_elbow: { boneName: 'Elbow_R', channel: 'rotation', referenceLandmarks: ['right_shoulder', 'right_wrist'] },
  left_wrist: { boneName: 'Wrist_L', channel: 'rotation', referenceLandmarks: ['left_elbow', 'left_shoulder'] },
  right_wrist: { boneName: 'Wrist_R', channel: 'rotation', referenceLandmarks: ['right_elbow', 'right_shoulder'] },
  left_hip: { boneName: 'Hip_L', channel: 'rotation', referenceLandmarks: ['left_knee', 'left_shoulder'] },
  right_hip: { boneName: 'Hip_R', channel: 'rotation', referenceLandmarks: ['right_knee', 'right_shoulder'] },
  left_knee: { boneName: 'Knee_L', channel: 'rotation', referenceLandmarks: ['left_hip', 'left_ankle'] },
  right_knee: { boneName: 'Knee_R', channel: 'rotation', referenceLandmarks: ['right_hip', 'right_ankle'] },
  left_ankle: { boneName: 'Ankle_L', channel: 'rotation', referenceLandmarks: ['left_knee', 'left_hip'] },
  right_ankle: { boneName: 'Ankle_R', channel: 'rotation', referenceLandmarks: ['right_knee', 'right_hip'] },
  root: { boneName: 'Root', channel: 'translation', referenceLandmarks: ['left_hip', 'right_hip'] }
};

export const QUADRUPED_LANDMARK_MAP: Record<string, LandmarkBinding> = {
  nose: { boneName: 'Head', channel: 'rotation', referenceLandmarks: ['shoulder_front_left', 'shoulder_front_right'] },
  muzzle: { boneName: 'Head', channel: 'rotation', referenceLandmarks: ['shoulder_front_left', 'shoulder_front_right'] },
  left_eye: { boneName: 'Eye_L', channel: 'rotation', referenceLandmarks: ['nose', 'right_eye'] },
  right_eye: { boneName: 'Eye_R', channel: 'rotation', referenceLandmarks: ['nose', 'left_eye'] },
  shoulder_front_left: { boneName: 'FL_Shoulder', channel: 'rotation', referenceLandmarks: ['elbow_front_left', 'hip_back_left'] },
  elbow_front_left: { boneName: 'FL_Elbow', channel: 'rotation', referenceLandmarks: ['shoulder_front_left', 'paw_front_left'] },
  paw_front_left: { boneName: 'FL_Paw', channel: 'rotation', referenceLandmarks: ['elbow_front_left', 'shoulder_front_left'] },
  shoulder_front_right: { boneName: 'FR_Shoulder', channel: 'rotation', referenceLandmarks: ['elbow_front_right', 'hip_back_right'] },
  elbow_front_right: { boneName: 'FR_Elbow', channel: 'rotation', referenceLandmarks: ['shoulder_front_right', 'paw_front_right'] },
  paw_front_right: { boneName: 'FR_Paw', channel: 'rotation', referenceLandmarks: ['elbow_front_right', 'shoulder_front_right'] },
  hip_back_left: { boneName: 'BL_Hip', channel: 'rotation', referenceLandmarks: ['knee_back_left', 'shoulder_front_left'] },
  knee_back_left: { boneName: 'BL_Knee', channel: 'rotation', referenceLandmarks: ['hip_back_left', 'paw_back_left'] },
  paw_back_left: { boneName: 'BL_Paw', channel: 'rotation', referenceLandmarks: ['knee_back_left', 'hip_back_left'] },
  hip_back_right: { boneName: 'BR_Hip', channel: 'rotation', referenceLandmarks: ['knee_back_right', 'shoulder_front_right'] },
  knee_back_right: { boneName: 'BR_Knee', channel: 'rotation', referenceLandmarks: ['hip_back_right', 'paw_back_right'] },
  paw_back_right: { boneName: 'BR_Paw', channel: 'rotation', referenceLandmarks: ['knee_back_right', 'hip_back_right'] },
  tail_base: { boneName: 'Tail_Base', channel: 'rotation', referenceLandmarks: ['tail_mid', 'hip_back_left'] },
  tail_mid: { boneName: 'Tail_Mid', channel: 'rotation', referenceLandmarks: ['tail_base', 'tail_tip'] },
  tail_tip: { boneName: 'Tail_Tip', channel: 'rotation', referenceLandmarks: ['tail_mid', 'tail_base'] },
  ear_left: { boneName: 'Ear_L', channel: 'rotation', referenceLandmarks: ['nose', 'shoulder_front_left'] },
  ear_right: { boneName: 'Ear_R', channel: 'rotation', referenceLandmarks: ['nose', 'shoulder_front_right'] }
};

export const CREATURE_LANDMARK_MAP: Record<string, LandmarkBinding> = {
  head_center: { boneName: 'Head', channel: 'rotation', referenceLandmarks: ['spine_top', 'spine_mid'] },
  spine_top: { boneName: 'Spine_Top', channel: 'rotation', referenceLandmarks: ['head_center', 'spine_mid'] },
  spine_mid: { boneName: 'Spine_Mid', channel: 'rotation', referenceLandmarks: ['spine_top', 'spine_bottom'] },
  spine_bottom: { boneName: 'Spine_Bottom', channel: 'rotation', referenceLandmarks: ['spine_mid', 'spine_top'] },
  tentacle_1_base: { boneName: 'Tentacle_1_Base', channel: 'rotation', referenceLandmarks: ['tentacle_1_mid', 'spine_bottom'] },
  tentacle_1_mid: { boneName: 'Tentacle_1_Mid', channel: 'rotation', referenceLandmarks: ['tentacle_1_base', 'tentacle_1_tip'] },
  tentacle_1_tip: { boneName: 'Tentacle_1_Tip', channel: 'rotation', referenceLandmarks: ['tentacle_1_mid', 'tentacle_1_base'] },
  tentacle_2_base: { boneName: 'Tentacle_2_Base', channel: 'rotation', referenceLandmarks: ['tentacle_2_mid', 'spine_bottom'] },
  tentacle_2_mid: { boneName: 'Tentacle_2_Mid', channel: 'rotation', referenceLandmarks: ['tentacle_2_base', 'tentacle_2_tip'] },
  tentacle_2_tip: { boneName: 'Tentacle_2_Tip', channel: 'rotation', referenceLandmarks: ['tentacle_2_mid', 'tentacle_2_base'] },
  tentacle_3_base: { boneName: 'Tentacle_3_Base', channel: 'rotation', referenceLandmarks: ['tentacle_3_mid', 'spine_bottom'] },
  tentacle_3_mid: { boneName: 'Tentacle_3_Mid', channel: 'rotation', referenceLandmarks: ['tentacle_3_base', 'tentacle_3_tip'] },
  tentacle_3_tip: { boneName: 'Tentacle_3_Tip', channel: 'rotation', referenceLandmarks: ['tentacle_3_mid', 'tentacle_3_base'] },
  tentacle_4_base: { boneName: 'Tentacle_4_Base', channel: 'rotation', referenceLandmarks: ['tentacle_4_mid', 'spine_bottom'] },
  tentacle_4_mid: { boneName: 'Tentacle_4_Mid', channel: 'rotation', referenceLandmarks: ['tentacle_4_base', 'tentacle_4_tip'] },
  tentacle_4_tip: { boneName: 'Tentacle_4_Tip', channel: 'rotation', referenceLandmarks: ['tentacle_4_mid', 'tentacle_4_base'] },
  eye_left: { boneName: 'Eye_L', channel: 'rotation', referenceLandmarks: ['head_center', 'eye_right'] },
  eye_right: { boneName: 'Eye_R', channel: 'rotation', referenceLandmarks: ['head_center', 'eye_left'] },
  mouth: { boneName: 'Mouth', channel: 'scale', referenceLandmarks: ['head_center', 'eye_left'] }
};

export const MECHANICAL_LANDMARK_MAP: Record<string, LandmarkBinding> = {
  body: { boneName: 'Body', channel: 'translation', referenceLandmarks: ['head', 'cable_front'] },
  head: { boneName: 'Head', channel: 'rotation', referenceLandmarks: ['body', 'antenna_tip'] },
  piston_left_top: { boneName: 'Piston_L_Top', channel: 'scale', referenceLandmarks: ['piston_left_bottom', 'body'] },
  piston_left_bottom: { boneName: 'Piston_L_Bottom', channel: 'scale', referenceLandmarks: ['piston_left_top', 'body'] },
  piston_right_top: { boneName: 'Piston_R_Top', channel: 'scale', referenceLandmarks: ['piston_right_bottom', 'body'] },
  piston_right_bottom: { boneName: 'Piston_R_Bottom', channel: 'scale', referenceLandmarks: ['piston_right_top', 'body'] },
  cable_front: { boneName: 'Cable_Front', channel: 'rotation', referenceLandmarks: ['cable_back', 'body'] },
  cable_back: { boneName: 'Cable_Back', channel: 'rotation', referenceLandmarks: ['cable_front', 'body'] },
  antenna_tip: { boneName: 'Antenna_Tip', channel: 'rotation', referenceLandmarks: ['head', 'body'] },
  sensor_left: { boneName: 'Sensor_L', channel: 'rotation', referenceLandmarks: ['head', 'sensor_right'] },
  sensor_right: { boneName: 'Sensor_R', channel: 'rotation', referenceLandmarks: ['head', 'sensor_left'] }
};

const RIG_TYPE_MAP: Record<MohoRigType, Record<string, LandmarkBinding>> = {
  humanoid_2leg: HUMANOID_LANDMARK_MAP,
  quadruped: QUADRUPED_LANDMARK_MAP,
  creature: CREATURE_LANDMARK_MAP,
  mechanical: MECHANICAL_LANDMARK_MAP
};

const RAD_TO_DEG = 180 / Math.PI;

function findLandmark(
  landmarks: MohoLandmark[],
  name: string
): MohoLandmark | undefined {
  for (const lm of landmarks) {
    if (lm.name === name) return lm;
  }
  return undefined;
}

function getLandmarkByName(
  landmarks: MohoLandmark[],
  name: string
): MohoLandmark {
  const lm = findLandmark(landmarks, name);
  if (!lm) {
    throw new Error(`Landmark "${name}" not found in input`);
  }
  return lm;
}

function computeAngleDeg(
  pivot: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const v1x = a.x - pivot.x;
  const v1y = a.y - pivot.y;
  const v2x = b.x - pivot.x;
  const v2y = b.y - pivot.y;
  const angle = Math.atan2(v2y, v2x) - Math.atan2(v1y, v1x);
  return angle * RAD_TO_DEG;
}

function computeLength(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalizeLandmarks(
  landmarks: MohoLandmark[]
): MohoLandmark[] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const lm of landmarks) {
    if (lm.x < minX) minX = lm.x;
    if (lm.y < minY) minY = lm.y;
    if (lm.x > maxX) maxX = lm.x;
    if (lm.y > maxY) maxY = lm.y;
  }
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return landmarks.map(lm => ({
    name: lm.name,
    x: (lm.x - centerX) / width,
    y: (lm.y - centerY) / height,
    confidence: lm.confidence
  }));
}

export class MohoRetargetingResolver {
  public resolve(input: MohoRetargetingInput): MohoRetargetingResult {
    const warnings: string[] = [];
    const unmappedLandmarks: string[] = [];
    const boneBindings: MohoBoneBinding[] = [];

    const map = RIG_TYPE_MAP[input.rigType];
    if (!map) {
      throw new Error(`Unsupported rig type: ${input.rigType}`);
    }

    if (input.characterBible.rigType !== input.rigType) {
      warnings.push(
        `Character bible rigType "${input.characterBible.rigType}" does not match input rigType "${input.rigType}"`
      );
    }

    const normalize = input.normalizeToCharacterSpace !== false;
    const landmarks = normalize
      ? normalizeLandmarks(input.landmarks)
      : input.landmarks;

    const boneNameToController: Record<string, MohoControllerBinding> = {};
    for (const ctrl of input.characterBible.controllers) {
      if (!boneNameToController[ctrl.boneName]) {
        boneNameToController[ctrl.boneName] = ctrl;
      }
    }

    const boneKeys: MohoBoneKey[] = [];
    const frame = input.frame ?? 1;

    const sortedLandmarks = [...input.landmarks].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const mappedLandmarkNames = new Set<string>();

    for (const landmarkName in map) {
      const landmark = findLandmark(landmarks, landmarkName);
      if (!landmark) continue;
      mappedLandmarkNames.add(landmarkName);

      const binding = map[landmarkName];
      const controller = boneNameToController[binding.boneName];

      if (!controller) {
        warnings.push(
          `Bone "${binding.boneName}" referenced by landmark "${landmarkName}" not found in character bible controllers`
        );
        continue;
      }

      let value: number;

      try {
        if (binding.channel === 'translation') {
          value = computeTranslationValue(
            landmark,
            binding,
            landmarks,
            input.rigType
          );
        } else if (binding.channel === 'scale') {
          value = computeScaleValue(landmark, binding, landmarks);
        } else {
          value = computeRotationValue(landmark, binding, landmarks);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`Skipped landmark "${landmarkName}": ${msg}`);
        continue;
      }

      if (binding.channel === 'rotation') {
        if (value > 360) value = value % 360;
        if (value < -360) value = value % -360;
      }

      if (controller.range) {
        if (value < controller.range.min) {
          warnings.push(
            `Value ${value.toFixed(3)} for bone "${binding.boneName}" clamped from ${value.toFixed(3)} to min ${controller.range.min}`
          );
          value = controller.range.min;
        }
        if (value > controller.range.max) {
          warnings.push(
            `Value ${value.toFixed(3)} for bone "${binding.boneName}" clamped from ${value.toFixed(3)} to max ${controller.range.max}`
          );
          value = controller.range.max;
        }
      }

      if (landmark.confidence < 0.3) {
        warnings.push(
          `Low confidence (${landmark.confidence.toFixed(2)}) for landmark "${landmarkName}"`
        );
      }

      boneKeys.push({
        boneId: controller.boneId,
        boneName: controller.boneName,
        channel: binding.channel,
        frame,
        value,
        interpolation: 'ease_in_out'
      });

      boneBindings.push({
        boneId: controller.boneId,
        boneName: controller.boneName,
        source: landmarkName
      });
    }

    for (const lm of sortedLandmarks) {
      if (!mappedLandmarkNames.has(lm.name)) {
        unmappedLandmarks.push(lm.name);
      }
    }

    const canonical = stringify({
      landmarks: sortedLandmarks,
      rigType: input.rigType,
      characterId: input.characterBible.characterId,
      frame
    }) || '';
    const performanceId = crypto
      .createHash('sha256')
      .update(canonical)
      .digest('hex');

    const fingerprintInput = stringify({
      boneKeys,
      performanceId,
      rigType: input.rigType
    }) || '';
    const deterministicFingerprint = crypto
      .createHash('sha256')
      .update(fingerprintInput)
      .digest('hex');

    const pir: MohoPerformancePir = {
      schemaVersion: '1.0',
      performanceId,
      rigType: input.rigType,
      shotManifestRef: '',
      mohoShowBibleRef: input.characterBible.rigPath,
      boneKeys,
      switchKeys: [],
      smartBoneActions: [],
      cameraKeys: [],
      fxKeys: [],
      deterministicFingerprint,
      provenance: {
        compiledAt: new Date(0).toISOString(),
        compilerVersion: 'mohoRetargetingResolver/1.0'
      }
    };

    return {
      pir,
      boneBindings,
      warnings,
      unmappedLandmarks
    };
  }
}

function computeRotationValue(
  landmark: MohoLandmark,
  binding: LandmarkBinding,
  landmarks: MohoLandmark[]
): number {
  const refs = binding.referenceLandmarks;
  if (!refs || refs.length < 2) {
    throw new Error(`rotation binding requires two reference landmarks`);
  }
  const prev = getLandmarkByName(landmarks, refs[0]);
  const next = getLandmarkByName(landmarks, refs[1]);
  return computeAngleDeg(landmark, prev, next);
}

function computeTranslationValue(
  landmark: MohoLandmark,
  binding: LandmarkBinding,
  landmarks: MohoLandmark[],
  rigType: MohoRigType
): number {
  const refs = binding.referenceLandmarks;
  if (!refs || refs.length < 2) {
    throw new Error(`translation binding requires two reference landmarks`);
  }
  const a = getLandmarkByName(landmarks, refs[0]);
  const b = getLandmarkByName(landmarks, refs[1]);
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const dx = landmark.x - midX;
  const dy = landmark.y - midY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * RAD_TO_DEG;
  if (rigType === 'mechanical') {
    return dist;
  }
  return angle;
}

function computeScaleValue(
  landmark: MohoLandmark,
  binding: LandmarkBinding,
  landmarks: MohoLandmark[]
): number {
  const refs = binding.referenceLandmarks;
  if (!refs || refs.length < 2) {
    throw new Error(`scale binding requires two reference landmarks`);
  }
  const a = getLandmarkByName(landmarks, refs[0]);
  const b = getLandmarkByName(landmarks, refs[1]);
  const len = computeLength(landmark, a);
  const ref = computeLength(b, a);
  if (ref === 0) {
    return 1;
  }
  return len / ref;
}