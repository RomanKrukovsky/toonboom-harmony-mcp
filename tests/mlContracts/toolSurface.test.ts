import { describe, expect, it } from '@jest/globals';
import { mlTools, mlOrchestratorTools } from '../../src/tools/mlTools.js';

/**
 * The MCP tool surface is a public contract. Renaming a tool breaks every caller, so the
 * original `harmony.ml.*` names are asserted explicitly and the new orchestrator tools are
 * required to live under a distinct `harmony.ml.v2.*` prefix.
 */

const ORIGINAL_TOOL_NAMES = [
  'harmony.ml.get_system_profile',
  'harmony.ml.list_models',
  'harmony.ml.install_models',
  'harmony.ml.verify_models',
  'harmony.ml.list_datasets',
  'harmony.ml.segment_video',
  'harmony.ml.estimate_pose',
  'harmony.ml.track_points',
  'harmony.ml.transcribe_audio',
  'harmony.ml.perceive_video',
  'harmony.ml.get_job',
  'harmony.ml.cancel_job'
];

describe('MCP tool surface stays backward compatible', () => {
  it('keeps every original harmony.ml.* tool name', () => {
    const names = mlTools.map(t => t.name);
    for (const original of ORIGINAL_TOOL_NAMES) {
      expect(names).toContain(original);
    }
  });

  it('adds the orchestrator tools without colliding with an existing name', () => {
    const names = mlTools.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const tool of mlOrchestratorTools) {
      expect(tool.name.startsWith('harmony.ml.v2.')).toBe(true);
      expect(ORIGINAL_TOOL_NAMES).not.toContain(tool.name);
    }
  });

  it('exposes the whole orchestrator interface named in the definition of done', () => {
    const names = mlOrchestratorTools.map(t => t.name);
    for (const suffix of [
      'submit_job', 'get_job', 'wait_for_job', 'cancel_job', 'retry_job',
      'select_provider', 'get_provider_readiness', 'get_model_readiness', 'unload_model'
    ]) {
      expect(names).toContain(`harmony.ml.v2.${suffix}`);
    }
  });

  it('gives every tool a schema and a handler', () => {
    for (const tool of mlTools) {
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(tool.inputSchema).toBeDefined();
      expect(typeof tool.handler).toBe('function');
    }
  });

  it('reports the error registry without needing a database', async () => {
    const tool = mlOrchestratorTools.find(t => t.name === 'harmony.ml.v2.list_error_codes')!;
    const result = await tool.handler({} as never) as unknown as { errors: Array<{ code: string; retryable: boolean }> };
    expect(result.errors.length).toBeGreaterThan(20);
    expect(result.errors.find(e => e.code === 'ML_LICENSE_BLOCKED')?.retryable).toBe(false);
  });

  it('evaluates a licence without opening the job store', async () => {
    const tool = mlOrchestratorTools.find(t => t.name === 'harmony.ml.v2.evaluate_license')!;
    const decision = await tool.handler({
      modelId: 'dwpose-ll-ucoco-384', gate: 'before_packaging', use: 'commercial_delivery'
    } as never) as unknown as { allowed: boolean; reasonCodes: string[] };
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCodes.length).toBeGreaterThan(0);
  });
});
