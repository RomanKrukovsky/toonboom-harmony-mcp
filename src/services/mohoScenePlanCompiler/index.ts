import path from 'path';
import { type MohoProductionRigSpec } from '../../schemas/mohoProductionRig.js';
import { MohoProjectCompiler } from '../mohoProjectCompiler/index.js';
import { MohoAnimationLibrary, type MohoMotionClip } from '../mohoAnimationLibrary/index.js';
import { MohoLipsyncSynthesizer, type PhonemeCue } from '../mohoLipsyncSynthesizer/index.js';

export interface CameraMoveSpec {
  startFrame: number;
  endFrame: number;
  panStart: [number, number];
  panEnd: [number, number];
  zoomStart: number;
  zoomEnd: number;
}

export interface MultiplaneLayerSpec {
  name: string;
  depthZ: number; // Parallax distance: 0 = character plane, -100 = far sky, +50 = foreground
  filePath?: string;
  opacity?: number;
}

export interface ShotCharacterSpec {
  characterName: string;
  rigSpec: MohoProductionRigSpec;
  position: [number, number];
  scale: [number, number];
  motionClipId?: string;
  lipsyncCues?: PhonemeCue[];
}

export interface MohoShotPlanSpec {
  shotId: string;
  title: string;
  startFrame: number;
  endFrame: number;
  fps: number;
  characters: ShotCharacterSpec[];
  camera?: CameraMoveSpec;
  backgroundLayers?: MultiplaneLayerSpec[];
}

export interface CompiledMohoShotResult {
  shotId: string;
  totalFrames: number;
  charactersCount: number;
  layersCount: number;
  documentJson: Record<string, unknown>;
  compiledMohoPath?: string;
}

/**
 * MohoScenePlanCompiler — Compiles complete multi-character animated shots for Moho
 * including multiplane backgrounds, camera moves, lipsync, and motion presets.
 */
