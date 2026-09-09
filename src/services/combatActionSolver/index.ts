import type {
  CombatActionSpec,
  CombatActorSpec,
  CombatTrajectoryKey,
  ConstraintHandOff,
  ImpactSpec,
  Vector2D
} from '../../schemas/combatActionPIR.js';

export interface SolvedActorTimeline {
  characterId: string;
  role: 'attacker' | 'defender';
  frames: Array<{
    frame: number;
    position: Vector2D;
    socketWorldPosition: Vector2D;
    isHitStopHold: boolean;
  }>;
}

export interface CameraShakeFrame {
  frame: number;
  offset: Vector2D;
}

export interface ConstraintWeightKey {
  frame: number;
  weight: number;
}

export interface SolvedCombatResult {
  specId: string;
  originalContactFrame: number;
  effectiveContactFrame: number;
  hitStopFrames: number;
  attackerTimeline: SolvedActorTimeline;
  defenderTimeline: SolvedActorTimeline;
  contactSocketDistanceAtImpact: number;
  impactWorldPosition: Vector2D;
  cameraShake: CameraShakeFrame[];
  constraintWeights: ConstraintWeightKey[];
  vfxSpawn: {
    preset: string;
    frame: number;
    position: Vector2D;
  };
}

export class CombatActionSolver {
  /**
   * Solves a dual-actor combat action beat: snaps contact sockets, applies hit-stop time dilation,
   * injects impulse recoil, procedural decaying camera shake, and constraint hand-off weights.
   */
  public static solveCombatInteraction(spec: CombatActionSpec): SolvedCombatResult {
    const contactFrame = spec.impact.contactFrame;
    const hitStop = spec.impact.hitStopFrames;

    // 1. Calculate socket world positions at contactFrame
    const attackerKeyAtContact = this.interpolateTrajectoryKey(spec.attacker.trajectory, contactFrame);
    const defenderKeyAtContact = this.interpolateTrajectoryKey(spec.defender.trajectory, contactFrame);

    const attackerSocketOffset = attackerKeyAtContact.socketOffset ?? { x: 0, y: 0 };
    const defenderSocketOffset = defenderKeyAtContact.socketOffset ?? { x: 0, y: 0 };

    const attackerSocketWorldAtContact: Vector2D = {
      x: attackerKeyAtContact.position.x + attackerSocketOffset.x,
      y: attackerKeyAtContact.position.y + attackerSocketOffset.y
    };

    const defenderSocketWorldAtContact: Vector2D = {
      x: defenderKeyAtContact.position.x + defenderSocketOffset.x,
      y: defenderKeyAtContact.position.y + defenderSocketOffset.y
    };

    // Snapping delta: how much defender needs to shift at contact to match attacker socket
    const snapDelta: Vector2D = {
      x: attackerSocketWorldAtContact.x - defenderSocketWorldAtContact.x,
      y: attackerSocketWorldAtContact.y - defenderSocketWorldAtContact.y
    };

    // 2. Build attacker timeline with hit-stop time dilation
    const attackerTimeline = this.buildActorTimeline({
      actor: spec.attacker,
      contactFrame,
      hitStopFrames: hitStop,
      snapOffset: { x: 0, y: 0 },
      impulseVector: { x: 0, y: 0 },
      isDefender: false
    });

    // 3. Build defender timeline with socket snapping, hit-stop, and post-impact impulse recoil
    const defenderTimeline = this.buildActorTimeline({
      actor: spec.defender,
      contactFrame,
      hitStopFrames: hitStop,
      snapOffset: snapDelta,
      impulseVector: spec.impact.impulseVector,
      isDefender: true
    });

    // Verify distance between contact sockets at effective contact frame
    const attackerContactFrameData = attackerTimeline.frames.find(f => f.frame === contactFrame)!;
    const defenderContactFrameData = defenderTimeline.frames.find(f => f.frame === contactFrame)!;

    const dx = attackerContactFrameData.socketWorldPosition.x - defenderContactFrameData.socketWorldPosition.x;
    const dy = attackerContactFrameData.socketWorldPosition.y - defenderContactFrameData.socketWorldPosition.y;
    const contactDistance = Math.hypot(dx, dy);

    // 4. Procedural camera shake starting at contactFrame
    const cameraShake = this.generateDecayingCameraShake(
      contactFrame,
      spec.impact.cameraShake.intensity,
      spec.impact.cameraShake.decayFrames,
      hitStop
    );

    // 5. Dynamic parent constraint weights
    const constraintWeights = this.solveConstraintHandOff(
      contactFrame,
      hitStop,
      spec.constraintHandOff
    );

    return {
      specId: spec.specId,
      originalContactFrame: contactFrame,
      effectiveContactFrame: contactFrame,
      hitStopFrames: hitStop,
      attackerTimeline,
      defenderTimeline,
      contactSocketDistanceAtImpact: contactDistance,
      impactWorldPosition: attackerSocketWorldAtContact,
      cameraShake,
      constraintWeights,
      vfxSpawn: {
        preset: spec.impact.vfxPreset,
        frame: contactFrame,
        position: attackerSocketWorldAtContact
      }
    };
  }

