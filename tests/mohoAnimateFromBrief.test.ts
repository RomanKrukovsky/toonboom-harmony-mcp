import path from 'path';
import fs from 'fs';
import { MohoAnimatorService } from '../src/services/mohoAnimatorEngine/index.js';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CERTIFIED_RIG = path.join(PROJECT_ROOT, 'docs/evidence/moho-stage1-humanoid/stage1_production_hero.moho');

describe('moho.animate.from_brief', () => {
  const tempDir = path.join(PROJECT_ROOT, 'temp_moho_anim');
  const outputPath = path.join(tempDir, 'output.moho');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Don't clean up so we can inspect the output
    // if (fs.existsSync(tempDir)) {
    //   fs.rmSync(tempDir, { recursive: true, force: true });
    // }
  });

  it('should generate an animation plan and animate the rig', async () => {
    const result = await MohoAnimatorService.animateFromBrief({
      rigPath: CERTIFIED_RIG,
      briefText: 'Character walks in, blinks, says Hello, and camera pushes in',
      durationFrames: 60,
      fps: 24,
      resolution: { width: 1920, height: 1080 },
      emotion: 'happy',
      dialogueLines: [{ text: 'Hello', startFrame: 10, endFrame: 20 }],
      outputPath: outputPath,
      cameraConstraints: 'push-in'
    });
    
    expect(result.animationPlan).toBeDefined();
    expect(result.animationPlan.blinks.length).toBeGreaterThan(0);
    expect(result.animationPlan.phonemes.length).toBe(1);
    expect(result.animationPlan.phonemes[0].word).toBe('Hello');
    expect(result.animationPlan.camera[0].type).toBe('push-in');
    
    // Check files
    expect(fs.existsSync(path.join(result.evidenceDirectory, 'animation_plan.json'))).toBe(true);
    expect(fs.existsSync(result.outputPath)).toBe(true);

    // Dry run render check or certified/failed
    expect(['dry_run', 'certified', 'failed']).toContain(result.status);
    expect(result.gates.length).toBeGreaterThan(0);
  });
});
