import { describe, it, expect } from '@jest/globals';

import type { ShotManifest } from '../src/schemas/shotManifest.js';
import type { MohoCharacterBible } from '../src/schemas/mohoCharacterBible.js';
import type { MohoLandmark } from '../src/services/retargetingResolver/mohoBranch.js';

import { mohoCompilerTools } from '../src/tools/mohoCompilerTools.js';
import { mohoRetargetingTools } from '../src/tools/mohoRetargetingTools.js';
import { mohoReferenceRigTemplateTools } from '../src/tools/mohoReferenceRigTemplateTools.js';

import {
  validMohoCharacterBible,
  validMohoCharacterBibleQuadruped,
  validMohoCharacterBibleCreature,
  validMohoCharacterBibleMechanical
} from './fixtures/mohoShowBible.valid.js';

type RigType = 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical';

function getTool<T = any>(tools: any[], name: string): { handler: (args: any) => Promise<any> } {
  const tool = tools.find(t => t.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool as { handler: (args: any) => Promise<any> };
}

function buildShotManifest(
  rigType: RigType,
  characterBible: MohoCharacterBible
): ShotManifest {
  return {
    schemaVersion: '1.0',
    shotId: `shot_${rigType}_v1`,
    showBibleRef: 'show/show_bible.json',
    production: 'test_production',
    episode: 'ep_01',
    sceneName: `scene_${rigType}_intro`,
    rigType,
    description: `Test ${rigType} shot for compiler-tools tests.`,
    staging: {
      positions: [
        { characterId: characterBible.characterId, preset: 'center', facing: 0 }
      ],
      shotSize: 'medium_shot',
      cameraMove: 'static',
      backgroundRef: 'bgs/test_bg.svg'
    },
    timing: {
      totalFrames: 48,
      fps: 24,
      minBeatFrames: 2,
      maxBeatFrames: 24,
      anticipationFrames: 4,
      followThroughFrames: 6,
      pauseBeforeBeats: {}
    },
    beats: [
      {
        beatId: 'beat_1',
        startFrame: 1,
        endFrame: 24,
        characterId: characterBible.characterId,
        intent: 'speak',
        emotion: 'happy',
        audioCue: {
          audioPath: 'audio/hello.wav',
          transcript: 'hello',
          language: 'en'
        }
      }
    ],
    fx: [],
    render: { preview: true, format: 'mp4', quality: 'standard' },
    provenance: {
      director: 'test-director',
      createdAt: '2026-01-01T00:00:00.000Z',
      sourceScriptRef: 'scripts/shot_test.json'
    }
  };
}

function lm(name: string, x: number, y: number, confidence = 0.95): MohoLandmark {
  return { name, x, y, confidence };
}

function humanoidLandmarks(): MohoLandmark[] {
  return [
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
    lm('root', 100, 200),
    lm('extra_will_not_map', 50, 50)
  ];
}

describe('mohoCompilerTools', () => {
  describe('moho.performance_pir.compile', () => {
    it('returns { status: "success", pir: {...}, fingerprint: "..." } for a valid ShotManifest + CharacterBible', async () => {
      const compile = getTool(mohoCompilerTools, 'moho.performance_pir.compile');
      const characterBible = validMohoCharacterBible();
      const shotManifest = buildShotManifest('humanoid_2leg', characterBible);

      const result = await compile.handler({ shotManifest, characterBible });

      expect(result.status).toBe('success');
      expect(result.pir).toBeDefined();
      expect(result.pir.schemaVersion).toBe('1.0');
      expect(result.pir.rigType).toBe('humanoid_2leg');
      expect(typeof result.fingerprint).toBe('string');
      expect(result.fingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(result.fingerprint).toBe(result.pir.deterministicFingerprint);
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('moho.performance_pir.validate', () => {
    it('returns { status: "valid" } for a valid PIR', async () => {
      const validate = getTool(mohoCompilerTools, 'moho.performance_pir.validate');
      const compile = getTool(mohoCompilerTools, 'moho.performance_pir.compile');
      const characterBible = validMohoCharacterBible();
      const shotManifest = buildShotManifest('humanoid_2leg', characterBible);
      const compiled = await compile.handler({ shotManifest, characterBible });
      expect(compiled.status).toBe('success');

      const result = await validate.handler({ pir: compiled.pir });
      expect(result.status).toBe('valid');
    });

    it('returns { status: "invalid", errors: [...] } for a malformed PIR', async () => {
      const validate = getTool(mohoCompilerTools, 'moho.performance_pir.validate');
      const result = await validate.handler({ pir: { schemaVersion: 'NOT_VALID' } });
      expect(result.status).toBe('invalid');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('moho.performance_pir.fingerprint', () => {
    it('is deterministic for the same PIR input', async () => {
      const fingerprint = getTool(mohoCompilerTools, 'moho.performance_pir.fingerprint');
      const compile = getTool(mohoCompilerTools, 'moho.performance_pir.compile');
      const characterBible = validMohoCharacterBible();
      const shotManifest = buildShotManifest('humanoid_2leg', characterBible);
      const compiled = await compile.handler({ shotManifest, characterBible });

      const a = await fingerprint.handler({ pir: compiled.pir });
      const b = await fingerprint.handler({ pir: compiled.pir });
      const c = await fingerprint.handler({ pir: compiled.pir });

      expect(a.status).toBe('success');
      expect(typeof a.fingerprint).toBe('string');
      expect(a.fingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(a.fingerprint).toBe(b.fingerprint);
      expect(b.fingerprint).toBe(c.fingerprint);
    });
  });

  describe('moho.command_plan.build', () => {
    it('returns { status: "success", plan: {...}, fingerprint: "..." } for a valid PIR + CharacterBible', async () => {
      const build = getTool(mohoCompilerTools, 'moho.command_plan.build');
      const compile = getTool(mohoCompilerTools, 'moho.performance_pir.compile');
      const characterBible = validMohoCharacterBible();
      const shotManifest = buildShotManifest('humanoid_2leg', characterBible);
      const compiled = await compile.handler({ shotManifest, characterBible });

      const result = await build.handler({ pir: compiled.pir, characterBible });

      expect(result.status).toBe('success');
      expect(result.plan).toBeDefined();
      expect(result.plan.schemaVersion).toBeDefined();
      expect(Array.isArray(result.plan.operations)).toBe(true);
      expect(result.plan.operations.length).toBeGreaterThan(0);
      expect(typeof result.fingerprint).toBe('string');
      expect(result.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('moho.command_plan.validate', () => {
    it('returns { status: "valid" } for a valid CommandPlan', async () => {
      const validate = getTool(mohoCompilerTools, 'moho.command_plan.validate');
      const build = getTool(mohoCompilerTools, 'moho.command_plan.build');
      const compile = getTool(mohoCompilerTools, 'moho.performance_pir.compile');
      const characterBible = validMohoCharacterBible();
      const shotManifest = buildShotManifest('humanoid_2leg', characterBible);
      const compiled = await compile.handler({ shotManifest, characterBible });
      const built = await build.handler({ pir: compiled.pir, characterBible });
      expect(built.status).toBe('success');

      const result = await validate.handler({ plan: built.plan });
      expect(result.status).toBe('valid');
    });
  });

  describe('moho.command_plan.fingerprint', () => {
    it('is deterministic for the same plan input', async () => {
      const fingerprint = getTool(mohoCompilerTools, 'moho.command_plan.fingerprint');
      const build = getTool(mohoCompilerTools, 'moho.command_plan.build');
      const compile = getTool(mohoCompilerTools, 'moho.performance_pir.compile');
      const characterBible = validMohoCharacterBible();
      const shotManifest = buildShotManifest('humanoid_2leg', characterBible);
      const compiled = await compile.handler({ shotManifest, characterBible });
      const built = await build.handler({ pir: compiled.pir, characterBible });

      const a = await fingerprint.handler({ plan: built.plan });
      const b = await fingerprint.handler({ plan: built.plan });
      const c = await fingerprint.handler({ plan: built.plan });

      expect(a.status).toBe('success');
      expect(a.fingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(a.fingerprint).toBe(b.fingerprint);
      expect(b.fingerprint).toBe(c.fingerprint);
    });
  });
});

describe('mohoRetargetingTools', () => {
  describe('moho.retargeting.list_supported_landmarks', () => {
    it('returns ~17 landmarks for humanoid_2leg', async () => {
      const list = getTool(mohoRetargetingTools, 'moho.retargeting.list_supported_landmarks');
      const result = await list.handler({ rigType: 'humanoid_2leg' });
      expect(result.status).toBe('success');
      expect(Array.isArray(result.supportedLandmarks)).toBe(true);
      expect(result.supportedLandmarks.length).toBeGreaterThanOrEqual(15);
      expect(result.supportedLandmarks.length).toBeLessThanOrEqual(20);
    });

    it('returns ~22 landmarks for quadruped', async () => {
      const list = getTool(mohoRetargetingTools, 'moho.retargeting.list_supported_landmarks');
      const result = await list.handler({ rigType: 'quadruped' });
      expect(result.status).toBe('success');
      expect(Array.isArray(result.supportedLandmarks)).toBe(true);
      expect(result.supportedLandmarks.length).toBeGreaterThanOrEqual(20);
      expect(result.supportedLandmarks.length).toBeLessThanOrEqual(24);
    });

    it('returns ~12 landmarks for creature', async () => {
      const list = getTool(mohoRetargetingTools, 'moho.retargeting.list_supported_landmarks');
      const result = await list.handler({ rigType: 'creature' });
      expect(result.status).toBe('success');
      expect(Array.isArray(result.supportedLandmarks)).toBe(true);
      expect(result.supportedLandmarks.length).toBeGreaterThanOrEqual(10);
      expect(result.supportedLandmarks.length).toBeLessThanOrEqual(20);
    });

    it('returns ~12 landmarks for mechanical', async () => {
      const list = getTool(mohoRetargetingTools, 'moho.retargeting.list_supported_landmarks');
      const result = await list.handler({ rigType: 'mechanical' });
      expect(result.status).toBe('success');
      expect(Array.isArray(result.supportedLandmarks)).toBe(true);
      expect(result.supportedLandmarks.length).toBeGreaterThanOrEqual(10);
      expect(result.supportedLandmarks.length).toBeLessThanOrEqual(15);
    });
  });

  describe('moho.retargeting.validate_landmarks', () => {
    it('returns a valid array containing the mapped landmark names', async () => {
      const validate = getTool(mohoRetargetingTools, 'moho.retargeting.validate_landmarks');
      const landmarks = [
        { name: 'nose', confidence: 0.9 },
        { name: 'left_eye', confidence: 0.9 },
        { name: 'right_eye', confidence: 0.9 },
        { name: 'left_shoulder', confidence: 0.9 },
        { name: 'right_shoulder', confidence: 0.9 },
        { name: 'unknown_landmark', confidence: 0.9 }
      ];

      const result = await validate.handler({ rigType: 'humanoid_2leg', landmarks });

      expect(result.status).toBe('success');
      expect(Array.isArray(result.valid)).toBe(true);
      expect(result.valid).toContain('nose');
      expect(result.valid).toContain('left_eye');
      expect(result.valid).toContain('right_eye');
      expect(result.valid).toContain('left_shoulder');
      expect(result.valid).toContain('right_shoulder');
      expect(result.invalid).toContain('unknown_landmark');
    });
  });

  describe('moho.retargeting.resolve', () => {
    it('returns { status: "success", pir: {...} } for 17 humanoid landmarks', async () => {
      const resolve = getTool(mohoRetargetingTools, 'moho.retargeting.resolve');
      const bible = validMohoCharacterBible();

      const result = await resolve.handler({
        landmarks: humanoidLandmarks(),
        characterBible: bible,
        rigType: 'humanoid_2leg'
      });

      expect(result.status).toBe('success');
      expect(result.pir).toBeDefined();
      expect(result.pir.schemaVersion).toBe('1.0');
      expect(result.pir.rigType).toBe('humanoid_2leg');
      expect(typeof result.pir.deterministicFingerprint).toBe('string');
      expect(result.pir.deterministicFingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(Array.isArray(result.boneBindings)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});

describe('mohoReferenceRigTemplateTools', () => {
  describe('moho.reference_rig.list', () => {
    it('returns 4 templates (humanoid_2leg, quadruped, creature, mechanical)', async () => {
      const list = getTool(mohoReferenceRigTemplateTools, 'moho.reference_rig.list');
      const result = await list.handler({});
      expect(result.status).toBe('success');
      expect(Array.isArray(result.templates)).toBe(true);
      expect(result.templates.length).toBe(4);
      const rigTypes = result.templates.map((t: any) => t.rigType).sort();
      expect(rigTypes).toEqual(['creature', 'humanoid_2leg', 'mechanical', 'quadruped']);
    });
  });

  describe('moho.reference_rig.get', () => {
    it('returns humanoid_2leg template with 19 bones', async () => {
      const get = getTool(mohoReferenceRigTemplateTools, 'moho.reference_rig.get');
      const result = await get.handler({ rigType: 'humanoid_2leg' });
      expect(result.status).toBe('success');
      expect(result.template.rigType).toBe('humanoid_2leg');
      expect(result.template.bones.length).toBe(19);
    });

    it('returns quadruped template with 23 bones', async () => {
      const get = getTool(mohoReferenceRigTemplateTools, 'moho.reference_rig.get');
      const result = await get.handler({ rigType: 'quadruped' });
      expect(result.status).toBe('success');
      expect(result.template.rigType).toBe('quadruped');
      expect(result.template.bones.length).toBe(23);
    });

    it('returns creature template with 21 bones', async () => {
      const get = getTool(mohoReferenceRigTemplateTools, 'moho.reference_rig.get');
      const result = await get.handler({ rigType: 'creature' });
      expect(result.status).toBe('success');
      expect(result.template.rigType).toBe('creature');
      expect(result.template.bones.length).toBe(21);
    });

    it('returns mechanical template with 20 bones', async () => {
      const get = getTool(mohoReferenceRigTemplateTools, 'moho.reference_rig.get');
      const result = await get.handler({ rigType: 'mechanical' });
      expect(result.status).toBe('success');
      expect(result.template.rigType).toBe('mechanical');
      expect(result.template.bones.length).toBe(20);
    });
  });

  describe('moho.reference_rig.build_plan', () => {
    it('returns a plan with at least 19 add_bone ops for humanoid + sample CharacterBible', async () => {
      const buildPlan = getTool(mohoReferenceRigTemplateTools, 'moho.reference_rig.build_plan');
      const bible = validMohoCharacterBible();

      const result = await buildPlan.handler({ rigType: 'humanoid_2leg', characterBible: bible });

      expect(result.status).toBe('success');
      expect(result.plan).toBeDefined();
      const addBoneOps = result.plan.operations.filter((op: any) => op.type === 'add_bone');
      expect(addBoneOps.length).toBeGreaterThanOrEqual(19);
      expect(typeof result.fingerprint).toBe('string');
      expect(result.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});