  /**
   * Generates discrete camera offsets with decaying harmonic oscillation.
   */
  public static generateDecayingCameraShake(
    startFrame: number,
    intensity: number,
    decayFrames: number,
    hitStopHoldFrames = 0
  ): CameraShakeFrame[] {
    const frames: CameraShakeFrame[] = [];
    const totalFrames = decayFrames + hitStopHoldFrames;
    const lambda = 3.0 / Math.max(1, decayFrames); // Decay constant: ~95% decay after decayFrames

    for (let f = 0; f <= totalFrames; f++) {
      const currentFrame = startFrame + f;
      if (intensity <= 0) {
        frames.push({ frame: currentFrame, offset: { x: 0, y: 0 } });
        continue;
      }

      // During hit-stop, hold a frozen peak offset
      if (f < hitStopHoldFrames) {
        frames.push({
          frame: currentFrame,
          offset: {
            x: +(intensity * 0.8).toFixed(3),
            y: +(-intensity * 0.6).toFixed(3)
          }
        });
        continue;
      }

      const activeTime = f - hitStopHoldFrames;
      const decayFactor = Math.exp(-lambda * activeTime);
      const phase = activeTime * 1.8; // High-frequency oscillation (~0.3 cycles per frame)

      const offsetX = intensity * decayFactor * Math.sin(phase);
      const offsetY = intensity * decayFactor * Math.cos(phase * 1.3) * 0.7;

      frames.push({
        frame: currentFrame,
        offset: {
          x: +offsetX.toFixed(3),
          y: +offsetY.toFixed(3)
        }
      });
    }

    return frames;
  }

  /**
   * Interpolates trajectory keyframe positions.
   */
  public static interpolateTrajectoryKey(
    trajectory: CombatTrajectoryKey[],
    targetFrame: number
  ): CombatTrajectoryKey {
    if (trajectory.length === 0) {
      return { frame: targetFrame, position: { x: 0, y: 0 }, socketOffset: { x: 0, y: 0 } };
    }

    const sorted = [...trajectory].sort((a, b) => a.frame - b.frame);
    if (targetFrame <= sorted[0].frame) return sorted[0];
    if (targetFrame >= sorted[sorted.length - 1].frame) return sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length - 1; i++) {
      const k1 = sorted[i];
      const k2 = sorted[i + 1];
      if (targetFrame >= k1.frame && targetFrame <= k2.frame) {
        const span = k2.frame - k1.frame;
        const alpha = span === 0 ? 0 : (targetFrame - k1.frame) / span;

        const posX = k1.position.x + (k2.position.x - k1.position.x) * alpha;
        const posY = k1.position.y + (k2.position.y - k1.position.y) * alpha;

        const off1 = k1.socketOffset ?? { x: 0, y: 0 };
        const off2 = k2.socketOffset ?? { x: 0, y: 0 };
        const sockX = off1.x + (off2.x - off1.x) * alpha;
        const sockY = off1.y + (off2.y - off1.y) * alpha;

        return {
          frame: targetFrame,
          position: { x: +posX.toFixed(3), y: +posY.toFixed(3) },
          socketOffset: { x: +sockX.toFixed(3), y: +sockY.toFixed(3) }
        };
      }
    }

