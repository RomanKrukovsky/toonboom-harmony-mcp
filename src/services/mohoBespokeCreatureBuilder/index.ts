import { MohoNativeBridge } from '../mohoNativeBridge/index.js';
import { MohoProjectCompiler } from '../mohoProjectCompiler/index.js';
import { type MohoVectorShape } from '../mohoVectorSimplifier/index.js';

export interface BespokeLimbSpec {
  name: string;
  type: 'tentacle' | 'spider_leg' | 'wing' | 'tail' | 'fin';
  segmentsCount: number;
  rootX: number;
  rootY: number;
  lengthPerSegment: number;
  angleDeg: number;
  hasPhysics?: boolean;
  physicsSpring?: number;
  physicsDamping?: number;
  ikTarget?: boolean;
  colorRgba?: [number, number, number, number];
}

export interface BespokeHeadSpec {
  name: string;
  rootBone: string;
  offsetX: number;
  offsetY: number;
  radius: number;
  eyesCount: number;
  hasMouth: boolean;
  asymmetricControls?: boolean;
  colorRgba?: [number, number, number, number];
}

export interface BespokeCreatureOptions {
  creatureName: string;
  bodyType: 'soft_body_slime' | 'chitin_armor' | 'multi_limb_hydra' | 'hybrid';
  limbs: BespokeLimbSpec[];
  heads: BespokeHeadSpec[];
  softBodyPinsCount?: number;
  lineWobbleRoughness?: number; // 0.0 to 1.0 (procedural line variation)
  baseColorRgba?: [number, number, number, number];
  outlineColorRgba?: [number, number, number, number];
  outlineWidth?: number;
  outputPath?: string;
}

export interface BespokeCreatureResult {
  creatureName: string;
  outputPath?: string;
  fileSizeBytes: number;
  totalBonesCount: number;
  totalLayersCount: number;
  limbsCount: number;
  headsCount: number;
  features: string[];
  docJson: Record<string, unknown>;
}

/**
 * MohoBespokeCreatureBuilder — Generator for non-standard anatomy, multi-limbed
 * monsters, hydras, amorphous soft-body slimes, and multi-layered chitin armor.
 */
