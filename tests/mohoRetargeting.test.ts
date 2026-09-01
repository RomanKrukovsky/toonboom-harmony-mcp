import {
  MohoRetargetingResolver,
  MohoLandmark,
  MohoRigType
} from '../src/services/retargetingResolver/mohoBranch.js';
import type { MohoCharacterBible } from '../src/schemas/mohoCharacterBible.js';
import type { MohoControllerBinding } from '../src/schemas/mohoCharacterBible.js';

function makeController(
  boneId: number,
  boneName: string,
  channel: 'rotation' | 'translation' | 'scale' | 'opacity' = 'rotation',
  rangeMin = -180,
  rangeMax = 180
): MohoControllerBinding {
  return {
    controllerId: `${boneName}_CTRL`,
    boneId,
    boneName,
    purpose: `${boneName} test controller`,
    range: { min: rangeMin, max: rangeMax, units: 'degrees' },
    channel
  };
}

function makeHumanoidBible(): MohoCharacterBible {
  return {
    schemaVersion: '1.0',
    characterId: 'char_test_humanoid',
    name: 'Test Humanoid',
    role: 'protagonist',
    rigType: 'humanoid_2leg',
    rigPath: 'rigs/char_test_humanoid.moho',
    turnaroundViews: ['front', 'side_left', 'back', 'side_right'],
    proportions: { headHeightRatio: 0.25, armSpanRatio: 1.0 },
    lineRules: { lineThicknessPt: 2.0, lineColourId: 'char_line' },
    controllers: [
      makeController(0, 'Head'),
      makeController(1, 'Eye_L'),
      makeController(2, 'Eye_R'),
      makeController(3, 'Shoulder_L'),
      makeController(4, 'Shoulder_R'),
      makeController(5, 'Elbow_L'),
      makeController(6, 'Elbow_R'),
      makeController(7, 'Wrist_L'),
      makeController(8, 'Wrist_R'),
      makeController(9, 'Hip_L'),
      makeController(10, 'Hip_R'),
      makeController(11, 'Knee_L'),
      makeController(12, 'Knee_R'),
      makeController(13, 'Ankle_L'),
      makeController(14, 'Ankle_R'),
      makeController(15, 'Root', 'translation', -500, 500)
    ],
    switchLayers: [],
    mouthShapes: [],
    expressions: [],
    gestureLibrary: [],
    paletteRef: 'palette_test_v1',
    provenance: {
      approver: 'test-artist',
      approvedAt: '2026-01-01T00:00:00.000Z',
      rigAuthor: 'test-rigger',
      licensePath: 'licenses/char_test_humanoid.license.json'
    }
  };
}

function makeQuadrupedBible(): MohoCharacterBible {
  return {
    schemaVersion: '1.0',
    characterId: 'char_test_quadruped',
    name: 'Test Quadruped',
    role: 'supporting',
    rigType: 'quadruped',
    rigPath: 'rigs/char_test_quadruped.moho',
    turnaroundViews: ['front', 'side_left', 'back', 'side_right'],
    proportions: { headHeightRatio: 0.4, armSpanRatio: 0.9 },
    lineRules: { lineThicknessPt: 2.5, lineColourId: 'char_line' },
    controllers: [
      makeController(0, 'Head'),
      makeController(1, 'Eye_L'),
      makeController(2, 'Eye_R'),
      makeController(3, 'FL_Shoulder'),
      makeController(4, 'FL_Elbow'),
      makeController(5, 'FL_Paw'),
      makeController(6, 'FR_Shoulder'),
      makeController(7, 'FR_Elbow'),
      makeController(8, 'FR_Paw'),
      makeController(9, 'BL_Hip'),
      makeController(10, 'BL_Knee'),
      makeController(11, 'BL_Paw'),
      makeController(12, 'BR_Hip'),
      makeController(13, 'BR_Knee'),
      makeController(14, 'BR_Paw'),
      makeController(15, 'Tail_Base'),
      makeController(16, 'Tail_Mid'),
      makeController(17, 'Tail_Tip'),
      makeController(18, 'Ear_L'),
      makeController(19, 'Ear_R')
    ],
    switchLayers: [],
    mouthShapes: [],
    expressions: [],
    gestureLibrary: [],
    paletteRef: 'palette_test_v1',
    provenance: {
      approver: 'test-artist',
      approvedAt: '2026-01-01T00:00:00.000Z',
      rigAuthor: 'test-rigger',
      licensePath: 'licenses/char_test_quadruped.license.json'
    }
  };
}

