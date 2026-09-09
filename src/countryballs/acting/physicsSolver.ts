import { ActionDefinition, getActionDefinition } from './actionVocabulary.js';
import { CountryballCharacter, CountryballEyeState } from '../../schemas/countryballs/seriesBible.js';

export interface FramePose {
  frame: number;
  deltaX: number;
  deltaY: number;
  scaleX: number;
  scaleY: number;
  rotationDeg: number;
  eyeState: CountryballEyeState;
  secondaryMotion: {
    accessoryDeltaY: number;
    accessoryRotationDeg: number;
  };
}

export class CountryballsPhysicsSolver {
  /**
   * Computes frame-by-frame transformation curves for a semantic countryball action.
   */
  public static solveActionCurves(
    actionId: string,
    startFrame: number,
    durationFrames: number,
    character: CountryballCharacter,
    intensity: number = 1.0,
    forcedEyeState?: CountryballEyeState
  ): FramePose[] {
    const actionDef = getActionDefinition(actionId);
    const totalFrames = Math.max(1, durationFrames);
    const poses: FramePose[] = [];

    // Weight multiplier adjusts responsiveness
    const weightFactor = character.physical.weight === 'light' ? 1.25 : character.physical.weight === 'heavy' ? 0.75 : 1.0;
    const bounciness = character.physical.bounciness;

    const baseSquash = 1.0 - (1.0 - actionDef.squashFactor) * intensity * (1.0 / weightFactor);
    const baseStretch = 1.0 + (actionDef.stretchFactor - 1.0) * intensity * weightFactor;

    for (let f = 0; f < totalFrames; f++) {
      const progress = f / (totalFrames - 1 || 1); // 0.0 to 1.0
      let deltaX = 0;
      let deltaY = 0;
      let scaleX = 1.0;
      let scaleY = 1.0;
      let rot = 0;
      let accY = 0;
      let accRot = 0;

      switch (actionDef.category) {
        case 'locomotion': {
          // Classic arc curve with squash on landing and stretch on jump
          const jumpArc = Math.sin(progress * Math.PI);
          deltaY = actionDef.yOffsetPx * jumpArc * weightFactor;
          deltaX = actionDef.xOffsetPx * progress;

          if (progress < 0.15) {
            // Anticipation squash
            const anticipPhase = progress / 0.15;
            scaleY = 1.0 - (1.0 - baseSquash) * (1 - anticipPhase);
            scaleX = 1.0 / Math.max(0.2, scaleY);
          } else if (progress > 0.85) {
            // Landing compression and bounce settle
            const landPhase = (progress - 0.85) / 0.15;
            const bounce = Math.sin(landPhase * Math.PI * 2) * (1.0 - baseSquash) * bounciness;
            scaleY = 1.0 - bounce;
            scaleX = 1.0 + bounce * 0.6;
          } else {
            // Aerial stretch
            scaleY = 1.0 + (baseStretch - 1.0) * jumpArc;
            scaleX = 1.0 / Math.max(0.2, scaleY);
          }

          rot = actionDef.rotationWobbleDeg * Math.sin(progress * Math.PI);
          accY = -deltaY * 0.2; // secondary lag for hats
          accRot = -rot * 0.4;
          break;
        }

        case 'reaction_take': {
          // Explosive impulse followed by damped harmonic oscillation
          const impulse = Math.sin(progress * Math.PI * 0.5);
          const damping = Math.exp(-progress * 3.5);
          const oscillation = Math.sin(progress * Math.PI * 6) * damping;

          deltaX = actionDef.xOffsetPx * impulse;
          deltaY = actionDef.yOffsetPx * impulse + oscillation * 10 * intensity;

          if (progress < 0.3) {
            // Explosive stretch/squash peak
            scaleY = baseStretch;
            scaleX = 1.0 / baseStretch;
          } else {
            // Damping settle
            scaleY = 1.0 + oscillation * (baseStretch - 1.0);
            scaleX = 1.0 - oscillation * (baseStretch - 1.0) * 0.8;
          }

          rot = actionDef.rotationWobbleDeg * impulse + oscillation * 8;
          accY = -deltaY * 0.35;
          accRot = rot * 1.5; // hat flies upward
          break;
        }

        case 'emotional_idle': {
          // Continuous looping sine wave
          const phase = progress * Math.PI * 2;
          deltaY = actionDef.yOffsetPx * Math.sin(phase);
          deltaX = actionDef.xOffsetPx * Math.cos(phase);
          scaleY = 1.0 + (baseStretch - 1.0) * Math.sin(phase);
          scaleX = 1.0 - (baseStretch - 1.0) * Math.sin(phase) * 0.7;
          rot = actionDef.rotationWobbleDeg * Math.sin(phase * 1.5);
          accY = deltaY * 0.3;
          accRot = rot * 0.5;
          break;
        }

        case 'gaze_micro': {
          // Minimal body motion, focus on eye/micro tilt
          deltaX = actionDef.xOffsetPx * Math.sin(progress * Math.PI);
          deltaY = actionDef.yOffsetPx * Math.sin(progress * Math.PI);
          scaleX = 1.0;
          scaleY = 1.0;
          rot = actionDef.rotationWobbleDeg * Math.sin(progress * Math.PI);
          accY = 0;
          accRot = 0;
          break;
        }

        case 'slapstick_gag': {
          // Extreme squash, cartoon flattening, explosive recovery
          if (progress < 0.2) {
            // Impact squash
            scaleY = baseSquash;
            scaleX = 1.0 / Math.max(0.1, baseSquash);
            deltaY = actionDef.yOffsetPx;
          } else if (progress < 0.6) {
            // Flatten hold
            scaleY = baseSquash * 1.05;
            scaleX = (1.0 / Math.max(0.1, baseSquash)) * 0.95;
            deltaY = actionDef.yOffsetPx;
          } else {
            // Elastic pop back
            const popPhase = (progress - 0.6) / 0.4;
            const popBounce = Math.sin(popPhase * Math.PI * 3) * Math.exp(-popPhase * 2.5);
            scaleY = 1.0 + popBounce * 0.5;
            scaleX = 1.0 - popBounce * 0.3;
            deltaY = actionDef.yOffsetPx * (1 - popPhase);
          }
          rot = actionDef.rotationWobbleDeg * progress;
          accY = -deltaY * 0.4;
          accRot = rot * 0.8;
          break;
        }

        case 'dialogue_gesture': {
          // Subtle speech bounce
          const speechPulse = Math.sin(progress * Math.PI * 4);
          deltaY = -4 * Math.abs(speechPulse) * intensity;
          scaleY = 1.0 + 0.04 * speechPulse;
          scaleX = 1.0 - 0.02 * speechPulse;
          rot = 2 * Math.sin(progress * Math.PI * 2);
          accY = deltaY * 0.2;
          accRot = rot;
          break;
        }

        default: {
          const _exhaustiveCheck: never = actionDef.category;
          scaleX = 1.0;
          scaleY = 1.0;
        }
      }

      poses.push({
        frame: startFrame + f,
        deltaX: Number(deltaX.toFixed(2)),
        deltaY: Number(deltaY.toFixed(2)),
        scaleX: Number(scaleX.toFixed(3)),
        scaleY: Number(scaleY.toFixed(3)),
        rotationDeg: Number(rot.toFixed(2)),
        eyeState: forcedEyeState || actionDef.recommendedEyeState,
        secondaryMotion: {
          accessoryDeltaY: Number(accY.toFixed(2)),
          accessoryRotationDeg: Number(accRot.toFixed(2))
        }
      });
    }

    return poses;
  }
}
