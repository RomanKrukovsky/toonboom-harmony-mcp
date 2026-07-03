import type { CharacterSpec } from '../../schemas/characterSpec.js';

export interface RigPart {
  name: string;
  nodeType: 'peg' | 'drawing' | 'group' | 'controller';
  parent?: string;
  notes?: string;
}

export interface SimpleRigSpec {
  characterName: string;
  rigType: 'front_only' | 'three_quarter' | 'symmetrical';
  parts: RigPart[];
  placeholderRigCreated: boolean;
  realRigCreated: boolean;
  missingAssets: string[];
  providedAssets: string[];
  nextBestAction: string;
  origin: 'placeholder' | 'assembled' | 'planned';
}

/**
 * RigSynthesizer — non-360 simple rig fallback.
 *
 * For productions that don't need a full 360 turnaround, this builds a
 * lighter front-facing or symmetrical rig plan. It follows the same
 * honesty rules as Rig360Synthesizer: no real rig without assets.
 */
export class RigSynthesizer {
  generateSpec(character: CharacterSpec): SimpleRigSpec {
    const missingAssets = this.requiredAssets(character).filter(k => !k.provided).map(k => k.key);
    const providedAssets = this.requiredAssets(character).filter(k => k.provided).map(k => k.key);
    const realRigCreated = missingAssets.length === 0 && providedAssets.length > 0;

    return {
      characterName: character.name,
      rigType: this.detectRigType(character),
      parts: this.buildParts(character),
      placeholderRigCreated: !realRigCreated,
      realRigCreated,
      missingAssets,
      providedAssets,
      nextBestAction: realRigCreated
        ? 'Import provided drawings into Harmony and connect parts to controllers'
        : 'Provide front view drawings and mouth chart to build a real simple rig',
      origin: realRigCreated ? 'assembled' : 'placeholder'
    };
  }

  buildFromAssets(character: CharacterSpec, assetPaths: Record<string, string>): SimpleRigSpec {
    const required = this.requiredAssets(character);
    const missingAssets: string[] = [];
    const providedAssets: string[] = [];

    for (const asset of required) {
      if (assetPaths[asset.key]) {
        asset.provided = true;
        providedAssets.push(asset.key);
      } else {
        missingAssets.push(asset.key);
      }
    }

    const realRigCreated = missingAssets.length === 0 && providedAssets.length > 0;
    return {
      characterName: character.name,
      rigType: this.detectRigType(character),
      parts: this.buildParts(character),
      placeholderRigCreated: !realRigCreated,
      realRigCreated,
      missingAssets,
      providedAssets,
      nextBestAction: realRigCreated
        ? 'All required simple-rig assets provided — build in Harmony'
        : `Provide ${missingAssets.length} missing assets before building a real simple rig`,
      origin: realRigCreated ? 'assembled' : 'placeholder'
    };
  }

  private detectRigType(character: CharacterSpec): SimpleRigSpec['rigType'] {
    if (character.requiredViews.includes('side_left') && character.requiredViews.includes('side_right')) {
      return 'symmetrical';
    }
    if (character.requiredViews.includes('front_3q_left')) {
      return 'three_quarter';
    }
    return 'front_only';
  }

  private buildParts(character: CharacterSpec): RigPart[] {
    const parts: RigPart[] = [
      { name: 'Root', nodeType: 'peg' },
      { name: 'Body', nodeType: 'drawing', parent: 'Root' },
      { name: 'Head_Group', nodeType: 'group', parent: 'Root' },
      { name: 'Head', nodeType: 'drawing', parent: 'Head_Group' },
      { name: 'Face', nodeType: 'group', parent: 'Head' },
      { name: 'Left_Eye', nodeType: 'drawing', parent: 'Face' },
      { name: 'Right_Eye', nodeType: 'drawing', parent: 'Face' },
      { name: 'Mouth', nodeType: 'drawing', parent: 'Face' },
      { name: 'Left_Brow', nodeType: 'drawing', parent: 'Face' },
      { name: 'Right_Brow', nodeType: 'drawing', parent: 'Face' },
      { name: 'Left_Arm', nodeType: 'drawing', parent: 'Body' },
      { name: 'Right_Arm', nodeType: 'drawing', parent: 'Body' },
      { name: 'Left_Hand', nodeType: 'drawing', parent: 'Left_Arm' },
      { name: 'Right_Hand', nodeType: 'drawing', parent: 'Right_Arm' },
      { name: 'MC_Head', nodeType: 'controller', parent: 'Root', notes: 'Rotates head group' },
      { name: 'MC_Body', nodeType: 'controller', parent: 'Root', notes: 'Global position/scale' }
    ];

    for (const hand of character.requiredHandPoses) {
      parts.push({ name: `Hand_${hand}`, nodeType: 'drawing', parent: 'Left_Hand', notes: `Swap drawing for ${hand}` });
    }

    return parts;
  }

  private requiredAssets(character: CharacterSpec): { key: string; provided: boolean }[] {
    const assets: { key: string; provided: boolean }[] = [];
    const views = character.requiredViews.slice(0, 1); // simple rig only needs front by default
    for (const view of views) {
      for (const layer of [...character.layerPlan.head, ...character.layerPlan.body]) {
        assets.push({ key: `${view}_${layer}`, provided: false });
      }
      for (const mouth of character.requiredMouthShapes) {
        assets.push({ key: `${view}_mouth_${mouth}`, provided: false });
      }
    }
    return assets;
  }
}