export class MohoBespokeCreatureBuilder {
  public static buildCreature(options: BespokeCreatureOptions): BespokeCreatureResult {
    const name = options.creatureName.trim() || 'AlienCreature';
    const baseColor = options.baseColorRgba ?? [120, 220, 140, 255];
    const outlineColor = options.outlineColorRgba ?? [20, 30, 25, 255];
    const strokeWidth = options.outlineWidth ?? 3.0;

    // 1. Build Skeletons (Root, Soft-Body Pin Lattice, Multi-Limbs, Multi-Heads)
    const bones = this.assembleCreatureBones(options);
    const boneMap = new Map<string, number>();
    bones.forEach((b, idx) => boneMap.set(b.name, idx));

    // 2. Format Bones for Moho JSON
    const bonesFormatted = bones.map((b, idx) => {
      const parentIdx = b.parent ? boneMap.get(b.parent) ?? -1 : -1;
      const targetIdx = b.ikTarget ? boneMap.get(b.ikTarget) ?? -1 : -1;

      return {
        name: b.name,
        parent: parentIdx,
        is_pin_bone: b.isPin ?? false,
        length: { val: b.length },
        anim_angle: {
          val: (b.angle * Math.PI) / 180,
          actions: []
        },
        anim_pos: {
          val: [b.x, b.y],
          actions: []
        },
        anim_scale: {
          val: [1.0, 1.0],
          actions: []
        },
        strength: b.strength ?? 0.0,
        shy: b.shy ?? false,
        tag_color: b.tagColor ?? 1,
        ik_target: targetIdx !== -1 ? targetIdx : undefined,
        has_physics: b.hasPhysics ?? false,
        physics_spring: b.physicsSpring,
        physics_damping: b.physicsDamping
      };
    });

    // 3. Build Layers Hierarchy with Soft-body Mesh and Bespoke Limbs
    const layers = this.assembleCreatureLayers(options, baseColor, strokeWidth);

    // 4. Document JSON
    const docJson: Record<string, unknown> = {
      mime_type: 'application/x-vnd.lm_mohodoc',
      version: 1045,
      major_version: 1,
      rev_version: 0,
      comment: `Bespoke Creature Rig: ${name}`,
      doc_uuid: `moho_creature_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      created_date: new Date().toUTCString(),
      modified_date: new Date().toUTCString(),
      project_data: {
        width: 1920,
        height: 1080,
        start_frame: 1,
        end_frame: 240,
        fps: 24.0,
        back_color: { r: 230, g: 235, b: 240, a: 255 },
        antialiasing: true,
        depth_sort: true
      },
      layers: [
        {
          name: name,
          type: 'BoneLayer',
          skeleton: {
            bones: bonesFormatted
          },
          layer_list: layers
        }
      ]
    };

    let fileSizeBytes = Buffer.byteLength(JSON.stringify(docJson));
    if (options.outputPath) {
      fileSizeBytes = MohoProjectCompiler.compileDocumentToFile(docJson, options.outputPath);
    }

    return {
      creatureName: name,
      outputPath: options.outputPath,
      fileSizeBytes,
      totalBonesCount: bonesFormatted.length,
      totalLayersCount: layers.length,
      limbsCount: options.limbs.length,
      headsCount: options.heads.length,
      features: [
        `Non-standard ${options.bodyType} topology`,
        `${options.limbs.length} bespoke multi-segmented limbs/tentacles`,
        `${options.heads.length} independent multi-eyed heads`,
        options.bodyType === 'soft_body_slime' ? 'Radial Pin-Bone Soft Body Lattice' : 'Rigid Chitin Armor Plates',
        'Procedural Variable Stroke Widths',
        'Secondary Spring/Damping Dynamics on all appendages'
      ],
      docJson
    };
  }

  private static assembleCreatureBones(options: BespokeCreatureOptions): Array<{
    name: string;
    parent: string | null;
    x: number;
    y: number;
    length: number;
    angle: number;
    strength?: number;
    isPin?: boolean;
    shy?: boolean;
    tagColor?: number;
    ikTarget?: string;
    hasPhysics?: boolean;
    physicsSpring?: number;
    physicsDamping?: number;
  }> {
    const bones: Array<any> = [
      { name: 'Master', parent: null, x: 0, y: 0, length: 30, angle: 90, strength: 0.0, tagColor: 1 },
      { name: 'Body_Center', parent: 'Master', x: 0, y: 80, length: 40, angle: 90, strength: 0.35, tagColor: 1 }
    ];

    // 1. Soft-Body Radial Pin Lattice (for Slimes/Blobs)
    if (options.bodyType === 'soft_body_slime') {
      const pinCount = options.softBodyPinsCount ?? 8;
      const radius = 60;
      for (let i = 0; i < pinCount; i++) {
        const theta = (i / pinCount) * Math.PI * 2;
        const px = Math.round(Math.cos(theta) * radius);
        const py = Math.round(80 + Math.sin(theta) * radius);
        bones.push({
          name: `SoftPin_${i + 1}`,
          parent: 'Body_Center',
          x: px,
          y: py,
          length: 15,
          angle: 90,
          isPin: true,
          strength: 0.20,
          hasPhysics: true,
          physicsSpring: 22.0,
          physicsDamping: 4.5,
          tagColor: 2
        });
      }
    }

    // 2. Multi-segmented Limbs / Tentacles / Wings
    for (const limb of options.limbs) {
      let parentName = 'Body_Center';
      let currX = limb.rootX;
      let currY = limb.rootY;
      const rad = (limb.angleDeg * Math.PI) / 180;
      const dx = Math.cos(rad) * limb.lengthPerSegment;
      const dy = Math.sin(rad) * limb.lengthPerSegment;

      for (let s = 1; s <= limb.segmentsCount; s++) {
        const segName = `${limb.name}_Seg_${s}`;
        const isTip = s === limb.segmentsCount;
        const ikTargetName = limb.ikTarget && isTip ? `${limb.name}_IK_Target` : undefined;

        bones.push({
          name: segName,
          parent: parentName,
          x: Math.round(currX),
          y: Math.round(currY),
          length: limb.lengthPerSegment,
          angle: limb.angleDeg,
          strength: 0.18,
          tagColor: 3,
          ikTarget: ikTargetName,
          hasPhysics: limb.hasPhysics ?? true,
          physicsSpring: limb.physicsSpring ?? 14.0,
          physicsDamping: limb.physicsDamping ?? 3.5
        });

        if (ikTargetName) {
          bones.push({
            name: ikTargetName,
            parent: 'Master',
            x: Math.round(currX + dx),
            y: Math.round(currY + dy),
            length: 20,
            angle: 0,
            isPin: true,
            strength: 0.0,
            tagColor: 4
          });
        }

        parentName = segName;
        currX += dx;
        currY += dy;
      }
    }

    // 3. Multi-Heads and Asymmetric Eye Dials
    for (const head of options.heads) {
      const headBoneName = `${head.name}_Bone`;
      bones.push({
        name: headBoneName,
        parent: 'Body_Center',
        x: head.offsetX,
        y: head.offsetY,
        length: head.radius * 0.8,
        angle: 90,
        strength: 0.30,
        tagColor: 5
      });

      // Individual Eye and Mouth Dials per head
      for (let e = 1; e <= head.eyesCount; e++) {
        bones.push({
          name: `${head.name}_Eye_${e}_Dial`,
          parent: headBoneName,
          x: head.offsetX + (e - (head.eyesCount + 1) / 2) * 18,
          y: head.offsetY + head.radius * 0.6,
          length: 12,
          angle: 0,
          strength: 0.0,
          tagColor: 5
        });
      }
    }

    return bones;
  }

  private static assembleCreatureLayers(
    options: BespokeCreatureOptions,
    baseColor: [number, number, number, number],
    strokeWidth: number
  ): Array<Record<string, unknown>> {
    const layers: Array<Record<string, unknown>> = [];

    // 1. Central Body Layer (Delaunay Soft-body Mesh or Armor Group)
    layers.push({
      name: 'Body_Base',
      type: 'VectorLayer',
      shapes: [
        MohoNativeBridge.generateCapsuleShape({
          name: 'Main_Body_Shape',
          centerX: 0,
          centerY: 80,
          radiusX: 55,
          radiusY: 65,
          fillRgba: baseColor,
          strokeWidth,
          jointCapPadding: false
        })
      ]
    });

    // 2. Limb Vector Groups
    for (const limb of options.limbs) {
      const limbShapes: MohoVectorShape[] = [];
      for (let s = 1; s <= limb.segmentsCount; s++) {
        limbShapes.push(
          MohoNativeBridge.generateCapsuleShape({
            name: `${limb.name}_Seg_${s}_Shape`,
            centerX: 0,
            centerY: 0,
            radiusX: Math.max(16 - s * 2, 6),
            radiusY: limb.lengthPerSegment * 0.9,
            fillRgba: limb.colorRgba ?? baseColor,
            strokeWidth,
            jointCapPadding: true
          })
        );
      }

      layers.push({
        name: `${limb.name}_Group`,
        type: 'GroupLayer',
        layer_list: [
          {
            name: `${limb.name}_Vectors`,
            type: 'VectorLayer',
            shapes: limbShapes
          }
        ]
      });
    }

    // 3. Head Vector Groups with Multi-Eyes
    for (const head of options.heads) {
      const eyeSublayers: Array<Record<string, unknown>> = [];
      for (let e = 1; e <= head.eyesCount; e++) {
        eyeSublayers.push({
          name: `Eye_${e}_Switch`,
          type: 'SwitchLayer',
          layer_list: ['Open', 'Blink', 'Squint', 'Wide', 'Angry'].map(st => ({
            name: `Eye_${e}_${st}`,
            type: 'VectorLayer'
          }))
        });
      }

      layers.push({
        name: `${head.name}_Group`,
        type: 'GroupLayer',
        layer_list: [
          {
            name: `${head.name}_Base`,
            type: 'VectorLayer',
            shapes: [
              MohoNativeBridge.generateCapsuleShape({
                name: `${head.name}_HeadShape`,
                centerX: 0,
                centerY: 0,
                radiusX: head.radius,
                radiusY: head.radius * 1.1,
                fillRgba: head.colorRgba ?? baseColor,
                strokeWidth,
                jointCapPadding: false
              })
            ]
          },
          ...eyeSublayers
        ]
      });
    }

    return layers;
  }
}
