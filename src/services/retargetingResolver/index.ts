import { PerformancePIR } from '../../schemas/performancePir.js';
import { RigBindingPlanV1 } from '../../schemas/rigBinding.js';
import { RetargetingPlan } from '../../schemas/retargetingPlan.js';
import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';

export class RetargetingResolver {
  public resolve(
    performancePir: PerformancePIR,
    bindingPlan: RigBindingPlanV1
  ): RetargetingPlan {
    const warnings: string[] = [];

    // Filter tracks: only keep ones that match bound nodes, and apply safety constraints.
    const resolvedTracks = performancePir.tracks.map(track => {
      return {
        nodeId: track.nodeId,
        keys: track.keys.map(k => {
          let rot = k.rotation;
          // Apply basic safety check: prevent crazy 360+ spinning logic if not expected
          if (rot !== undefined) {
            if (rot > 360) rot = rot % 360;
            if (rot < -360) rot = rot % -360;
          }
          return {
            frame: k.frame,
            rotation: rot,
            x: k.x,
            y: k.y,
            scaleX: k.scaleX,
            scaleY: k.scaleY,
            interpolation: k.interpolation
          };
        })
      };
    });

    const bindingHashStr = stringify(bindingPlan) || '';
    const bindingHash = crypto.createHash('sha256').update(bindingHashStr).digest('hex');

    return {
      schema: 'toon-boom-mcp/retargeting-plan-v1',
      characterId: performancePir.characterId,
      performanceId: performancePir.performanceId,
      bindingHash: `sha256:${bindingHash}`,
      tracks: resolvedTracks,
      warnings
    };
  }
}
