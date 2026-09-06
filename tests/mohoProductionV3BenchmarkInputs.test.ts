import path from 'path';
import {
  buildMohoV3BenchmarkArtworkInput,
  requiredMohoV3BenchmarkAssetPaths
} from '../src/services/mohoProductionV3BenchmarkInputs/index.js';

const manifestPath = path.join(path.sep, 'benchmark', 'benchmark-manifest.json');
const manifest = { assetRoot: 'assets' };

describe('Moho Production v3 benchmark inputs', () => {
  it('uses a v3 layered manifest instead of the unrelated character-pack schema', () => {
    const shot = {
      shotId: 'p95-01',
      artworkMode: 'layered_manifest' as const,
      activeCharacterCount: 1,
      characterId: 'hero',
      hasDialogue: true
    };

    expect(buildMohoV3BenchmarkArtworkInput(manifestPath, manifest, shot)).toEqual({
      mode: 'layered_manifest',
      manifestPath: path.join(path.sep, 'benchmark', 'assets', 'p95-01', 'layered-manifest-v3.json'),
      assetPaths: [],
      propPaths: []
    });
    expect(requiredMohoV3BenchmarkAssetPaths(manifestPath, manifest, shot)).toEqual([
      path.join(path.sep, 'benchmark', 'assets', 'p95-01', 'layered-manifest-v3.json'),
      path.join(path.sep, 'benchmark', 'assets', 'p95-01', 'dialogue.wav')
    ]);
  });

  it('supplies one independent image and reference per active flat character', () => {
    const shot = {
      shotId: 'p95-20',
      artworkMode: 'flat_characters' as const,
      activeCharacterCount: 3,
      characterId: 'robot_a',
      hasDialogue: false
    };

    expect(buildMohoV3BenchmarkArtworkInput(manifestPath, manifest, shot)).toEqual({
      mode: 'flat_characters',
      imagePaths: [
        path.join(path.sep, 'benchmark', 'assets', 'p95-20', 'character-01.png'),
        path.join(path.sep, 'benchmark', 'assets', 'p95-20', 'character-02.png'),
        path.join(path.sep, 'benchmark', 'assets', 'p95-20', 'character-03.png')
      ],
      characterRefs: ['robot_a', 'robot_a_support_02', 'robot_a_support_03'],
      propPaths: []
    });
  });
});
