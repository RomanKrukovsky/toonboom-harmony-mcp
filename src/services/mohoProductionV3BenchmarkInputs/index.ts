import path from 'path';
import type { MohoProductionV3StartInput } from '../../schemas/mohoProductionV3.js';

export type MohoProductionV3BenchmarkArtworkMode =
  | 'layered_manifest'
  | 'flat_characters'
  | 'flat_scene';

export interface MohoProductionV3BenchmarkManifestPaths {
  assetRoot: string;
}

export interface MohoProductionV3BenchmarkShotInput {
  shotId: string;
  artworkMode: MohoProductionV3BenchmarkArtworkMode;
  activeCharacterCount: number;
  characterId: string;
  hasDialogue: boolean;
}

function shotAssetRoot(
  manifestPath: string,
  manifest: MohoProductionV3BenchmarkManifestPaths,
  shot: MohoProductionV3BenchmarkShotInput
): string {
  return path.resolve(path.dirname(manifestPath), manifest.assetRoot, shot.shotId);
}

export function buildMohoV3BenchmarkArtworkInput(
  manifestPath: string,
  manifest: MohoProductionV3BenchmarkManifestPaths,
  shot: MohoProductionV3BenchmarkShotInput
): MohoProductionV3StartInput['artwork'] {
  if (!Number.isInteger(shot.activeCharacterCount) || shot.activeCharacterCount < 1) {
    throw new Error(`activeCharacterCount must be a positive integer for ${shot.shotId}.`);
  }
  const root = shotAssetRoot(manifestPath, manifest, shot);
  switch (shot.artworkMode) {
    case 'layered_manifest':
      return {
        mode: 'layered_manifest',
        manifestPath: path.join(root, 'layered-manifest-v3.json'),
        assetPaths: [],
        propPaths: []
      };
    case 'flat_characters':
      return {
        mode: 'flat_characters',
        imagePaths: Array.from(
          { length: shot.activeCharacterCount },
          (_, index) => path.join(root, `character-${String(index + 1).padStart(2, '0')}.png`)
        ),
        characterRefs: Array.from(
          { length: shot.activeCharacterCount },
          (_, index) => index === 0
            ? shot.characterId
            : `${shot.characterId}_support_${String(index + 1).padStart(2, '0')}`
        ),
        propPaths: []
      };
    case 'flat_scene':
      return { mode: 'flat_scene', imagePath: path.join(root, 'scene.png') };
    default: {
      const exhaustive: never = shot.artworkMode;
      throw new Error(`Unsupported benchmark artwork mode: ${String(exhaustive)}`);
    }
  }
}

export function requiredMohoV3BenchmarkAssetPaths(
  manifestPath: string,
  manifest: MohoProductionV3BenchmarkManifestPaths,
  shot: MohoProductionV3BenchmarkShotInput
): string[] {
  const artwork = buildMohoV3BenchmarkArtworkInput(manifestPath, manifest, shot);
  const required = artwork.mode === 'layered_manifest'
    ? [artwork.manifestPath]
    : artwork.mode === 'flat_characters'
      ? artwork.imagePaths
      : [artwork.imagePath];
  if (shot.hasDialogue) {
    required.push(path.join(shotAssetRoot(manifestPath, manifest, shot), 'dialogue.wav'));
  }
  return required;
}
