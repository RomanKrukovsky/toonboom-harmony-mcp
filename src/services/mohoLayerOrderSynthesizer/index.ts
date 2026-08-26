export interface LayerSortingDialSpec {
  dialBoneName: string;
  targetLayerName: string;
  baseZIndex: number;
  frontZIndex: number;
  backZIndex: number;
  angleMinDeg: number;
  angleMaxDeg: number;
}

export interface SynthesizedLayerOrderResult {
  sortingDials: LayerSortingDialSpec[];
  layerOrderActions: Array<{
    actionName: string;
    targetLayer: string;
    frame: number;
    newZIndex: number;
  }>;
}

/**
 * MohoLayerOrderSynthesizer — Solves Dynamic Layer Z-Ordering and limb crossing.
 * Generates Smart Bone Dials to dynamically move arms/legs in front of or behind the torso.
 */
export class MohoLayerOrderSynthesizer {
  public static synthesizeSortingSystem(): SynthesizedLayerOrderResult {
    const sortingDials: LayerSortingDialSpec[] = [
      {
        dialBoneName: 'Arm_Order_L',
        targetLayerName: 'Arm_L',
        baseZIndex: 40,
        frontZIndex: 100, // In front of everything (chest, coat, head)
        backZIndex: 10,   // Behind torso and back
        angleMinDeg: -45,
        angleMaxDeg: 45
      },
      {
        dialBoneName: 'Arm_Order_R',
        targetLayerName: 'Arm_R',
        baseZIndex: 40,
        frontZIndex: 100,
        backZIndex: 10,
        angleMinDeg: -45,
        angleMaxDeg: 45
      },
      {
        dialBoneName: 'Leg_Order_L',
        targetLayerName: 'Leg_L',
        baseZIndex: 20,
        frontZIndex: 35,  // In front of skirt/coat
        backZIndex: 5,    // Behind pelvis
        angleMinDeg: -45,
        angleMaxDeg: 45
      }
    ];

    const layerOrderActions: Array<{
      actionName: string;
      targetLayer: string;
      frame: number;
      newZIndex: number;
    }> = [];

    for (const dial of sortingDials) {
      // Action when dial rotates to +45 deg (Bring to Front)
      layerOrderActions.push({
        actionName: `${dial.dialBoneName}_FRONT`,
        targetLayer: dial.targetLayerName,
        frame: 24,
        newZIndex: dial.frontZIndex
      });

      // Action when dial rotates to -45 deg (Send to Back)
      layerOrderActions.push({
        actionName: `${dial.dialBoneName}_BACK`,
        targetLayer: dial.targetLayerName,
        frame: 24,
        newZIndex: dial.backZIndex
      });
    }

    return {
      sortingDials,
      layerOrderActions
    };
  }
}
