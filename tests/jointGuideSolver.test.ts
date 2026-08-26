import { JointGuideSolver } from '../src/services/jointGuideSolver/index.js';
import type { CharacterTopologyPIR } from '../src/services/pivotEstimator/index.js';

/**
 * JointGuideSolver geometry tests on a clean synthetic full-body skeleton
 * (the real-photo fixture has unreliable hinge landmarks — see the golden
 * path report). Exact-math assertions:
 *   - center sits ON the joint landmark (future peg pivot);
 *   - radius = overlapFactor × the shorter adjacent bone (clamped);
 *   - the slice chord is perpendicular to the parent bone at distance radius.
 */

function limbTopology(): CharacterTopologyPIR {
  const p = (name: string, x: number, y: number) => ({
    name, x, y, normalizedX: x / 400, normalizedY: y / 400,
    confidence: 0.95, visible: true, sourceModel: 'synthetic'
  });
  return {
    version: '1.0',
    characterId: 'synthetic_biped',
    requiresHumanReview: false,
    missingOrUnreliableJoints: [],
    points: [
      // Right arm: shoulder(300,100) -> elbow(300,180) -> wrist(300,260): straight down, bones 80/80.
      p('shoulder_right', 300, 100),
      p('elbow_right', 300, 180),
      p('wrist_right', 300, 260),
      // Left leg: hip(100,300) -> knee(100,360) -> ankle(100,440): bones 60/80 -> shorter=60.
      p('hip_left', 100, 300),
      p('knee_left', 100, 360),
      p('ankle_left', 100, 440)
    ]
  };
}

describe('JointGuideSolver — hinge circles ("круги с центром")', () => {
  const solver = new JointGuideSolver();

  it('places the circle center exactly on the joint and sizes radius from the shorter bone', () => {
    const { guides } = solver.solve(limbTopology(), { overlapFactor: 0.3 });
    const elbow = guides.guides.find(g => g.jointName === 'elbow_right')!;
    expect(elbow.centerX).toBe(300);
    expect(elbow.centerY).toBe(180);
    // bones 80/80 -> radius = 0.3*80 = 24
    expect(elbow.radiusPx).toBeCloseTo(24, 5);
    expect(elbow.overlapPx).toBe(elbow.radiusPx);

    const knee = guides.guides.find(g => g.jointName === 'knee_left')!;
    // bones 60/80 -> radius = 0.3*60 = 18
    expect(knee.radiusPx).toBeCloseTo(18, 5);
  });

  it('draws the slice chord perpendicular to the parent bone at distance radius', () => {
    const { guides } = solver.solve(limbTopology(), { overlapFactor: 0.3 });
    const elbow = guides.guides.find(g => g.jointName === 'elbow_right')!;
    // Parent bone points straight up (0,-1); perpendicular is (1,0); chord through
    // (300, 180-24) with half-length 1.4*24=33.6.
    expect(elbow.sliceChord.x1).toBeCloseTo(300 + 33.6, 1);
    expect(elbow.sliceChord.y1).toBeCloseTo(180 - 24, 1);
    expect(elbow.sliceChord.x2).toBeCloseTo(300 - 33.6, 1);
    expect(elbow.sliceChord.y2).toBeCloseTo(180 - 24, 1);
  });

  it('clamps the radius into [minRadiusPx, maxRadiusPx]', () => {
    const { guides } = solver.solve(limbTopology(), { overlapFactor: 0.9, minRadiusPx: 10, maxRadiusPx: 30 });
    const elbow = guides.guides.find(g => g.jointName === 'elbow_right')!;
    // 0.9*80=72 -> clamped to 30
    expect(elbow.radiusPx).toBe(30);
  });

  it('reports missing hinge landmarks instead of guessing', () => {
    const partial = limbTopology();
    partial.points = partial.points.filter(p => p.name !== 'wrist_right');
    const { guides, missingLandmarks } = solver.solve(partial);
    expect(guides.guides.find(g => g.jointName === 'elbow_right')).toBeUndefined();
    expect(missingLandmarks).toContain('wrist_right');
  });

  it('is deterministic', () => {
    const a = solver.solve(limbTopology());
    const b = solver.solve(limbTopology());
    expect(JSON.stringify(a.guides)).toBe(JSON.stringify(b.guides));
  });
});
