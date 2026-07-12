import { type SceneUnderstanding } from '../../schemas/sceneIntelligence.js';
import { type DigitalActor } from '../../schemas/digitalActor.js';
import {
  type KeyPose,
  type KeyPoseSet,
  type MotionSynthesisPlan,
  type MotionTrack,
  motionSynthesisPlanSchema
} from '../../schemas/keyPoseMotion.js';
import { HarmonyError } from '../../security.js';

export class MotionSynthesizer {
  /**
   * Synthesizes motion tracks by interpolating between key poses.
   */
  synthesize(scene: SceneUnderstanding, poses: KeyPoseSet, actor: DigitalActor, tolerance = 0.05): MotionSynthesisPlan {
    const endFrame = scene.endFrame;
    const tracks: MotionTrack[] = [];
    const drawingSubstitutions: any[] = [];
    const exposureBlocks: any[] = [];

    // 1. Gather all body parts
    const parts = actor.hierarchy.map(h => h.partId);

    // 2. Setup transform tracks per body part and property
    const properties = ['positionX', 'positionY', 'rotation', 'scaleX', 'scaleY', 'skew'] as const;

    for (const part of parts) {
      const pivot = actor.pivots.find(p => p.partId === part) || { x: 0, y: 0 };

      for (const prop of properties) {
        // Find keyframe values from key poses
        const rawKeys = poses.poses
          .map((p: KeyPose) => {
            const val = p.transforms[part]?.[prop] ?? (prop.startsWith('scale') ? 1.0 : 0.0);
            return {
              frame: p.frame,
              value: val,
              type: p.type
            };
          })
          .sort((a: any, b: any) => a.frame - b.frame);

        if (rawKeys.length === 0) continue;

        // Populate a dense array of values for every frame [1..endFrame]
        const denseKeys: { frame: number; value: number; interpolation: string }[] = [];
        
        // Pad beginning if first keypose is after frame 1
        if (rawKeys[0].frame > 1) {
          const val = rawKeys[0].value;
          for (let f = 1; f < rawKeys[0].frame; f++) {
            denseKeys.push({ frame: f, value: val, interpolation: 'hold' });
          }
        }

        // Interpolate between successive keyframes
        for (let i = 0; i < rawKeys.length - 1; i++) {
          const k1 = rawKeys[i];
          const k2 = rawKeys[i + 1];
          const span = k2.frame - k1.frame;

          denseKeys.push({ frame: k1.frame, value: k1.value, interpolation: 'linear' });

          for (let f = k1.frame + 1; f < k2.frame; f++) {
            const t = (f - k1.frame) / span;
            let val = k1.value;

            // Simple curves based on the target pose type
            let interp = 'linear';
            if (k2.type === 'OvershootPose') {
              // Overshoot timing: ease out slightly and overshoot
              interp = 'overshoot';
              const s = 1.70158; // tension parameter
              const t2 = t - 1;
              const ratio = t2 * t2 * ((s + 1) * t2 + s) + 1;
              val = k1.value + (k2.value - k1.value) * ratio;
            } else if (k2.type === 'SettlePose') {
              // Settle timing: bounce dampening
              interp = 'settle';
              const angle = t * Math.PI * 2.5;
              const damp = Math.exp(-3 * t);
              const ratio = 1 - damp * Math.cos(angle);
              val = k1.value + (k2.value - k1.value) * ratio;
            } else if (k2.type === 'ExtremePose') {
              // Ease in-out
              interp = 'ease-in-out';
              const ratio = t * t * (3 - 2 * t);
              val = k1.value + (k2.value - k1.value) * ratio;
            } else {
              // Linear interpolation
              val = k1.value + (k2.value - k1.value) * t;
            }

            denseKeys.push({ frame: f, value: val, interpolation: interp });
          }
        }

        // Add last keyframe and pad to end of scene
        const lastKey = rawKeys[rawKeys.length - 1];
        for (let f = lastKey.frame; f <= endFrame; f++) {
          denseKeys.push({ frame: f, value: lastKey.value, interpolation: 'hold' });
        }

        // 3. Key reduction with error control
        const originalCount = denseKeys.length;
        const reducedKeys = this.reduceKeyframes(denseKeys, tolerance);

        const compressionRatio = Number((originalCount / Math.max(1, reducedKeys.length)).toFixed(2));
        
        // Calculate max error
        let maxError = 0;
        for (const dense of denseKeys) {
          const interpVal = this.getInterpolatedValue(reducedKeys, dense.frame);
          const error = Math.abs(dense.value - interpVal);
          if (error > maxError) maxError = error;
        }

        tracks.push({
          trackId: `track_${actor.actorId}_${part}_${prop}`,
          characterId: actor.actorId,
          partId: part,
          property: prop,
          keyframes: reducedKeys.map(k => ({
            frame: k.frame,
            value: Number(k.value.toFixed(4)),
            interpolation: k.interpolation as any
          })),
          residualError: Number(maxError.toFixed(4)),
          keyReductionMetrics: {
            originalKeyCount: originalCount,
            reducedKeyCount: reducedKeys.length,
            compressionRatio,
            maxError: Number(maxError.toFixed(4))
          }
        });
      }

      // 4. Generate drawing substitutions & exposures
      const drawingKeys = poses.poses
        .map((p: KeyPose) => ({
          frame: p.frame,
          drawingId: p.fittedDrawings[part] || 'default'
        }))
        .sort((a: any, b: any) => a.frame - b.frame);

      if (drawingKeys.length > 0) {
        // Pad start
        if (drawingKeys[0].frame > 1) {
          exposureBlocks.push({
            partId: part,
            startFrame: 1,
            endFrame: drawingKeys[0].frame - 1,
            drawingId: drawingKeys[0].drawingId
          });
        }

        // Add substitutions and ranges
        for (let i = 0; i < drawingKeys.length; i++) {
          const k1 = drawingKeys[i];
          drawingSubstitutions.push({
            frame: k1.frame,
            partId: part,
            drawingId: k1.drawingId
          });

          const nextFrame = (i < drawingKeys.length - 1) ? drawingKeys[i + 1].frame : endFrame + 1;
          exposureBlocks.push({
            partId: part,
            startFrame: k1.frame,
            endFrame: nextFrame - 1,
            drawingId: k1.drawingId
          });
        }
      }
    }

    const plan = {
      schemaVersion: '1.0',
      sceneId: scene.sceneId,
      tracks,
      drawingSubstitutions,
      exposureBlocks,
      frameByFrameExceptions: [],
      origin: 'generated'
    };

    return motionSynthesisPlanSchema.parse(plan);
  }

