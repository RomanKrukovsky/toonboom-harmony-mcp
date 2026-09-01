import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import {
  type MohoCommand,
  type MohoCommandPlan,
  MOHO_COMMAND_PLAN_SCHEMA,
  mohoCommandPlanSchema
} from '../../schemas/mohoCommandPlan.js';
import { type MohoCharacterBible } from '../../schemas/mohoCharacterBible.js';
import { type MohoPerformancePir } from '../../schemas/mohoPerformancePir.js';

export const MOHO_COMMAND_BUILDER_VERSION = 'MohoCommandBuilder v1';

export interface MohoCommandBuilderOptions {
  pir: MohoPerformancePir;
  characterBible: MohoCharacterBible;
  documentPath?: string | null;
  compilerName?: string;
}

export interface MohoCommandBuilderResult {
  plan: MohoCommandPlan;
  fingerprint: string;
}

interface MutableCmd {
  commandId: string;
  type: MohoCommand['type'];
  params: Record<string, any>;
  preconditions: string[];
  destructiveLevel: MohoCommand['destructiveLevel'];
  idempotencyKey: string;
  rollback: MohoCommand['rollback'];
  expectedArtifact: MohoCommand['expectedArtifact'];
  verification: MohoCommand['verification'];
}

export class MohoCommandBuilder {
  public buildPlan(opts: MohoCommandBuilderOptions): MohoCommandPlan {
    const { pir, characterBible, documentPath = null, compilerName = MOHO_COMMAND_BUILDER_VERSION } = opts;
    const operations: MohoCommand[] = [];
    let counter = 1;
    const gen = (): string => `mcmd_${(counter++).toString().padStart(4, '0')}`;
    const skeletonLayerName = `${characterBible.name}_Skeleton`;

    const made: MutableCmd[] = [];
    const push = (c: MutableCmd): void => {
      const parsed = mohoCommandPlanSchema.shape.operations.element.parse(c);
      made.push(parsed as MutableCmd);
    };

    for (const ctrl of characterBible.controllers) {
      const restPose = ctrl.restPose ?? {
        xPixels: 0,
        yPixels: 0,
        lengthPixels: 50,
        angleDeg: 0
      };
      push({
        commandId: gen(),
        type: 'add_bone',
        params: {
          boneId: ctrl.boneId,
          name: ctrl.boneName,
          x: restPose.xPixels,
          y: restPose.yPixels,
          lengthPx: restPose.lengthPixels,
          angleDeg: restPose.angleDeg
        },
        preconditions: ['skeleton_layer_exists', 'rig_open'],
        destructiveLevel: 'reversible',
        idempotencyKey: `add_bone_${ctrl.boneName}_${ctrl.boneId}`,
        rollback: { strategy: 'delete_created', snapshotRequired: false },
        expectedArtifact: { kind: 'bone', path: ctrl.boneName, nonempty: true },
        verification: { method: 'bone_exists', required: true, acceptance: ['count >= 1'] }
      });
    }

    const controllerBoneNames = new Set(characterBible.controllers.map(controller => controller.boneName));
    for (const ctrl of characterBible.controllers) {
      const parentName = ctrl.parentBoneName;
      if (parentName) {
        if (!controllerBoneNames.has(parentName)) {
          throw new Error(`bone "${ctrl.boneName}" references unknown parent: ${parentName}`);
        }
        push({
          commandId: gen(),
          type: 'set_bone_parent',
          params: {
            boneId: ctrl.boneName,
            parentBoneId: parentName
          },
          preconditions: [
            'skeleton_layer_exists',
            `bone_exists:${ctrl.boneName}`,
            `bone_exists:${parentName}`,
            'rig_open'
          ],
          destructiveLevel: 'reversible',
          idempotencyKey: `set_bone_parent_${ctrl.boneId}_${ctrl.boneName}_to_${parentName}`,
          rollback: { strategy: 'none', snapshotRequired: false },
          expectedArtifact: { kind: 'bone', path: ctrl.boneName, nonempty: true },
          verification: { method: 'bone_exists', required: true, acceptance: ['count >= 1'] }
        });
      }
    }

    for (const sw of characterBible.switchLayers) {
      push({
        commandId: gen(),
        type: 'create_switch_layer',
        params: {
          switchId: sw.switchId,
          layerName: sw.layerName
        },
        preconditions: ['rig_open'],
        destructiveLevel: 'reversible',
        idempotencyKey: `create_switch_layer_${sw.switchId}_${sw.layerName}`,
        rollback: { strategy: 'delete_created', snapshotRequired: false },
        expectedArtifact: { kind: 'switch_layer', path: sw.layerName, nonempty: true },
        verification: { method: 'switch_layer_exists', required: true, acceptance: ['count >= 1'] }
      });
      for (const choice of sw.choices) {
        push({
          commandId: gen(),
        type: 'add_switch_choice',
        params: {
          layerName: sw.layerName,
          choiceId: choice.choiceId,
          choiceName: choice.drawingName
          },
          preconditions: ['rig_open', `switch_layer_exists:${sw.layerName}`],
          destructiveLevel: 'reversible',
          idempotencyKey: `add_switch_choice_${sw.switchId}_${choice.choiceId}`,
          rollback: { strategy: 'none', snapshotRequired: false },
          expectedArtifact: { kind: 'switch_choice', path: `${sw.layerName}/${choice.drawingName}`, nonempty: true },
          verification: { method: 'count_equals', required: true, acceptance: ['count >= 1'] }
        });
      }
    }

    for (const ctrl of characterBible.controllers) {
      const bindTarget = ctrl.layerName;
      if (bindTarget) {
        push({
          commandId: gen(),
          type: 'bind_layer_to_bone',
          params: {
            layerName: bindTarget,
            boneId: ctrl.boneName
          },
          preconditions: [
            'skeleton_layer_exists',
            `bone_exists:${ctrl.boneName}`,
            `layer_exists:${bindTarget}`,
            'rig_open'
          ],
          destructiveLevel: 'reversible',
          idempotencyKey: `bind_layer_to_bone_${bindTarget}_${ctrl.boneName}`,
          rollback: { strategy: 'none', snapshotRequired: false },
          expectedArtifact: { kind: 'bone', path: ctrl.boneName, nonempty: true },
          verification: { method: 'bone_exists', required: true, acceptance: ['count >= 1'] }
        });
      }
    }

    const sortedSwitchKeys = [...pir.switchKeys].sort((a, b) => {
      if (a.frame !== b.frame) return a.frame - b.frame;
      if (a.switchLayerName !== b.switchLayerName) {
        return a.switchLayerName.localeCompare(b.switchLayerName);
      }
      return a.choice.localeCompare(b.choice);
    });
    for (const key of sortedSwitchKeys) {
      const switchLayer = characterBible.switchLayers.find(
        candidate => candidate.layerName === key.switchLayerName
      );
      if (!switchLayer) {
        throw new Error(`switch key references unknown layer: ${key.switchLayerName}`);
      }
      if (!switchLayer.choices.some(choice => choice.drawingName === key.choice)) {
        throw new Error(
          `switch key references unknown choice: ${key.switchLayerName}/${key.choice}`
        );
      }
      push({
        commandId: gen(),
        type: 'set_switch_key',
        params: {
          layerName: key.switchLayerName,
          frame: key.frame,
          choiceName: key.choice
        },
        preconditions: ['rig_open', `switch_layer_exists:${key.switchLayerName}`],
        destructiveLevel: 'reversible',
        idempotencyKey: `set_switch_key_${key.switchLayerName}_${key.frame}_${key.choice}`,
        rollback: { strategy: 'none', snapshotRequired: false },
        expectedArtifact: {
          kind: 'switch_key',
          path: `${key.switchLayerName}/${key.frame}`,
          nonempty: true
        },
        verification: { method: 'switch_key_exists', required: true, acceptance: ['count >= 1'] }
      });
    }

    const actionKeysByName = new Map<string, typeof pir.smartBoneActions>();
    for (const k of pir.smartBoneActions) {
      const arr = actionKeysByName.get(k.actionName) ?? [];
      arr.push(k);
      actionKeysByName.set(k.actionName, arr);
    }
    for (const [actionName, keys] of actionKeysByName) {
      const targetBone = keys[0]?.targetBone ?? 'Master';
      push({
        commandId: gen(),
        type: 'create_smart_action',
        params: {
          actionName,
          targetBone
        },
        preconditions: ['skeleton_layer_exists', 'rig_open'],
        destructiveLevel: 'reversible',
        idempotencyKey: `create_smart_action_${actionName}`,
        rollback: { strategy: 'delete_created', snapshotRequired: false },
        expectedArtifact: { kind: 'action', path: actionName, nonempty: true },
        verification: { method: 'count_equals', required: true, acceptance: ['count >= 1'] }
      });
      const sorted = [...keys].sort((a, b) => a.frame - b.frame);
      for (const k of sorted) {
        push({
          commandId: gen(),
          type: 'set_action_channel_key',
          params: {
            actionName,
            boneName: k.targetBone,
            frame: k.frame,
            angleDeg: k.angleDeg,
            scaleX: k.scaleX,
            scaleY: k.scaleY
          },
          preconditions: ['skeleton_layer_exists', `action_exists:${actionName}`, 'rig_open'],
          destructiveLevel: 'reversible',
          idempotencyKey: `set_action_channel_key_${actionName}_${k.targetBone}_${k.frame}`,
          rollback: { strategy: 'none', snapshotRequired: false },
          expectedArtifact: { kind: 'action', path: `${actionName}/${k.targetBone}`, nonempty: true },
          verification: { method: 'count_equals', required: true, acceptance: ['count >= 1'] }
        });
      }
    }

    const sortedBoneKeys = [...pir.boneKeys].sort((a, b) => {
      if (a.boneId !== b.boneId) return a.boneId - b.boneId;
      return a.frame - b.frame;
    });
    const controllersByBoneName = new Map(
      characterBible.controllers.map(controller => [controller.boneName, controller])
    );
    for (const bk of sortedBoneKeys) {
      const controller = controllersByBoneName.get(bk.boneName);
      if (!controller) {
        throw new Error(`bone key references unknown bone: ${bk.boneName}`);
      }
      if (bk.channel === 'opacity' && !controller.layerName) {
        throw new Error(`opacity key for bone "${bk.boneName}" requires controller.layerName`);
      }
      push({
        commandId: gen(),
        type: 'set_bone_channel_key',
        params: {
          boneName: bk.boneName,
          layerName: controller.layerName,
          frame: bk.frame,
          channel: bk.channel,
          value: bk.value,
          interpolation: bk.interpolation
        },
        preconditions: ['skeleton_layer_exists', `bone_exists:${bk.boneName}`, 'rig_open'],
        destructiveLevel: 'reversible',
        idempotencyKey: `set_bone_channel_key_${bk.boneId}_${bk.boneName}_${bk.channel}_${bk.frame}`,
        rollback: { strategy: 'none', snapshotRequired: false },
        expectedArtifact: {
          kind: 'bone_key',
          path: `${bk.boneName}/${bk.channel}/${bk.frame}`,
          nonempty: true
        },
        verification: { method: 'bone_key_exists', required: true, acceptance: ['count >= 1'] }
      });
    }

    const sortedCameraKeys = [...pir.cameraKeys].sort((a, b) => a.frame - b.frame);
    for (const key of sortedCameraKeys) {
      push({
        commandId: gen(),
        type: 'set_camera_key',
        params: {
          frame: key.frame,
          xPixels: key.x,
          yPixels: key.y,
          zoom: key.zoom,
          rotationDeg: key.rotation
        },
        preconditions: ['rig_open'],
        destructiveLevel: 'reversible',
        idempotencyKey: `set_camera_key_${key.frame}`,
        rollback: { strategy: 'none', snapshotRequired: false },
        expectedArtifact: { kind: 'camera_key', path: `Camera/${key.frame}`, nonempty: true },
        verification: { method: 'camera_key_exists', required: true, acceptance: ['count >= 1'] }
      });
    }

    const expectBones = characterBible.controllers.length;
    const expectSwitches = characterBible.switchLayers.length;
    push({
      commandId: gen(),
      type: 'verify_rig',
      params: {
        expect_bones: expectBones,
        expect_switches: expectSwitches,
        skeletonLayer: skeletonLayerName
      },
      preconditions: ['skeleton_layer_exists', 'rig_open'],
      destructiveLevel: 'none',
      idempotencyKey: `verify_rig_${characterBible.characterId}_${expectBones}_${expectSwitches}`,
      rollback: { strategy: 'none', snapshotRequired: false },
      expectedArtifact: { kind: 'bone', path: skeletonLayerName, nonempty: true },
      verification: { method: 'count_equals', required: true, acceptance: ['count >= 1'] }
    });

    push({
      commandId: gen(),
      type: 'save_document',
      params: {
        documentPath: documentPath ?? null
      },
      preconditions: ['rig_open', 'document_dirty'],
      destructiveLevel: 'reversible',
      idempotencyKey: `save_document_${characterBible.characterId}_${counter}`,
      rollback: { strategy: 'none', snapshotRequired: false },
      expectedArtifact: { kind: 'bone', path: documentPath ?? characterBible.rigPath, nonempty: true },
      verification: { method: 'count_equals', required: true, acceptance: ['count >= 1'] }
    });

    operations.push(...made);

    const sourceHash = crypto
      .createHash('sha256')
      .update(stringify({ pir, characterBible }) || '')
      .digest('hex');

    const plan: MohoCommandPlan = {
      schemaVersion: MOHO_COMMAND_PLAN_SCHEMA,
      planId: `MOHO-${sourceHash.slice(0, 12).toUpperCase()}`,
      documentPath,
      createdAt: '1970-01-01T00:00:00.000Z',
      status: 'implemented_unverified',
      requiresRealMoho: true,
      sourceManifestSha256: sourceHash,
      operations,
      acceptanceGates: [
        'skeleton_layer_exists',
        'all_bones_created',
        'all_switch_layers_created',
        'all_choices_created',
        'all_actions_created',
        'all_keys_set',
        'rig_verified',
        'document_saved'
      ],
      provenance: {
        compiler: 'MohoRigPlanCompiler v1',
        source: compilerName,
        characterName: characterBible.name
      }
    };

    return mohoCommandPlanSchema.parse(plan) as MohoCommandPlan;
  }

  public buildWithFingerprint(opts: MohoCommandBuilderOptions): MohoCommandBuilderResult {
    const plan = this.buildPlan(opts);
    const fingerprint = crypto
      .createHash('sha256')
      .update(stringify(plan.operations) || '')
      .digest('hex');
    return { plan, fingerprint };
  }
}

export default MohoCommandBuilder;
