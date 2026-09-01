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
