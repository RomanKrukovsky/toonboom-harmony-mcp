export interface MohoBoneKeyframe {
  frame: number;
  angleDeg?: number;
  pos?: [number, number];
  scale?: [number, number];
}

export interface MohoMotionTrack {
  boneName: string;
  keyframes: MohoBoneKeyframe[];
}

export interface MohoMotionClip {
  clipId: string;
  name: string;
  durationFrames: number;
  looping: boolean;
  description: string;
  tracks: MohoMotionTrack[];
}

/**
 * MohoAnimationLibrary — Standard production motion presets for Moho characters.
 * Implements 12 principles of animation (anticipation, squash/stretch, follow-through).
 */
export class MohoAnimationLibrary {
  /**
   * 24-frame classic biped walk cycle.
   */
  public static getWalkCycle(): MohoMotionClip {
    return {
      clipId: 'walk_cycle_24f',
      name: 'Standard Biped Walk Cycle',
      durationFrames: 24,
      looping: true,
      description: '24-frame walk cycle with contact, down, passing, up, and contact phases.',
      tracks: [
        // Pelvis vertical bobbing
        {
          boneName: 'Pelvis',
          keyframes: [
            { frame: 1, pos: [0, 60] },
            { frame: 4, pos: [0, 56] },  // Down (recoil)
            { frame: 7, pos: [0, 62] },  // Passing
            { frame: 10, pos: [0, 64] }, // Up (high point)
            { frame: 13, pos: [0, 60] }, // Contact 2
            { frame: 16, pos: [0, 56] }, // Down 2
            { frame: 19, pos: [0, 62] }, // Passing 2
            { frame: 22, pos: [0, 64] }, // Up 2
            { frame: 24, pos: [0, 60] }  // Loop close
          ]
        },
        // Legs L/R (Alternating stride)
        {
          boneName: 'Thigh_L',
          keyframes: [
            { frame: 1, angleDeg: 245 },  // Forward contact
            { frame: 7, angleDeg: 270 },  // Passing
            { frame: 13, angleDeg: 295 }, // Back push-off
            { frame: 19, angleDeg: 275 }, // Knee lift passing
            { frame: 24, angleDeg: 245 }
          ]
        },
        {
          boneName: 'Shin_L',
          keyframes: [
            { frame: 1, angleDeg: 270 },
            { frame: 7, angleDeg: 290 },
            { frame: 13, angleDeg: 255 },
            { frame: 19, angleDeg: 220 }, // High knee bend
            { frame: 24, angleDeg: 270 }
          ]
        },
        {
          boneName: 'Thigh_R',
          keyframes: [
            { frame: 1, angleDeg: 295 },  // Back push-off
            { frame: 7, angleDeg: 275 },  // Knee lift
            { frame: 13, angleDeg: 245 }, // Forward contact
            { frame: 19, angleDeg: 270 }, // Passing
            { frame: 24, angleDeg: 295 }
          ]
        },
        {
          boneName: 'Shin_R',
          keyframes: [
            { frame: 1, angleDeg: 255 },
            { frame: 7, angleDeg: 220 },
            { frame: 13, angleDeg: 270 },
            { frame: 19, angleDeg: 290 },
            { frame: 24, angleDeg: 255 }
          ]
        },
        // Arms L/R (Counter-balancing legs)
        {
          boneName: 'UpperArm_L',
          keyframes: [
            { frame: 1, angleDeg: 195 }, // Back swing
            { frame: 13, angleDeg: 165 }, // Forward swing
            { frame: 24, angleDeg: 195 }
          ]
        },
        {
          boneName: 'UpperArm_R',
          keyframes: [
            { frame: 1, angleDeg: 15 },  // Forward swing
            { frame: 13, angleDeg: -15 }, // Back swing
            { frame: 24, angleDeg: 15 }
          ]
        }
      ]
    };
  }

  /**
   * 48-frame natural idle breathing loop with subtle eye blink.
   */
  public static getIdleBreathing(): MohoMotionClip {
    return {
      clipId: 'idle_breathing_48f',
      name: 'Idle Breathing Loop',
      durationFrames: 48,
      looping: true,
      description: '48-frame relaxed idle with chest breathing, head drift, and eyelid blink.',
      tracks: [
        {
          boneName: 'Torso',
          keyframes: [
            { frame: 1, scale: [1.0, 1.0], pos: [0, 120] },
            { frame: 24, scale: [1.03, 1.02], pos: [0, 122] }, // Inhale
            { frame: 48, scale: [1.0, 1.0], pos: [0, 120] }    // Exhale
          ]
        },
        {
          boneName: 'Head',
          keyframes: [
            { frame: 1, angleDeg: 90, pos: [0, 220] },
            { frame: 16, angleDeg: 89, pos: [1, 221] },
            { frame: 32, angleDeg: 91, pos: [-1, 219] },
            { frame: 48, angleDeg: 90, pos: [0, 220] }
          ]
        }
      ]
    };
  }

  /**
   * 36-frame jump & squat landing with squash and stretch.
   */
  public static getJumpSquat(): MohoMotionClip {
    return {
      clipId: 'jump_squat_36f',
      name: 'Jump & Squat Action',
      durationFrames: 36,
      looping: false,
      description: 'Anticipation crouch (squash), upward launch (stretch), apex, and impact landing.',
      tracks: [
        {
          boneName: 'Master',
          keyframes: [
            { frame: 1, pos: [0, 0] },
            { frame: 6, pos: [0, -30] }, // Anticipation crouch
            { frame: 14, pos: [0, 180] }, // Apex of jump
            { frame: 22, pos: [0, 0] },   // Touchdown
            { frame: 26, pos: [0, -25] }, // Landing cushion
            { frame: 36, pos: [0, 0] }    // Recovery to stand
          ]
        },
        {
          boneName: 'Body s/s',
          keyframes: [
            { frame: 1, angleDeg: 0 },
            { frame: 6, angleDeg: -45 }, // Squash on crouch
            { frame: 10, angleDeg: 60 },  // Stretch on launch
            { frame: 14, angleDeg: 0 },   // Neutral at apex
            { frame: 22, angleDeg: 50 },  // Stretch on descent
            { frame: 26, angleDeg: -50 }, // Squash on impact
            { frame: 36, angleDeg: 0 }    // Rest
          ]
        }
      ]
    };
  }

  /**
   * Returns a clip by identifier.
   */
  public static getClip(clipId: string): MohoMotionClip | null {
    if (clipId === 'walk_cycle' || clipId === 'walk_cycle_24f') return this.getWalkCycle();
    if (clipId === 'idle_breathing' || clipId === 'idle_breathing_48f') return this.getIdleBreathing();
    if (clipId === 'jump_squat' || clipId === 'jump_squat_36f') return this.getJumpSquat();
    return null;
  }
}
