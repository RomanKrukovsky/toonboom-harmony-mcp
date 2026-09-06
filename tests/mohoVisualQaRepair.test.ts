import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { MohoVisualQaRepairEngine } from '../src/services/mohoVisualQaRepair/index.js';

const describeWithLicensedMoho = process.env.RUN_REAL_MOHO_TESTS === '1'
  && fs.existsSync('/Applications/Moho.app/Contents/MacOS/Moho') ? describe : describe.skip;

describeWithLicensedMoho('MohoVisualQaRepairEngine', () => {
  const tempDir = path.resolve(__dirname, '../temp_moho_qa_test');
  const projectPath = path.join(tempDir, 'defective.moho');

  beforeAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir, { recursive: true });
    execFileSync('python3', [
      '-c',
      [
        'import sys',
        'from pipeline.riggen.master_character_compiler import compile_master_character',
        'from pipeline.moho.extract import extract_from_file',
        'from pipeline.moho.emit import emit',
        'from pipeline.pir.schema import Channel',
        'p=sys.argv[1]',
        'compile_master_character(name="QaSource", out_path=p, canvas_w=400, canvas_h=600)',
        'r=extract_from_file(p)',
        'r.bone_by_id("Head Switch").strength=0.75',
        'r.bone_by_id("Eyes Switch").angle_channel=Channel(type="Val", when=[0], val=[0.0], interp=[])',
        'r.bone_by_id("Mouth Switch").angle_channel=Channel(type="Val", when=[0], val=[0.0], interp=[])',
        'emit(r,p)'
      ].join(';'),
      projectPath
    ], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, PYTHONPATH: path.resolve(__dirname, '..') }
    });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('repairs a real project and promotes it after native recertification', async () => {
    const engine = new MohoVisualQaRepairEngine({ projectPath });
    const result = await engine.runRepairLoop({
      projectId: projectPath,
      maxPasses: 3,
      autoRepair: true
    });

    expect(result.status).toBe('success');
    expect(result.is_certified).toBe(true);
    expect(result.repairs_promoted).toBe(true);
    expect(result.fixes_applied).toBeGreaterThanOrEqual(3);
    expect(result.final_acceptance).toEqual({
      opened: true,
      saved: true,
      reopened: true,
      errors: []
    });
    const lastLog = result.log[result.log.length - 1];
    expect(lastLog.status).toBe('certified');
  }, 45000);
});

describe('moho.qa.certify_and_repair contract', () => {
  it('validates input schema with projectPath, manifestPath, maxRepairPasses, evidenceDir, outputPath', () => {
    const { MohoQaRepairSpecSchema } = require('../src/services/mohoVisualQaRepair/index.js');
    const parsed = MohoQaRepairSpecSchema.parse({
      projectPath: '/path/to/hero.moho',
      manifestPath: '/path/to/manifest.json',
      maxRepairPasses: 4,
      evidenceDir: '/path/to/evidence',
      outputPath: '/path/to/output.moho',
      autoRepair: true
    });
    expect(parsed.projectPath).toBe('/path/to/hero.moho');
    expect(parsed.manifestPath).toBe('/path/to/manifest.json');
    expect(parsed.maxRepairPasses).toBe(4);
    expect(parsed.evidenceDir).toBe('/path/to/evidence');
    expect(parsed.outputPath).toBe('/path/to/output.moho');
    expect(parsed.autoRepair).toBe(true);
  });

  it('validates output schema with status, certified, initialScore, finalScore, repairPasses, detectedDefects, appliedRepairs, evidenceDirectory', () => {
    const { MohoQaRepairResultSchema } = require('../src/services/mohoVisualQaRepair/index.js');
    const parsed = MohoQaRepairResultSchema.parse({
      status: 'success',
      certified: true,
      initialScore: 65.0,
      finalScore: 100.0,
      repairPasses: 2,
      detectedDefects: [
        { issue_type: 'missing_blink', frame: 24, severity: 'medium', description: 'Missing blink' }
      ],
      appliedRepairs: [
        { pass: 1, issue: 'missing_blink', action: 'Inserted natural blink keys' }
      ],
      evidenceDirectory: '/path/to/evidence'
    });
    expect(parsed.status).toBe('success');
    expect(parsed.certified).toBe(true);
    expect(parsed.initialScore).toBe(65.0);
    expect(parsed.finalScore).toBe(100.0);
    expect(parsed.repairPasses).toBe(2);
    expect(parsed.detectedDefects).toHaveLength(1);
    expect(parsed.appliedRepairs).toHaveLength(1);
    expect(parsed.evidenceDirectory).toBe('/path/to/evidence');
  });

  it('exposes moho.qa.certify_and_repair tool', () => {
    const { mohoQaTools } = require('../src/tools/mohoQaTools.js');
    const tool = mohoQaTools.find((t: any) => t.name === 'moho.qa.certify_and_repair');
    expect(tool).toBeDefined();
    expect(tool.inputSchema).toBeDefined();
    expect(typeof tool.handler).toBe('function');
  });
});
