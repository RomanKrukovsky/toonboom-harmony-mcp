import { MohoProductionQualityAuditor } from '../src/services/mohoProductionQualityAuditor/index.js';

const expected = {
  saved_bone_ids: ['arm', 'hand', 'root'],
  saved_layer_ids: ['body', 'mouth'],
  saved_layer_order: ['body', 'mouth'],
  parent_bone_pairs: [
    { boneId: 'arm', parentBoneId: 'root' },
    { boneId: 'hand', parentBoneId: 'arm' }
  ],
  binding_pairs: [
    { partId: 'body', boneId: 'root' },
    { partId: 'hand_art', boneId: 'hand' }
  ],
  switch_choices: { mouth: ['A', 'B'] },
  action_driver_targets: [
    { actionId: 'arm_bend', driverBoneId: 'arm', targetBoneIds: ['hand'] }
  ],
  mesh_point_counts: { face_mesh: 8 },
  vitruvian_membership: { arms: ['arm', 'hand'] }
};

describe('Moho native rig structural comparison', () => {
  test('accepts an exact native round-trip match independent of array order', () => {
    const actual = {
      ...expected,
      saved_bone_ids: ['root', 'hand', 'arm'],
      binding_pairs: [...expected.binding_pairs].reverse(),
      switch_choices: { mouth: ['B', 'A'] },
      vitruvian_membership: { arms: ['hand', 'arm'] }
    };

    const report = MohoProductionQualityAuditor.compareNativeStructure(expected, actual);

    expect(report.passed).toBe(true);
    expect(report.mismatches).toEqual([]);
  });

  test('rejects a deliberately broken binding and names the failed category', () => {
    const actual = {
      ...expected,
      binding_pairs: [
        { partId: 'body', boneId: 'root' },
        { partId: 'hand_art', boneId: 'arm' }
      ]
    };

    const report = MohoProductionQualityAuditor.compareNativeStructure(expected, actual);

    expect(report.passed).toBe(false);
    expect(report.bindingsMatch).toBe(false);
    expect(report.bonesMatch).toBe(true);
    expect(report.mismatches).toContain('bindings');
  });
});
