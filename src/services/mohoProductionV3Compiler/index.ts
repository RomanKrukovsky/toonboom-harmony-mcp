import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import {
  MOHO_COMMAND_PLAN_SCHEMA,
  mohoCommandPlanSchema,
  type MohoCommand,
  type MohoCommandPlan
} from '../../schemas/mohoCommandPlan.js';
import {
  artworkPackV3Schema,
  performancePlanV3Schema,
  rigBlueprintV3Schema,
  type ArtworkPackV3,
  type PerformancePlanV3,
  type RigBlueprintV3
} from '../../schemas/mohoProductionV3.js';

export interface CompileMohoProductionPlanV3Input {
  artwork: ArtworkPackV3;
  blueprint: RigBlueprintV3;
  performance?: PerformancePlanV3;
  characterName: string;
  documentPath: string;
}

interface AssetReference {
  id: string;
  sourcePath: string;
}

function stableSha256(value: unknown): string {
  return crypto.createHash('sha256').update(stringify(value) || '').digest('hex');
}

function assertion(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validatePerformance(
  performance: PerformancePlanV3 | undefined,
  bones: Map<string, string>,
  switches: Map<string, RigBlueprintV3['switches'][number]>
): void {
  if (!performance) return;
  assertion(performance.unknownControllers.length === 0, `Unknown controller: ${performance.unknownControllers.join(', ')}`);
  assertion(performance.interactionConflicts.length === 0, `Interaction conflict: ${performance.interactionConflicts.join(', ')}`);
  const failedContinuity = performance.continuityChecks.filter(check => !check.passed);
  assertion(failedContinuity.length === 0, `Continuity gap: ${failedContinuity.map(check => check.note).join('; ')}`);

  for (const character of performance.characters) {
    const boneTracks = [
      character.poseKeys,
      character.gazeKeys,
      character.gestureKeys,
      character.secondaryMotionKeys,
      character.interactionKeys
    ];
    for (const key of boneTracks.flat()) {
      assertion(bones.has(key.boneId), `Unknown controller: ${key.boneId}`);
    }

    const switchTracks = [character.emotionKeys, character.mouthKeys, character.blinkKeys];
    for (const key of switchTracks.flat()) {
      const switchDefinition = switches.get(key.switchId);
      assertion(switchDefinition, `Unknown controller: ${key.switchId}`);
      assertion(
        switchDefinition.choices.some(choice => choice.choiceId === key.choice),
        `Unknown switch choice: ${key.switchId}/${key.choice}`
      );
    }
  }
}

export function compileMohoProductionPlanV3(input: CompileMohoProductionPlanV3Input): MohoCommandPlan {
  const artwork = artworkPackV3Schema.parse(input.artwork);
  const blueprint = rigBlueprintV3Schema.parse(input.blueprint);
  const performance = input.performance ? performancePlanV3Schema.parse(input.performance) : undefined;

  assertion(artwork.shotId === blueprint.shotId, 'Artwork and rig blueprint shotId must match.');
  assertion(!performance || performance.shotId === artwork.shotId, 'Performance plan shotId must match artwork.');
  assertion(input.characterName.trim().length > 0, 'characterName is required.');
  assertion(input.documentPath.toLowerCase().endsWith('.moho'), 'documentPath must end with .moho.');

  const bones = new Map(blueprint.bones.map(bone => [bone.boneId, bone.name]));
  const switches = new Map(blueprint.switches.map(switchDefinition => [switchDefinition.switchId, switchDefinition]));
  const assets = new Map<string, AssetReference>();
  for (const part of artwork.parts) assets.set(part.partId, { id: part.partId, sourcePath: part.sourcePath });
  for (const drawing of artwork.drawingAssets) assets.set(drawing.drawingId, { id: drawing.drawingId, sourcePath: drawing.sourcePath });

  validatePerformance(performance, bones, switches);

  const operations: MohoCommand[] = [];
  let commandCounter = 1;
  const push = (
    type: MohoCommand['type'],
    params: Record<string, unknown>,
    preconditions: string[],
    identity: string,
    kind: string,
    path: string | null,
    destructiveLevel: MohoCommand['destructiveLevel'] = 'reversible'
  ): void => {
    operations.push({
      commandId: `mcmd_${String(commandCounter++).padStart(4, '0')}`,
      type,
      params,
      preconditions,
      destructiveLevel,
      idempotencyKey: identity.padEnd(12, '_').slice(0, 64),
      rollback: destructiveLevel === 'reversible'
        ? { strategy: 'delete_created', snapshotRequired: false }
        : { strategy: 'none', snapshotRequired: false },
      expectedArtifact: { kind, path, nonempty: true },
      verification: { method: 'native_moho_audit', required: true, acceptance: ['verified'] }
    });
  };

  for (const part of [...artwork.parts].sort((left, right) => left.zIndex - right.zIndex || left.partId.localeCompare(right.partId))) {
    push('import_image_layer', { layerName: part.partId, sourcePath: part.sourcePath }, ['rig_open'], `image_${part.partId}`, 'image_layer', part.partId);
  }

  for (const bone of blueprint.bones) {
    push('add_bone', {
      boneId: bone.boneId,
      name: bone.name,
      x: bone.x,
      y: bone.y,
      lengthPx: bone.lengthPx,
      angleDeg: bone.angleDeg
    }, ['skeleton_layer_exists', 'rig_open'], `bone_${bone.boneId}`, 'bone', bone.name);
    if (bone.parentBoneId !== null) {
      const parentName = bones.get(bone.parentBoneId);
      assertion(parentName, `Unknown parent bone: ${bone.parentBoneId}`);
      push('set_bone_parent', { boneId: bone.name, parentBoneId: parentName }, ['skeleton_layer_exists', 'rig_open'], `parent_${bone.boneId}`, 'bone_parent', bone.name);
    }
  }

  for (const constraint of blueprint.constraints) {
    const boneName = bones.get(constraint.boneId);
    assertion(boneName, `Unknown constrained bone: ${constraint.boneId}`);
    push('set_bone_constraints', {
      boneName,
      minAngle: constraint.minAngleDeg,
      maxAngle: constraint.maxAngleDeg,
      controlBone: '',
      scaleControl: 1
    }, ['skeleton_layer_exists', 'rig_open'], `constraint_${constraint.boneId}`, 'bone_constraint', boneName);
  }

  for (const binding of blueprint.bindings) {
    const part = assets.get(binding.partId);
    const boneName = bones.get(binding.boneId);
    assertion(part, `Unknown binding part: ${binding.partId}`);
    assertion(boneName, `Unknown binding bone: ${binding.boneId}`);
    switch (binding.mode) {
      case 'layer':
        push('bind_layer_to_bone', { layerName: part.id, boneId: boneName }, ['skeleton_layer_exists', 'rig_open'], `binding_${binding.partId}`, 'layer_binding', part.id);
        break;
      case 'flexi':
        push('bind_layer_flexi', { layerName: part.id }, ['skeleton_layer_exists', 'rig_open'], `binding_${binding.partId}`, 'flexi_binding', part.id);
        break;
      case 'point':
        throw new Error(`Point binding is unsupported for raster part: ${binding.partId}`);
      default: {
        const exhaustive: never = binding.mode;
        throw new Error(`Unsupported binding mode: ${String(exhaustive)}`);
      }
    }
  }

  for (const switchDefinition of blueprint.switches) {
    push('create_switch_layer', { layerName: switchDefinition.layerName }, ['rig_open'], `switch_${switchDefinition.switchId}`, 'switch_layer', switchDefinition.layerName);
    for (const choice of switchDefinition.choices) {
      const asset = assets.get(choice.partId);
      assertion(asset, `Unknown switch asset: ${choice.partId}`);
      push('add_switch_image_choice', {
        layerName: switchDefinition.layerName,
        choiceName: choice.choiceId,
        sourcePath: asset.sourcePath
      }, ['rig_open', `switch_layer_exists:${switchDefinition.layerName}`], `choice_${switchDefinition.switchId}_${choice.choiceId}`, 'switch_choice', `${switchDefinition.layerName}/${choice.choiceId}`);
    }
  }

  const smartBoneDrivers = new Set<string>();
  for (const action of blueprint.actions) {
    const driverName = bones.get(action.driverBoneId);
    assertion(driverName, `Unknown Smart Action driver: ${action.driverBoneId}`);
    assertion(!smartBoneDrivers.has(driverName), `Multiple Smart Actions use driver bone ${driverName}; Moho requires one action per driver.`);
    smartBoneDrivers.add(driverName);
    for (const target of action.targets) {
      const targetName = bones.get(target.boneId);
      assertion(targetName, `Unknown Smart Action target: ${target.boneId}`);
      push('wire_smart_bone_channel', {
        smartBoneId: driverName,
        targetBoneId: targetName,
        driverMinAngle: action.driverMinAngleDeg,
        driverMaxAngle: action.driverMaxAngleDeg,
        targetMinAngle: target.minAngleDeg,
        targetMaxAngle: target.maxAngleDeg
      }, ['skeleton_layer_exists', 'rig_open'], `action_${action.actionId}_${target.boneId}`, 'smart_action', action.actionId);
    }
  }

  for (const mesh of blueprint.warpMeshes) {
    const target = assets.get(mesh.targetPartId);
    assertion(target, `Unknown Smart Warp target: ${mesh.targetPartId}`);
    push('create_mesh_layer', {
      meshLayerName: mesh.meshId,
      pointCount: mesh.points.length,
      points: mesh.points
    }, ['rig_open'], `mesh_${mesh.meshId}`, 'mesh_layer', mesh.meshId);
    push('bind_smart_warp_mesh', {
      targetLayerName: target.id,
      meshLayerName: mesh.meshId
    }, ['rig_open', `layer_exists:${target.id}`], `warp_${mesh.meshId}`, 'smart_warp', mesh.meshId);
  }

  for (const group of blueprint.vitruvianGroups) {
    const defaultBone = bones.get(group.defaultActiveBoneId);
    assertion(defaultBone, `Unknown Vitruvian default bone: ${group.defaultActiveBoneId}`);
    push('create_vitruvian_group', {
      groupName: group.groupName,
      defaultActiveBone: defaultBone
    }, ['skeleton_layer_exists', 'rig_open'], `vitruvian_${group.groupName}`, 'vitruvian_group', group.groupName);
    for (const boneId of group.boneIds) {
      const boneName = bones.get(boneId);
      assertion(boneName, `Unknown Vitruvian bone: ${boneId}`);
      push('add_vitruvian_bone', { groupName: group.groupName, boneName }, ['skeleton_layer_exists', 'rig_open'], `vitruvian_${group.groupName}_${boneId}`, 'vitruvian_bone', boneName);
    }
  }

  for (const shadow of blueprint.shadows ?? []) {
    const rootBone = bones.get(shadow.rootBoneId);
    assertion(rootBone, `Unknown projected shadow root bone: ${shadow.rootBoneId}`);
    push('create_projected_shadow', {
      layerName: shadow.layerName,
      rootBone,
      scaleY: shadow.scaleY
    }, ['skeleton_layer_exists', 'rig_open'], `shadow_${shadow.layerName}`, 'projected_shadow', shadow.layerName);
  }

  if (performance) {
    for (const character of performance.characters) {
      const boneTracks = [
        character.poseKeys,
        character.gazeKeys,
        character.gestureKeys,
        character.secondaryMotionKeys,
        character.interactionKeys
      ];
      for (const key of boneTracks.flat()) {
        const boneName = bones.get(key.boneId);
        assertion(boneName, `Unknown controller: ${key.boneId}`);
        push('set_bone_channel_key', {
          boneName,
          layerName: '',
          frame: key.frame,
          channel: key.channel,
          value: key.value
        }, ['skeleton_layer_exists', 'rig_open'], `bone_key_${character.characterRef}_${key.boneId}_${key.frame}_${key.channel}`, 'animation_key', boneName, 'none');
      }

      const switchTracks = [character.emotionKeys, character.mouthKeys, character.blinkKeys];
      for (const key of switchTracks.flat()) {
        const switchDefinition = switches.get(key.switchId);
        assertion(switchDefinition, `Unknown controller: ${key.switchId}`);
        push('set_switch_key', {
          layerName: switchDefinition.layerName,
          frame: key.frame,
          choiceName: key.choice
        }, ['rig_open'], `switch_key_${character.characterRef}_${key.switchId}_${key.frame}`, 'animation_key', switchDefinition.layerName, 'none');
      }
    }
    for (const key of performance.cameraKeys) {
      push('set_camera_key', key, ['rig_open'], `camera_key_${key.frame}`, 'camera_key', String(key.frame), 'none');
    }
  }

  push('verify_rig', {
    expect_bones: blueprint.bones.length,
    expect_switches: blueprint.switches.length,
    expect_meshes: blueprint.warpMeshes.length,
    expect_warps: blueprint.warpMeshes.length,
    expect_actions: smartBoneDrivers.size
  }, ['skeleton_layer_exists', 'rig_open'], `verify_${artwork.shotId}`, 'rig', null, 'none');
  push('save_document', { documentPath: input.documentPath }, ['rig_open', 'document_dirty'], `save_${artwork.shotId}`, 'document', input.documentPath, 'none');

  const sourceHash = stableSha256({ artwork, blueprint, performance: performance ?? null });
  const plan: MohoCommandPlan = {
    schemaVersion: MOHO_COMMAND_PLAN_SCHEMA,
    planId: `PRODV3-${sourceHash.slice(0, 16).toUpperCase()}`,
    documentPath: input.documentPath,
    createdAt: '1970-01-01T00:00:00.000Z',
    status: 'implemented_unverified',
    requiresRealMoho: true,
    sourceManifestSha256: sourceHash,
    operations,
    acceptanceGates: [
      'source_assets_loaded',
      'skeleton_matches_blueprint',
      'bindings_match_blueprint',
      'switches_match_blueprint',
      'smart_actions_match_blueprint',
      'smart_warp_matches_blueprint',
      'native_open_save_reopen',
      'document_saved'
    ],
    provenance: {
      compiler: 'MohoRigPlanCompiler v1',
      source: `MohoProductionV3:${artwork.shotId}`,
      characterName: input.characterName
    }
  };
  return mohoCommandPlanSchema.parse(plan) as MohoCommandPlan;
}
