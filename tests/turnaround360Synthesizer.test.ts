import { describe, expect, it } from '@jest/globals';
import { Turnaround360Synthesizer } from '../src/services/turnaround360Synthesizer/index.js';
import type { Turnaround360Config, LayerDepthSpec } from '../src/schemas/turnaround360Spec.js';

describe('Turnaround360Synthesizer', () => {
  const sampleLayerDepths: LayerDepthSpec[] = [
    { layerName: 'Nose', amplitude: 1.2, phaseOffsetDeg: 0, baseZ: 0.5 }, // Frontmost at 0 deg
    { layerName: 'Face', amplitude: 0.5, phaseOffsetDeg: 0, baseZ: 0.0 },
    { layerName: 'Ear_L', amplitude: 1.0, phaseOffsetDeg: 90, baseZ: -0.2 }, // Frontmost at 270 deg
    { layerName: 'Ear_R', amplitude: 1.0, phaseOffsetDeg: -90, baseZ: -0.2 } // Frontmost at 90 deg
  ];

  const sampleConfig: Turnaround360Config = {
    characterId: 'hero_360',
    angles: ['0', '45', '90', '135', '180'],
    layerDepths: sampleLayerDepths,
    masterController: {
      xRange: [0, 360],
      yRange: [-30, 30]
    }
  };

  it('computes continuous trigonometric layer Z-depth', () => {
    const noseAtFront = Turnaround360Synthesizer.computeLayerZ(sampleLayerDepths[0], 0);
    const noseAtBack = Turnaround360Synthesizer.computeLayerZ(sampleLayerDepths[0], 180);

    expect(noseAtFront).toBeCloseTo(1.7, 1);
    expect(noseAtBack).toBeCloseTo(-0.7, 1);
    expect(noseAtFront).toBeGreaterThan(noseAtBack);
  });

  it('generates continuous Z-ordering intervals without popping', () => {
    const intervals = Turnaround360Synthesizer.generateZOrderingIntervals(sampleLayerDepths);

    expect(intervals.length).toBeGreaterThan(1);
    expect(intervals[0].startAngleDeg).toBe(0);
    expect(intervals[intervals.length - 1].endAngleDeg).toBe(360);

    // Front view (around 0 deg): Nose must be in front of Face
    const frontOrder = intervals[0].layerOrder;
    expect(frontOrder.indexOf('Nose')).toBeLessThan(frontOrder.indexOf('Face'));

    // Back view (around 180 deg): Face must be in front of Nose
    const backInterval = intervals.find(i => i.startAngleDeg <= 180 && i.endAngleDeg >= 180)!;
    expect(backInterval.layerOrder.indexOf('Face')).toBeLessThan(backInterval.layerOrder.indexOf('Nose'));
  });

  it('prevents triangle inversion during horizontal deformation up to 90 degrees', () => {
    const anglesToTest = [0, 30, 60, 85, 90];

    for (const ang of anglesToTest) {
      const mesh = Turnaround360Synthesizer.generateBoundaryPreservingMesh(0, 0, 100, 120, ang);
      expect(mesh.hasInvertedTriangles).toBe(false);
      expect(mesh.triangles.length).toBeGreaterThan(10);

      // Verify each triangle has strictly positive area
      for (const tri of mesh.triangles) {
        expect(tri.area).toBeGreaterThan(0.001);
      }
    }
  });

  it('synthesizes Harmony Master Controller 2D point interpolator', () => {
    const result = Turnaround360Synthesizer.synthesize360Turnaround(sampleConfig);
    const mc = result.harmonyMasterController;

    expect(mc.gridConfig.nodeName).toBe('hero_360_Turnaround_MC');
    expect(mc.gridConfig.xMin).toBe(0);
    expect(mc.gridConfig.xMax).toBe(360);
    expect(mc.gridConfig.yMin).toBe(-30);
    expect(mc.gridConfig.yMax).toBe(30);

    expect(mc.scriptCode).toContain('Point2D');
    expect(mc.scriptCode).toContain('configureMasterController_hero_360');
  });

  it('synthesizes Moho 2D Smart Bone dials with orthogonal axes', () => {
    const result = Turnaround360Synthesizer.synthesize360Turnaround(sampleConfig);
    const mohoBones = result.mohoSmartBones;

    expect(mohoBones.bones).toHaveLength(2);
    expect(mohoBones.bones[0].name).toBe('Dial_Turn_X');
    expect(mohoBones.bones[0].axis).toBe('x');
    expect(mohoBones.bones[1].name).toBe('Dial_Tilt_Y');
    expect(mohoBones.bones[1].axis).toBe('y');

    expect(mohoBones.actionNames).toEqual(expect.arrayContaining([
      'Dial_Turn_X_0',
      'Dial_Turn_X_45',
      'Dial_Turn_X_90',
      'Dial_Turn_X_180',
      'Dial_Tilt_Y_UP',
      'Dial_Tilt_Y_DOWN'
    ]));
  });
});
