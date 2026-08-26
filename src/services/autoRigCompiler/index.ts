import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import {
  CharacterTopologyPIRSchema,
  type CharacterTopologyPIR
} from '../pivotEstimator/index.js';
import { PivotEstimator } from '../pivotEstimator/index.js';
import { RigTemplateRegistry, type RigTemplateEntry } from '../rigTemplateRegistry/index.js';
import { RigBindingResolver } from '../rigBindingResolver/index.js';
import { HarmonyCommandBuilder } from '../harmonyCommandBuilder/index.js';
import { CharacterRigAssembler } from '../../adapters/characterRigAssembler.js';
import { DeformerGenerator } from '../../adapters/deformerGenerator.js';
import { JointGuideSolver } from '../jointGuideSolver/index.js';
import type { CharacterDrawingPIR } from '../../schemas/vectorizationPIR.js';
import type { CharacterRigAssemblyPlan, PartRigSpec } from '../../schemas/characterRigPIR.js';
import type { DeformerAssemblyPlan } from '../../schemas/deformerPIR.js';
import type { JointGuides } from '../../schemas/jointGuides.js';
import { harmonyCommandPlanV4Schema, type HarmonyCommandPlanV4 } from '../../schemas/harmonyCommandPlanV4.js';
import { type RigBindingPlanV1 } from '../../schemas/rigBinding.js';

/**
 * AutoRigCompiler — deterministic replacement for the mechanical layer of
 * 2D cut-out rigging:
 *
 *   raw skeleton (real model output) -> joints + reliability audit
 *     -> pivot placement -> template slot binding
 *     -> HarmonyCommandPlanV4 (peg hierarchy, pivots, node graph)
 *
 * With an optional CharacterDrawingPIR (layer decomposition), it additionally
 * emits the rest of a rigger's mechanical output:
 *
 *   drawing layers -> rig assembly plan (parts, auto-patch joints, backdrops)
 *                  -> deformer plan (Curve for limbs, Envelope for torso/head)
 *                  -> face master-controller plan (3x3 grid over eyes/mouth/brows)
 *
 * Every stage is a previously verified component (PivotEstimator,
 * RigBindingResolver, HarmonyCommandBuilder, CharacterRigAssembler,
 * DeformerGenerator); this orchestrator adds no creative decisions of its own.
 *
 * What it deliberately does NOT replace: art-gap patch artwork at deformed
 * joints and final rig approval. Those stay human until perception can see
 * them.
 */

export interface AutoRigAttachment {
  partId: string;
  pegNodeName: string;
  drawingNodeName: string;
  parentPartId: string | null;
  semanticGroup: string;
}

export interface AutoRigResult {
  characterId: string;
  topologyPir: CharacterTopologyPIR;
  topologySha256: string;
  templateId: string;
  templateVersion: string;
  templateContentHash: string;
  bindingPlan: RigBindingPlanV1;
  commandPlan: HarmonyCommandPlanV4;
  rigAssemblyPlan: CharacterRigAssemblyPlan | null;
  deformerPlan: DeformerAssemblyPlan | null;
  jointGuides: JointGuides | null;
  missingHingeLandmarks: string[];
  attachments: AutoRigAttachment[];
  /** SHA-256 over volatile-stripped artifacts; stable across runs. */
  rigContentDigest: string;
}

export function stripVolatilePlanFields(plan: HarmonyCommandPlanV4): Record<string, unknown> {
  const { planId, manifestId, createdAt, ...rest } = plan;
  return rest;
}

/**
 * Assembly/deformer plans stamp planId/createdAt with Date.now() by design.
 * rigAssemblyPlan.planHash is derived from those volatile fields, so it is
 * excluded from content digests as well.
 */
function stripVolatileRigPlanFields(plan: CharacterRigAssemblyPlan): Record<string, unknown> {
  const { planId, createdAt, planHash, ...rest } = plan;
  return rest;
}
function stripVolatileDeformerPlanFields(plan: DeformerAssemblyPlan): Record<string, unknown> {
  const { planId, ...rest } = plan;
  return rest;
}

function sha256Of(value: unknown): string {
  return crypto.createHash('sha256').update(stringify(value) ?? '').digest('hex');
}

export class AutoRigCompiler {
  private readonly bindingResolver = new RigBindingResolver();
  private readonly planBuilder = new HarmonyCommandBuilder();

