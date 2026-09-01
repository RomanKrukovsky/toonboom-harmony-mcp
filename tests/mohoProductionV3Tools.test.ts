import { describe, expect, it, jest } from '@jest/globals';
import { createMohoProductionV3Tools } from '../src/tools/mohoProductionV3Tools.js';

describe('Moho Production v3 MCP tools', () => {
  it('publishes exactly the seven v3 commands', () => {
    const tools = createMohoProductionV3Tools({ orchestrator: {} as never });
    expect(tools.map(tool => tool.name)).toEqual([
      'moho.production.v3.start',
      'moho.production.v3.status',
      'moho.production.v3.resume',
      'moho.production.v3.cancel',
      'moho.production.v3.approve',
      'moho.production.v3.inspect_stage',
      'moho.production.v3.rerun_stage'
    ]);
  });

  it('routes status without changing the job', async () => {
    const status = jest.fn(async () => ({ jobId: 'job-1', status: 'running' }));
    const tools = createMohoProductionV3Tools({ orchestrator: { status } as never });
    const tool = tools.find(candidate => candidate.name === 'moho.production.v3.status');
    expect(tool).toBeDefined();
    const result = await (tool!.handler as (args: unknown) => Promise<unknown>)({ jobId: 'job-1' });
    expect(status).toHaveBeenCalledWith('job-1');
    expect(result).toEqual({ jobId: 'job-1', status: 'running' });
  });

  it('requires a non-empty reason for rerun_stage at schema level', () => {
    const tools = createMohoProductionV3Tools({ orchestrator: {} as never });
    const tool = tools.find(candidate => candidate.name === 'moho.production.v3.rerun_stage');
    expect(tool?.inputSchema.safeParse({ jobId: 'job-1', stage: 'native_render', reason: '' }).success).toBe(false);
  });
});
