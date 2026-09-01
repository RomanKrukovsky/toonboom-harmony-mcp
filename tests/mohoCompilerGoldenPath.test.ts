import { describe, it, expect } from '@jest/globals';

import {
  type ShotManifest
} from '../src/schemas/shotManifest.js';

import {
  type MohoCharacterBible
} from '../src/schemas/mohoCharacterBible.js';

import {
  MohoPerformancePirCompiler
} from '../src/services/mohoPerformancePirCompiler/index.js';

import {
  MohoCommandBuilder
} from '../src/services/mohoCommandBuilder/index.js';

import {
  REFERENCE_RIG_TEMPLATES,
  getReferenceRigTemplate,
  buildRigFromTemplate,
  type RigTemplate
} from '../src/services/mohoReferenceRigTemplates/index.js';

import {
  validMohoCharacterBible,
  validMohoCharacterBibleQuadruped,
  validMohoCharacterBibleCreature,
  validMohoCharacterBibleMechanical
} from './fixtures/mohoShowBible.valid.js';

type RigType = 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical';

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
    description: `Test ${rigType} shot validating the ShotManifest → PIR → Plan pipeline.`,
    staging: {
      positions: [
        {
          characterId: characterBible.characterId,
          preset: 'center',
          facing: 0
        }
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
      },
      {
        beatId: 'beat_2',
        startFrame: 25,
        endFrame: 48,
        characterId: characterBible.characterId,
        intent: 'react',
        emotion: 'surprise',
        audioCue: {
          audioPath: 'audio/oh.wav',
          transcript: 'oh',
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

interface GoldenPathResult {
  pir: ReturnType<MohoPerformancePirCompiler['compile']>['pir'];
  plan: ReturnType<MohoCommandBuilder['buildWithFingerprint']>['plan'];
  planFingerprint: string;
}

function runGoldenPath(
  rigType: RigType,
  characterBible: MohoCharacterBible
): GoldenPathResult {
  const shotManifest = buildShotManifest(rigType, characterBible);
  const compiler = new MohoPerformancePirCompiler();
  const compiled = compiler.compile({
    shotManifest,
    characterBible
  });

  const builder = new MohoCommandBuilder();
  const built = builder.buildWithFingerprint({
    pir: compiled.pir,
    characterBible
  });

  return {
    pir: compiled.pir,
    plan: built.plan,
    planFingerprint: built.fingerprint
  };
}

describe('SPRINT 2.6 — Moho compiler golden path', () => {
  describe('humanoid golden path', () => {
    const rigType: RigType = 'humanoid_2leg';
    const characterBible = validMohoCharacterBible();
    const result = runGoldenPath(rigType, characterBible);

    it('PIR has non-empty boneKeys', () => {
      expect(result.pir.boneKeys.length).toBeGreaterThan(0);
    });

    it('PIR has non-empty switchKeys (mouth switch from beat audioCue)', () => {
      expect(result.plan).toBeDefined();
      expect(result.pir.switchKeys.length).toBeGreaterThan(0);
    });

    it('PIR.deterministicFingerprint is 64-char hex', () => {
      expect(typeof result.pir.deterministicFingerprint).toBe('string');
      expect(result.pir.deterministicFingerprint).toHaveLength(64);
      expect(result.pir.deterministicFingerprint).toMatch(/^[0-9a-f]{64}$/);
    });

    it('CommandPlan has add_bone operations', () => {
      const addBones = result.plan.operations.filter(op => op.type === 'add_bone');
      expect(addBones.length).toBeGreaterThan(0);
    });

    it('CommandPlan has create_switch_layer + add_switch_choice operations', () => {
      const switchLayers = result.plan.operations.filter(op => op.type === 'create_switch_layer');
      const switchChoices = result.plan.operations.filter(op => op.type === 'add_switch_choice');
      expect(switchLayers.length).toBeGreaterThan(0);
      expect(switchChoices.length).toBeGreaterThan(0);
    });

    it('CommandPlan ends with verify_rig + save_document', () => {
      const last2 = result.plan.operations.slice(-2);
      expect(last2[0].type).toBe('verify_rig');
      expect(last2[1].type).toBe('save_document');
    });

    it('plan fingerprint is deterministic (re-run yields same fingerprint)', () => {
      const second = runGoldenPath(rigType, validMohoCharacterBible());
      expect(second.planFingerprint).toBe(result.planFingerprint);
    });
  });

  describe('quadruped golden path', () => {
    const rigType: RigType = 'quadruped';
    const characterBible = validMohoCharacterBibleQuadruped();
    const result = runGoldenPath(rigType, characterBible);

    it('compiles cleanly with boneKeys and a valid 64-char fingerprint', () => {
      expect(result.pir.rigType).toBe('quadruped');
      expect(result.pir.boneKeys.length).toBeGreaterThan(0);
      expect(result.pir.deterministicFingerprint).toMatch(/^[0-9a-f]{64}$/);
    });

    it('CommandPlan has add_bone + switch operations and ends with verify_rig/save_document', () => {
      const types = result.plan.operations.map(op => op.type);
      expect(types.filter(t => t === 'add_bone').length).toBeGreaterThan(0);
      expect(types.filter(t => t === 'create_switch_layer').length).toBeGreaterThan(0);
      expect(types.filter(t => t === 'add_switch_choice').length).toBeGreaterThan(0);
      const last2 = result.plan.operations.slice(-2);
      expect(last2[0].type).toBe('verify_rig');
      expect(last2[1].type).toBe('save_document');
    });
  });

  describe('creature golden path', () => {
    const rigType: RigType = 'creature';
    const characterBible = validMohoCharacterBibleCreature();
    const result = runGoldenPath(rigType, characterBible);

    it('compiles cleanly with boneKeys and a valid 64-char fingerprint', () => {
      expect(result.pir.rigType).toBe('creature');
      expect(result.pir.boneKeys.length).toBeGreaterThan(0);
      expect(result.pir.deterministicFingerprint).toMatch(/^[0-9a-f]{64}$/);
    });

    it('CommandPlan ends with verify_rig + save_document', () => {
      const last2 = result.plan.operations.slice(-2);
      expect(last2[0].type).toBe('verify_rig');
      expect(last2[1].type).toBe('save_document');
    });
  });

  describe('mechanical golden path', () => {
    const rigType: RigType = 'mechanical';
    const characterBible = validMohoCharacterBibleMechanical();
    const result = runGoldenPath(rigType, characterBible);

    it('compiles cleanly with boneKeys and a valid 64-char fingerprint', () => {
      expect(result.pir.rigType).toBe('mechanical');
      expect(result.pir.boneKeys.length).toBeGreaterThan(0);
      expect(result.pir.deterministicFingerprint).toMatch(/^[0-9a-f]{64}$/);
    });

    it('CommandPlan has add_bone ops and ends with verify_rig/save_document', () => {
      const types = result.plan.operations.map(op => op.type);
      expect(types.filter(t => t === 'add_bone').length).toBeGreaterThan(0);
      const last2 = result.plan.operations.slice(-2);
      expect(last2[0].type).toBe('verify_rig');
      expect(last2[1].type).toBe('save_document');
    });
  });

  describe('determinism', () => {
    it('same ShotManifest compiled twice yields identical fingerprints', () => {
      const characterBible = validMohoCharacterBible();
      const shotManifest = buildShotManifest('humanoid_2leg', characterBible);
      const compiler = new MohoPerformancePirCompiler();

      const a = compiler.compile({ shotManifest, characterBible });
      const b = compiler.compile({ shotManifest, characterBible });

      expect(a.pir.deterministicFingerprint).toBe(b.pir.deterministicFingerprint);
      expect(a.pir.performanceId).toBe(b.pir.performanceId);
    });

    it('CommandPlan fingerprint is stable for identical inputs', () => {
      const characterBible = validMohoCharacterBibleQuadruped();
      const shotManifest = buildShotManifest('quadruped', characterBible);
      const compiler = new MohoPerformancePirCompiler();
      const builder = new MohoCommandBuilder();

      const compiled = compiler.compile({ shotManifest, characterBible });
      const a = builder.buildWithFingerprint({ pir: compiled.pir, characterBible });
      const b = builder.buildWithFingerprint({ pir: compiled.pir, characterBible });

      expect(a.fingerprint).toBe(b.fingerprint);
    });
  });

  describe('rig template → plan', () => {
    const cases: Array<{
      rigType: RigType;
      bible: MohoCharacterBible;
      bibleFactory: () => MohoCharacterBible;
    }> = [
      { rigType: 'humanoid_2leg', bible: validMohoCharacterBible(), bibleFactory: () => validMohoCharacterBible() },
      { rigType: 'quadruped', bible: validMohoCharacterBibleQuadruped(), bibleFactory: () => validMohoCharacterBibleQuadruped() },
      { rigType: 'creature', bible: validMohoCharacterBibleCreature(), bibleFactory: () => validMohoCharacterBibleCreature() },
      { rigType: 'mechanical', bible: validMohoCharacterBibleMechanical(), bibleFactory: () => validMohoCharacterBibleMechanical() }
    ];

    for (const c of cases) {
      it(`buildRigFromTemplate for "${c.rigType}" yields add_bone ops equal to template bone count`, () => {
        const template: RigTemplate = getReferenceRigTemplate(c.rigType);
        const plan = buildRigFromTemplate(template, c.bibleFactory());

        const addBoneOps = plan.operations.filter(op => op.type === 'add_bone');
        expect(addBoneOps.length).toBe(template.bones.length);
      });
    }
  });

  describe('cross-reference gate', () => {
    it('returns violations including unknown_rig_type when ShotManifest rigType not in allowedRigTypes', () => {
      const characterBible = validMohoCharacterBibleMechanical();
      const shotManifest = buildShotManifest('mechanical', characterBible);

      const compiler = new MohoPerformancePirCompiler();
      const result = compiler.compile({
        shotManifest,
        characterBible,
        crossRefs: {
          allowedRigTypes: ['humanoid_2leg']
        }
      });

      expect(result.violations.length).toBeGreaterThan(0);
      const kinds = result.violations.map(v => v.kind);
      expect(kinds).toContain('unknown_rig_type');

      const rigTypeViolation = result.violations.find(v => v.kind === 'unknown_rig_type');
      expect(rigTypeViolation).toBeDefined();
      expect(rigTypeViolation?.ref).toBe('mechanical');
    });

    it('returns violations when ShotManifest rigType is mechanical and allowedRigTypes excludes it', () => {
      const characterBible = validMohoCharacterBibleMechanical();
      const shotManifest = buildShotManifest('mechanical', characterBible);

      const compiler = new MohoPerformancePirCompiler();
      const result = compiler.compile({
        shotManifest,
        characterBible,
        crossRefs: {
          allowedRigTypes: ['humanoid_2leg', 'quadruped', 'creature']
        }
      });

      expect(result.violations.some(v => v.kind === 'unknown_rig_type')).toBe(true);
      expect(result.warnings.some(w => w.includes('fail-closed'))).toBe(true);
    });
  });

  describe('reference template bone counts', () => {
    it('humanoid template has 19 bones', () => {
      expect(REFERENCE_RIG_TEMPLATES.humanoid_2leg.bones.length).toBe(19);
    });

    it('quadruped template has 23 bones', () => {
      expect(REFERENCE_RIG_TEMPLATES.quadruped.bones.length).toBe(23);
    });

    it('creature template has 21 bones', () => {
      expect(REFERENCE_RIG_TEMPLATES.creature.bones.length).toBe(21);
    });

    it('mechanical template has 20 bones', () => {
      expect(REFERENCE_RIG_TEMPLATES.mechanical.bones.length).toBe(20);
    });
  });
});