  /**
   * Simple tolerance-based key reduction (similar to Ramer-Douglas-Peucker on 1D series).
   */
  private reduceKeyframes(
    keys: { frame: number; value: number; interpolation: string }[],
    tolerance: number
  ): { frame: number; value: number; interpolation: string }[] {
    if (keys.length <= 2) return keys;

    const result: { frame: number; value: number; interpolation: string }[] = [];
    result.push(keys[0]); // Always keep start

    // Recursive RDP implementation
    const rdp = (startIdx: number, endIdx: number) => {
      if (endIdx - startIdx <= 1) return;

      let maxDist = 0;
      let maxIdx = -1;

      const startK = keys[startIdx];
      const endK = keys[endIdx];
      const span = endK.frame - startK.frame;

      for (let i = startIdx + 1; i < endIdx; i++) {
        const curK = keys[i];
        // Linear estimate
        const t = (curK.frame - startK.frame) / span;
        const estVal = startK.value + (endK.value - startK.value) * t;
        const dist = Math.abs(curK.value - estVal);

        if (dist > maxDist) {
          maxDist = dist;
          maxIdx = i;
        }
      }

      if (maxDist > tolerance) {
        rdp(startIdx, maxIdx);
        result.push(keys[maxIdx]);
        rdp(maxIdx, endIdx);
      }
    };

    rdp(0, keys.length - 1);
    result.push(keys[keys.length - 1]); // Always keep end

    return result.sort((a, b) => a.frame - b.frame);
  }

  /**
   * Interpolate value at frame to calculate verification residual error.
   */
  private getInterpolatedValue(
    keys: { frame: number; value: number; interpolation: string }[],
    frame: number
  ): number {
    const idx = keys.findIndex(k => k.frame >= frame);
    if (idx === -1) return keys[keys.length - 1].value;
    if (keys[idx].frame === frame) return keys[idx].value;
    if (idx === 0) return keys[0].value;

    const k1 = keys[idx - 1];
    const k2 = keys[idx];
    const t = (frame - k1.frame) / (k2.frame - k1.frame);
    return k1.value + (k2.value - k1.value) * t;
  }
}
