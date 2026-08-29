import { MohoVisualQaRepairEngine } from '../src/services/mohoVisualQaRepair/index.js';

describe('MohoVisualQaRepairEngine', () => {
  it('should successfully run a simulated repair loop and return certified status', async () => {
    const engine = new MohoVisualQaRepairEngine({ projectPath: 'dummy.moho' });
    const result = await engine.runRepairLoop({ projectId: 'dummy.moho', maxPasses: 3, autoRepair: true });

    expect(result).toBeDefined();
    expect(result.is_certified).toBe(true);
    expect(Array.isArray(result.log)).toBe(true);
    
    // The last log entry should indicate certification
    const lastLog = result.log[result.log.length - 1];
    expect(lastLog.status).toBe('certified');
    expect(lastLog.message).toBe('No defects found.');
  });
});
