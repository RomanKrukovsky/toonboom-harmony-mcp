import fs from 'fs';
import path from 'path';
import { MohoProductionRigCompiler } from '../src/services/mohoProductionRigCompiler/index.js';

const installedMoho = '/Applications/Moho.app/Contents/MacOS/Moho';
const describeWithLicensedMoho = process.env.RUN_REAL_MOHO_TESTS === '1'
  && process.platform === 'darwin' && fs.existsSync(installedMoho)
  ? describe
  : describe.skip;

describeWithLicensedMoho('MohoProductionRigCompiler native certification', () => {
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
    const protectedOutput = path.join(tempDir, 'protected.moho');
    const originalContents = 'existing project must survive a failed compile';
    fs.writeFileSync(protectedOutput, originalContents);

    const result = await MohoProductionRigCompiler.compile({
      characterName: 'UncertifiableHero',
      outputPath: protectedOutput,
      evidenceDirectory: path.join(tempDir, 'evidence_fail'),
      minimumScore: 101
    });

    expect(result.status).toBe('failed');
    expect(result.certified).toBe(false);
    expect(result.errors.some(error => error.includes('below required 101'))).toBe(true);
    expect(fs.readFileSync(protectedOutput, 'utf8')).toBe(originalContents);
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
