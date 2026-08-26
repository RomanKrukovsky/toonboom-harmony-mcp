import {
  type SmartShadowSpec
} from '../../schemas/mohoProductionRig.js';

/**
 * MohoShadowBuilder — generates dynamic projected ground shadows for Moho characters.
 *
 * Placed at the bottom of the character layer stack (`shadow`), parented to
 * the character Root/Master bone with inverse Y scaling (e.g. -0.25) and
 * light-source angle skew.
 */

export interface ShadowLayerResult {
  layerName: string;
  parentBone: string;
  shapeType: 'ellipse' | 'polygon';
  transform: {
    scaleX: number;
    scaleY: number;
    skewX: number;
    opacity: number;
  };
  connectedBones: string[];
}

export class MohoShadowBuilder {
  public static buildShadow(spec: SmartShadowSpec = {
    enabled: true,
    layerName: 'shadow',
    rootBoneName: 'Master',
    scaleY: -0.25,
    skewX: 0.1,
    opacity: 0.35
  }): ShadowLayerResult {
    return {
      layerName: spec.layerName,
      parentBone: spec.rootBoneName,
      shapeType: 'ellipse',
      transform: {
        scaleX: 1.2,
        scaleY: spec.scaleY,
        skewX: spec.skewX,
        opacity: spec.opacity
      },
      connectedBones: ['Pelvis', 'Foot_L', 'Foot_R']
    };
  }
}
