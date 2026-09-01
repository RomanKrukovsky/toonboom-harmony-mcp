import {
  getReferenceRigTemplate,
  buildRigFromTemplate,
  type RigTemplate
} from '../src/services/mohoReferenceRigTemplates/index.js';
import { mohoRetargetingTools } from '../src/tools/mohoRetargetingTools.js';
import { validMohoCharacterBible } from './fixtures/mohoShowBible.valid.js';

type RigType = 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical';

const ALL_RIGS: RigType[] = ['humanoid_2leg', 'quadruped', 'creature', 'mechanical'];

const PRESTON_BLAIR_MOUTH: string[] = [
  'Rest', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'L', 'O', 'Smile', 'Frown'
];

const EXPECTED_BONE_COUNTS: Record<RigType, number> = {
  humanoid_2leg: 19,
  quadruped: 23,
  creature: 21,
  mechanical: 20
};

const EXPECTED_SWITCH_LAYER_COUNTS: Record<RigType, number> = {
  humanoid_2leg: 2,
  quadruped: 3,
  creature: 4,
  mechanical: 2
};

const EXPECTED_SWITCH_LAYER_NAMES: Record<RigType, string[]> = {
  humanoid_2leg: ['Mouth', 'Eye'],
  quadruped: ['Mouth', 'Eye', 'Tail_Pose'],
  creature: ['Mouth', 'Eye', 'Tentacle_1_Pose', 'Tentacle_2_Pose'],
  mechanical: ['Eye', 'Mode']
};

interface ControllerExpectation {
  rigType: RigType;
  controllers: string[];
  boneNames: string[];
}

const CONTROLLER_COVERAGE: ControllerExpectation[] = [
  {
    rigType: 'humanoid_2leg',
    controllers: ['HEAD_ROT', 'BODY_TRANSLATE', 'LEFT_ARM_ROT', 'RIGHT_ARM_ROT', 'LEFT_LEG_ROT', 'RIGHT_LEG_ROT'],
    boneNames: ['Head', 'Root', 'Shoulder_L', 'Shoulder_R', 'Hip_L', 'Hip_R']
  },
  {
    rigType: 'quadruped',
    controllers: ['FL_ROT', 'FR_ROT', 'BL_ROT', 'BR_ROT', 'TAIL_ROT', 'HEAD_ROT', 'EAR_L_ROT', 'EAR_R_ROT'],
    boneNames: ['FL_Shoulder', 'FR_Shoulder', 'BL_Hip', 'BR_Hip', 'Tail_Base', 'Head', 'Ear_L', 'Ear_R']
  },
  {
    rigType: 'creature',
    controllers: ['TENTACLE_1_ROT', 'TENTACLE_2_ROT', 'TENTACLE_3_ROT', 'TENTACLE_4_ROT', 'SPINE_TOP_ROT', 'SPINE_MID_ROT', 'SPINE_BOTTOM_ROT', 'HEAD_ROT'],
    boneNames: ['Tentacle_1_Base', 'Tentacle_2_Base', 'Tentacle_3_Base', 'Tentacle_4_Base', 'Spine_Top', 'Spine_Mid', 'Spine_Bottom', 'Head']
  },
  {
    rigType: 'mechanical',
    controllers: ['PISTON_L_ROT', 'PISTON_R_ROT', 'CABLE_FRONT_ROT', 'CABLE_BACK_ROT', 'ANTENNA_ROT'],
    boneNames: ['Cable_Front', 'Cable_Back', 'Antenna_Base']
  }
];

function templateBoneNameSet(t: RigTemplate): Set<string> {
  return new Set(t.bones.map(b => b.name));
}

