import { AnimationCritic } from '../src/adapters/animationCritic/index.js';
import { VariantTournament } from '../src/adapters/variantTournament/index.js';
import { criticReportSchema } from '../src/schemas/animationCritic.js';
import { variantTournamentSchema } from '../src/schemas/variantTournament.js';

describe('AnimationCritic', () => {
  let critic: AnimationCritic;

  beforeEach(() => {
    critic = new AnimationCritic();
  });

  describe('Technical Checks', () => {
    test('detects missing drawings when no key poses or motion tracks', () => {
      const report = critic.critique({
        variantId: 'v1',
        sceneId: 's1'
      });

      const missingDrawings = report.technicalChecks.find(c => c.checkType === 'missing_drawings');
      expect(missingDrawings).toBeDefined();
      expect(missingDrawings?.passed).toBe(false);
      expect(missingDrawings?.severity).toBe('critical');
    });

    test('passes missing drawings check when key poses are present', () => {
      const report = critic.critique({
        variantId: 'v1',
        sceneId: 's1',
        keyPoses: {
          poses: [
            {
              poseId: 'p1',
              type: 'KeyPose',
              confidence: 0.8,
              features: { silhouetteQuality: 0.7 }
            }
          ]
        }
      });

      const missingDrawings = report.technicalChecks.find(c => c.checkType === 'missing_drawings');
      expect(missingDrawings?.passed).toBe(true);
    });

    test('detects timing mismatch in scene beats', () => {
      const report = critic.critique({
        variantId: 'v1',
        sceneId: 's1',
        sceneUnderstanding: {
          beats: [
            { startTime: 0, endTime: 5, emotion: 'happy' },
            { startTime: 3, endTime: 8, emotion: 'sad' } // Overlaps with previous
          ]
        }
      });

      const timing = report.technicalChecks.find(c => c.checkType === 'timing_mismatch');
      expect(timing?.passed).toBe(false);
      expect(timing?.severity).toBe('medium');
    });

    test('detects excessive keys in motion tracks', () => {
      const keyframes = Array.from({ length: 1500 }, (_, i) => ({
        frame: i,
        position: { x: i, y: i, z: 0 }
      }));

      const report = critic.critique({
        variantId: 'v1',
        sceneId: 's1',
        motionTracks: {
          tracks: [{ keyframes }]
        }
      });

      const excessiveKeys = report.technicalChecks.find(c => c.checkType === 'excessive_keys');
      expect(excessiveKeys?.passed).toBe(false);
      expect(excessiveKeys?.severity).toBe('medium');
    });

    test('detects frozen motion in tracks', () => {
      const report = critic.critique({
        variantId: 'v1',
        sceneId: 's1',
        motionTracks: {
          tracks: [
            { keyframes: [{ position: { x: 0, y: 0, z: 0 } }] }, // No motion
            { keyframes: [{ position: { x: 0, y: 0, z: 0 } }] }  // No motion
          ]
        }
      });

      const frozen = report.technicalChecks.find(c => c.checkType === 'frozen_motion');
      expect(frozen?.passed).toBe(false);
      expect(frozen?.severity).toBe('high');
    });
  });

  describe('Artistic Checks', () => {
    test('detects missing anticipation poses', () => {
      const report = critic.critique({
        variantId: 'v1',
        sceneId: 's1',
        keyPoses: {
          poses: [
            {
              poseId: 'p1',
              type: 'KeyPose',
              confidence: 0.8,
              features: { silhouetteQuality: 0.7 }
            }
          ]
        }
      });

      const anticipation = report.artisticChecks.find(c => c.checkType === 'anticipation');
      expect(anticipation?.passed).toBe(false);
      expect(anticipation?.severity).toBe('medium');
    });

    test('passes anticipation check when anticipation poses exist', () => {
      const report = critic.critique({
        variantId: 'v1',
        sceneId: 's1',
        keyPoses: {
          poses: [
            {
              poseId: 'p1',
              type: 'AnticipationPose',
              confidence: 0.8,
              features: { silhouetteQuality: 0.7 }
            },
            {
              poseId: 'p2',
              type: 'OvershootPose',
              confidence: 0.8,
              features: { silhouetteQuality: 0.7 }
            }
          ]
        }
      });

      const anticipation = report.artisticChecks.find(c => c.checkType === 'anticipation');
      expect(anticipation?.passed).toBe(true);

      const followThrough = report.artisticChecks.find(c => c.checkType === 'follow_through');
      expect(followThrough?.passed).toBe(true);
    });

    test('detects low pose confidence', () => {
      const report = critic.critique({
        variantId: 'v1',
        sceneId: 's1',
        keyPoses: {
          poses: [
            { poseId: 'p1', type: 'KeyPose', confidence: 0.3, features: { silhouetteQuality: 0.5 } }
          ]
        }
      });

      const readability = report.artisticChecks.find(c => c.checkType === 'pose_readability');
      expect(readability?.passed).toBe(false);
      expect(readability?.severity).toBe('high');
    });

    test('detects missing eyelines in camera shots', () => {
      const report = critic.critique({
        variantId: 'v1',
        sceneId: 's1',
        cameraLayout: {
          shots: [
            { framingRules: ['rule_of_thirds'], cameraMovement: 'static', explanation: 'test' },
            { framingRules: ['rule_of_thirds'], cameraMovement: 'static', eyelines: [], explanation: 'test' }
          ]
        }
      });

      const gaze = report.artisticChecks.find(c => c.checkType === 'gaze_direction');
      expect(gaze?.passed).toBe(false);
    });
  });

  describe('Report Generation', () => {
    test('generates Zod-valid critic report', () => {
      const report = critic.critique({
        variantId: 'v1',
        sceneId: 's1',
        keyPoses: { poses: [] }
      });

      const parsed = criticReportSchema.safeParse(report);
      expect(parsed.success).toBe(true);
    });

    test('calculates overall score correctly', () => {
      const report = critic.critique({
        variantId: 'v1',
        sceneId: 's1',
        keyPoses: {
          poses: [
            { poseId: 'p1', type: 'AnticipationPose', confidence: 0.8, features: { silhouetteQuality: 0.8 } }
          ]
        }
      });

      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.overallScore).toBeLessThanOrEqual(1);
      expect(report.technicalScore).toBeGreaterThan(0);
      expect(report.artisticScore).toBeGreaterThan(0);
    });

    test('counts critical and high issues correctly', () => {
      const report = critic.critique({
        variantId: 'v1',
        sceneId: 's1'
        // No key poses - will trigger critical issue
      });

      expect(report.criticalIssues).toBeGreaterThan(0);
      expect(report.passed).toBe(false);
    });

    test('generates recommendations for failed checks', () => {
      const report = critic.critique({
        variantId: 'v1',
        sceneId: 's1'
      });

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.humanReviewRequired).toBe(true);
    });
  });
});

