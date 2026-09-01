import { MohoCommandBuilder } from '../src/services/mohoCommandBuilder/index.js';
import { type MohoPerformancePir } from '../src/schemas/mohoPerformancePir.js';
import { emitMohoLua } from '../src/services/mohoLuaEmitter/index.js';
import { validMohoCharacterBible } from './fixtures/mohoShowBible.valid.js';

function minimalPir(): MohoPerformancePir {
  return {
    schemaVersion: '1.0',
    performanceId: 'MOHO-PRODUCTION-TEST',
    rigType: 'humanoid_2leg',
    shotManifestRef: 'shot_001',
    mohoShowBibleRef: 'char_test_humanoid',
    boneKeys: [],
    switchKeys: [],
    smartBoneActions: [],
    cameraKeys: [],
    fxKeys: [],
    deterministicFingerprint: 'a'.repeat(64),
    provenance: {
      compiledAt: '1970-01-01T00:00:00.000Z',
      compilerVersion: 'production-test'
    }
  };
}

describe('MohoCommandBuilder production contracts', () => {
  it('gives every switch choice the real parent switch layer name', () => {
    const bible = validMohoCharacterBible();
    const plan = new MohoCommandBuilder().buildPlan({
      pir: minimalPir(),
      characterBible: bible
    });

    const choices = plan.operations.filter(operation => operation.type === 'add_switch_choice');
    const expectedChoices = bible.switchLayers.flatMap(layer =>
      layer.choices.map(choice => [layer.layerName, choice.drawingName])
    );
    expect(choices.map(operation => [operation.params.layerName, operation.params.choiceName]))
      .toEqual(expectedChoices);
  });

  it('builds byte-identical plans for identical approved inputs', () => {
    const bible = validMohoCharacterBible();
    const builder = new MohoCommandBuilder();
    const first = builder.buildPlan({ pir: minimalPir(), characterBible: bible });
    const second = builder.buildPlan({ pir: minimalPir(), characterBible: bible });

    expect(second).toEqual(first);
  });

  it('preserves timed switch choices as executable plan operations', () => {
    const bible = validMohoCharacterBible();
    const pir = minimalPir();
    pir.switchKeys = [{
      switchLayerName: 'Mouth',
      frame: 12,
      choice: 'mouth_open',
      interpolation: 'step'
    }];

    const plan = new MohoCommandBuilder().buildPlan({ pir, characterBible: bible });
    const switchKeys = plan.operations.filter(operation => operation.type === 'set_switch_key');

    expect(switchKeys.map(operation => operation.params)).toEqual([{
      layerName: 'Mouth',
      frame: 12,
      choiceName: 'mouth_open'
    }]);
    expect(emitMohoLua(plan, bible.name)).toContain(
      'setSwitchKey("Mouth", 12, "mouth_open")'
    );
  });

  it('preserves camera motion as executable Moho camera channel keys', () => {
    const bible = validMohoCharacterBible();
    const pir = minimalPir();
    pir.cameraKeys = [
      { frame: 1, x: 0, zoom: 1, rotation: 0 },
      { frame: 24, x: 120, y: -48, zoom: 1.25, rotation: 6 }
    ];

    const plan = new MohoCommandBuilder().buildPlan({ pir, characterBible: bible });
    const cameraKeys = plan.operations.filter(operation => operation.type === ('set_camera_key' as any));

    expect(cameraKeys.map(operation => operation.params)).toEqual([
      { frame: 1, xPixels: 0, yPixels: undefined, zoom: 1, rotationDeg: 0 },
      { frame: 24, xPixels: 120, yPixels: -48, zoom: 1.25, rotationDeg: 6 }
    ]);

    const lua = emitMohoLua(plan, bible.name);
    expect(lua).toContain('setCameraKey(1, 0, nil, 1, 0)');
    expect(lua).toContain('setCameraKey(24, 120, -48, 1.25, 6)');
    expect(lua).toContain('doc().fCameraTrack:SetValue(frame, position)');
    expect(lua).toContain('doc().fCameraZoom:SetValue(frame, zoom)');
    expect(lua).toContain('doc().fCameraRoll:SetValue(frame, math.rad(rotationDeg))');
  });

  it('builds positioned bone hierarchy before binding approved artwork layers', () => {
    const bible: any = validMohoCharacterBible();
    bible.controllers[0].parentBoneName = 'body_root';
    bible.controllers[0].layerName = 'Head_Artwork';
    bible.controllers[0].restPose = {
      xPixels: 100,
      yPixels: 72,
      lengthPixels: 48,
      angleDeg: 90
    };
    bible.controllers[1].restPose = {
      xPixels: 100,
      yPixels: 140,
      lengthPixels: 72,
      angleDeg: 90
    };

    const plan = new MohoCommandBuilder().buildPlan({ pir: minimalPir(), characterBible: bible });
    const headBone = plan.operations.find(
      operation => operation.type === 'add_bone' && operation.params.name === 'head_root'
    );
    const parent = plan.operations.find(operation => operation.type === 'set_bone_parent');
    const binding = plan.operations.find(operation => operation.type === 'bind_layer_to_bone');
    const lastBoneIndex = plan.operations.map(operation => operation.type).lastIndexOf('add_bone');

    expect(headBone?.params).toMatchObject({
      x: 100,
      y: 72,
      lengthPx: 48,
      angleDeg: 90
    });
    expect(parent?.params).toEqual({ boneId: 'head_root', parentBoneId: 'body_root' });
    expect(plan.operations.indexOf(parent!)).toBeGreaterThan(lastBoneIndex);
    expect(binding?.params).toEqual({ layerName: 'Head_Artwork', boneId: 'head_root' });
    expect(plan.operations.indexOf(binding!)).toBeGreaterThan(plan.operations.indexOf(parent!));

    const lua = emitMohoLua(plan, bible.name);
    expect(lua).toContain('local pixelsToWorld = 6.0 / doc():Height()');
    expect(lua).toContain('b.fLength = len * pixelsToWorld');
    expect(lua).toContain('b.fAnimPos:SetValue(0, LM.Vector2:new_local(x * pixelsToWorld, y * pixelsToWorld))');
  });

  it('turns PIR bone motion into real Moho animation channel writes', () => {
    const bible = validMohoCharacterBible();
    bible.controllers.find(controller => controller.boneName === 'eye_blink')!.layerName = 'Eye';
    const pir = minimalPir();
    pir.boneKeys = [
      { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 8, value: 15, interpolation: 'ease_in_out' },
      { boneId: 1, boneName: 'body_root', channel: 'translation', frame: 8, value: 24, interpolation: 'ease_in_out' },
      { boneId: 4, boneName: 'mouth_dial', channel: 'scale', frame: 8, value: 1.1, interpolation: 'ease_in_out' },
      { boneId: 5, boneName: 'eye_blink', channel: 'opacity', frame: 8, value: 0.5, interpolation: 'ease_in_out' }
    ];

    const plan = new MohoCommandBuilder().buildPlan({ pir, characterBible: bible });
    const boneKeys = plan.operations.filter(operation => operation.type === ('set_bone_channel_key' as any));

    expect(boneKeys).toHaveLength(4);
    const lua = emitMohoLua(plan, bible.name);
    expect(lua).toContain('b.fAnimAngle:SetValue(frame, math.rad(value))');
    expect(lua).toContain('b.fAnimPos:SetValue(frame, position)');
    expect(lua).toContain('b.fAnimScale:SetValue(frame, value)');
    expect(lua).toContain('targetLayer.fAlpha:SetValue(frame, value)');
  });

  it('emits the installed Moho 14 layer and switch APIs', () => {
    const bible = validMohoCharacterBible();
    const plan = new MohoCommandBuilder().buildPlan({ pir: minimalPir(), characterBible: bible });
    const lua = emitMohoLua(plan, bible.name);

    expect(lua).toContain('function MohoScript(moho)');
    expect(lua).toContain('moho:CreateNewLayer(MOHO.LT_BONE, false)');
    expect(lua).toContain('moho:LayerAsBone(l)');
    expect(lua).toContain('moho:CreateNewLayer(MOHO.LT_SWITCH, false)');
    expect(lua).toContain('s:SetValue(frame, choiceName)');
    expect(lua).not.toContain('MOHO_LAYER_TYPE_');
    expect(lua).not.toContain('LayerAsSkeleton');
    expect(lua).not.toContain('fSwitchChannel');
    expect(lua).not.toContain('local moho = moho or assert');
  });
});
