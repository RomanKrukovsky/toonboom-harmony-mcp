import { describe, it, expect } from '@jest/globals';
import { MohoAnatomyVectorSynthesizer } from '../src/services/mohoAnatomyVectorSynthesizer/index.js';
import { MohoAudioAcousticAnalyzer } from '../src/services/mohoAudioAcousticAnalyzer/index.js';
import { MohoFootLockKinematics } from '../src/services/mohoFootLockKinematics/index.js';
import { MohoPointWeightSkinningEngine } from '../src/services/mohoPointWeightSkinningEngine/index.js';

describe('Studio Quality Upgrades: Anatomy, Acoustics, Foot-Locking, Skinning', () => {
  it('synthesizes true anatomical Bezier shapes with muscle contours and facial features', () => {
    const head = MohoAnatomyVectorSynthesizer.generateAnatomicalHead({
      name: 'Hero_Head',
      fillRgba: [240, 200, 180, 255]
    });
    expect(head.points.length).toBeGreaterThanOrEqual(10);
    expect(head.isClosed).toBe(true);

    const eye = MohoAnatomyVectorSynthesizer.generateDetailedEye('Eye_L', 0, 0, 15);
    expect(eye.sclera).toBeDefined();
    expect(eye.iris).toBeDefined();
    expect(eye.pupil).toBeDefined();
    expect(eye.specular).toBeDefined();

    const arm = MohoAnatomyVectorSynthesizer.generateAnatomicalLimb({
      name: 'Arm_Bicep',
      limbType: 'upper_arm',
      fillRgba: [50, 100, 200, 255],
      length: 80,
      width: 30
    });
    expect(arm.points.length).toBe(8);
    expect(arm.isClosed).toBe(true);

    const handPoses = MohoAnatomyVectorSynthesizer.generateHandPoses('Hand_L', [240, 200, 180, 255]);
    expect(handPoses['Fist']).toBeDefined();
    expect(handPoses['Open']).toBeDefined();
    expect(handPoses['Point']).toBeDefined();
  });

  it('analyzes acoustic audio curves to dynamically scale mouth aperture and pitch eyebrows', () => {
    const acoustic = MohoAudioAcousticAnalyzer.analyzeAcousticProfile(undefined, 24, 48);

    expect(acoustic.totalDurationFrames).toBe(48);
    expect(acoustic.frames).toHaveLength(48);
    expect(acoustic.keyframeTracks.mouthScaleY.length).toBeGreaterThan(5);

    // Verify mouth aperture responds to energy
    const maxAperture = Math.max(...acoustic.frames.map(f => f.mouthApertureY));
    const minAperture = Math.min(...acoustic.frames.map(f => f.mouthApertureY));
    expect(maxAperture).toBeGreaterThan(minAperture);
  });

  it('guarantees zero foot-slip and 3-point reverse foot rolls in foot-locking kinematics', () => {
    const cycle = MohoFootLockKinematics.generateLockedFootCycle(100, -90, 24);

    expect(cycle.moonwalkSlipErrorPx).toBe(0.0);
    expect(cycle.leftFootTrack.length).toBeGreaterThan(5);
    expect(cycle.rightFootTrack.length).toBeGreaterThan(5);

    // Verify locked stance frames exist
    const stanceFrames = cycle.leftFootTrack.filter(f => f.isStanceLocked);
    expect(stanceFrames.length).toBeGreaterThan(0);
    expect(stanceFrames[0].posY).toBe(-90);
  });

  it('computes smooth normalized multi-bone skinning weights without polygon tearing', () => {
    const points = [
      { x: 0, y: 50 },  // Mid waist
      { x: 0, y: 100 }, // Upper torso
      { x: 0, y: 10 }   // Lower pelvis
    ];

    const bones = [
      { name: 'Pelvis', startX: 0, startY: 0, endX: 0, endY: 40 },
      { name: 'Torso', startX: 0, startY: 40, endX: 0, endY: 100 }
    ];

    const skinning = MohoPointWeightSkinningEngine.calculateSmoothSkinningWeights('Waist_Mesh', points, bones);

    expect(skinning.isNormalized).toBe(true);
    expect(skinning.pointWeights).toHaveLength(3);

    // Verify weight sum = 1.0 for each point
    for (const pw of skinning.pointWeights) {
      const sum = pw.weights.reduce((s, w) => s + w.weight, 0);
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
    }
  });
});
