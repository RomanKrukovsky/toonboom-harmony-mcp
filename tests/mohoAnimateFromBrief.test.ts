import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { MohoAnimatorService } from '../src/services/mohoAnimatorEngine/index.js';


describe('moho.animate.from_brief', () => {
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

  it('fails closed when the input rig does not exist', async () => {
    const outputPath = path.join(tempDir, 'missing-output.moho');
    const result = await MohoAnimatorService.animateFromBrief({
      rigPath: path.join(tempDir, 'missing.moho'),
      briefText: 'Walk',
      durationFrames: 30,
      fps: 24,
      resolution: { width: 400, height: 600 },
      emotion: 'neutral',
      dialogueLines: [],
      outputPath,
      cameraConstraints: 'static'
    });

    expect(result.status).toBe('failed');
    expect(result.certified).toBe(false);
    expect(fs.existsSync(outputPath)).toBe(false);
  });
});
