import {
  type VitruvianGroupSpec,
  type TurnaroundAngle
} from '../../schemas/mohoProductionRig.js';

/**
 * MohoVitruvianEngine — configures Vitruvian Bone Groups in Moho.
 *
 * Vitruvian Bones allow swapping entire skeletal chains (e.g., front foot vs
 * profile foot, or 3-finger hand vs fist vs pointing hand) under a single parent,
 * with only ONE active bone branch enabled per angle/pose.
 */

export interface VitruvianBoneConfig {
  boneName: string;
  isVitruvian: boolean;
  vitruvianGroup: string;
  parentBone: string;
  defaultActive: boolean;
}

export class MohoVitruvianEngine {
  /**
   * Build standard Vitruvian limb groups (Feet, Hands, Face angles).
   */
  public static createStandardVitruvianGroups(): VitruvianGroupSpec[] {
    return [
      {
        groupName: 'Foot_L_Vitruvian',
        activeBoneName: 'Foot_L_Front',
        branches: [
          { branchName: 'Front', angleName: 'Front', boneNames: ['Foot_L_Front', 'Toe_L_Front'] },
          { branchName: 'ThreeQuarter', angleName: '3/4 R', boneNames: ['Foot_L_34', 'Toe_L_34'] },
          { branchName: 'Side', angleName: 'Side R', boneNames: ['Foot_L_Side', 'Toe_L_Side', 'Heel_L_Side'] }
        ]
      },
      {
        groupName: 'Foot_R_Vitruvian',
        activeBoneName: 'Foot_R_Front',
        branches: [
          { branchName: 'Front', angleName: 'Front', boneNames: ['Foot_R_Front', 'Toe_R_Front'] },
          { branchName: 'ThreeQuarter', angleName: '3/4 R', boneNames: ['Foot_R_34', 'Toe_R_34'] },
          { branchName: 'Side', angleName: 'Side R', boneNames: ['Foot_R_Side', 'Toe_R_Side', 'Heel_R_Side'] }
        ]
      },
      {
        groupName: 'Hand_L_Vitruvian',
        activeBoneName: 'Hand_L_Open',
        branches: [
          { branchName: 'Open', boneNames: ['Hand_L_Open', 'Thumb_L', 'Fingers_L'] },
          { branchName: 'Fist', boneNames: ['Hand_L_Fist'] },
          { branchName: 'Point', boneNames: ['Hand_L_Point', 'Index_L'] }
        ]
      },
      {
        groupName: 'Hand_R_Vitruvian',
        activeBoneName: 'Hand_R_Open',
        branches: [
          { branchName: 'Open', boneNames: ['Hand_R_Open', 'Thumb_R', 'Fingers_R'] },
          { branchName: 'Fist', boneNames: ['Hand_R_Fist'] },
          { branchName: 'Point', boneNames: ['Hand_R_Point', 'Index_R'] }
        ]
      }
    ];
  }

  /**
   * Flatten Vitruvian group specs into per-bone configurations.
   */
  public static compileBoneConfigs(
    groups: VitruvianGroupSpec[],
    parentBoneMap: Record<string, string>
  ): VitruvianBoneConfig[] {
    const configs: VitruvianBoneConfig[] = [];

    for (const group of groups) {
      for (const branch of group.branches) {
        for (const bName of branch.boneNames) {
          configs.push({
            boneName: bName,
            isVitruvian: true,
            vitruvianGroup: group.groupName,
            parentBone: parentBoneMap[bName] ?? parentBoneMap[group.groupName] ?? 'Master',
            defaultActive: bName === group.activeBoneName || branch.boneNames.includes(group.activeBoneName)
          });
        }
      }
    }

    return configs;
  }
}