  compile(
    rawSkeleton: unknown,
    characterId: string,
    registry: RigTemplateRegistry,
    templateId = 'biped_standard',
    templateVersion = '1.0.0',
    drawingPir?: CharacterDrawingPIR
  ): AutoRigResult {
    // 1. Skeleton -> topology PIR with pivot estimates and honesty audit.
    const pir = PivotEstimator.estimate(rawSkeleton, characterId);
    const pirParse = CharacterTopologyPIRSchema.safeParse(pir);
    if (!pirParse.success) {
      throw new Error(`CharacterTopologyPIR failed schema validation: ${pirParse.error.message}`);
    }

    const topologySha256 = sha256Of(pir);

    // 2. Template slots <- landmark bindings.
    const entry: RigTemplateEntry = registry.getTemplate(templateId, templateVersion);
    const bindingPlan = this.bindingResolver.resolveBinding(
      characterId,
      pir,
      `sha256:${topologySha256}`,
      entry
    );

    // 3. Binding plan -> rig assembly command plan for real Harmony.
    const commandPlan = this.planBuilder.buildPlan(pir, bindingPlan, entry);
    const planParse = harmonyCommandPlanV4Schema.safeParse(commandPlan);
    if (!planParse.success) {
      throw new Error(`rig command plan failed schema validation: ${JSON.stringify(planParse.error.errors)}`);
    }

    // 4. Optional drawing decomposition -> full cut-out rig package:
    //    part hierarchy with peg/drawing node names, deformer set (Curve for
    //    limbs, Envelope for torso/head), and the face master controller.
    let rigAssemblyPlan: CharacterRigAssemblyPlan | null = null;
    let deformerPlan: DeformerAssemblyPlan | null = null;
    let attachments: AutoRigAttachment[] = [];
    if (drawingPir) {
      rigAssemblyPlan = CharacterRigAssembler.assemblePlan(drawingPir, characterId);
      deformerPlan = DeformerGenerator.generatePlan(rigAssemblyPlan);
      attachments = rigAssemblyPlan.parts.map((p: PartRigSpec) => ({
        partId: p.partId,
        pegNodeName: p.pegNodeName,
        drawingNodeName: p.drawingNodeName,
        parentPartId: p.parentPartId,
        semanticGroup: p.semanticGroup
      }));
    }

    // 5. Hinge circles ("draw a circle with a center at the joint"): pivot
    //    positions + slice chords + overlap radii for clean elbow/knee bends.
    const jointSolver = new JointGuideSolver();
    const jointSolve = jointSolver.solve(pir);

    // 6. Snap hinge pivots to the circle centers: each guide's center becomes
    //    the peg pivot of the CHILD part (Forearm/Shin), so the limb rotates
    //    around the drawn circle and the overlap ball hides the bend.
    const hingeChildPart: Record<string, string> = {
      elbow_left: 'Forearm_L',
      elbow_right: 'Forearm_R',
      knee_left: 'Shin_L',
      knee_right: 'Shin_R'
    };
    if (rigAssemblyPlan) {
      for (const guide of jointSolve.guides.guides) {
        const childPartId = hingeChildPart[guide.jointName];
        const part = attachments.find(a => a.partId === childPartId);
        if (!part) continue;
        commandPlan.commands.push({
          commandId: `cmd_${9000 + commandPlan.commands.length}`,
          type: 'set_peg_pivot',
          params: {
            target_node_id: part.pegNodeName,
            coordinate_space: 'HARMONY_SCENE',
            pivot: { x: guide.centerX, y: guide.centerY, z: 0 },
            source_binding: `joint_guide:${guide.jointName}`
          },
          preconditions: [`node_exists:${part.pegNodeName}`],
          destructiveLevel: 'reversible',
          idempotencyKey: `pivot_hinge_${guide.jointName}_center`,
          rollback: { strategy: 'none', snapshotRequired: false },
          expectedArtifact: { kind: 'node_attr', path: null, nonempty: false },
          verification: { method: 'check_attr', required: true, acceptance: [] }
        });
      }
      const revalidated = harmonyCommandPlanV4Schema.safeParse(commandPlan);
      if (!revalidated.success) {
        throw new Error(`rig command plan failed schema validation after hinge pivots: ${JSON.stringify(revalidated.error.errors)}`);
      }
    }

    return {
      characterId,
      topologyPir: pir,
      topologySha256,
      templateId,
      templateVersion,
      templateContentHash: entry.contentHash,
      bindingPlan,
      commandPlan,
      rigAssemblyPlan,
      deformerPlan,
      jointGuides: jointSolve.guides,
      missingHingeLandmarks: jointSolve.missingLandmarks,
      attachments,
      rigContentDigest: `sha256:${sha256Of({
        topologyPir: pir,
        bindingPlan,
        commandPlan: stripVolatilePlanFields(commandPlan),
        rigAssemblyPlan: rigAssemblyPlan ? stripVolatileRigPlanFields(rigAssemblyPlan) : null,
        deformerPlan: deformerPlan ? stripVolatileDeformerPlanFields(deformerPlan) : null,
        jointGuides: jointSolve.guides
      })}`
    };
  }
}
