import { describe, it, expect } from '@jest/globals';
import { MohoNativeBridge } from '../src/services/mohoNativeBridge/index.js';

describe('MohoNativeBridge (Rust Core Integration)', () => {
  it('detects and connects to compiled native Rust core', () => {
    const isAvailable = MohoNativeBridge.isNativeAvailable();
    expect(isAvailable).toBe(true);
  });

  it('executes high-speed RDP contour simplification via Rust', () => {
    const rawNoisyPoints = [
      { x: 0, y: 0 },
      { x: 1, y: 0.1 },
      { x: 2, y: -0.1 },
      { x: 3, y: 0.05 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ];

    const simplified = MohoNativeBridge.simplifyContour(rawNoisyPoints, 1.0);
    expect(simplified.length).toBeLessThan(rawNoisyPoints.length);
    expect(simplified[0]).toEqual({ x: 0, y: 0 });
  });

  it('executes Bezier curve fitting and tangent curvature calculation via Rust', () => {
    const box = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ];

    const bezierPoints = MohoNativeBridge.fitBezierHandles(box, 0.35);
    expect(bezierPoints).toHaveLength(4);
    expect(bezierPoints[0].handleIn).toBeDefined();
    expect(bezierPoints[0].handleOut).toBeDefined();
  });

  it('generates cartoon capsule vector shapes with seamless joint inpainting via Rust', () => {
    const shape = MohoNativeBridge.generateCapsuleShape({
      name: 'Arm_L',
      centerX: 0,
      centerY: 100,
      radiusX: 15,
      radiusY: 30,
      fillRgba: [240, 200, 180, 255],
      strokeWidth: 3.0,
      jointCapPadding: true
    });

    expect(shape.name).toBe('Arm_L');
    expect(shape.points).toHaveLength(8);
    expect(shape.fillColor).toEqual({ r: 240, g: 200, b: 180, a: 255 });
    expect(shape.strokeWidth).toBe(3.0);
  });

  it('generates 2D Delaunay triangulation mesh via Rust', () => {
    const mesh = MohoNativeBridge.generateDelaunayMesh(
      'Torso_Mesh',
      'Torso',
      { minX: -50, minY: 0, maxX: 50, maxY: 100 },
      4,
      4
    );

    expect(mesh.meshLayerName).toBe('Torso_Mesh');
    expect(mesh.pointCount).toBe(25); // (4+1) * (4+1)
    expect(mesh.triangleCount).toBe(32); // 4*4*2
    expect(mesh.triangles).toHaveLength(32);
  });

  it('compiles binary .moho ZIP container directly via Rust', () => {
    const dummyJson = JSON.stringify({ version: 1045, name: 'NativeTest' });
    const zipBuffer = MohoNativeBridge.compileMohoZip(dummyJson);

    expect(zipBuffer.length).toBeGreaterThan(0);
    // Check ZIP magic signature 0x04034b50 ("PK\x03\x04")
    expect(zipBuffer[0]).toBe(0x50); // 'P'
    expect(zipBuffer[1]).toBe(0x4b); // 'K'
    expect(zipBuffer[2]).toBe(0x03);
    expect(zipBuffer[3]).toBe(0x04);
  });

  it('calculates trajectory-aligned dynamic squash & stretch via Rust', () => {
    const trajectory = [
      { frame: 1, posX: 0, posY: 300 },
      { frame: 12, posX: 100, posY: 50 }
    ];

    const squash = MohoNativeBridge.calculateTrajectorySquash('Ball', trajectory, 0.5);
    expect(squash.totalKeyframes).toBe(2);
    expect(squash.keyframes[1].scaleX).toBeGreaterThan(1.0);
  });

  it('interpolates point morph trajectories with Hermite ease S-curves via Rust', () => {
    const srcPoints = [
      { x: 0, y: 0, handleIn: { dx: -2, dy: 0 }, handleOut: { dx: 2, dy: 0 }, curvature: 0.2 },
      { x: 10, y: 10, handleIn: { dx: 0, dy: -2 }, handleOut: { dx: 0, dy: 2 }, curvature: 0.2 }
    ];
    const dstPoints = [
      { x: 20, y: 0, handleIn: { dx: -4, dy: 0 }, handleOut: { dx: 4, dy: 0 }, curvature: 0.4 },
      { x: 30, y: 20, handleIn: { dx: 0, dy: -4 }, handleOut: { dx: 0, dy: 4 }, curvature: 0.4 }
    ];

    const midPoints = MohoNativeBridge.interpolatePointMorph(srcPoints, dstPoints, 0.5);
    expect(midPoints).toHaveLength(2);
    expect(midPoints[0].x).toBeCloseTo(10, 2); // Midway between 0 and 20
    expect(midPoints[0].curvature).toBeCloseTo(0.3, 2); // Midway between 0.2 and 0.4
  });

  it('simulates secondary bone spring/damper physics trajectories via Rust', () => {
    const trajectory = MohoNativeBridge.simulateBonePhysics(0, 45, {
      spring: 16.0,
      damping: 8.0,
      mass: 1.0,
      gravity: 0.0,
      frames: 48
    });

    expect(trajectory).toHaveLength(48);
    // Over time with critical damping it settles to target angle 45
    expect(trajectory[trajectory.length - 1]).toBeCloseTo(45, 0);
  });
});