function makeCreatureBible(): MohoCharacterBible {
  return {
    schemaVersion: '1.0',
    characterId: 'char_test_creature',
    name: 'Test Creature',
    role: 'antagonist',
    rigType: 'creature',
    rigPath: 'rigs/char_test_creature.moho',
    turnaroundViews: ['front', 'side_left', 'back', 'side_right'],
    proportions: { headHeightRatio: 0.3, armSpanRatio: 1.2 },
    lineRules: { lineThicknessPt: 3.0, lineColourId: 'char_line' },
    controllers: [
      makeController(0, 'Head'),
      makeController(1, 'Spine_Top'),
      makeController(2, 'Spine_Mid'),
      makeController(3, 'Spine_Bottom'),
      makeController(4, 'Tentacle_1_Base'),
      makeController(5, 'Tentacle_1_Mid'),
      makeController(6, 'Tentacle_1_Tip'),
      makeController(7, 'Tentacle_2_Base'),
      makeController(8, 'Tentacle_2_Mid'),
      makeController(9, 'Tentacle_2_Tip'),
      makeController(10, 'Tentacle_3_Base'),
      makeController(11, 'Tentacle_3_Mid'),
      makeController(12, 'Tentacle_3_Tip'),
      makeController(13, 'Tentacle_4_Base'),
      makeController(14, 'Tentacle_4_Mid'),
      makeController(15, 'Tentacle_4_Tip'),
      makeController(16, 'Eye_L'),
      makeController(17, 'Eye_R'),
      makeController(18, 'Mouth', 'scale', 0, 2)
    ],
    switchLayers: [],
    mouthShapes: [],
    expressions: [],
    gestureLibrary: [],
    paletteRef: 'palette_test_v1',
    provenance: {
      approver: 'test-artist',
      approvedAt: '2026-01-01T00:00:00.000Z',
      rigAuthor: 'test-rigger',
      licensePath: 'licenses/char_test_creature.license.json'
    }
  };
}

function makeMechanicalBible(): MohoCharacterBible {
  return {
    schemaVersion: '1.0',
    characterId: 'char_test_mechanical',
    name: 'Test Mechanical',
    role: 'supporting',
    rigType: 'mechanical',
    rigPath: 'rigs/char_test_mechanical.moho',
    turnaroundViews: ['front', 'side_left', 'back', 'side_right'],
    proportions: { headHeightRatio: 0.35, armSpanRatio: 1.1 },
    lineRules: { lineThicknessPt: 2.0, lineColourId: 'char_line' },
    controllers: [
      makeController(0, 'Body', 'translation', -500, 500),
      makeController(1, 'Head'),
      makeController(2, 'Piston_L_Top', 'scale', 0, 10),
      makeController(3, 'Piston_L_Bottom', 'scale', 0, 10),
      makeController(4, 'Piston_R_Top', 'scale', 0, 10),
      makeController(5, 'Piston_R_Bottom', 'scale', 0, 10),
      makeController(6, 'Cable_Front'),
      makeController(7, 'Cable_Back'),
      makeController(8, 'Antenna_Tip'),
      makeController(9, 'Sensor_L'),
      makeController(10, 'Sensor_R')
    ],
    switchLayers: [],
    mouthShapes: [],
    expressions: [],
    gestureLibrary: [],
    paletteRef: 'palette_test_v1',
    provenance: {
      approver: 'test-artist',
      approvedAt: '2026-01-01T00:00:00.000Z',
      rigAuthor: 'test-rigger',
      licensePath: 'licenses/char_test_mechanical.license.json'
    }
  };
}

function lm(name: string, x: number, y: number, confidence = 0.95): MohoLandmark {
  return { name, x, y, confidence };
}

