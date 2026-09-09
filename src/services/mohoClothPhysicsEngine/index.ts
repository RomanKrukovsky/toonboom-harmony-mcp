import type {
  ClothKeyframeChannel,
  ClothPhysicsInput
} from '../../schemas/mohoClothPhysicsSpec.js';

export interface SolvedClothSimulation {
  characterId: string;
  channels: ClothKeyframeChannel[];
  maxDeflectionDeg: number;
  barrierCollisionsPrevented: number;
}

export class MohoClothPhysicsEngine {
  /**
   * Simulates non-collapsing, damped harmonic wave dynamics across serial bone chains
   * with collision barrier enforcement (e.g. legs/body plane).
   */
  public static simulateClothWaves(input: ClothPhysicsInput): SolvedClothSimulation {
    const channels: ClothKeyframeChannel[] = [];
    let maxDeflection = 0;
    let collisionsPrevented = 0;

    const windAngleDeg = (Math.atan2(input.windVector.y, input.windVector.x) * 180) / Math.PI;
    const windMagnitude = Math.hypot(input.windVector.x, input.windVector.y);
    const windBiasDeg = Math.min(25, windMagnitude * 1.5) * (Math.cos((windAngleDeg * Math.PI) / 180) >= 0 ? 1 : -1);

    for (const chain of input.chains) {
      for (let nodeIdx = 0; nodeIdx < chain.nodes.length; nodeIdx++) {
        const node = chain.nodes[nodeIdx];
        const keys: Array<{ frame: number; angleDeg: number }> = [];

        // Damping: amplitude decays progressively down the chain to prevent whipping singularities
        const nodeDamping = Math.exp(-input.dampingFactor * nodeIdx);
        const phaseDelay = nodeIdx * 0.45; // Progressive wave delay down the chain

        for (let frame = 1; frame <= input.totalFrames; frame++) {
          const wavePhase = frame * input.waveFrequency - phaseDelay;
          const harmonicOscillation = Math.sin(wavePhase) * input.waveAmplitudeDeg * nodeDamping;

          let finalAngle = node.baseAngleDeg + windBiasDeg + harmonicOscillation;

          // Barrier plane collision enforcement (e.g. thigh plane)
          if (input.barrierPlane) {
            // Simplified angle clamp against barrier normal
            const normalAngleDeg = (Math.atan2(input.barrierPlane.normal.y, input.barrierPlane.normal.x) * 180) / Math.PI;
            const angleDiff = finalAngle - normalAngleDeg;

            // If angle pushes cloth inside the barrier (into the character body)
            if (angleDiff < -80) {
              finalAngle = normalAngleDeg - 80;
              collisionsPrevented++;
            } else if (angleDiff > 80) {
              finalAngle = normalAngleDeg + 80;
              collisionsPrevented++;
            }
          }

          finalAngle = +finalAngle.toFixed(2);
          maxDeflection = Math.max(maxDeflection, Math.abs(finalAngle - node.baseAngleDeg));

          keys.push({
            frame,
            angleDeg: finalAngle
          });
        }

        channels.push({
          boneId: node.boneId,
          keys
        });
      }
    }

    return {
      characterId: input.characterId,
      channels,
      maxDeflectionDeg: +maxDeflection.toFixed(2),
      barrierCollisionsPrevented: collisionsPrevented
    };
  }
}
