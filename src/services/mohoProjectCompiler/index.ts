import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  type MohoProductionRigSpec,
  type SmartBoneDialSpec,
  type VitruvianGroupSpec
} from '../../schemas/mohoProductionRig.js';
import { MohoTurnaroundBuilder } from '../mohoTurnaroundBuilder/index.js';
import { MohoSmartActionSynthesizer } from '../mohoSmartActionSynthesizer/index.js';
import { MohoVitruvianEngine } from '../mohoVitruvianEngine/index.js';
import { MohoShadowBuilder } from '../mohoShadowBuilder/index.js';
import { MohoAnimatorContractGate } from '../mohoAnimatorContractGate/index.js';

/**
 * MohoProjectCompiler — builds native .moho projects from a known-good Moho
 * template. Moho's parser distinguishes integer and floating-point JSON tokens,
 * so the final document is serialized by the loss-preserving Python helper.
 *
 * This enables 100% automated, headless generation of Turnaround Production Rigs.
 */

function resolveProjectAsset(relativePath: string): string {
  const candidates = [
    path.resolve(process.cwd(), relativePath),
    path.resolve(path.dirname(process.argv[1] ?? process.cwd()), '..', relativePath)
  ];
  const found = candidates.find(candidate => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Required Moho compiler asset is missing: ${relativePath}`);
  }
  return found;
}

function resolvePythonExecutable(): string {
  return process.env.MOHO_PYTHON_BIN ?? process.env.PYTHON_BIN ?? (process.platform === 'win32' ? 'python' : 'python3');
}

export interface CompileMohoProjectOptions {
  outputPath: string;
  spec: MohoProductionRigSpec;
  width?: number;
  height?: number;
  fps?: number;
}

export interface CompiledMohoProjectResult {
  outputPath: string;
  fileSizeBytes: number;
  bonesCount: number;
  smartDialsCount: number;
}

export function stripVolatileMohoFields(doc: Record<string, unknown>): Record<string, unknown> {
  const { doc_uuid, created_date, modified_date, ...rest } = doc;
  return rest;
}

export class MohoProjectCompiler {
  public static compileDocumentToFile(docJson: Record<string, unknown>, outputPath: string): number {
    const helperPath = resolveProjectAsset('scripts/python/compile_moho_project.py');
    const templatePath = process.env.MOHO_PROJECT_TEMPLATE
      ?? resolveProjectAsset('fixtures/moho_reference/gramps_rig.moho.bak');
    const result = spawnSync(
      resolvePythonExecutable(),
      [helperPath, templatePath, path.resolve(outputPath)],
      {
        input: JSON.stringify(docJson),
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      }
    );

    if (result.error) {
      throw new Error(`Could not run the safe Moho compiler: ${result.error.message}`);
    }
    if (result.status !== 0) {
      const details = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
      throw new Error(details);
    }
    if (!fs.existsSync(outputPath)) {
      throw new Error('Safe Moho compiler finished without creating the requested file');
    }
    return fs.statSync(outputPath).size;
  }

  public static compileToDocumentJson(
    spec: MohoProductionRigSpec,
    width = 1920,
    height = 1080,
    fps = 24.0,
    docUuid?: string,
    timestamp?: string
  ): Record<string, unknown> {
    const turnaround = MohoTurnaroundBuilder.buildTurnaroundMatrix({
      characterName: spec.characterName,
      includeHead: true,
      includeBody: true
    });

    const jointActions = MohoSmartActionSynthesizer.synthesizeJointCorrections(spec.jointCorrections);
    const squash = MohoSmartActionSynthesizer.synthesizeSquashStretch(spec.squashStretch);
    const mouthScale = MohoSmartActionSynthesizer.synthesizeMouthScaleDials();
    const waist = MohoSmartActionSynthesizer.synthesizeWaistSoftBend();
    const shadow = MohoShadowBuilder.buildShadow(spec.shadow);

    const allDials = [...turnaround.smartDials, ...squash.smartDials, ...mouthScale.smartDials, ...spec.smartDials];
    const allActions = [...jointActions, ...squash.actions, ...mouthScale.actions];

    // Build Bones array
    const rawBones = [
      { name: 'Master', parent: null, x: 0, y: 0, length: 40, angle: 90 },
      { name: 'Pelvis', parent: 'Master', x: 0, y: 60, length: 30, angle: 90 },
      { name: 'Torso', parent: 'Pelvis', x: 0, y: 120, length: 50, angle: 90 },
      { name: 'Neck', parent: 'Torso', x: 0, y: 180, length: 20, angle: 90 },
      { name: 'Head', parent: 'Neck', x: 0, y: 220, length: 40, angle: 90 },
      // Waist Soft Bend Helper Bones (Borsch Lesson 9)
      { name: waist.pinBone.name, parent: waist.pinBone.parent, x: 0, y: 80, length: 15, angle: 90, isHelper: true },
      { name: waist.helperBone.name, parent: waist.helperBone.parent, x: 0, y: 80, length: 25, angle: 0, isHelper: true },
      // Limbs L/R
      { name: 'UpperArm_L', parent: 'Torso', x: -40, y: 170, length: 45, angle: 180 },
      { name: 'Forearm_L', parent: 'UpperArm_L', x: -85, y: 170, length: 45, angle: 180 },
      { name: 'Hand_L', parent: 'Forearm_L', x: -130, y: 170, length: 20, angle: 180 },
      { name: 'UpperArm_R', parent: 'Torso', x: 40, y: 170, length: 45, angle: 0 },
      { name: 'Forearm_R', parent: 'UpperArm_R', x: 85, y: 170, length: 45, angle: 0 },
      { name: 'Hand_R', parent: 'Forearm_R', x: 130, y: 170, length: 20, angle: 0 },
      { name: 'Thigh_L', parent: 'Pelvis', x: -25, y: 50, length: 60, angle: 270 },
      { name: 'Shin_L', parent: 'Thigh_L', x: -25, y: -10, length: 60, angle: 270 },
      { name: 'Foot_L', parent: 'Shin_L', x: -25, y: -70, length: 25, angle: 0 },
      { name: 'Thigh_R', parent: 'Pelvis', x: 25, y: 50, length: 60, angle: 270 },
      { name: 'Shin_R', parent: 'Thigh_R', x: 25, y: -10, length: 60, angle: 270 },
      { name: 'Foot_R', parent: 'Shin_R', x: 25, y: -70, length: 25, angle: 0 }
    ];

    // Add Smart Bone Dials
    for (const dial of allDials) {
      rawBones.push({
        name: dial.dialName,
        parent: 'Master',
        x: 200,
        y: 200,
        length: 30,
        angle: dial.neutralAngleDeg
      });
    }

    const audited = MohoAnimatorContractGate.auditAndApplyContract(
      rawBones.map(b => ({
        name: b.name,
        parent: b.parent,
        isSmartDial: allDials.some(d => d.dialName === b.name),
        isHelperOrDeformer: (b as any).isHelper
      })),
      spec.animatorContract
    );

    const boneMap = new Map<string, number>();
    rawBones.forEach((b, idx) => boneMap.set(b.name, idx));

    const bonesFormatted = rawBones.map((b, idx) => {
      const audit = audited.auditedBones[idx];
      const parentIdx = b.parent ? boneMap.get(b.parent) ?? -1 : -1;
      return {
        name: b.name,
        parent: parentIdx,
        length: { val: b.length },
        anim_angle: {
          val: (b.angle * Math.PI) / 180,
          actions: allActions
            .filter(a => a.targetBone === b.name)
            .map(a => ({
              name: a.actionName,
              pose: {
                when: a.keyframes.map(k => k.frame),
                val: a.keyframes.map(k => ((k.angleDeg ?? b.angle) * Math.PI) / 180)
              }
            }))
        },
        anim_pos: {
          val: [b.x, b.y],
          actions: []
        },
        anim_scale: {
          val: [1.0, 1.0],
          actions: allActions
            .filter(a => a.targetBone === b.name && a.keyframes.some(k => k.scale))
            .map(a => ({
              name: a.actionName,
              pose: {
                when: a.keyframes.map(k => k.frame),
                val: a.keyframes.map(k => [k.scale?.x ?? 1.0, k.scale?.y ?? 1.0])
              }
            }))
        },
        color: audit.color,
        is_shy: audit.isShy,
        strength: 0.15,
        binding_mode: 1 // Standard flexi-binding across 20 benchmark rigs
      };
    });

    const nowStr = timestamp ?? 'Thu Jan 01 1970 00:00:00 GMT';
    const uuidStr = docUuid ?? `moho_doc_${spec.characterId}`;

    const doc: Record<string, unknown> = {
      mime_type: 'application/x-vnd.lm_mohodoc',
      version: 1045,
      major_version: 1,
      rev_version: 0,
      comment: 'Generated by MohoProductionRigEngine (toonboom-harmony-mcp)',
      doc_uuid: uuidStr,
      created_date: nowStr,
      modified_date: nowStr,
      project_data: {
        width,
        height,
        start_frame: 1,
        end_frame: 240,
        fps,
        back_color: { r: 234, g: 234, b: 234, a: 255 },
        antialiasing: true,
        depth_sort: false
      },
      layers: [
        {
          name: spec.characterName,
          type: 'BoneLayer',
          skeleton: {
            bones: bonesFormatted
          },
          layer_list: [
            {
              name: 'Head switch',
              type: 'SwitchLayer',
              layer_list: turnaround.headTurn.angles.map(ang => ({
                name: `Head_${ang.replace(/[\s/]/g, '_')}`,
                type: 'VectorLayer'
              }))
            },
            {
              name: 'Body switch',
              type: 'SwitchLayer',
              layer_list: turnaround.bodyTurn.angles.map(ang => ({
                name: `Body_${ang.replace(/[\s/]/g, '_')}`,
                type: 'VectorLayer'
              }))
            },
            {
              name: shadow.layerName,
              type: 'VectorLayer'
            }
          ]
        }
      ]
    };

    return doc;
  }

  public static compileToFile(opts: CompileMohoProjectOptions): {
    outputPath: string;
    fileSizeBytes: number;
    bonesCount: number;
    smartDialsCount: number;
  } {
    const docJson = this.compileToDocumentJson(opts.spec, opts.width, opts.height, opts.fps);
    const fileSizeBytes = this.compileDocumentToFile(docJson, opts.outputPath);

    const rootLayer = (docJson.layers as Array<Record<string, unknown>>)[0];
    const skel = (rootLayer.skeleton as Record<string, unknown>) ?? {};
    const bones = (skel.bones as unknown[]) ?? [];

    return {
      outputPath: opts.outputPath,
      fileSizeBytes,
      bonesCount: bones.length,
      smartDialsCount: opts.spec.smartDials.length
    };
  }
}