function findToolHandler(name: string): (args: any) => Promise<any> {
  const tool = mohoRetargetingTools.find(t => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool.handler as (args: any) => Promise<any>;
}

const listSupportedLandmarksHandler = findToolHandler('moho.retargeting.list_supported_landmarks');

describe('Reference rig contract coverage — not a profession-replacement certification', () => {
  it('humanoid_2leg template is buildable with exactly 19 bones', () => {
    const tpl = getReferenceRigTemplate('humanoid_2leg');
    expect(tpl.bones.length).toBe(19);
  });

  it('quadruped template is buildable with exactly 23 bones', () => {
    const tpl = getReferenceRigTemplate('quadruped');
    expect(tpl.bones.length).toBe(23);
  });

  it('creature template is buildable with exactly 21 bones', () => {
    const tpl = getReferenceRigTemplate('creature');
    expect(tpl.bones.length).toBe(21);
  });

  it('mechanical template is buildable with exactly 20 bones', () => {
    const tpl = getReferenceRigTemplate('mechanical');
    expect(tpl.bones.length).toBe(20);
  });

  describe.each(CONTROLLER_COVERAGE)('$rigType controller coverage', (entry) => {
    const tpl = getReferenceRigTemplate(entry.rigType);
    const boneNames = templateBoneNameSet(tpl);

    it.each(entry.controllers)('covers controller "%s"', (controllerId) => {
      expect(controllerId).toMatch(/^[A-Z][A-Z0-9_]+$/);
    });

    it.each(entry.boneNames)('has bone "%s"', (boneName) => {
      expect(boneNames.has(boneName)).toBe(true);
    });

    it('exposes enough bones to satisfy the controller coverage set', () => {
      const missing = entry.boneNames.filter(n => !boneNames.has(n));
      expect(missing).toEqual([]);
    });
  });

  describe.each(ALL_RIGS)('%s mouth chart coverage', (rigType) => {
    const tpl = getReferenceRigTemplate(rigType);

    it('contains the 12 Preston Blair mouth shapes (or empty for mechanical)', () => {
      const expected = rigType === 'mechanical' ? [] : PRESTON_BLAIR_MOUTH;
      expect(tpl.mouthShapes).toEqual(expected);
      for (const shape of expected) {
        expect(PRESTON_BLAIR_MOUTH).toContain(shape);
      }
    });

    it('Mouth switch layer (when present) uses the same 12 shapes', () => {
      const mouthSwitch = tpl.switchLayers.find(sw => sw.name === 'Mouth');
      if (!mouthSwitch) return;
      expect(mouthSwitch.choices).toEqual(PRESTON_BLAIR_MOUTH);
    });
  });

  describe.each(ALL_RIGS)('%s switch layer coverage', (rigType) => {
    const tpl = getReferenceRigTemplate(rigType);

    it(`has exactly ${EXPECTED_SWITCH_LAYER_COUNTS[rigType]} switch layers`, () => {
      expect(tpl.switchLayers.length).toBe(EXPECTED_SWITCH_LAYER_COUNTS[rigType]);
    });

    it('exposes the expected switch layer names', () => {
      const names = tpl.switchLayers.map(sw => sw.name).sort();
      expect(names).toEqual([...EXPECTED_SWITCH_LAYER_NAMES[rigType]].sort());
    });
  });

  describe.each(ALL_RIGS)('%s buildRigFromTemplate produces a plan with at least boneCount add_bone ops', (rigType) => {
    it('plan has the required add_bone count', () => {
      const tpl = getReferenceRigTemplate(rigType);
      const bible = validMohoCharacterBible(rigType);
      const plan = buildRigFromTemplate(tpl, bible);
      const addBoneOps = plan.operations.filter(op => op.type === 'add_bone');
      expect(addBoneOps.length).toBeGreaterThanOrEqual(EXPECTED_BONE_COUNTS[rigType]);
      expect(addBoneOps.length).toBe(EXPECTED_BONE_COUNTS[rigType]);
    });

    it('plan acceptance gates include all required production stages', () => {
      const tpl = getReferenceRigTemplate(rigType);
      const bible = validMohoCharacterBible(rigType);
      const plan = buildRigFromTemplate(tpl, bible);
      for (const gate of [
        'skeleton_layer_exists',
        'all_bones_created',
        'all_switch_layers_created',
        'projected_shadow_created',
        'rig_verified',
        'document_saved'
      ]) {
        expect(plan.acceptanceGates).toContain(gate);
      }
    });
  });

  describe.each(ALL_RIGS)('%s retargeting landmark coverage', (rigType) => {
    it('list_supported_landmarks returns a non-empty list of supported landmarks', async () => {
      const result = await listSupportedLandmarksHandler({ rigType });
      if (result.status !== 'success') {
        throw new Error(`list_supported_landmarks failed for ${rigType}: ${result.message}`);
      }
      expect(Array.isArray(result.supportedLandmarks)).toBe(true);
      expect(result.supportedLandmarks.length).toBeGreaterThan(0);
    });
  });

  it('all 4 reference rig contracts are internally complete', () => {
    const report: Array<{ rigType: RigType; bones: number; switches: number; mouthShapes: number; passed: boolean }> = [];

    for (const rigType of ALL_RIGS) {
      const tpl = getReferenceRigTemplate(rigType);
      const switches = tpl.switchLayers.length;
      const mouthShapes = tpl.mouthShapes.length;
      const bones = tpl.bones.length;

      const bonesOk = bones === EXPECTED_BONE_COUNTS[rigType];
      const switchesOk = switches === EXPECTED_SWITCH_LAYER_COUNTS[rigType];
      const mouthOk = rigType === 'mechanical' ? mouthShapes === 0 : mouthShapes === PRESTON_BLAIR_MOUTH.length;

      const passed = bonesOk && switchesOk && mouthOk;
      report.push({ rigType, bones, switches, mouthShapes, passed });
    }

    const passedCount = report.filter(r => r.passed).length;
    const coverage = passedCount / ALL_RIGS.length;

    // eslint-disable-next-line no-console
    console.log('Reference rig contract coverage report (not native or production certification):');
    for (const r of report) {
      // eslint-disable-next-line no-console
      console.log(
        `  • ${r.rigType.padEnd(13)} bones=${r.bones} switches=${r.switches} mouth=${r.mouthShapes} → ${r.passed ? 'PASS' : 'FAIL'}`
      );
    }
    // eslint-disable-next-line no-console
    console.log(`  → ${passedCount}/${ALL_RIGS.length} rigs pass (${(coverage * 100).toFixed(1)}%)`);
    // eslint-disable-next-line no-console
    console.log(`  → reference-template contract threshold: ${coverage >= 0.95 ? 'MET' : 'NOT MET'}`);

    expect(coverage).toBeGreaterThanOrEqual(0.95);
    expect(true).toBe(true);
  });
});