export class MohoScenePlanCompiler {
  public static compileShot(
    spec: MohoShotPlanSpec,
    outputPath?: string
  ): CompiledMohoShotResult {
    const totalFrames = spec.endFrame - spec.startFrame + 1;
    const allLayers: Array<Record<string, unknown>> = [];

    // 1. Background multiplane layers (Far back)
    const bgLayers = spec.backgroundLayers ?? [
      { name: 'BG_Sky', depthZ: -200 },
      { name: 'BG_Distant', depthZ: -100 },
      { name: 'BG_Ground', depthZ: 0 }
    ];

    for (const bg of bgLayers) {
      allLayers.push({
        name: bg.name,
        type: 'VectorLayer',
        depth_z: bg.depthZ,
        opacity: bg.opacity ?? 1.0
      });
    }

    // 2. Compile each character bone layer
    for (const char of spec.characters) {
      const charDoc = MohoProjectCompiler.compileToDocumentJson(
        char.rigSpec,
        1920,
        1080,
        spec.fps
      );

      const charLayers = (charDoc.layers as Array<Record<string, unknown>>) || [];
      if (charLayers.length > 0) {
        const rootBoneLayer = { ...charLayers[0] };
        rootBoneLayer.name = char.characterName;
        // Apply character initial position and scale
        rootBoneLayer.anim_pos = {
          val: char.position,
          actions: []
        };
        rootBoneLayer.anim_scale = {
          val: char.scale,
          actions: []
        };

        // Apply motion clip if requested
        if (char.motionClipId) {
          const clip = MohoAnimationLibrary.getClip(char.motionClipId);
          if (clip) {
            this.applyMotionClipToBoneLayer(rootBoneLayer, clip, spec.startFrame, spec.endFrame);
          }
        }

        // Apply lipsync cues if present
        if (char.lipsyncCues && char.lipsyncCues.length > 0) {
          const lipsync = MohoLipsyncSynthesizer.synthesizeLipsync({ cues: char.lipsyncCues });
          this.applyLipsyncToSwitchLayer(rootBoneLayer, lipsync.switchKeys);
        }

        allLayers.push(rootBoneLayer);
      }
    }

    // 3. Foreground multiplane layers
    const fgLayers = (spec.backgroundLayers ?? []).filter(l => l.depthZ > 0);
    for (const fg of fgLayers) {
      allLayers.push({
        name: fg.name,
        type: 'VectorLayer',
        depth_z: fg.depthZ,
        opacity: fg.opacity ?? 1.0
      });
    }

    // 4. Construct complete scene document JSON
    const documentJson: Record<string, unknown> = {
      mime_type: 'application/x-vnd.lm_mohodoc',
      version: 1045,
      major_version: 1,
      rev_version: 0,
      comment: `Compiled Shot: ${spec.shotId} (${spec.title})`,
      doc_uuid: `moho_shot_${spec.shotId}`,
      project_data: {
        width: 1920,
        height: 1080,
        start_frame: spec.startFrame,
        end_frame: spec.endFrame,
        fps: spec.fps,
        back_color: { r: 234, g: 234, b: 234, a: 255 },
        antialiasing: true,
        depth_sort: true
      },
      camera: spec.camera
        ? {
            pan: {
              when: [spec.camera.startFrame, spec.camera.endFrame],
              val: [spec.camera.panStart, spec.camera.panEnd]
            },
            zoom: {
              when: [spec.camera.startFrame, spec.camera.endFrame],
              val: [spec.camera.zoomStart, spec.camera.zoomEnd]
            }
          }
        : undefined,
      layers: allLayers
    };

    let compiledPath: string | undefined;
    if (outputPath && spec.characters.length > 0) {
      MohoProjectCompiler.compileToFile({
        outputPath,
        spec: spec.characters[0].rigSpec
      });
      compiledPath = outputPath;
    }

    return {
      shotId: spec.shotId,
      totalFrames,
      charactersCount: spec.characters.length,
      layersCount: allLayers.length,
      documentJson,
      compiledMohoPath: compiledPath
    };
  }

  private static applyMotionClipToBoneLayer(
    boneLayer: Record<string, unknown>,
    clip: MohoMotionClip,
    startFrame: number,
    endFrame: number
  ): void {
    const skel = boneLayer.skeleton as Record<string, unknown> | undefined;
    if (!skel || !Array.isArray(skel.bones)) return;

    for (const track of clip.tracks) {
      const bone = skel.bones.find((b: any) => b.name === track.boneName);
      if (!bone) continue;

      let currentFrame = startFrame;
      const angleWhen: number[] = [];
      const angleVal: number[] = [];

      while (currentFrame <= endFrame) {
        for (const kf of track.keyframes) {
          const frameNum = currentFrame + kf.frame - 1;
          if (frameNum > endFrame) break;
          if (kf.angleDeg !== undefined) {
            angleWhen.push(frameNum);
            angleVal.push((kf.angleDeg * Math.PI) / 180);
          }
        }
        if (!clip.looping) break;
        currentFrame += clip.durationFrames;
      }

      if (angleWhen.length > 0) {
        bone.anim_angle = {
          val: angleVal[0],
          when: angleWhen,
          anim_val: angleVal
        };
      }
    }
  }

  private static applyLipsyncToSwitchLayer(
    boneLayer: Record<string, unknown>,
    switchKeys: Array<{ frame: number; shape: string }>
  ): void {
    const layerList = boneLayer.layer_list as Array<Record<string, unknown>> | undefined;
    if (!layerList) return;

    const mouthSwitch = layerList.find(l => l.name === 'Mouth switch' && l.type === 'SwitchLayer');
    if (mouthSwitch) {
      mouthSwitch.switch_keys = {
        when: switchKeys.map(k => k.frame),
        val: switchKeys.map(k => `Mouth_${k.shape}`),
        interp: 'step'
      };
    }
  }
}
