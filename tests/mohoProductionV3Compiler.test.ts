import { compileMohoProductionPlanV3 } from '../src/services/mohoProductionV3Compiler/index.js';
import { emitMohoLua } from '../src/services/mohoLuaEmitter/index.js';
import type { ArtworkPackV3, PerformancePlanV3, RigBlueprintV3 } from '../src/schemas/mohoProductionV3.js';

const provenance = { provider: 'test', model: 'test', callId: 'call-1' };

const artwork: ArtworkPackV3 = {
  schemaVersion: '3.0',
  shotId: 'shot-compiler',
  parts: [{
    partId: 'body', characterRef: 'hero', sourcePath: '/tmp/body.png', maskPath: null,
    zIndex: 1, confidence: 0.95, pivot: { x: 0, y: 0 }, synthesized: true, view: 'front'
  }],
  occlusionGraph: [],
  joints: [],
  requiredViews: ['front'],
  drawingSets: { mouth: ['Rest', 'A'], eyes: [], hands: [] },
  drawingAssets: [
    { drawingId: 'mouth_rest', kind: 'mouth', sourcePath: '/tmp/mouth_rest.png', confidence: 0.96 },
    { drawingId: 'mouth_a', kind: 'mouth', sourcePath: '/tmp/mouth_a.png', confidence: 0.96 }
  ],
  overallConfidence: 0.95,
  provenance
};

const blueprint: RigBlueprintV3 = {
  schemaVersion: '3.0',
  shotId: 'shot-compiler',
  bones: [{ boneId: 'root', name: 'Root', parentBoneId: null, x: 0, y: 0, angleDeg: 90, lengthPx: 40 }],
  bindings: [{ partId: 'body', boneId: 'root', mode: 'layer' }],
  constraints: [{ boneId: 'root', minAngleDeg: -30, maxAngleDeg: 30 }],
  switches: [{
    switchId: 'mouth',
    layerName: 'Mouth',
    choices: [{ choiceId: 'Rest', partId: 'mouth_rest' }, { choiceId: 'A', partId: 'mouth_a' }]
  }],
  actions: [{
    actionId: 'root_lean', driverBoneId: 'root', driverMinAngleDeg: -30, driverMaxAngleDeg: 30,
    targets: [{ boneId: 'root', minAngleDeg: -30, maxAngleDeg: 30 }], minFrame: 0, maxFrame: 100
  }],
  warpMeshes: [{
    meshId: 'body_warp', targetPartId: 'body',
    points: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }]
  }],
  controlPoses: [],
  vitruvianGroups: [],
  provenance
};

const performance: PerformancePlanV3 = {
  schemaVersion: '3.0',
  shotId: 'shot-compiler',
  characters: [{
    characterRef: 'hero',
    poseKeys: [{ frame: 0, boneId: 'root', channel: 'rotation', value: 0 }],
    gazeKeys: [], emotionKeys: [], gestureKeys: [],
    mouthKeys: [{ frame: 12, switchId: 'mouth', choice: 'A' }],
    blinkKeys: [], secondaryMotionKeys: [], interactionKeys: []
  }],
  cameraKeys: [{ frame: 0, xPixels: 0, yPixels: 0, zoom: 1, rotationDeg: 0 }],
  continuityChecks: [{ fromFrame: 0, toFrame: 24, passed: true, note: 'continuous' }],
  unknownControllers: [],
  interactionConflicts: [],
  provenance
};

describe('Moho Production v3 compiler', () => {
  it('compiles artwork, arbitrary rig geometry, Smart Actions and performance into native Lua', () => {
    const plan = compileMohoProductionPlanV3({
      artwork,
      blueprint,
      performance,
      characterName: 'Hero',
      documentPath: '/tmp/shot-compiler.moho'
    });
    const lua = emitMohoLua(plan, 'Hero');

    expect(lua).toContain('importImageLayer("body", "/tmp/body.png")');
    expect(lua).toContain('addSwitchImageChoice("Mouth", "A", "/tmp/mouth_a.png")');
    expect(lua).toContain('createMeshLayer("body_warp", 4, {{x=-1,y=-1}');
    expect(lua).toContain('setBoneChannelKey("Root", "", 0, "rotation", 0)');
    expect(lua).toContain('setSwitchKey("Mouth", 12, "A")');
    expect(lua).toContain('verifyRig(1, 1, 1, 1, 1)');
  });

  it('stops on unknown controllers and interaction conflicts', () => {
    expect(() => compileMohoProductionPlanV3({
      artwork,
      blueprint,
      performance: { ...performance, unknownControllers: ['missing_hand_ctrl'] },
      characterName: 'Hero',
      documentPath: '/tmp/shot-compiler.moho'
    })).toThrow(/unknown controller/i);

    expect(() => compileMohoProductionPlanV3({
      artwork,
      blueprint,
      performance: { ...performance, interactionConflicts: ['two hands claim prop'] },
      characterName: 'Hero',
      documentPath: '/tmp/shot-compiler.moho'
    })).toThrow(/interaction conflict/i);
  });
});
