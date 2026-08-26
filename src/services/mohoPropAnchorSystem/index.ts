export interface PropAttachmentSpec {
  propName: string;
  defaultHand: 'Hand_R' | 'Hand_L' | 'World';
  localOffset: [number, number];
  localAngleDeg: number;
}

export interface PropAnchorRigResult {
  anchorBones: Array<Record<string, unknown>>;
  switchDialSpec: {
    dialBoneName: string;
    handR_angleDeg: number;
    handL_angleDeg: number;
    world_angleDeg: number;
  };
  smartActions: Array<{ actionName: string; targetHand: string; weightR: number; weightL: number }>;
}

/**
 * MohoPropAnchorSystem — Manages interactive prop attachment, hand swapping,
 * and world placement for characters holding weapons/tools (e.g. Portal Gun).
 */
export class MohoPropAnchorSystem {
  public static createPropAnchor(params?: {
    propName?: string;
    defaultHand?: 'Hand_R' | 'Hand_L' | 'World';
  }): PropAnchorRigResult {
    const propName = params?.propName ?? 'Prop_Gun';
    const defaultHand = params?.defaultHand ?? 'Hand_R';

    // 1. Dynamic Prop Anchor Bone (Follows active hand or stays in world space)
    const anchorBones: Array<Record<string, unknown>> = [
      {
        name: `${propName}_Anchor`,
        parent: -1, // Dynamically controlled by Target constraints
        pos: [125, 170],
        length: 25,
        angle: 0,
        strength: 0,
        tag_color: 2 // Yellow = Utility/Anchor
      },
      // Dial to switch attachment: -45 deg = Left Hand, 0 deg = World, +45 deg = Right Hand
      {
        name: `${propName}_Parent_Dial`,
        parent: -1,
        pos: [220, 200],
        length: 30,
        angle: defaultHand === 'Hand_R' ? 45 : defaultHand === 'Hand_L' ? -45 : 0,
        strength: 0,
        has_angle_limits: true,
        angle_limit_min: -45,
        angle_limit_max: 45,
        tag_color: 4 // Purple = Controller Dial
      }
    ];

    const switchDialSpec = {
      dialBoneName: `${propName}_Parent_Dial`,
      handL_angleDeg: -45,
      world_angleDeg: 0,
      handR_angleDeg: 45
    };

    const smartActions = [
      {
        actionName: `${propName}_Parent_Dial_RIGHT`,
        targetHand: 'Hand_R',
        weightR: 1.0,
        weightL: 0.0
      },
      {
        actionName: `${propName}_Parent_Dial_LEFT`,
        targetHand: 'Hand_L',
        weightR: 0.0,
        weightL: 1.0
      },
      {
        actionName: `${propName}_Parent_Dial_WORLD`,
        targetHand: 'World',
        weightR: 0.0,
        weightL: 0.0
      }
    ];

    return {
      anchorBones,
      switchDialSpec,
      smartActions
    };
  }
}
