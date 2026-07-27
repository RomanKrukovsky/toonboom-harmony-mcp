import fs from 'fs';
import path from 'path';
import { TasteModelEngine } from '../src/adapters/tasteModelEngine/index.js';
import { AnimationCritic } from '../src/adapters/animationCritic/index.js';
import { VariantTournament } from '../src/adapters/variantTournament/index.js';

describe('Phase 5: Taste Model Engine & Pairwise Preference Optimization', () => {
  const outputDir = path.resolve(process.cwd(), 'output/phase5_taste');

  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  describe('5.1 Taste Model Engine', () => {
    it('evaluates studio taste score and artist acceptance probability', () => {
      const tasteEngine = new TasteModelEngine();
      const critic = new AnimationCritic();

      const report = critic.critique({
        sceneId: 'SCENE_TASTE_01',
        variantId: 'variant_alpha'
      });

      const tasteResult = tasteEngine.evaluateTasteScore('variant_alpha', report, []);

      expect(tasteResult.variantId).toBe('variant_alpha');
      expect(tasteResult.tasteScore).toBeGreaterThan(0.0);
      expect(tasteResult.tasteScore).toBeLessThanOrEqual(1.0);
      expect(tasteResult.artistAcceptanceProbability).toBeGreaterThan(0.0);

      const scoresPath = path.join(outputDir, 'taste_model_scores.json');
      fs.writeFileSync(scoresPath, JSON.stringify(tasteResult, null, 2));
      expect(fs.existsSync(scoresPath)).toBe(true);
    });

    it('computes pairwise preference comparison between two variants', () => {
      const tasteEngine = new TasteModelEngine();
      const critic = new AnimationCritic();

      const reportA = critic.critique({ sceneId: 'SCENE_TASTE_01', variantId: 'variant_A' });
      const reportB = critic.critique({ sceneId: 'SCENE_TASTE_01', variantId: 'variant_B' });

      const pairwise = tasteEngine.calculatePairwisePreference({
        variantA: { variantId: 'variant_A', criticReport: reportA, correctionsCount: 0 },
        variantB: { variantId: 'variant_B', criticReport: reportB, correctionsCount: 3 }
      });

      expect(pairwise.winnerId).toBe('variant_A');
      expect(pairwise.loserId).toBe('variant_B');
      expect(pairwise.preferenceMargin).toBeGreaterThan(0);

      const reportPath = path.join(outputDir, 'pairwise_preference_report.json');
      fs.writeFileSync(reportPath, JSON.stringify(pairwise, null, 2));
      expect(fs.existsSync(reportPath)).toBe(true);
    });
  });

  describe('5.2 Variant Tournament Integration', () => {
    it('runs multi-round tournament with taste model integration', () => {
      const tournament = new VariantTournament();
      const result = tournament.run({
        sceneId: 'SCENE_TOURNAMENT_01',
        variants: [
          {
            variantId: 'v1',
            variantName: 'Variant High Principles',
            variantType: 'director',
            criticInput: { sceneId: 'SCENE_TOURNAMENT_01', variantId: 'v1' }
          },
          {
            variantId: 'v2',
            variantName: 'Variant Low Principles',
            variantType: 'performance',
            criticInput: { sceneId: 'SCENE_TOURNAMENT_01', variantId: 'v2' }
          }
        ],
        budget: { maxVariants: 5, maxComputeTimeMs: 10000, maxRefinementRounds: 1 }
      });

      expect(result.tournamentId).toBeDefined();
      expect(result.provenance).toBeDefined();
    });
  });
});
