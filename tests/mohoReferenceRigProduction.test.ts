import {
  buildRigFromTemplate,
  HUMANOID_TEMPLATE
} from '../src/services/mohoReferenceRigTemplates/index.js';
import { emitMohoLua } from '../src/services/mohoLuaEmitter/index.js';
import { validMohoCharacterBible } from './fixtures/mohoShowBible.valid.js';

describe('Moho reference rig production contracts', () => {
  it('builds byte-identical reference plans for identical approved inputs', () => {
    const bible = validMohoCharacterBible();

    const first = buildRigFromTemplate(HUMANOID_TEMPLATE, bible);
    const second = buildRigFromTemplate(HUMANOID_TEMPLATE, bible);

    expect(second).toEqual(first);
  });

  it('converts absolute template coordinates into parent-local bone transforms', () => {
    const plan = buildRigFromTemplate(HUMANOID_TEMPLATE, validMohoCharacterBible());
    const pelvis = plan.operations.find(
      operation => operation.type === 'add_bone' && operation.params.name === 'Pelvis'
    );

    expect(pelvis?.params).toMatchObject({
      x: 60,
      y: 0,
      angleDeg: 0,
      lengthPx: 30
    });
  });

  it('emits real Moho bone-group operations for Vitruvian groups', () => {
    const bible = validMohoCharacterBible();
    const lua = emitMohoLua(buildRigFromTemplate(HUMANOID_TEMPLATE, bible), bible.name);

    expect(lua).toContain('group = skel:AddGroup(0)');
    expect(lua).toContain('group:AddBone(boneId)');
    expect(lua).toContain('group.fActiveBone:SetValue(0, boneId)');
    expect(lua).toContain('if switchCount < expectSwitches then');
    expect(lua).not.toContain('fIsVitruvian');
  });

  it('creates real Smart Bone actions instead of logging a pretend wire', () => {
    const bible = validMohoCharacterBible();
    const lua = emitMohoLua(buildRigFromTemplate(HUMANOID_TEMPLATE, bible), bible.name);

    expect(lua).toContain('layer:ActivateAction(smartId)');
    expect(lua).toContain('driver.fAnimAngle:SetValue(100, math.rad(driverMaxAngle))');
    expect(lua).toContain('target.fAnimAngle:SetValue(100, math.rad(targetMaxAngle))');
    expect(lua).not.toContain('print("[WIRE]');
  });

  it('creates populated warp geometry and binds it to a distinct artwork layer', () => {
    const bible = validMohoCharacterBible();
    const plan = buildRigFromTemplate(HUMANOID_TEMPLATE, bible);
    const bind = plan.operations.find(operation => operation.type === 'bind_smart_warp_mesh');
    const lua = emitMohoLua(plan, bible.name);

    expect(bind?.params.targetLayerName).toBe('Body_Artwork');
    expect(bind?.params.meshLayerName).toBe('Body_Mesh');
    expect(lua).toContain('mesh:AddLonePoint(point, 0)');
    expect(lua).toContain('mesh:AppendPoint(point, 0)');
    expect(lua).toContain('target:SetWarpLayer(meshLayer)');
    expect(lua).toContain('warp:MarkAsWarpLayer(true, target)');
    expect(lua).not.toContain('print("[SMART_WARP]');
  });

  it('creates visible shadow geometry and verifies meshes, warps and actions', () => {
    const bible = validMohoCharacterBible();
    const lua = emitMohoLua(buildRigFromTemplate(HUMANOID_TEMPLATE, bible), bible.name);

    expect(lua).toContain('shadowMesh:AddLonePoint(point, 0)');
    expect(lua).toContain('moho:CreateShape(true)');
    expect(lua).toContain('if meshCount < expectMeshes then');
    expect(lua).toContain('if warpCount < expectWarps then');
    expect(lua).toContain('if actionCount < expectActions then');
    expect(lua).not.toContain('print(string.format("[SHADOW]');
  });
});
