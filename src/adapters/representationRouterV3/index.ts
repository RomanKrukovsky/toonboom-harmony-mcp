import {
  routingPlanSchema,
  routingDecisionSchema,
  representationSegmentSchema,
  REPRESENTATION_ROUTER_SCHEMA_VERSION,
  type RoutingPlan,
  type RoutingDecision,
  type RepresentationType
} from '../../schemas/representationRouter.js';
import type { PartDecomposition, PartTrack } from '../../schemas/partDecomposition.js';

export interface RoutingInput {
  characterId: string;
  sceneId: string;
  decomposition: PartDecomposition;
  studioProfile?: {
    preferredRepresentation?: RepresentationType;
    maxDeformersPerPart?: number;
    editabilityPriority?: number;
    frameByFrameAllowed?: boolean;
  };
  artistLocks?: Record<string, RepresentationType>;
}

function computeFactors(part: PartTrack): RoutingDecision['factors'] {
  const states = part.frameStates;
  if (states.length === 0) {
    return {
      rigidMotion: 0, silhouetteChange: 0, articulation: 0, occlusion: 0,
      topologyChange: 0, lineStability: 1, residualError: 0,
      estimatedKeyCount: 0, nodeViewComplexity: 'low' as const,
      editability: 1, artistLocked: false
    };
  }

  const motions = states.map(s => Math.sqrt(s.motionDelta.dx ** 2 + s.motionDelta.dy ** 2));
  const avgMotion = motions.reduce((a, b) => a + b, 0) / motions.length;
  const maxMotion = Math.max(...motions);
  const motionVariance = motions.reduce((sum, m) => sum + (m - avgMotion) ** 2, 0) / motions.length;

  const rigidMotion = part.motionCluster === 'rigid' ? 0.9 : part.motionCluster === 'static' ? 0.95 : Math.max(0, 1 - motionVariance / 100);

  const occludedFrames = states.filter(s => s.occluded).length;
  const occlusion = states.length > 0 ? occludedFrames / states.length : 0;

  const articulation = part.motionCluster === 'articulated' ? 0.8 : part.motionCluster === 'deformable' ? 0.6 : 0.1;

  const silhouetteChange = part.motionCluster === 'deformable' ? 0.7 : part.motionCluster === 'articulated' ? 0.5 : 0.1;

  const topologyChange = part.partId === 'hair' || part.partId === 'clothing' ? 0.6 : 0.0;

  const lowConfFrames = states.filter(s => s.confidence < 0.4).length;
  const lineStability = states.length > 0 ? 1 - (lowConfFrames / states.length) : 0.5;

  const residualError = maxMotion > 50 ? 0.3 : maxMotion > 20 ? 0.15 : 0.05;

  const estimatedKeyCount = part.motionCluster === 'static' ? 1 : Math.max(2, Math.round(avgMotion / 5));

  const nodeViewComplexity: 'low' | 'medium' | 'high' =
    articulation > 0.6 ? 'high' : articulation > 0.3 ? 'medium' : 'low';

  const editability = part.identity.inferred ? 0.5 : 0.8;

  return {
    rigidMotion: Math.min(1, rigidMotion),
    silhouetteChange: Math.min(1, silhouetteChange),
    articulation: Math.min(1, articulation),
    occlusion: Math.min(1, occlusion),
    topologyChange: Math.min(1, topologyChange),
    lineStability: Math.min(1, Math.max(0, lineStability)),
    residualError,
    estimatedKeyCount,
    nodeViewComplexity,
    editability,
    artistLocked: false
  };
}

function selectRepresentation(
  part: PartTrack,
  factors: RoutingDecision['factors'],
  studioProfile: NonNullable<RoutingInput['studioProfile']>
): { representation: RepresentationType; explanation: string; confidence: number } {
  const locked = studioProfile.preferredRepresentation;
  const editPriority = studioProfile.editabilityPriority ?? 0.5;

  if (factors.rigidMotion > 0.8 && factors.silhouetteChange < 0.2) {
    return {
      representation: 'peg_transform',
      explanation: `Part ${part.partId} moves rigidly with minimal silhouette change — Peg transform is optimal.`,
      confidence: 0.9
    };
  }

  if (factors.articulation > 0.6 && factors.silhouetteChange < 0.5) {
    return {
      representation: 'curve_deformer',
      explanation: `Part ${part.partId} has articulated motion with moderate silhouette change — Curve deformer balances editability and fidelity.`,
      confidence: 0.75
    };
  }

  if (factors.topologyChange > 0.4) {
    if (studioProfile.frameByFrameAllowed !== false) {
      return {
        representation: 'frame_by_frame_vector',
        explanation: `Part ${part.partId} has topology changes (e.g. hair/cloth) — frame-by-frame vector preserves shape fidelity.`,
        confidence: 0.65
      };
    }
    return {
      representation: 'drawing_substitution',
      explanation: `Part ${part.partId} has topology changes but frame-by-frame is disabled — using drawing substitutions.`,
      confidence: 0.55
    };
  }

  if (factors.silhouetteChange > 0.5 && factors.articulation < 0.4) {
    return {
      representation: 'envelope_deformer',
      explanation: `Part ${part.partId} has significant silhouette change without articulation — Envelope deformer for soft deformation.`,
      confidence: 0.7
    };
  }

  if (factors.occlusion > 0.5) {
    return {
      representation: 'reference_only',
      explanation: `Part ${part.partId} is occluded >50% of frames — marking as reference only to avoid hallucination.`,
      confidence: 0.4
    };
  }

  if (editPriority > 0.7 && factors.rigidMotion > 0.5) {
    return {
      representation: 'peg_transform',
      explanation: `High editability priority + moderate rigidity — Peg transform preferred for artist control.`,
      confidence: 0.7
    };
  }

  if (locked) {
    return {
      representation: locked,
      explanation: `Studio profile prefers ${locked} — applying as default.`,
      confidence: 0.5
    };
  }

  return {
    representation: 'curve_deformer',
    explanation: `Part ${part.partId} has mixed motion characteristics — Curve deformer as safe default.`,
    confidence: 0.6
  };
}

