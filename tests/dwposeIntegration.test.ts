import { describe, expect, it } from '@jest/globals';
import { PivotEstimator, CharacterTopologyPIRSchema } from '../src/services/pivotEstimator';

describe('DWPose Integration & Verification Tests', () => {
  it('Should correctly estimate pivots and flag requiresHumanReview for unreliable joints', () => {
    const rawSkeleton = {
      points: [
        {
          name: 'body_0',
          x: 100,
          y: 200,
          normalizedX: 0.5,
          normalizedY: 0.5,
          confidence: 0.9,
          visible: true,
          sourceModel: 'dwpose-body'
        },
        {
          name: 'body_1',
          x: 110,
          y: 210,
          normalizedX: 0.55,
          normalizedY: 0.55,
          confidence: 0.2, // Low confidence
          visible: false,
          sourceModel: 'dwpose-body'
        }
      ]
    };

    const pir = PivotEstimator.estimate(rawSkeleton, 'char_test');
    
    // Zod validation should pass and result in a typed object
    expect(() => CharacterTopologyPIRSchema.parse(pir)).not.toThrow();
    
    // Because there's a low confidence point and <10 points total
    expect(pir.requiresHumanReview).toBe(true);
    expect(pir.missingOrUnreliableJoints).toContain('body_1');
    expect(pir.missingOrUnreliableJoints).toContain('General Skeleton Completeness');
  });
});
