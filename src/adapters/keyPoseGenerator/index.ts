import { type SceneUnderstanding } from '../../schemas/sceneIntelligence.js';
import { type PerformancePlan } from '../../schemas/voicePerformance.js';
import { type DigitalActor } from '../../schemas/digitalActor.js';
import {
  type KeyPose,
  type KeyPoseSet,
  keyPoseSetSchema,
  KEY_POSE_MOTION_SCHEMA_VERSION
} from '../../schemas/keyPoseMotion.js';
import { HarmonyError } from '../../security.js';

export class KeyPoseGenerator {
  /**
   * Generates key poses for a character based on the scene script and voice performance details.
   */
  generate(scene: SceneUnderstanding, performance: PerformancePlan, actor: DigitalActor): KeyPoseSet {
    const fps = scene.fps || 24;
    const poses: KeyPose[] = [];

    // Helper to add a pose at a specific frame
    const addPose = (
      frame: number,
      type: KeyPose['type'],
      description: string,
      features: Partial<KeyPose['features']>,
      inferred = false
    ) => {
      // Prevent duplicates on the same frame
      if (poses.some(p => p.frame === frame)) return;

      // Extract parts from actor hierarchy or fallback
      const fittedDrawings: Record<string, string> = {};
      const transforms: Record<string, any> = {};

      for (const node of actor.hierarchy) {
        fittedDrawings[node.partId] = actor.substitutions.find(s => s.partId === node.partId)?.drawingId || 'default';
        
        // Setup initial default transform values
        transforms[node.partId] = {
          positionX: 0,
          positionY: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          skew: 0
        };
      }

      // Add a simple 2D skeleton graph
      const skeletonControlGraph: Record<string, { x: number; y: number; angle: number }> = {};
      for (const pivot of actor.pivots) {
        skeletonControlGraph[pivot.partId] = {
          x: pivot.x,
          y: pivot.y,
          angle: 0
        };
      }

      const defaultFeatures: KeyPose['features'] = {
        storytellingPose: description,
        silhouetteQuality: 0.8,
        lineOfAction: 'straight',
        balance: 'centered',
        weightDistribution: 'centered',
        facialExpression: features.facialExpression || 'neutral',
        handShape: features.handShape || 'rest',
        gazeDirection: features.gazeDirection || 'front',
        relationToCamera: 'front_facing'
      };

      poses.push({
        poseId: `pose_${actor.actorId}_f${frame}_${type.toLowerCase()}`,
        characterId: actor.actorId,
        frame,
        type,
        description,
        mode: 'generated_pose',
        confidence: 0.85,
        features: { ...defaultFeatures, ...features },
        skeletonControlGraph,
        fittedDrawings,
        transforms,
        inferred,
        provenance: 'automatic_key_pose_generation_v1'
      });
    };

    // 1. Initial Rest/Neutral Pose at Frame 1
    addPose(1, 'HoldPose', 'Initial state, waiting to act', {
      facialExpression: 'neutral',
      gazeDirection: 'front'
    });

    // 2. Parse performance events and place poses accordingly
    for (const event of performance.events) {
      const startFrame = Math.max(1, Math.round(event.startTime * fps));
      const endFrame = Math.min(scene.endFrame, Math.round(event.endTime * fps));
      const midFrame = Math.round((startFrame + endFrame) / 2);

      if (event.kind === 'gesture') {
        // Planning: Anticipation -> Extreme -> Settle
        const antFrame = Math.max(1, startFrame - 4);
        const overFrame = Math.min(scene.endFrame, endFrame + 3);

        addPose(antFrame, 'AnticipationPose', `Prepare gesture: ${event.description}`, {
          lineOfAction: 'reverse_c',
          facialExpression: 'focused',
          handShape: 'prepare'
        }, true);

        addPose(startFrame, 'BreakdownPose', `Start movement: ${event.description}`, {
          lineOfAction: 's_curve'
        });

        addPose(midFrame, 'ExtremePose', `Accent point of gesture: ${event.description}`, {
          silhouetteQuality: 0.95,
          lineOfAction: 'c_curve',
          handShape: 'point'
        });

        addPose(endFrame, 'OvershootPose', `Flick overshoot: ${event.description}`, {
          lineOfAction: 'straight',
          handShape: 'open'
        }, true);

        addPose(overFrame, 'SettlePose', `Settle back from gesture`, {
          lineOfAction: 'straight',
          handShape: 'rest'
        }, true);
      } else if (event.kind === 'gaze') {
        addPose(startFrame, 'BreakdownPose', `Turn gaze toward: ${event.target || 'target'}`, {
          gazeDirection: event.target || 'front'
        });
        addPose(endFrame, 'HoldPose', `Hold gaze on: ${event.target || 'target'}`, {
          gazeDirection: event.target || 'front'
        });
      } else if (event.kind === 'facial_expression') {
        addPose(startFrame, 'ExtremePose', `Change facial expression to: ${event.description}`, {
          facialExpression: event.description
        });
      } else if (event.kind === 'blink') {
        addPose(startFrame, 'BreakdownPose', 'Eyes closed mid-blink', {
          facialExpression: 'blink'
        });
        addPose(startFrame + 2, 'HoldPose', 'Recover from blink', {
          facialExpression: 'neutral'
        });
      }
    }

    // Sort poses by frame chronologically
    poses.sort((a, b) => a.frame - b.frame);

    const result = {
      schemaVersion: KEY_POSE_MOTION_SCHEMA_VERSION,
      sceneId: scene.sceneId,
      poses,
      poseCount: poses.length,
      createdAt: new Date().toISOString()
    };

    return keyPoseSetSchema.parse(result);
  }
}
