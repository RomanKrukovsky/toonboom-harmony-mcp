export interface BonePhysicsConfig {
  boneName: string;
  enablePhysics: boolean;
  mass: number;
  friction: number;
  spring: number;
  damping: number;
}

export interface PhysicsChainResult {
  chainName: string;
  bones: BonePhysicsConfig[];
}

/**
 * MohoPhysicsEngine — Injects native bone physics into character secondary elements
 * (coat tails, hair strands, capes, skirts, ties) for automatic overlapping motion.
 */
export class MohoPhysicsEngine {
  /**
   * Generates bone physics chains for standard character secondary elements.
   */
  public static configureCharacterPhysics(params?: {
    includeCoatPhysics?: boolean;
    includeHairPhysics?: boolean;
  }): PhysicsChainResult[] {
    const results: PhysicsChainResult[] = [];

    // 1. Lab Coat / Cloth Tails Physics (Loose cloth with gentle spring)
    if (params?.includeCoatPhysics !== false) {
      results.push({
        chainName: 'Coat_Dynamics',
        bones: [
          {
            boneName: 'Coat_Tail_L1',
            enablePhysics: true,
            mass: 1.2,
            friction: 0.4,
            spring: 0.65,
            damping: 0.55
          },
          {
            boneName: 'Coat_Tail_L2',
            enablePhysics: true,
            mass: 0.8,
            friction: 0.3,
            spring: 0.75,
            damping: 0.45
          },
          {
            boneName: 'Coat_Tail_R1',
            enablePhysics: true,
            mass: 1.2,
            friction: 0.4,
            spring: 0.65,
            damping: 0.55
          },
          {
            boneName: 'Coat_Tail_R2',
            enablePhysics: true,
            mass: 0.8,
            friction: 0.3,
            spring: 0.75,
            damping: 0.45
          }
        ]
      });
    }

    // 2. Hair Tufts / Spikes Physics (Snappier, lighter spring)
    if (params?.includeHairPhysics !== false) {
      results.push({
        chainName: 'Hair_Dynamics',
        bones: [
          {
            boneName: 'Hair_Lock_L',
            enablePhysics: true,
            mass: 0.5,
            friction: 0.2,
            spring: 0.85,
            damping: 0.4
          },
          {
            boneName: 'Hair_Lock_R',
            enablePhysics: true,
            mass: 0.5,
            friction: 0.2,
            spring: 0.85,
            damping: 0.4
          },
          {
            boneName: 'Hair_Lock_Top',
            enablePhysics: true,
            mass: 0.4,
            friction: 0.2,
            spring: 0.9,
            damping: 0.35
          }
        ]
      });
    }

    return results;
  }
}
