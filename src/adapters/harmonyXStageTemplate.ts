/**
 * Canonical Toon Boom Harmony .xstage generator.
 *
 * Emits genuine, conforming Harmony scene XML that Stage and Harmony can parse
 * without "Ignoring tag" errors, with valid Composite, Display, Write, and Camera nodes.
 */

import crypto from 'crypto';

export interface HarmonySceneOptions {
  sceneName?: string;
  width?: number;
  height?: number;
  fps?: number;
  frameCount?: number;
}

export function generateCanonicalXStageXml(options: HarmonySceneOptions = {}): string {
  const width = options.width ?? 1920;
  const height = options.height ?? 1080;
  const fps = options.fps ?? 24;
  const frameCount = options.frameCount ?? 120;
  const sceneId = crypto.randomBytes(8).toString('hex');

  return `<?xml version="1.0" encoding="UTF-8"?>
<project source="Stage (Stage) version 25.0.0 build 23967" version="2500" build="23967" creator="harmony">
  <elements/>
  <options>
    <metrics unitAspectRatioX="4" unitAspectRatioY="3" numberOfUnitsX="24" numberOfUnitsY="24" numberOfUnitsZ="12"/>
    <resolution name="HDTV_1080p24" size="${width},${height}" fovFit="VerticalFitFov" fov="41.1121"/>
    <framerate val="${fps}"/>
    <zdragging val="true"/>
    <zOrderCompatibilityWith7_3 val="false"/>
    <cameraInSymbols val="true"/>
  </options>
  <scenes>
    <scene name="Top" id="${sceneId}" nbframes="${frameCount}">
      <columns/>
      <options>
        <defaultDisplay val="Display"/>
      </options>
      <rootgroup name="Top">
        <options>
          <collapsed val="false"/>
        </options>
        <nodelist>
          <module type="COMPOSITE" name="Composite" pos="0,0,1">
            <options>
              <version val="1"/>
              <collapsed val="false"/>
            </options>
            <attrs>
              <compositeMode val="composite2D"/>
              <flattenOutput val="true"/>
              <applyFocus val="true"/>
              <multiplier val="1"/>
              <outputZ val="LEFTMOST"/>
              <outputZInputPort val="1"/>
              <flattenVector val="false"/>
              <tvgPalette val=""/>
            </attrs>
          </module>
          <module type="DISPLAY" name="Display" pos="0,100,2">
            <options>
              <version val="1"/>
              <collapsed val="false"/>
            </options>
          </module>
          <module type="WRITE" name="Write" pos="100,100,3">
            <options>
              <version val="1"/>
              <collapsed val="false"/>
            </options>
            <attrs>
              <exportToMovie val="false"/>
              <drawingType val="TGA"/>
              <leadingZeros val="3"/>
              <start val="1"/>
            </attrs>
          </module>
          <module type="CAMERA" name="Camera" pos="-200,-100,4">
            <options>
              <version val="1"/>
              <collapsed val="false"/>
            </options>
            <attrs>
              <fov val="41.1121"/>
            </attrs>
          </module>
        </nodelist>
        <linklist>
          <link from="Composite" to="Display"/>
          <link from="Composite" to="Write"/>
        </linklist>
      </rootgroup>
    </scene>
  </scenes>
  <symbols>
    <folder name="Symbols">
      <scene id="${sceneId}"/>
    </folder>
  </symbols>
  <timeline>
    <scene id="${sceneId}"/>
  </timeline>
</project>
`;
}
