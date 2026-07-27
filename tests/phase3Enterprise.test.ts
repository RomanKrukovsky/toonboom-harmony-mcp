import fs from 'fs';
import path from 'path';
import { rig360GenerationTools } from '../src/tools/rig360GenerationTools.js';
import { commercialWorkflowTools } from '../src/tools/commercialWorkflowTools.js';
import { factoryFoundationTools } from '../src/tools/factoryFoundationTools.js';

import { characterSpecSchema } from '../src/schemas/characterSpec.js';

describe('Phase 3: Digital Actor Platform & Enterprise Production Infrastructure', () => {
  const outputDir = path.resolve(process.cwd(), 'output/phase3_enterprise');

  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  describe('3.1 360° Character Rig Plan Compiler (Strategy D)', () => {
    const mockCharacter = characterSpecSchema.parse({
      name: 'HeroCharacter',
      role: 'Protagonist',
      personality: 'Brave and energetic',
      visualStyle: 'Vector cutout 2D',
      bodyType: 'Athletic Biped',
      requiredViews: ['front', 'front_3q_left', 'side_left', 'back_3q_left', 'back']
    });

    it('compiles full rig360_spec.json for character turnaround', async () => {
      const tool = rig360GenerationTools.find(t => t.name === 'harmony.rig360.generate_spec');
      expect(tool).toBeDefined();

      const res: any = await (tool!.handler as any)({
        characterSpec: mockCharacter
      });

      expect(res.status).toBe('success');
      expect(res.rig360Spec).toBeDefined();
      expect(res.rig360Spec.characterName).toBe('HeroCharacter');
      expect(res.rig360Spec.placeholderRigCreated).toBe(true);

      const outputPath = path.join(outputDir, 'head360_rig_plan.json');
      fs.writeFileSync(outputPath, JSON.stringify(res.rig360Spec, null, 2));
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it('generates turnaround 8-view plan and master controller layout', async () => {
      const turnaroundTool = rig360GenerationTools.find(t => t.name === 'harmony.rig360.generate_turnaround_plan');
      const mcTool = rig360GenerationTools.find(t => t.name === 'harmony.rig360.generate_master_controller_plan');

      expect(turnaroundTool).toBeDefined();
      expect(mcTool).toBeDefined();

      const tRes: any = await (turnaroundTool!.handler as any)({ characterSpec: mockCharacter });
      const mcRes: any = await (mcTool!.handler as any)({ characterSpec: mockCharacter });

      expect(tRes.status).toBe('success');
      expect(mcRes.status).toBe('success');
      expect(tRes.turnaroundPlan.views.length).toBeGreaterThan(0);
    });
  });

  describe('3.2 Multi-Shot Batch Production Pipeline', () => {
    const plansDir = path.join(outputDir, 'scene_plans');

    it('generates scene plans for multi-shot sequence', async () => {
      const genPlansTool = commercialWorkflowTools.find(t => t.name === 'harmony.production.generate_scene_plans');
      expect(genPlansTool).toBeDefined();

      const res: any = await (genPlansTool!.handler as any)({
        outputDirectory: plansDir
      });

      expect(res.status).toBe('success');
      expect(res.generatedFiles.length).toBe(3);
      expect(fs.existsSync(path.join(plansDir, 'plan_SC_001.json'))).toBe(true);
    });

    it('runs batch scene assembly across generated plans', async () => {
      const batchTool = commercialWorkflowTools.find(t => t.name === 'harmony.production.run_batch_scene_assembly');
      expect(batchTool).toBeDefined();

      const res: any = await (batchTool!.handler as any)({
        plansDirectory: plansDir
      });

      expect(res.status).toBe('success');
      expect(res.processedCount).toBe(3);

      const reportPath = path.join(outputDir, 'batch_assembly_report.json');
      fs.writeFileSync(reportPath, JSON.stringify(res, null, 2));
      expect(fs.existsSync(reportPath)).toBe(true);
    });

    it('calculates ROI time and financial savings report', async () => {
      const reportTool = commercialWorkflowTools.find(t => t.name === 'harmony.production.generate_time_savings_report');
      expect(reportTool).toBeDefined();

      const res: any = await (reportTool!.handler as any)({
        scenesCount: 20,
        hourlyRate: 50
      });

      expect(res.status).toBe('success');
      expect(res.metrics.scenesProcessed).toBe(20);
      expect(res.metrics.financialSavingsUSD).toBeGreaterThan(0);
    });
  });

  describe('3.3 Enterprise Production System Status', () => {
    it('queries enterprise control plane status', async () => {
      const statusTool = factoryFoundationTools.find(t => t.name === 'harmony.factory.system.status');
      expect(statusTool).toBeDefined();

      const res: any = await (statusTool!.handler as any)({});
      expect(res.status).toBeDefined();
      expect(res.capabilities).toBeDefined();
    });
  });
});
