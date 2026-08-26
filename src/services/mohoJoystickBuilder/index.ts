export interface JoystickGridPose {
  name: string;
  gridX: number; // -1 to 1
  gridY: number; // -1 to 1
  headAngleDeg: number;
  pupilOffsetX: number;
  pupilOffsetY: number;
  noseOffsetX: number;
  noseOffsetY: number;
  eyebrowTiltDeg: number;
}

export interface Moho2DJoystickConfig {
  controllerName: string;
  hudPosition: [number, number]; // Position in viewport, e.g. [250, 300]
  boxSize: number;               // Width/Height in px, e.g. 80
  controlBoneName: string;
  targetBones: string[];
  gridPoses: JoystickGridPose[];
}

export interface CompiledJoystickResult {
  controllerBone: Record<string, unknown>;
  boxFrameBones: Array<Record<string, unknown>>;
  smartActions: Array<{ name: string; durationFrames: number; keys: Record<string, unknown> }>;
}

/**
 * MohoJoystickBuilder — Constructs 2D XY Smart Mesh / Pin HUD Controllers for facial animation.
 * Allows moving a single 2D joystick on screen to seamlessly control 9 head & gaze poses.
 */
export class MohoJoystickBuilder {
  public static buildFaceJoystick(params?: {
    controllerName?: string;
    hudPosition?: [number, number];
    boxSize?: number;
  }): CompiledJoystickResult {
    const name = params?.controllerName ?? 'Face_2D_Joystick';
    const hudPos = params?.hudPosition ?? [260, 320];
    const size = params?.boxSize ?? 80;
    const halfSize = size / 2;

    // 1. Controller Bone (Pin bone bounded inside box)
    const controllerBone: Record<string, unknown> = {
      name: `${name}_Knob`,
      parent: -1,
      pos: [hudPos[0], hudPos[1]],
      length: 0, // Pin bone
      angle: 0,
      strength: 0,
      is_pin_bone: true,
      has_pos_limits: true,
      pos_min: [-halfSize, -halfSize],
      pos_max: [halfSize, halfSize],
      tag_color: 4 // Purple = Controller
    };

    // 2. HUD Box boundary frame bones (Shy visual indicator)
    const boxFrameBones: Array<Record<string, unknown>> = [
      {
        name: `${name}_Frame_TL`,
        pos: [hudPos[0] - halfSize, hudPos[1] + halfSize],
        length: size,
        angle: 0, // Top bar
        strength: 0,
        shy: true,
        tag_color: 5
      },
      {
        name: `${name}_Frame_BL`,
        pos: [hudPos[0] - halfSize, hudPos[1] - halfSize],
        length: size,
        angle: 0, // Bottom bar
        strength: 0,
        shy: true,
        tag_color: 5
      }
    ];

    // 3. 9-Pose 2D Smart Action Lattice (Center, Up, Down, Left, Right, 4 Corners)
    const standardGridPoses: JoystickGridPose[] = [
      { name: 'Center', gridX: 0, gridY: 0, headAngleDeg: 0, pupilOffsetX: 0, pupilOffsetY: 0, noseOffsetX: 0, noseOffsetY: 0, eyebrowTiltDeg: 0 },
      { name: 'Look_Left', gridX: -1, gridY: 0, headAngleDeg: -25, pupilOffsetX: -8, pupilOffsetY: 0, noseOffsetX: -12, noseOffsetY: 0, eyebrowTiltDeg: -3 },
      { name: 'Look_Right', gridX: 1, gridY: 0, headAngleDeg: 25, pupilOffsetX: 8, pupilOffsetY: 0, noseOffsetX: 12, noseOffsetY: 0, eyebrowTiltDeg: 3 },
      { name: 'Look_Up', gridX: 0, gridY: 1, headAngleDeg: 0, pupilOffsetX: 0, pupilOffsetY: 8, noseOffsetX: 0, noseOffsetY: 6, eyebrowTiltDeg: 5 },
      { name: 'Look_Down', gridX: 0, gridY: -1, headAngleDeg: 0, pupilOffsetX: 0, pupilOffsetY: -8, noseOffsetX: 0, noseOffsetY: -6, eyebrowTiltDeg: -5 },
      { name: 'Look_Up_Left', gridX: -1, gridY: 1, headAngleDeg: -20, pupilOffsetX: -6, pupilOffsetY: 6, noseOffsetX: -10, noseOffsetY: 5, eyebrowTiltDeg: 4 },
      { name: 'Look_Up_Right', gridX: 1, gridY: 1, headAngleDeg: 20, pupilOffsetX: 6, pupilOffsetY: 6, noseOffsetX: 10, noseOffsetY: 5, eyebrowTiltDeg: 4 },
      { name: 'Look_Down_Left', gridX: -1, gridY: -1, headAngleDeg: -20, pupilOffsetX: -6, pupilOffsetY: -6, noseOffsetX: -10, noseOffsetY: -5, eyebrowTiltDeg: -4 },
      { name: 'Look_Down_Right', gridX: 1, gridY: -1, headAngleDeg: 20, pupilOffsetX: 6, pupilOffsetY: -6, noseOffsetX: 10, noseOffsetY: -5, eyebrowTiltDeg: -4 }
    ];

    const smartActions = standardGridPoses.map(pose => ({
      name: `${name}_${pose.name}`,
      durationFrames: 24,
      keys: {
        gridX: pose.gridX,
        gridY: pose.gridY,
        headAngle: pose.headAngleDeg,
        pupils: [pose.pupilOffsetX, pose.pupilOffsetY],
        nose: [pose.noseOffsetX, pose.noseOffsetY],
        brows: pose.eyebrowTiltDeg
      }
    }));

    return {
      controllerBone,
      boxFrameBones,
      smartActions
    };
  }
}