function buildAlternatives(
  part: PartTrack,
  chosen: RepresentationType,
  factors: RoutingDecision['factors']
): RoutingDecision['alternatives'] {
  const allTypes: RepresentationType[] = [
    'peg_transform', 'curve_deformer', 'envelope_deformer', 'bone_deformer',
    'drawing_substitution', 'frame_by_frame_vector', 'reference_only'
  ];

  return allTypes
    .filter(t => t !== chosen)
    .slice(0, 3)
    .map(rep => ({
      representation: rep,
      score: computeAltScore(rep, factors),
      reason: `Alternative for ${part.partId}: ${rep} scores ${computeAltScore(rep, factors).toFixed(2)} under current factors.`
    }));
}

function computeAltScore(rep: RepresentationType, factors: RoutingDecision['factors']): number {
  switch (rep) {
    case 'peg_transform': return factors.rigidMotion * 0.9;
    case 'curve_deformer': return (1 - factors.rigidMotion) * 0.7 + factors.editability * 0.3;
    case 'envelope_deformer': return factors.silhouetteChange * 0.6;
    case 'bone_deformer': return factors.articulation * 0.7;
    case 'drawing_substitution': return factors.topologyChange * 0.8;
    case 'frame_by_frame_vector': return factors.topologyChange * 0.9;
    case 'reference_only': return factors.occlusion * 0.8;
    default: return 0.1;
  }
}

export class RepresentationRouterV3 {
  route(input: RoutingInput): RoutingPlan {
    const { decomposition, studioProfile = {}, artistLocks = {} } = input;
    const decisions: RoutingDecision[] = [];
    const segmentMap = new Map<string, RoutingDecision[]>();

    for (const part of decomposition.parts) {
      const factors = computeFactors(part);

      if (artistLocks[part.partId]) {
        factors.artistLocked = true;
      }

      const { representation, explanation, confidence } = selectRepresentation(part, factors, studioProfile);
      const alternatives = buildAlternatives(part, representation, factors);

      const decision = routingDecisionSchema.parse({
        decisionId: `dec_${part.partId}_${decomposition.parts.indexOf(part)}`,
        partId: part.partId,
        startFrame: part.frameStates[0]?.frame ?? 1,
        endFrame: part.frameStates[part.frameStates.length - 1]?.frame ?? 1,
        representation: artistLocks[part.partId] ?? representation,
        explanation: artistLocks[part.partId]
          ? `Artist locked ${part.partId} to ${artistLocks[part.partId]}`
          : explanation,
        confidence: artistLocks[part.partId] ? 1.0 : confidence,
        factors,
        alternatives
      });

      decisions.push(decision);

      if (!segmentMap.has(part.partId)) segmentMap.set(part.partId, []);
      segmentMap.get(part.partId)!.push(decision);
    }

    const segments = Array.from(segmentMap.entries()).map(([partId, decs]) =>
      representationSegmentSchema.parse({
        partId,
        segments: decs.map(d => ({
          startFrame: d.startFrame,
          endFrame: d.endFrame,
          representation: d.representation,
          decisionId: d.decisionId,
          explanation: d.explanation,
          confidence: d.confidence
        }))
      })
    );

    const representationCounts: Record<string, number> = {};
    for (const d of decisions) {
      representationCounts[d.representation] = (representationCounts[d.representation] ?? 0) + 1;
    }

    const avgConfidence = decisions.length > 0
      ? decisions.reduce((s, d) => s + d.confidence, 0) / decisions.length
      : 0;

    const lockedCount = decisions.filter(d => d.factors.artistLocked).length;

    return routingPlanSchema.parse({
      schemaVersion: REPRESENTATION_ROUTER_SCHEMA_VERSION,
      characterId: input.characterId,
      sceneId: input.sceneId,
      decisions,
      segments,
      studioProfile: {
        preferredRepresentation: studioProfile.preferredRepresentation,
        maxDeformersPerPart: studioProfile.maxDeformersPerPart,
        editabilityPriority: studioProfile.editabilityPriority ?? 0.5,
        frameByFrameAllowed: studioProfile.frameByFrameAllowed ?? true
      },
      summary: {
        totalDecisions: decisions.length,
        representationCounts: representationCounts as Record<RepresentationType, number>,
        averageConfidence: avgConfidence,
        lockedPartCount: lockedCount
      },
      provenance: {
        engine: 'RepresentationRouterV3 v1',
        createdAt: new Date().toISOString()
      }
    });
  }
}
