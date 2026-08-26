import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
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
 * MohoProjectCompiler — directly synthesizes binary-valid .moho project files
 * (ZIP container containing Project.mohoproj JSON and preview.jpg).
 *
 * This enables 100% automated, headless generation of Turnaround Production Rigs.
 */

// Minimal 1x1 valid JPEG image for preview.jpg in .moho container
const MINIMAL_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x80, 0xff, 0xd9
]);

function createZipArchive(files: Array<{ name: string; content: Buffer }>): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const filenameBuf = Buffer.from(file.name, 'utf8');
    const compressed = zlib.deflateRawSync(file.content);
    const crc = computeCrc32(file.content);

    // Local file header (30 bytes + name)
    const local = Buffer.alloc(30 + filenameBuf.length);
    local.writeUInt32LE(0x04034b50, 0); // Signature
    local.writeUInt16LE(20, 4);          // Version needed (2.0)
    local.writeUInt16LE(0, 6);           // Flags
    local.writeUInt16LE(8, 8);           // Method (Deflate)
    local.writeUInt16LE(0, 10);          // Mod time
    local.writeUInt16LE(0, 12);          // Mod date
    local.writeUInt32LE(crc, 14);        // CRC32
    local.writeUInt32LE(compressed.length, 18); // Compressed size
    local.writeUInt32LE(file.content.length, 22); // Uncompressed size
    local.writeUInt16LE(filenameBuf.length, 26);  // Filename len
    local.writeUInt16LE(0, 28);          // Extra field len
    filenameBuf.copy(local, 30);

    // Central directory header (46 bytes + name)
    const central = Buffer.alloc(46 + filenameBuf.length);
    central.writeUInt32LE(0x02014b50, 0); // Signature
    central.writeUInt16LE(20, 4);          // Version made by
    central.writeUInt16LE(20, 6);          // Version needed
    central.writeUInt16LE(0, 8);           // Flags
    central.writeUInt16LE(8, 10);          // Method
    central.writeUInt16LE(0, 12);          // Mod time
    central.writeUInt16LE(0, 14);          // Mod date
    central.writeUInt32LE(crc, 16);        // CRC32
    central.writeUInt32LE(compressed.length, 20); // Compressed size
    central.writeUInt32LE(file.content.length, 24); // Uncompressed size
    central.writeUInt16LE(filenameBuf.length, 28);  // Filename len
    central.writeUInt16LE(0, 30);          // Extra len
    central.writeUInt16LE(0, 32);          // Comment len
    central.writeUInt16LE(0, 34);          // Disk start
    central.writeUInt16LE(0, 36);          // Internal attr
    central.writeUInt32LE(0, 38);          // External attr
    central.writeUInt32LE(offset, 42);     // Local header offset
    filenameBuf.copy(central, 46);

    localHeaders.push(local, compressed);
    centralHeaders.push(central);
    offset += local.length + compressed.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((sum, b) => sum + b.length, 0);

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

function computeCrc32(buf: Buffer): number {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (~crc) >>> 0;
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
    const jsonBuffer = Buffer.from(JSON.stringify(docJson, null, 2), 'utf8');

    const zipBuffer = createZipArchive([
      { name: 'Project.mohoproj', content: jsonBuffer },
      { name: 'preview.jpg', content: MINIMAL_JPEG }
    ]);

    const dir = path.dirname(opts.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(opts.outputPath, zipBuffer);

    const rootLayer = (docJson.layers as Array<Record<string, unknown>>)[0];
    const skel = (rootLayer.skeleton as Record<string, unknown>) ?? {};
    const bones = (skel.bones as unknown[]) ?? [];

    return {
      outputPath: opts.outputPath,
      fileSizeBytes: zipBuffer.length,
      bonesCount: bones.length,
      smartDialsCount: opts.spec.smartDials.length
    };
  }
}
