import path from 'path';
import { MohoVisualQaRepairEngine } from '../src/services/mohoVisualQaRepair/index.js';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CERTIFIED_RIG = path.join(PROJECT_ROOT, 'docs/evidence/moho-stage1-humanoid/stage1_production_hero.moho');

describe('MohoVisualQaRepairEngine', () => {
  it('should successfully run a real repair loop and return certified status', async () => {
    const engine = new MohoVisualQaRepairEngine({ projectPath: CERTIFIED_RIG });
    const result = await engine.runRepairLoop({ projectId: CERTIFIED_RIG, maxPasses: 3, autoRepair: true });

    expect(result).toBeDefined();
    expect(result.is_certified).toBe(true);
    expect(Array.isArray(result.log)).toBe(true);
    
    // The last log entry should indicate certification
    const lastLog = result.log[result.log.length - 1];
    expect(lastLog.status).toBe('certified');
    expect(lastLog.message).toContain('certified');
  }, 30000);
});
