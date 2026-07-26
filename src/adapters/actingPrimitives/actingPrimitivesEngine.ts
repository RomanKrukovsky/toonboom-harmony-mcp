import { PIRv1, PIRActingPrimitive } from '../../schemas/pirV1.js';

export interface FrameKeyframeTransform {
  frame: number;
  pegId: string;
  position: { x: number; y: number; z: number };
  rotation: { angleZ: number };
  scale: { x: number; y: number };
}

export interface ActingPerformanceCurves {
  totalFrames: number;
  keyframes: FrameKeyframeTransform[];
  primitivesEvaluated: string[];
  maxPeakRecoilAngle: number;
}

export class ActingPrimitivesEngine {
  evaluatePerformance(pir: PIRv1): ActingPerformanceCurves {
    const totalFrames = pir.durationFrames;
    const keyframes: FrameKeyframeTransform[] = [];
    const primitivesEvaluated: string[] = [];
    let maxPeakRecoilAngle = 0;

    // Default keyframes across time
    for (let frame = 1; frame <= totalFrames; frame++) {
      let masterY = 0;
      let masterX = 0;
      let headRot = 0;
      let headY = 0;
      let armRRot = 0;
      let armLRot = 0;
      let torsoScaleY = 1.0;

      for (const primitive of pir.actingPrimitives) {
        if (frame >= primitive.startFrame && frame <= primitive.endFrame) {
          if (!primitivesEvaluated.includes(primitive.type)) {
            primitivesEvaluated.push(primitive.type);
          }

          const localProgress = (frame - primitive.startFrame) / Math.max(1, primitive.endFrame - primitive.startFrame);

          if (primitive.type === 'anticipation') {
            // Crouch down, pull head down, compress torso, wind up energy
            const crouch = Math.sin(localProgress * Math.PI) * primitive.intensity;
            masterY -= crouch * 0.8;
            torsoScaleY -= crouch * 0.15;
            headY -= crouch * 0.4;
            headRot -= crouch * 8.0; // slight forward tilt
            armRRot -= crouch * 15.0;
            armLRot += crouch * 15.0;
          } else if (primitive.type === 'recoil') {
            // Explosive flinch backward, head snap back, peak recoil, dampening ease-out
            const phase = localProgress;
            // Impulse curve: fast ramp up, oscillating dampening
            const recoilImpulse = Math.sin(phase * Math.PI) * Math.exp(-phase * 1.5) * primitive.intensity;
            masterX -= recoilImpulse * 2.5;
            masterY += recoilImpulse * 0.5;
            headRot += recoilImpulse * 80.0; // head snap back
            armRRot += recoilImpulse * 45.0;
            armLRot -= recoilImpulse * 45.0;

            if (Math.abs(headRot) > maxPeakRecoilAngle) {
              maxPeakRecoilAngle = Math.abs(headRot);
            }
          } else if (primitive.type === 'comedic_hold') {
            // Freeze posture with subtle micro-vibration & eye gaze hold
            const microVibe = Math.sin(frame * 1.8) * 0.05 * primitive.intensity;
            masterX += microVibe;
            masterY += microVibe * 0.5;
            headRot += Math.cos(frame * 1.2) * 0.5 * primitive.intensity;
          }
        }
      }

      const prefix = pir.inputContract.characterName.toLowerCase().replace(/[^a-z0-9]/g, '_');

      // Master Peg
      keyframes.push({
        frame,
        pegId: `${prefix}_Master_P`,
        position: { x: Number(masterX.toFixed(3)), y: Number(masterY.toFixed(3)), z: 0 },
        rotation: { angleZ: 0 },
        scale: { x: 1, y: 1 }
      });

      // Torso Peg
      keyframes.push({
        frame,
        pegId: `${prefix}_Torso_P`,
        position: { x: 0, y: 0, z: 0 },
        rotation: { angleZ: 0 },
        scale: { x: 1, y: Number(torsoScaleY.toFixed(3)) }
      });

      // Head Peg
      keyframes.push({
        frame,
        pegId: `${prefix}_Head_P`,
        position: { x: 0, y: Number(headY.toFixed(3)), z: 0 },
        rotation: { angleZ: Number(headRot.toFixed(2)) },
        scale: { x: 1, y: 1 }
      });

      // Right Arm Peg
      keyframes.push({
        frame,
        pegId: `${prefix}_Arm_R_P`,
        position: { x: 0, y: 0, z: 0 },
        rotation: { angleZ: Number(armRRot.toFixed(2)) },
        scale: { x: 1, y: 1 }
      });

      // Left Arm Peg
      keyframes.push({
        frame,
        pegId: `${prefix}_Arm_L_P`,
        position: { x: 0, y: 0, z: 0 },
        rotation: { angleZ: Number(armLRot.toFixed(2)) },
        scale: { x: 1, y: 1 }
      });
    }

    return {
      totalFrames,
      keyframes,
      primitivesEvaluated,
      maxPeakRecoilAngle: Number(maxPeakRecoilAngle.toFixed(2))
    };
  }
}
