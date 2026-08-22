/**
 * Tests for layoutCameraTools — real layout geometry and camera maths.
 *
 * These tools used to return three hardcoded plane names and
 * `safeAreasValid: true` regardless of input. None of it needs Harmony: it is
 * pinhole parallax, perspective scaling and broadcast safe-area geometry.
 *
 * The tests assert the maths actually responds to input (a constant would fail),
 * and that anything requiring a live scene is reported as a plan rather than a
 * success.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { layoutCameraTools } from '../src/tools/layoutCameraTools.js';
import { requireTool } from './helpers/toolInvocation.js';

const layoutGenerate = requireTool(layoutCameraTools, 'harmony.layout.generate');
const placeCharacters = requireTool(layoutCameraTools, 'harmony.layout.place_characters');
const buildMultiplane = requireTool(layoutCameraTools, 'harmony.layout.build_multiplane');
const cameraPlan = requireTool(layoutCameraTools, 'harmony.camera.plan');
const cameraApply = requireTool(layoutCameraTools, 'harmony.camera.apply');
const pushIn = requireTool(layoutCameraTools, 'harmony.camera.generate_push_in');
const pan = requireTool(layoutCameraTools, 'harmony.camera.generate_pan');
const validate = requireTool(layoutCameraTools, 'harmony.camera.validate');
const importBg = requireTool(layoutCameraTools, 'harmony.background.import');
const publishLocation = requireTool(layoutCameraTools, 'harmony.background.publish_location');

describe('layout.generate', () => {
  it('computes parallax from depth rather than returning constants', async () => {
    const result: any = await layoutGenerate.handler({ sceneId: 'SC_01', cameraZ: 1000 });

    expect(result.verification).toBe('verified_real');
    expect(result.simulated).toBe(false);

    const byName = Object.fromEntries(result.details.planes.map((p: any) => [p.name, p]));
    // Pinhole relation: cameraZ / (cameraZ - depth).
    expect(byName.SKY.parallaxFactor).toBeCloseTo(1000 / (1000 - -100), 4);
    expect(byName.FLOOR.parallaxFactor).toBeCloseTo(1.0, 4);
    // A nearer plane must move faster than a far one.
    expect(byName.FOREGROUND.parallaxFactor).toBeGreaterThan(byName.SKY.parallaxFactor);
  });

  it('responds to camera depth', async () => {
    const near: any = await layoutGenerate.handler({ sceneId: 'S', cameraZ: 200 });
    const far: any = await layoutGenerate.handler({ sceneId: 'S', cameraZ: 5000 });
    const nearSky = near.details.planes.find((p: any) => p.name === 'SKY').parallaxFactor;
    const farSky = far.details.planes.find((p: any) => p.name === 'SKY').parallaxFactor;
    expect(nearSky).not.toBeCloseTo(farSky, 4);
  });

  it('derives safe areas from the real resolution', async () => {
    const result: any = await layoutGenerate.handler({
      sceneId: 'S', resolution: { width: 1000, height: 500 }
    });
    expect(result.details.safeAreas.actionSafe.width).toBe(930);
    expect(result.details.safeAreas.titleSafe.height).toBe(450);
  });

  it('orders planes back to front for compositing', async () => {
    const result: any = await layoutGenerate.handler({ sceneId: 'S' });
    const depths = result.details.planes.map((p: any) => p.depth);
    expect(depths).toEqual([...depths].sort((a: number, b: number) => a - b));
  });
});

describe('layout.place_characters', () => {
  it('scales characters by depth via perspective', async () => {
    const result: any = await placeCharacters.handler({
      sceneId: 'S',
      characters: [
        { name: 'Near', position: 'left', depth: 100 },
        { name: 'Far', position: 'right', depth: -200 }
      ]
    });
    const near = result.details.placements.find((p: any) => p.name === 'Near');
    const far = result.details.placements.find((p: any) => p.name === 'Far');
    // Closer to camera => larger on screen.
    expect(near.perspectiveScale).toBeGreaterThan(far.perspectiveScale);
    // Lateral slots must differ.
    expect(near.x).toBeLessThan(0);
    expect(far.x).toBeGreaterThan(0);
  });

  it('detects characters that would overlap', async () => {
    const result: any = await placeCharacters.handler({
      sceneId: 'S',
      characters: [
        { name: 'A', position: 'center', depth: 10 },
        { name: 'B', position: 'center', depth: 10 }
      ]
    });
    expect(result.details.collisions.length).toBe(1);
    expect(result.status).toBe('partial_success');
  });
});

describe('layout.build_multiplane', () => {
  it('makes near planes travel further than far planes during a pan', async () => {
    const result: any = await buildMultiplane.handler({
      sceneId: 'S', cameraZ: 1000, panDistance: 500
    });
    const byName = Object.fromEntries(result.details.levels.map((l: any) => [l.name, l]));
    expect(Math.abs(byName.FOREGROUND.apparentShift)).toBeGreaterThan(
      Math.abs(byName.SKY.apparentShift)
    );
    expect(result.details.parallaxMonotonic).toBe(true);
  });

  it('reports zero shift for a static camera', async () => {
    const result: any = await buildMultiplane.handler({ sceneId: 'S', panDistance: 0 });
    for (const level of result.details.levels) {
      expect(level.apparentShift).toBe(0);
    }
  });
});

describe('camera.plan', () => {
  it('maps shot size to camera depth', async () => {
    const closeUp: any = await cameraPlan.handler({ shotId: 'S', shotSize: 'close_up' });
    const longShot: any = await cameraPlan.handler({ shotId: 'S', shotSize: 'long_shot' });
    // A tighter framing sits closer to the subject.
    expect(closeUp.details.from.z).toBeLessThan(longShot.details.from.z);
  });

  it('moves the camera inward for a push in and outward for a pull out', async () => {
    const push: any = await cameraPlan.handler({ shotId: 'S', movement: 'push_in' });
    const pull: any = await cameraPlan.handler({ shotId: 'S', movement: 'pull_out' });
    expect(push.details.to.z).toBeLessThan(push.details.from.z);
    expect(pull.details.to.z).toBeGreaterThan(pull.details.from.z);
  });

  it('produces no movement for a static shot', async () => {
    const result: any = await cameraPlan.handler({ shotId: 'S', movement: 'static' });
    expect(result.details.to).toEqual(result.details.from);
  });

  it('is deterministic: same input yields the same planId', async () => {
    const a: any = await cameraPlan.handler({ shotId: 'S', movement: 'pan_left' });
    const b: any = await cameraPlan.handler({ shotId: 'S', movement: 'pan_left' });
    expect(a.details.planId).toBe(b.details.planId);
  });

  it('eases rather than interpolating linearly by default', async () => {
    const eased: any = await cameraPlan.handler({ shotId: 'S', movement: 'pan_right', durationFrames: 10 });
    const linear: any = await cameraPlan.handler({
      shotId: 'S', movement: 'pan_right', durationFrames: 10, easing: 'linear'
    });
    const mid = Math.floor(eased.details.keyframes.length / 2);
    // Both hit the same endpoints, but the interior differs.
    expect(eased.details.keyframes[0].x).toBeCloseTo(linear.details.keyframes[0].x, 4);
    expect(eased.details.keyframes[2].x).not.toBeCloseTo(linear.details.keyframes[2].x, 4);
    expect(eased.details.keyframes[mid]).toBeDefined();
  });
});

describe('camera.apply', () => {
  it('builds a validated command plan but does not claim Harmony ran', async () => {
    const result: any = await cameraApply.handler({
      sceneId: 'SC', keyframes: [
        { frame: 1, x: 0, y: 0, z: 12 },
        { frame: 24, x: 100, y: 0, z: 10 }
      ]
    });
    expect(result.status).toBe('success');
    expect(result.isRealHarmonyExecution).toBe(false);
    expect(result.requiresRealHarmony).toBe(true);
    expect(result.verification).toBe('implemented_unverified');
    // Three transform channels per keyframe.
    expect(result.details.commandCount).toBe(6);
  });

  it('rejects duplicate frames instead of producing a broken plan', async () => {
    const result: any = await cameraApply.handler({
      sceneId: 'SC', keyframes: [
        { frame: 5, x: 0, y: 0, z: 12 },
        { frame: 5, x: 9, y: 0, z: 11 }
      ]
    });
    expect(result.status).toBe('blocked');
    expect(result.errors.join(' ')).toMatch(/5/);
  });
});

describe('camera moves', () => {
  it('push in interpolates Z across the requested frame count', async () => {
    const result: any = await pushIn.handler({
      nodePath: 'Top/Camera', startZ: 12, endZ: 10, durationFrames: 24
    });
    expect(result.details.direction).toBe('push_in');
    expect(result.details.keyframes.length).toBe(24);
    expect(result.details.keyframes[0].z).toBeCloseTo(12, 3);
    expect(result.details.keyframes[23].z).toBeCloseTo(10, 3);
    expect(result.details.zTravel).toBeCloseTo(2, 4);
  });

  it('warns when a push in has no movement', async () => {
    const result: any = await pushIn.handler({ nodePath: 'C', startZ: 10, endZ: 10 });
    expect(result.details.direction).toBe('static');
    expect(result.warnings.join(' ')).toMatch(/движения не будет/);
  });

  it('warns about a pan fast enough to strobe', async () => {
    const result: any = await pan.handler({
      nodePath: 'C', startX: 0, endX: 2000, durationFrames: 12
    });
    expect(result.details.pixelsPerFrame).toBeGreaterThan(40);
    expect(result.warnings.join(' ')).toMatch(/стробинг/);
  });

  it('computes real pan distance and duration', async () => {
    const result: any = await pan.handler({
      nodePath: 'C', startX: 0, endX: 300, startY: 0, endY: 400, durationFrames: 48, fps: 24
    });
    // 3-4-5 triangle.
    expect(result.details.distance).toBeCloseTo(500, 1);
    expect(result.details.durationSeconds).toBeCloseTo(2, 3);
  });
});

describe('camera.validate', () => {
  it('passes a well-composed shot', async () => {
    const result: any = await validate.handler({
      shotId: 'S', shotSize: 'close_up',
      subjects: [{ name: 'Hero', x: 0.35, y: 0.12, width: 0.3, height: 0.6, facing: 'front' }]
    });
    expect(result.details.safeAreasValid).toBe(true);
    expect(result.status).toBe('success');
  });

  it('catches action-safe, headroom and look-room violations together', async () => {
    const result: any = await validate.handler({
      shotId: 'S', shotSize: 'close_up',
      subjects: [{ name: 'Hero', x: 0.01, y: 0.005, width: 0.5, height: 0.6, facing: 'left' }]
    });
    const rules = result.details.issues.map((i: any) => i.rule);
    expect(rules).toContain('action_safe');
    expect(rules).toContain('headroom');
    expect(rules).toContain('look_room');
    expect(result.details.safeAreasValid).toBe(false);
  });

  it('reports null rather than true when there is nothing to check', async () => {
    // The placeholder always answered `safeAreasValid: true`.
    const result: any = await validate.handler({ shotId: 'S' });
    expect(result.details.safeAreasValid).toBeNull();
    expect(result.details.evaluated).toBe(false);
  });

  it('does not apply headroom rules to wide shots', async () => {
    const subject = { name: 'Hero', x: 0.4, y: 0.30, width: 0.2, height: 0.4, facing: 'front' as const };
    const wide: any = await validate.handler({ shotId: 'S', shotSize: 'long_shot', subjects: [subject] });
    const tight: any = await validate.handler({ shotId: 'S', shotSize: 'close_up', subjects: [subject] });
    expect(wide.details.issues.some((i: any) => i.rule === 'headroom')).toBe(false);
    expect(tight.details.issues.some((i: any) => i.rule === 'headroom')).toBe(true);
  });
});

describe('background import and publish', () => {
  const workDir = path.resolve(process.cwd(), 'output', 'layout-tests');

  beforeAll(() => {
    fs.mkdirSync(workDir, { recursive: true });
  });
  afterAll(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('detects PNG by magic bytes and hashes the file', async () => {
    const png = path.join(workDir, 'bg.png');
    fs.writeFileSync(png, Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('payload')
    ]));

    const result: any = await importBg.handler({ filePath: png });
    expect(result.details.detectedFormat).toBe('png');
    expect(result.details.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.details.sizeBytes).toBeGreaterThan(0);
    expect(result.verification).toBe('verified_real');
  });

  it('flags a file whose format cannot be identified', async () => {
    const junk = path.join(workDir, 'junk.png');
    fs.writeFileSync(junk, 'this is definitely not an image');
    const result: any = await importBg.handler({ filePath: junk });
    expect(result.details.detectedFormat).toBe('unknown');
    expect(result.status).toBe('partial_success');
  });

  it('refuses to import a missing file instead of reporting success', async () => {
    const result: any = await importBg.handler({ filePath: path.join(workDir, 'ghost.png') });
    expect(result.status).toBe('blocked');
    expect(result.errors.join(' ')).toMatch(/FILE_NOT_FOUND/);
  });

  it('publishes layers with a content-addressed manifest', async () => {
    const a = path.join(workDir, 'sky.png');
    const b = path.join(workDir, 'floor.png');
    fs.writeFileSync(a, 'SKY_LAYER');
    fs.writeFileSync(b, 'FLOOR_LAYER');

    const result: any = await publishLocation.handler({
      locationId: 'lab',
      sourcePaths: [a, b],
      libraryDir: path.join(workDir, 'library')
    });

    expect(result.status).toBe('success');
    expect(result.details.layerCount).toBe(2);
    expect(fs.existsSync(result.details.manifestPath)).toBe(true);
    // Digest must depend on content, so republishing identical layers matches.
    const expected = crypto.createHash('sha256').update(
      result.details.layers.map((l: any) => l.sha256).sort().join('')
    ).digest('hex');
    expect(result.details.locationDigest).toBe(expected);
  });

  it('does not report published when no source file exists', async () => {
    const result: any = await publishLocation.handler({
      locationId: 'ghost',
      sourcePaths: [path.join(workDir, 'nope.png')],
      libraryDir: path.join(workDir, 'library')
    });
    expect(result.status).toBe('blocked');
  });
});