    return sorted[sorted.length - 1];
  }

  private static buildActorTimeline(params: {
    actor: CombatActorSpec;
    contactFrame: number;
    hitStopFrames: number;
    snapOffset: Vector2D;
    impulseVector: Vector2D;
    isDefender: boolean;
  }): SolvedActorTimeline {
    const { actor, contactFrame, hitStopFrames, snapOffset, impulseVector, isDefender } = params;
    const sorted = [...actor.trajectory].sort((a, b) => a.frame - b.frame);
    const minFrame = sorted[0]?.frame ?? 1;
    const maxFrame = sorted[sorted.length - 1]?.frame ?? 24;

    const frames: SolvedActorTimeline['frames'] = [];

    // Pre-contact frames
    for (let f = minFrame; f < contactFrame; f++) {
      const key = this.interpolateTrajectoryKey(sorted, f);
      const socketOffset = key.socketOffset ?? { x: 0, y: 0 };
      frames.push({
        frame: f,
        position: key.position,
        socketWorldPosition: {
          x: +(key.position.x + socketOffset.x).toFixed(3),
          y: +(key.position.y + socketOffset.y).toFixed(3)
        },
        isHitStopHold: false
      });
    }

    // Impact Frame & Hit-Stop Hold
    const contactKey = this.interpolateTrajectoryKey(sorted, contactFrame);
    const contactSocketOffset = contactKey.socketOffset ?? { x: 0, y: 0 };

    const snappedContactPos: Vector2D = {
      x: +(contactKey.position.x + (isDefender ? snapOffset.x : 0)).toFixed(3),
      y: +(contactKey.position.y + (isDefender ? snapOffset.y : 0)).toFixed(3)
    };

    const snappedSocketWorldPos: Vector2D = {
      x: +(snappedContactPos.x + contactSocketOffset.x).toFixed(3),
      y: +(snappedContactPos.y + contactSocketOffset.y).toFixed(3)
    };

    // Insert contact frame
    frames.push({
      frame: contactFrame,
      position: snappedContactPos,
      socketWorldPosition: snappedSocketWorldPos,
      isHitStopHold: false
    });

    // Insert hit-stop hold frames (same position held)
    for (let h = 1; h <= hitStopFrames; h++) {
      frames.push({
        frame: contactFrame + h,
        position: snappedContactPos,
        socketWorldPosition: snappedSocketWorldPos,
        isHitStopHold: true
      });
    }

    // Post-impact frames (shifted by hitStopFrames + impulse applied)
    const postSpan = Math.max(1, maxFrame - contactFrame);
    for (let f = contactFrame + 1; f <= maxFrame; f++) {
      const originalKey = this.interpolateTrajectoryKey(sorted, f);
      const originalSocketOffset = originalKey.socketOffset ?? { x: 0, y: 0 };
      const timeSinceContact = f - contactFrame;
      const progress = Math.min(1, timeSinceContact / postSpan);

      // Impulse decay: rapid onset then settling
      const impulseWeight = Math.sin(progress * Math.PI * 0.5);

      const shiftedPos: Vector2D = {
        x: +(originalKey.position.x + (isDefender ? snapOffset.x : 0) + (isDefender ? impulseVector.x * impulseWeight : 0)).toFixed(3),
        y: +(originalKey.position.y + (isDefender ? snapOffset.y : 0) + (isDefender ? impulseVector.y * impulseWeight : 0)).toFixed(3)
      };

      frames.push({
        frame: f + hitStopFrames,
        position: shiftedPos,
        socketWorldPosition: {
          x: +(shiftedPos.x + originalSocketOffset.x).toFixed(3),
          y: +(shiftedPos.y + originalSocketOffset.y).toFixed(3)
        },
        isHitStopHold: false
      });
    }

    return {
      characterId: actor.characterId,
      role: actor.role,
      frames
    };
  }

  private static solveConstraintHandOff(
    contactFrame: number,
    hitStopFrames: number,
    constraintHandOff?: ConstraintHandOff
  ): ConstraintWeightKey[] {
    if (!constraintHandOff || !constraintHandOff.enabled) {
      return [{ frame: 1, weight: 0.0 }];
    }

    const handOffStart = (constraintHandOff.handOffFrame ?? contactFrame) + hitStopFrames;
    const blendDuration = Math.max(1, constraintHandOff.blendDurationFrames);

    const keys: ConstraintWeightKey[] = [
      { frame: 1, weight: 0.0 },
      { frame: Math.max(1, handOffStart - 1), weight: 0.0 }
    ];

    for (let i = 0; i <= blendDuration; i++) {
      const alpha = i / blendDuration;
      // Smooth cubic hermite blend (smoothstep)
      const smoothWeight = alpha * alpha * (3 - 2 * alpha);
      keys.push({
        frame: handOffStart + i,
        weight: +smoothWeight.toFixed(4)
      });
    }

    return keys;
  }
}
