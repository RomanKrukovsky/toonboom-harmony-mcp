import { describe, expect, it } from '@jest/globals';
import { MohoJointInpainter } from '../src/services/mohoJointInpainter/index.js';
import type { InpaintLimbRequest } from '../src/schemas/mohoJointInpainterSpec.js';

describe('MohoJointInpainter', () => {
  const sampleRequest: InpaintLimbRequest = {
    characterId: 'hero',
    layerName: 'Arm_L',
    joints: [
      {
        jointId: 'elbow_l',
        jointType: 'elbow',
        pivot: { x: 50, y: 120 },
        direction: { x: 0, y: 1 }, // Pointing down along forearm
        radiusPx: 20,
        arcAngleDeg: 180
      },
      {
        jointId: 'wrist_l',
        jointType: 'wrist',
        pivot: { x: 50, y: 190 },
        direction: { x: 0, y: 1 },
        radiusPx: 12, // Input 12px, but minimum rule MUST enforce >= 16px
        arcAngleDeg: 180
      }
    ]
  };

  it('generates rounded joint caps for all joints in request', () => {
    const result = MohoJointInpainter.inpaintJointCaps(sampleRequest);

    expect(result.caps).toHaveLength(2);
    expect(result.caps[0].jointId).toBe('elbow_l');
    expect(result.caps[1].jointId).toBe('wrist_l');
  });

  it('enforces minimum 16px overlap padding even if smaller radius is requested', () => {
    const result = MohoJointInpainter.inpaintJointCaps(sampleRequest);
    const wristCap = result.caps.find(c => c.jointId === 'wrist_l')!;

    expect(wristCap.overlapPaddingPx).toBeGreaterThanOrEqual(16);
    expect(wristCap.overlapPaddingPx).toBe(16);
  });

  it('generates closed valid SVG path geometry', () => {
    const result = MohoJointInpainter.inpaintJointCaps(sampleRequest);
    const cap = result.caps[0];

    expect(cap.svgPath.startsWith('M ')).toBe(true);
    expect(cap.svgPath.endsWith(' Z')).toBe(true);
    expect(cap.contourPoints.length).toBeGreaterThan(10);
  });
});