describe('MohoRetargetingResolver', () => {
  const resolver = new MohoRetargetingResolver();

  describe('Humanoid landmarks → PIR', () => {
    it('maps 17 DWPose-style landmarks and returns a PIR with bone bindings', () => {
      const landmarks: MohoLandmark[] = [
        lm('nose', 100, 50),
        lm('left_eye', 90, 40),
        lm('right_eye', 110, 40),
        lm('left_shoulder', 70, 100),
        lm('right_shoulder', 130, 100),
        lm('left_elbow', 50, 150),
        lm('right_elbow', 150, 150),
        lm('left_wrist', 30, 200),
        lm('right_wrist', 170, 200),
        lm('left_hip', 80, 200),
        lm('right_hip', 120, 200),
        lm('left_knee', 70, 280),
        lm('right_knee', 130, 280),
        lm('left_ankle', 65, 360),
        lm('right_ankle', 135, 360),
        lm('root', 100, 200)
      ];

      const result = resolver.resolve({
        landmarks,
        characterBible: makeHumanoidBible(),
        rigType: 'humanoid_2leg',
        frame: 1
      });

      expect(result.pir).toBeDefined();
      expect(result.pir.schemaVersion).toBe('1.0');
      expect(result.pir.rigType).toBe('humanoid_2leg');
      expect(result.pir.boneKeys.length).toBeGreaterThan(0);
      expect(result.pir.deterministicFingerprint).toMatch(/^[a-f0-9]{64}$/);

      expect(result.boneBindings.length).toBeGreaterThan(0);

      const boundBoneNames = result.boneBindings.map(b => b.boneName);
      expect(boundBoneNames).toContain('Head');
      expect(boundBoneNames).toContain('Shoulder_L');
      expect(boundBoneNames).toContain('Shoulder_R');
    });
  });

  describe('Quadruped landmarks → PIR', () => {
    it('handles 4 legs + tail + ears via 22 landmarks', () => {
      const landmarks: MohoLandmark[] = [
        lm('nose', 100, 50),
        lm('muzzle', 95, 70),
        lm('left_eye', 90, 40),
        lm('right_eye', 110, 40),
        lm('shoulder_front_left', 60, 120),
        lm('elbow_front_left', 40, 170),
        lm('paw_front_left', 30, 220),
        lm('shoulder_front_right', 140, 120),
        lm('elbow_front_right', 160, 170),
        lm('paw_front_right', 170, 220),
        lm('hip_back_left', 60, 180),
        lm('knee_back_left', 50, 240),
        lm('paw_back_left', 45, 300),
        lm('hip_back_right', 140, 180),
        lm('knee_back_right', 150, 240),
        lm('paw_back_right', 155, 300),
        lm('tail_base', 100, 180),
        lm('tail_mid', 110, 220),
        lm('tail_tip', 120, 260),
        lm('ear_left', 80, 30),
        lm('ear_right', 120, 30)
      ];

      const result = resolver.resolve({
        landmarks,
        characterBible: makeQuadrupedBible(),
        rigType: 'quadruped',
        frame: 5
      });

      expect(result.pir.rigType).toBe('quadruped');
      expect(result.pir.boneKeys.length).toBeGreaterThan(0);

      const boundBoneNames = result.boneBindings.map(b => b.boneName);
      expect(boundBoneNames).toContain('Tail_Base');
      expect(boundBoneNames).toContain('Tail_Mid');
      expect(boundBoneNames).toContain('Tail_Tip');
      expect(boundBoneNames).toContain('Ear_L');
      expect(boundBoneNames).toContain('Ear_R');
      expect(boundBoneNames).toContain('FL_Shoulder');
      expect(boundBoneNames).toContain('FR_Shoulder');
      expect(boundBoneNames).toContain('BL_Hip');
      expect(boundBoneNames).toContain('BR_Hip');
    });
  });

  describe('Creature landmarks → PIR', () => {
    it('handles 4 tentacles + spine via 12 landmarks', () => {
      const landmarks: MohoLandmark[] = [
        lm('head_center', 100, 50),
        lm('spine_top', 100, 100),
        lm('spine_mid', 100, 150),
        lm('spine_bottom', 100, 200),
        lm('tentacle_1_base', 60, 220),
        lm('tentacle_1_mid', 40, 260),
        lm('tentacle_1_tip', 20, 300),
        lm('tentacle_2_base', 140, 220),
        lm('tentacle_2_mid', 160, 260),
        lm('tentacle_2_tip', 180, 300),
        lm('eye_left', 90, 40),
        lm('eye_right', 110, 40)
      ];

      const result = resolver.resolve({
        landmarks,
        characterBible: makeCreatureBible(),
        rigType: 'creature',
        frame: 10
      });

      expect(result.pir.rigType).toBe('creature');
      expect(result.pir.boneKeys.length).toBeGreaterThan(0);

      const boundBoneNames = result.boneBindings.map(b => b.boneName);
      expect(boundBoneNames).toContain('Tentacle_1_Base');
      expect(boundBoneNames).toContain('Tentacle_1_Tip');
      expect(boundBoneNames).toContain('Tentacle_2_Base');
      expect(boundBoneNames).toContain('Tentacle_2_Tip');
      expect(boundBoneNames).toContain('Spine_Mid');
      expect(boundBoneNames).toContain('Spine_Bottom');
    });
  });

  describe('Mechanical landmarks → PIR', () => {
    it('produces scale-based keys for pistons', () => {
      const landmarks: MohoLandmark[] = [
        lm('body', 100, 150),
        lm('head', 100, 80),
        lm('piston_left_top', 60, 150),
        lm('piston_left_bottom', 60, 220),
        lm('piston_right_top', 140, 150),
        lm('piston_right_bottom', 140, 220),
        lm('cable_front', 100, 250),
        lm('cable_back', 100, 50),
        lm('antenna_tip', 100, 20),
        lm('sensor_left', 80, 70),
        lm('sensor_right', 120, 70)
      ];

      const result = resolver.resolve({
        landmarks,
        characterBible: makeMechanicalBible(),
        rigType: 'mechanical',
        frame: 12
      });

      expect(result.pir.rigType).toBe('mechanical');
      expect(result.pir.boneKeys.length).toBeGreaterThan(0);

      const pistonKeys = result.pir.boneKeys.filter(
        k => k.boneName === 'Piston_L_Top' || k.boneName === 'Piston_R_Top'
      );
      expect(pistonKeys.length).toBeGreaterThan(0);
      for (const key of pistonKeys) {
        expect(key.channel).toBe('scale');
      }

      const boundBoneNames = result.boneBindings.map(b => b.boneName);
      expect(boundBoneNames).toContain('Piston_L_Top');
      expect(boundBoneNames).toContain('Piston_R_Top');
      expect(boundBoneNames).toContain('Body');
      expect(boundBoneNames).toContain('Cable_Front');
    });
  });

  describe('Unmapped landmark handling', () => {
    it('places a landmark not in the rig map into unmappedLandmarks', () => {
      const landmarks: MohoLandmark[] = [
        lm('nose', 100, 50),
        lm('left_shoulder', 70, 100),
        lm('right_shoulder', 130, 100),
        lm('left_elbow', 50, 150),
        lm('right_elbow', 150, 150),
        lm('left_wrist', 30, 200),
        lm('right_wrist', 170, 200),
        lm('left_hip', 80, 200),
        lm('right_hip', 120, 200),
        lm('left_knee', 70, 280),
        lm('right_knee', 130, 280),
        lm('left_ankle', 65, 360),
        lm('right_ankle', 135, 360),
        lm('root', 100, 200),
        lm('left_eye', 90, 40),
        lm('right_eye', 110, 40),
        lm('mysterious_extra_lm', 50, 50)
      ];

      const result = resolver.resolve({
        landmarks,
        characterBible: makeHumanoidBible(),
        rigType: 'humanoid_2leg',
        frame: 1
      });

      expect(result.unmappedLandmarks).toContain('mysterious_extra_lm');
    });
  });

  describe('Low-confidence warning', () => {
    it('generates a warning for a landmark with confidence < 0.5', () => {
      const landmarks: MohoLandmark[] = [
        lm('nose', 100, 50, 0.95),
        lm('left_eye', 90, 40, 0.95),
        lm('right_eye', 110, 40, 0.95),
        lm('left_shoulder', 70, 100, 0.2),
        lm('right_shoulder', 130, 100, 0.95),
        lm('left_elbow', 50, 150, 0.95),
        lm('right_elbow', 150, 150, 0.95),
        lm('left_wrist', 30, 200, 0.95),
        lm('right_wrist', 170, 200, 0.95),
        lm('left_hip', 80, 200, 0.95),
        lm('right_hip', 120, 200, 0.95),
        lm('left_knee', 70, 280, 0.95),
        lm('right_knee', 130, 280, 0.95),
        lm('left_ankle', 65, 360, 0.95),
        lm('right_ankle', 135, 360, 0.95),
        lm('root', 100, 200, 0.95)
      ];

      const result = resolver.resolve({
        landmarks,
        characterBible: makeHumanoidBible(),
        rigType: 'humanoid_2leg',
        frame: 1
      });

      const lowConfWarnings = result.warnings.filter(w => /low confidence/i.test(w));
      expect(lowConfWarnings.length).toBeGreaterThan(0);
      expect(lowConfWarnings.some(w => w.includes('left_shoulder'))).toBe(true);
    });
  });

  describe('Determinism', () => {
    it('produces the same PIR fingerprint for the same input', () => {
      const landmarks: MohoLandmark[] = [
        lm('nose', 100, 50),
        lm('left_eye', 90, 40),
        lm('right_eye', 110, 40),
        lm('left_shoulder', 70, 100),
        lm('right_shoulder', 130, 100),
        lm('left_elbow', 50, 150),
        lm('right_elbow', 150, 150),
        lm('left_wrist', 30, 200),
        lm('right_wrist', 170, 200),
        lm('left_hip', 80, 200),
        lm('right_hip', 120, 200),
        lm('left_knee', 70, 280),
        lm('right_knee', 130, 280),
        lm('left_ankle', 65, 360),
        lm('right_ankle', 135, 360),
        lm('root', 100, 200)
      ];
      const bible = makeHumanoidBible();

      const r1 = resolver.resolve({ landmarks, characterBible: bible, rigType: 'humanoid_2leg', frame: 1 });
      const r2 = resolver.resolve({ landmarks, characterBible: bible, rigType: 'humanoid_2leg', frame: 1 });
      const r3 = resolver.resolve({ landmarks, characterBible: bible, rigType: 'humanoid_2leg', frame: 1 });

      expect(r1.pir.deterministicFingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(r1.pir.deterministicFingerprint).toBe(r2.pir.deterministicFingerprint);
      expect(r2.pir.deterministicFingerprint).toBe(r3.pir.deterministicFingerprint);
      expect(r1.pir.performanceId).toBe(r2.pir.performanceId);
    });
  });

  describe('Bone bindings are non-empty', () => {
    it('produces at least 5 bone bindings for a humanoid', () => {
      const landmarks: MohoLandmark[] = [
        lm('nose', 100, 50),
        lm('left_eye', 90, 40),
        lm('right_eye', 110, 40),
        lm('left_shoulder', 70, 100),
        lm('right_shoulder', 130, 100),
        lm('left_elbow', 50, 150),
        lm('right_elbow', 150, 150),
        lm('left_wrist', 30, 200),
        lm('right_wrist', 170, 200),
        lm('left_hip', 80, 200),
        lm('right_hip', 120, 200),
        lm('left_knee', 70, 280),
        lm('right_knee', 130, 280),
        lm('left_ankle', 65, 360),
        lm('right_ankle', 135, 360),
        lm('root', 100, 200)
      ];

      const result = resolver.resolve({
        landmarks,
        characterBible: makeHumanoidBible(),
        rigType: 'humanoid_2leg',
        frame: 1
      });

      expect(result.boneBindings.length).toBeGreaterThanOrEqual(5);

      const uniqueBones = new Set(result.boneBindings.map(b => b.boneName));
      expect(uniqueBones.size).toBe(result.boneBindings.length);
    });
  });
});