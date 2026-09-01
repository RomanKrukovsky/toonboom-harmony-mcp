import fs from 'fs';
import path from 'path';
import { mohoProductionTools } from '../src/tools/mohoProductionTools.js';

describe('moho.project.inspect and moho.project.certify tools', () => {
  const inspectTool = mohoProductionTools.find(t => t.name === 'moho.project.inspect');
  const certifyTool = mohoProductionTools.find(t => t.name === 'moho.project.certify');
  const instantiateTemplateTool = mohoProductionTools.find(t => t.name === 'moho.assets.instantiate_template');
  const referenceProject = path.resolve(process.cwd(), 'fixtures/moho_reference/gramps_rig.moho.bak');
  const tempEvidenceDir = path.resolve(process.cwd(), 'temp_certify_evidence');

  beforeAll(() => {
    if (!fs.existsSync(tempEvidenceDir)) {
      fs.mkdirSync(tempEvidenceDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempEvidenceDir)) {
      fs.rmSync(tempEvidenceDir, { recursive: true, force: true });
    }
  });

  it('inspect tool is registered and inspects a valid reference project', async () => {
    expect(inspectTool).toBeDefined();
    if (!fs.existsSync(referenceProject)) return;

    const handler = inspectTool!.handler as (args: any) => Promise<any>;
    const result = await handler({ projectPath: referenceProject });
    expect(result.status).toBe('success');
    expect(result.is_valid_zip).toBe(true);
    expect(result.bones_count).toBeGreaterThan(0);
  });

  it('certify tool is registered and returns certification report', async () => {
    expect(certifyTool).toBeDefined();
    if (!fs.existsSync(referenceProject)) return;

    const handler = certifyTool!.handler as (args: any) => Promise<any>;
    const result = await handler({
      projectPath: referenceProject,
      evidenceDirectory: tempEvidenceDir
    });

    expect(result.status).toBeDefined();
    expect(typeof result.score).toBe('number');
    expect(Array.isArray(result.gates)).toBe(true);
  }, 45000);

  it('does not report legacy template data as a verified production success', async () => {
    expect(instantiateTemplateTool).toBeDefined();
    const handler = instantiateTemplateTool!.handler as (args: any) => Promise<any>;
    const result = await handler({ templateId: 'quad_pioneer_dog' });

    expect(result.status).toBe('implemented_unverified');
    expect(result.replacement).toBe('moho.production.v3.start');
    expect(result.verifiedNativeMoho).toBe(false);
  });
});
