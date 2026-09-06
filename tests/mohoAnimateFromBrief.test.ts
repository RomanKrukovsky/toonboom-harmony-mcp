import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { MohoAnimatorService } from '../src/services/mohoAnimatorEngine/index.js';
import {
  MohoAnimateFromBriefInputSchema,
  MohoAnimationPlanSchema
} from '../src/schemas/mohoAnimator.js';

describe('moho.animate.from_brief schema and planning', () => {
  it('validates valid input with durationSeconds and new fields', () => {
    const valid = {
      rigPath: '/path/to/rig.moho',
      brief: 'Character runs, stops, smiles, and says Hello',
      durationSeconds: 4.5,
      fps: 24,
      canvasWidth: 1920,
      canvasHeight: 1080,
      motionStyle: 'expressive',
      emotion: 'happy',
      dialogue: 'Hello everyone!',
      language: 'en',
      outputPath: '/path/to/out.moho',
      cameraConstraints: 'push-in'
    };
    const parsed = MohoAnimateFromBriefInputSchema.parse(valid);
    expect(parsed.brief).toBe('Character runs, stops, smiles, and says Hello');
    expect(parsed.durationSeconds).toBe(4.5);
    expect(parsed.motionStyle).toBe('expressive');
    expect(parsed.language).toBe('en');
  });

  it('supports backwards-compatible fields (briefText, resolution, durationFrames)', () => {
    const valid = {
      rigPath: '/path/to/rig.moho',
      briefText: 'Character walks',
      durationFrames: 60,
      fps: 24,
      resolution: { width: 1280, height: 720 },
      outputPath: '/path/to/out.moho'
    };
    const parsed = MohoAnimateFromBriefInputSchema.parse(valid);
    expect(parsed.briefText).toBe('Character walks');
    expect(parsed.durationFrames).toBe(60);
    expect(parsed.resolution?.width).toBe(1280);
  });

  it('rejects input without either brief or briefText', () => {
    const invalid = {
      rigPath: '/path/to/rig.moho',
      outputPath: '/path/to/out.moho'
    };
    expect(() => MohoAnimateFromBriefInputSchema.parse(invalid)).toThrow();
  });

  it('generates a valid deterministic animation plan from brief', () => {
    const plan = MohoAnimatorService.generatePlan({
      rigPath: '/path/to/rig.moho',
      brief: 'Hero runs in, stops, blinks, says Welcome, and camera zooms in',
      durationFrames: 72,
      fps: 24,
      motionStyle: 'expressive',
      emotion: 'happy',
      dialogue: 'Welcome',
      outputPath: '/path/to/out.moho',
      cameraConstraints: 'push-in'
    });

    // Validate against plan schema
    const validatedPlan = MohoAnimationPlanSchema.parse(plan);
    expect(validatedPlan.actions.length).toBeGreaterThanOrEqual(1);
    expect(validatedPlan.actions[0].type).toBe('run');
    expect(validatedPlan.beats.length).toBe(3);
    expect(validatedPlan.blinks.length).toBeGreaterThan(0);
    expect(validatedPlan.phonemes.length).toBeGreaterThan(0);
    expect(validatedPlan.camera[0].type).toBe('push-in');
    expect(validatedPlan.diagnosticFrames.length).toBeGreaterThanOrEqual(3);
  });

  it('fails closed when the input rig does not exist', async () => {
    const tempDir = path.resolve(__dirname, '../temp_moho_missing_test');
    fs.mkdirSync(tempDir, { recursive: true });
    const outputPath = path.join(tempDir, 'missing-output.moho');

    const result = await MohoAnimatorService.animateFromBrief({
      rigPath: path.join(tempDir, 'nonexistent.moho'),
      brief: 'Walk',
      durationFrames: 30,
      fps: 24,
      outputPath,
      cameraConstraints: 'static'
    });

    expect(result.status).toBe('failed');
    expect(result.certified).toBe(false);
    expect(result.score).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(false);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

const describeWithLicensedMoho = process.env.RUN_REAL_MOHO_TESTS === '1'
  && fs.existsSync('/Applications/Moho.app/Contents/MacOS/Moho') ? describe : describe.skip;

describeWithLicensedMoho('moho.animate.from_brief native Moho integration', () => {
  let tempDir: string;
  let rigPath: string;

  beforeAll(() => {
    tempDir = path.resolve(__dirname, '../temp_moho_anim_test');
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir, { recursive: true });
    rigPath = path.join(tempDir, 'source.moho');
    execFileSync('python3', [
      '-c',
      'import sys; from pipeline.riggen.master_character_compiler import compile_master_character; compile_master_character(name="AnimatorSource", out_path=sys.argv[1], canvas_w=400, canvas_h=600)',
      rigPath
    ], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, PYTHONPATH: path.resolve(__dirname, '..') }
    });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('injects animation and certifies distinct native Moho renders', async () => {
    const outputPath = path.join(tempDir, 'animated.moho');
    const result = await MohoAnimatorService.animateFromBrief({
      rigPath,
      briefText: 'Character walks in, blinks, says Hello, and camera pushes in',
      durationFrames: 60,
      fps: 24,
      resolution: { width: 400, height: 600 },
      emotion: 'happy',
      dialogueLines: [{ text: 'Hello', startFrame: 10, endFrame: 20 }],
      outputPath,
      cameraConstraints: 'push-in'
    });

    expect(result.status).toBe('certified');
    expect(result.certified).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.errors).toEqual([]);
    expect(result.gates.filter(gate => gate.mandatory).every(gate => gate.passed)).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.existsSync(path.join(result.evidenceDirectory, 'animation-report.json'))).toBe(true);
    expect(result.renderResult.frame_differences.every((value: number) => value > 0)).toBe(true);
    expect(result.renderResult.applied).toContain('camera:push-in');
    expect(result.renderResult.applied).toContain('hair-follow-through');
  }, 45000);
});
