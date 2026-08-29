import fs from 'fs';
import path from 'path';
import { MohoProductionRigCompiler } from '../src/services/mohoProductionRigCompiler/index.js';

describe('MohoProductionRigCompiler', () => {
  const tempDir = path.resolve(__dirname, '../temp_production_rig');
  const outputPath = path.join(tempDir, 'hero.moho');
  const evidenceDir = path.join(tempDir, 'evidence');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails closed when minimumScore is set impossibly high (>100)', async () => {
    const result = await MohoProductionRigCompiler.compile({
      characterName: 'UncertifiableHero',
      outputPath: path.join(tempDir, 'fail.moho'),
      evidenceDirectory: path.join(tempDir, 'evidence_fail'),
      minimumScore: 101
    });

    expect(result.status).toBe('failed');
    expect(result.certified).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'fail.moho'))).toBe(false);
  }, 45000);

  it('successfully compiles and certifies a production humanoid rig (score >= 95)', async () => {
    const result = await MohoProductionRigCompiler.compile({
      characterName: 'ProductionHero',
      gender: 'female',
      outputPath,
      evidenceDirectory: evidenceDir,
      canvasWidth: 400,
      canvasHeight: 600,
      minimumScore: 95
    });

    expect(result.status).toBe('certified');
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.certified).toBe(true);
    expect(result.mandatoryPassed).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.existsSync(path.join(evidenceDir, 'readiness-report.json'))).toBe(true);
  }, 45000);
});
