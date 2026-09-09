import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { HarmonyNativeRunner, type HarmonyNativeRenderResult } from '../../adapters/harmonyNativeRunner.js';
import type { MohoCharacterAssetPackV1 } from '../../schemas/mohoCharacterAssetPackV1.js';

export interface CompileHarmonyRigInput {
  characterPack: MohoCharacterAssetPackV1;
  outputDir: string;
  sceneName?: string;
  width?: number;
  height?: number;
  fps?: number;
  frameCount?: number;
}

export interface HarmonyCompiledRigResult {
  characterId: string;
  sceneName: string;
  sceneDir: string;
  xstagePath: string;
  pegNodes: string[];
  drawingNodes: string[];
  totalNodes: number;
  totalLinks: number;
}

export interface VerifyHarmonyRigResult {
  characterId: string;
  passed: boolean;
  scenePath: string;
  renderResult: HarmonyNativeRenderResult;
  structuralCheck: {
    pegsPresent: boolean;
    drawingsPresent: boolean;
    compositeConnected: boolean;
    writeConnected: boolean;
  };
}

export class HarmonyRigCompiler {
  public static compileRig(input: CompileHarmonyRigInput): HarmonyCompiledRigResult {
    const sceneName = input.sceneName ?? `${input.characterPack.characterId}_rig`;
    const sceneDir = path.join(input.outputDir, sceneName);
    fs.mkdirSync(sceneDir, { recursive: true });
    const xstagePath = path.join(sceneDir, `${sceneName}.xstage`);

    const width = input.width ?? input.characterPack.canvas.width ?? 1920;
    const height = input.height ?? input.characterPack.canvas.height ?? 1080;
    const fps = input.fps ?? 24;
    const frameCount = input.frameCount ?? 24;
    const sceneId = crypto.randomBytes(8).toString('hex');

    // Categorize layers from character pack
    const bodyLayers = input.characterPack.layers.filter(l => l.kind === 'body');
    const headLayers = input.characterPack.layers.filter(l => l.kind === 'head');
    const limbLayers = input.characterPack.layers.filter(l => l.kind === 'limb');
    const mouthLayers = input.characterPack.layers.filter(l => l.kind === 'mouth');
    const eyeLayers = input.characterPack.layers.filter(l => l.kind === 'eye');
    const handLayers = input.characterPack.layers.filter(l => l.kind === 'hand');

    // Build standard peg hierarchy
    const pegNodes = [
      'Master_Peg',
      'Torso_Peg',
      'Head_Peg',
      'Arm_L_Peg',
      'Arm_R_Peg',
      'Leg_L_Peg',
      'Leg_R_Peg'
    ];

    // Build drawing nodes
    const drawingNodes: string[] = [];
    for (const b of bodyLayers) drawingNodes.push(`Drawing_${b.layerId}`);
    for (const h of headLayers) drawingNodes.push(`Drawing_${h.layerId}`);
    for (const l of limbLayers) drawingNodes.push(`Drawing_${l.layerId}`);
    if (mouthLayers.length > 0) drawingNodes.push('Drawing_Mouth');
    if (eyeLayers.length > 0) drawingNodes.push('Drawing_Eyes');
    if (handLayers.length > 0) drawingNodes.push('Drawing_Hands');

    const modules: string[] = [];
    const links: string[] = [];

    // System modules
    modules.push(`
          <module type="COMPOSITE" name="Composite" pos="0,0,1">
            <options><version val="1"/><collapsed val="false"/></options>
            <attrs>
              <compositeMode val="composite2D"/>
              <flattenOutput val="true"/>
              <applyFocus val="true"/>
              <multiplier val="1"/>
              <outputZ val="LEFTMOST"/>
              <outputZInputPort val="1"/>
            </attrs>
          </module>
          <module type="DISPLAY" name="Display" pos="0,100,2">
            <options><version val="1"/><collapsed val="false"/></options>
          </module>
          <module type="WRITE" name="Write" pos="100,100,3">
            <options><version val="1"/><collapsed val="false"/></options>
            <attrs>
              <exportToMovie val="false"/>
              <drawingType val="TGA"/>
              <leadingZeros val="3"/>
              <start val="1"/>
            </attrs>
          </module>
          <module type="CAMERA" name="Camera" pos="-200,-100,4">
            <options><version val="1"/><collapsed val="false"/></options>
            <attrs><fov val="41.1121"/></attrs>
          </module>`);

    // Add Peg modules
    let pegIdx = 10;
    for (const peg of pegNodes) {
      modules.push(`
          <module type="PEG" name="${peg}" pos="0,${pegIdx * 10},${pegIdx}" publishUnderTab="${peg}">
            <options><version val="1"/><collapsed val="false"/></options>
            <attrs>
              <enable3d val="false"/>
              <position><separate val="false"/><x val="0"/><y val="0"/><z val="0"/></position>
              <scale><separate val="true"/><xy val="1"/><x val="1"/><y val="1"/><z val="1"/></scale>
              <rotation><separate val="false"/><anglex val="0"/></rotation>
            </attrs>
          </module>`);
      pegIdx++;
    }

    // Add Drawing modules
    let drawIdx = 50;
    for (const d of drawingNodes) {
      modules.push(`
          <module type="READ" name="${d}" pos="50,${drawIdx * 10},${drawIdx}" publishUnderTab="${d}">
            <options><version val="1"/><collapsed val="false"/></options>
            <attrs>
              <enable3d val="false"/>
              <offset><separate val="true"/><x val="0"/><y val="0"/><z val="0"/></offset>
              <scale><separate val="true"/><xy val="1"/><x val="1"/><y val="1"/><z val="1"/></scale>
              <rotation><separate val="false"/><anglex val="0"/></rotation>
            </attrs>
          </module>`);
      drawIdx++;
    }

    // Peg hierarchy links
    links.push('<link out="Master_Peg" in="Torso_Peg" inport="0"/>');
    links.push('<link out="Torso_Peg" in="Head_Peg" inport="0"/>');
    links.push('<link out="Torso_Peg" in="Arm_L_Peg" inport="0"/>');
    links.push('<link out="Torso_Peg" in="Arm_R_Peg" inport="0"/>');
    links.push('<link out="Master_Peg" in="Leg_L_Peg" inport="0"/>');
    links.push('<link out="Master_Peg" in="Leg_R_Peg" inport="0"/>');

    // Peg to Drawing links
    for (const d of drawingNodes) {
      if (d.includes('Head') || d.includes('head') || d.includes('Mouth') || d.includes('Eyes')) {
        links.push(`<link out="Head_Peg" in="${d}" inport="0"/>`);
      } else if (d.includes('Arm_L') || d.includes('arm_l') || d.includes('Hands')) {
        links.push(`<link out="Arm_L_Peg" in="${d}" inport="0"/>`);
      } else if (d.includes('Arm_R') || d.includes('arm_r')) {
        links.push(`<link out="Arm_R_Peg" in="${d}" inport="0"/>`);
      } else if (d.includes('Leg_L') || d.includes('leg_l')) {
        links.push(`<link out="Leg_L_Peg" in="${d}" inport="0"/>`);
      } else if (d.includes('Leg_R') || d.includes('leg_r')) {
        links.push(`<link out="Leg_R_Peg" in="${d}" inport="0"/>`);
      } else {
        links.push(`<link out="Torso_Peg" in="${d}" inport="0"/>`);
      }
    }

    // Drawing to Composite links
    for (const d of drawingNodes) {
      links.push(`<link out="${d}" in="Composite"/>`);
    }

    // Composite to Display and Write
    links.push('<link out="Composite" in="Display"/>');
    links.push('<link out="Composite" in="Write"/>');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<project source="Stage (Stage) version 25.0.0 build 23967" version="2500" build="23967" creator="harmony">
  <elements/>
  <options>
    <metrics unitAspectRatioX="4" unitAspectRatioY="3" numberOfUnitsX="24" numberOfUnitsY="24" numberOfUnitsZ="12"/>
    <resolution name="HDTV_1080p24" size="${width},${height}" fovFit="VerticalFitFov" fov="41.1121"/>
    <framerate val="${fps}"/>
    <zdragging val="true"/>
    <cameraInSymbols val="true"/>
  </options>
  <scenes>
    <scene name="Top" id="${sceneId}" nbframes="${frameCount}">
      <columns/>
      <options><defaultDisplay val="Display"/></options>
      <rootgroup name="Top">
        <options><collapsed val="false"/></options>
        <nodelist>${modules.join('')}
        </nodelist>
        <linkedlist>${links.join('')}
        </linkedlist>
      </rootgroup>
    </scene>
  </scenes>
  <symbols>
    <folder name="Symbols"><scene id="${sceneId}"/></folder>
  </symbols>
  <timeline><scene id="${sceneId}"/></timeline>
</project>
`;

    fs.writeFileSync(xstagePath, xml, 'utf8');

    return {
      characterId: input.characterPack.characterId,
      sceneName,
      sceneDir,
      xstagePath,
      pegNodes,
      drawingNodes,
      totalNodes: 4 + pegNodes.length + drawingNodes.length,
      totalLinks: links.length
    };
  }

  public static async verifyRig(xstagePath: string, outputDir: string): Promise<VerifyHarmonyRigResult> {
    const xml = fs.readFileSync(xstagePath, 'utf8');
    const pegsPresent = xml.includes('type="PEG" name="Master_Peg"') && xml.includes('type="PEG" name="Torso_Peg"');
    const drawingsPresent = xml.includes('type="READ"');
    const compositeConnected = xml.includes('in="Composite"');
    const writeConnected = xml.includes('out="Composite" in="Write"');

    const renderResult = await HarmonyNativeRunner.renderSceneAndEncode({
      scenePath: xstagePath,
      outputDir,
      startFrame: 1,
      endFrame: 24,
      fps: 24
    });

    const passed = (
      pegsPresent &&
      drawingsPresent &&
      compositeConnected &&
      writeConnected &&
      renderResult.success &&
      renderResult.renderedFramesCount === 24 &&
      renderResult.reopenedVerified
    );

    return {
      characterId: path.basename(path.dirname(xstagePath)),
      passed,
      scenePath: xstagePath,
      renderResult,
      structuralCheck: {
        pegsPresent,
        drawingsPresent,
        compositeConnected,
        writeConnected
      }
    };
  }
}
