import { describe, it, expect } from '@jest/globals';
import { MohoVectorSimplifier } from '../src/services/mohoVectorSimplifier/index.js';

describe('MohoVectorSimplifier', () => {
  it('simplifies raw noisy polygonal contour to minimal points using RDP algorithm', () => {
    const rawNoisyPoints = [
      { x: 0, y: 0 },
      { x: 1, y: 0.1 },
      { x: 2, y: -0.1 },
      { x: 3, y: 0.05 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ];

    const simplified = MohoVectorSimplifier.simplifyContour(rawNoisyPoints, 1.0);
    expect(simplified.length).toBeLessThan(rawNoisyPoints.length);
    expect(simplified[0]).toEqual({ x: 0, y: 0 });
  });

  it('fits smooth Bezier curvature handles to points', () => {
    const box = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ];

    const bezierPoints = MohoVectorSimplifier.fitBezierHandles(box, 0.35);
    expect(bezierPoints).toHaveLength(4);
    expect(bezierPoints[0].handleIn).toBeDefined();
    expect(bezierPoints[0].handleOut).toBeDefined();
  });

  it('generates clean 8-point cartoon capsule vector shape with seamless joint padding', () => {
    const limb = MohoVectorSimplifier.generateCapsuleShape({
      name: 'Forearm_L',
      centerX: -85,
      centerY: 170,
      radiusX: 10,
      radiusY: 25,
      fillRgba: [240, 215, 195, 255],
      strokeWidth: 3.0,
      jointCapPadding: true
    });

    expect(limb.name).toBe('Forearm_L');
    expect(limb.points).toHaveLength(8);
    expect(limb.fillColor).toEqual({ r: 240, g: 215, b: 195, a: 255 });
    expect(limb.strokeWidth).toBe(3.0);
    expect(limb.isClosed).toBe(true);
  });
});