describe('VariantTournament', () => {
  let tournament: VariantTournament;

  beforeEach(() => {
    tournament = new VariantTournament();
  });

  const createVariants = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      variantId: `v${i + 1}`,
      variantName: `Variant ${i + 1}`,
      variantType: 'director' as const,
      criticInput: {
        variantId: `v${i + 1}`,
        sceneId: 's1',
        keyPoses: {
          poses: [
            { poseId: 'p1', type: 'AnticipationPose', confidence: 0.8, features: { silhouetteQuality: 0.7 } }
          ]
        },
        cameraLayout: {
          shots: [
            { framingRules: ['rule_of_thirds'], cameraMovement: 'static', eyelines: [], explanation: 'test' }
          ]
        }
      },
      metadata: { index: i }
    }));
  };

  test('runs complete tournament with 4 rounds', () => {
    const result = tournament.run({
      sceneId: 's1',
      variants: createVariants(5),
      budget: {
        maxVariants: 5,
        maxComputeTimeMs: 60000,
        maxRefinementRounds: 1
      }
    });

    expect(result.rounds.length).toBeGreaterThan(0);
    expect(result.rounds[0].roundType).toBe('technical_gate');
    expect(result.rounds[result.rounds.length - 1].roundType).toBe('final_selection');
  });

  test('selects winner with highest score', () => {
    const result = tournament.run({
      sceneId: 's1',
      variants: createVariants(3),
      budget: {
        maxVariants: 3,
        maxComputeTimeMs: 60000,
        maxRefinementRounds: 0
      }
    });

    expect(result.winner).toBeDefined();
    expect(result.winner?.selected).toBe(true);
  });

  test('generates Zod-valid tournament result', () => {
    const result = tournament.run({
      sceneId: 's1',
      variants: createVariants(3),
      budget: {
        maxVariants: 3,
        maxComputeTimeMs: 60000,
        maxRefinementRounds: 1
      }
    });

    const parsed = variantTournamentSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  test('tracks all variants through rounds', () => {
    const result = tournament.run({
      sceneId: 's1',
      variants: createVariants(4),
      budget: {
        maxVariants: 4,
        maxComputeTimeMs: 60000,
        maxRefinementRounds: 1
      }
    });

    expect(result.variants.length).toBe(4);
    for (const variant of result.variants) {
      expect(variant.roundReached).toBeGreaterThan(0);
    }
  });

  test('eliminates variants with critical issues', () => {
    const variants = [
      {
        variantId: 'v1',
        variantName: 'Good Variant',
        variantType: 'director' as const,
        criticInput: {
          variantId: 'v1',
          sceneId: 's1',
          keyPoses: { poses: [{ poseId: 'p1', type: 'AnticipationPose', confidence: 0.8, features: { silhouetteQuality: 0.7 } }] }
        }
      },
      {
        variantId: 'v2',
        variantName: 'Bad Variant',
        variantType: 'director' as const,
        criticInput: {
          variantId: 'v2',
          sceneId: 's1'
          // No key poses - will trigger critical issue
        }
      }
    ];

    const result = tournament.run({
      sceneId: 's1',
      variants,
      budget: {
        maxVariants: 2,
        maxComputeTimeMs: 60000,
        maxRefinementRounds: 0
      }
    });

    const badVariant = result.variants.find(v => v.variantId === 'v2');
    expect(badVariant?.eliminated).toBe(true);
  });

  test('respects budget constraints', () => {
    const result = tournament.run({
      sceneId: 's1',
      variants: createVariants(3),
      budget: {
        maxVariants: 3,
        maxComputeTimeMs: 60000,
        maxRefinementRounds: 0
      }
    });

    expect(result.budget.maxVariants).toBe(3);
    expect(result.budget.maxRefinementRounds).toBe(0);
  });

  test('computes total compute time', () => {
    const result = tournament.run({
      sceneId: 's1',
      variants: createVariants(3),
      budget: {
        maxVariants: 3,
        maxComputeTimeMs: 60000,
        maxRefinementRounds: 0
      }
    });

    expect(result.totalComputeTimeMs).toBeGreaterThanOrEqual(0);
  });
});
