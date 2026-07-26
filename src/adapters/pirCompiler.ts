import fs from 'fs';
import path from 'path';
import { PIRv1 } from '../schemas/pirV1.js';
import { buildHumanoidStandardRigTemplate, HumanoidStandardRigTemplate } from './rigTemplates/humanoidStandardRig.js';
import { ActingPrimitivesEngine, ActingPerformanceCurves } from './actingPrimitives/actingPrimitivesEngine.js';

export interface CompiledSceneBundle {
  scenePath: string;
  commandPlanPath: string;
  rigTemplate: HumanoidStandardRigTemplate;
  performance: ActingPerformanceCurves;
  frameCount: number;
}

export class PIRCompiler {
  private readonly actingEngine = new ActingPrimitivesEngine();

  compileToHarmonyScene(pir: PIRv1, outputDir: string): CompiledSceneBundle {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const characterName = pir.inputContract.characterName;
    const rigTemplate = buildHumanoidStandardRigTemplate(characterName);
    const performance = this.actingEngine.evaluatePerformance(pir);

    const sceneName = `${pir.shotId}_scene`;
    const sceneFolder = path.join(outputDir, sceneName);
    if (!fs.existsSync(sceneFolder)) {
      fs.mkdirSync(sceneFolder, { recursive: true });
    }

    const elementsFolder = path.join(sceneFolder, 'elements');
    if (!fs.existsSync(elementsFolder)) {
      fs.mkdirSync(elementsFolder, { recursive: true });
    }

    // Build XML structure for .xstage
    const xstageContent = this.generateXStageXml(pir, rigTemplate, performance);
    const xstagePath = path.join(sceneFolder, `${sceneName}.xstage`);
    fs.writeFileSync(xstagePath, xstageContent, 'utf-8');

    // Build Harmony Command Plan JSON
    const commandPlan = {
      planVersion: '1.0',
      shotId: pir.shotId,
      productionProfile: pir.productionProfile,
      character: characterName,
      topology: rigTemplate.topology,
      frameCount: pir.durationFrames,
      fps: pir.fps,
      nodes: rigTemplate.nodes,
      autopatchJoints: rigTemplate.autopatchJoints,
      deformerChains: rigTemplate.deformerChains,
      keyframeTransforms: performance.keyframes,
      maxPeakRecoilAngle: performance.maxPeakRecoilAngle
    };

    const commandPlanPath = path.join(sceneFolder, 'command_plan.json');
    fs.writeFileSync(commandPlanPath, JSON.stringify(commandPlan, null, 2), 'utf-8');

    return {
      scenePath: xstagePath,
      commandPlanPath,
      rigTemplate,
      performance,
      frameCount: pir.durationFrames
    };
  }

  private generateXStageXml(pir: PIRv1, rig: HumanoidStandardRigTemplate, perf: ActingPerformanceCurves): string {
    const nodesXml = rig.nodes.map(n => `      <node id="${n.id}" name="${n.name}" type="${n.type}" />`).join('\n');
    const autopatchXml = rig.autopatchJoints.map(a => `      <autopatch joint="${a.jointName}" cutter="${a.cutterNode}" matte="${a.matteLayer}" target="${a.targetLayer}" />`).join('\n');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<project version="3" sceneName="${pir.shotId}_scene" fps="${pir.fps}" frameCount="${pir.durationFrames}">
  <elements>
${nodesXml}
  </elements>
  <autopatchRules>
${autopatchXml}
  </autopatchRules>
  <timeline frameCount="${pir.durationFrames}">
    <actingPrimitives evaluated="${perf.primitivesEvaluated.join(',')}" maxRecoil="${perf.maxPeakRecoilAngle}" />
  </timeline>
</project>`;
  }
}
