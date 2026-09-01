import fs from 'fs';
import path from 'path';
import { FactoryFoundationStore } from '../src/adapters/factoryFoundation/index.js';
import { MOHO_PRODUCTION_V3_STAGES } from '../src/schemas/mohoProductionV3.js';

describe('Moho Production v3 durable store', () => {
  function testRoot(name: string): string {
    return fs.mkdtempSync(path.join(process.cwd(), 'output', `${name}-`));
  }

  it('runs the versioned v3 migration and stores hashed stage artifacts', async () => {
    const root = testRoot('v3-store');
    const source = path.join(root, 'blueprint.json');
    fs.writeFileSync(source, '{"ok":true}');
    const store = new FactoryFoundationStore(root);
    const job = await store.createJob('moho.production.v3', { shotId: 'shot-1' }, [...MOHO_PRODUCTION_V3_STAGES]);

    expect(await store.getSchemaVersion()).toBeGreaterThanOrEqual(3);

    const linked = await store.recordStageArtifact(
      job.jobId,
      'rig_blueprint',
      source,
      'application/json',
      { source: 'claude', modelCallId: 'call-1' }
    );
    const artifacts = await store.listStageArtifacts(job.jobId, 'rig_blueprint');

    expect(linked.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(linked.valid).toBe(true);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].provenance).toEqual({ source: 'claude', modelCallId: 'call-1' });
  });

  it('persists approvals and counts one shared reject budget', async () => {
    const store = new FactoryFoundationStore(testRoot('v3-approval'));
    const job = await store.createJob('moho.production.v3', { shotId: 'shot-2' }, [...MOHO_PRODUCTION_V3_STAGES]);
    const first = await store.requestApproval(job.jobId, 'rig_blueprint', 'rig_blueprint', []);
    await store.decideApproval(first.approvalId, 'reject', 'director-1', {
      text: 'Move the shoulder pivot.',
      annotationPaths: ['/tmp/shoulder-note.png']
    });
    const second = await store.requestApproval(job.jobId, 'rig_blueprint', 'rig_blueprint', []);
    await store.decideApproval(second.approvalId, 'reject', 'director-1', { text: 'Try once more.' });

    expect(await store.countApprovalRejects(job.jobId)).toBe(2);
    expect((await store.listApprovals(job.jobId)).map(item => item.status)).toEqual(['rejected', 'rejected']);
  });

  it('invalidates dependent checkpoints and approvals only with director authority', async () => {
    const store = new FactoryFoundationStore(testRoot('v3-invalidation'));
    const job = await store.createJob('moho.production.v3', { shotId: 'shot-3' }, [...MOHO_PRODUCTION_V3_STAGES]);
    await store.setStep(job.jobId, 'rig_blueprint', 'completed', { sha256: 'a'.repeat(64) });
    await store.setStep(job.jobId, 'native_rig', 'completed', { sha256: 'b'.repeat(64) });
    const approval = await store.requestApproval(job.jobId, 'rig_blueprint', 'rig_blueprint', []);
    await store.decideApproval(approval.approvalId, 'approve', 'director-1', { text: 'Approved.' });

    await expect(store.invalidateStagesFrom(
      job.jobId,
      'rig_blueprint',
      [...MOHO_PRODUCTION_V3_STAGES],
      'artist',
      'Change the topology.'
    )).rejects.toThrow(/director/i);

    await store.invalidateStagesFrom(
      job.jobId,
      'rig_blueprint',
      [...MOHO_PRODUCTION_V3_STAGES],
      'director',
      'Change the topology.'
    );

    const restored = await store.getJob(job.jobId);
    expect(restored.steps.find(step => step.name === 'rig_blueprint')?.status).toBe('pending');
    expect(restored.steps.find(step => step.name === 'native_rig')?.status).toBe('pending');
    expect((await store.listApprovals(job.jobId))[0].status).toBe('invalidated');
  });

  it('records model calls without exposing provider responses in job state', async () => {
    const store = new FactoryFoundationStore(testRoot('v3-model-call'));
    const job = await store.createJob('moho.production.v3', { shotId: 'shot-4' }, [...MOHO_PRODUCTION_V3_STAGES]);
    const call = await store.recordModelCall({
      jobId: job.jobId,
      stage: 'decomposition',
      provider: 'openai',
      model: 'vision-model',
      requestSha256: 'c'.repeat(64),
      responseSha256: 'd'.repeat(64),
      status: 'completed',
      metadata: { latencyMs: 1200 }
    });

    expect(call.callId).toMatch(/^model_call_/);
    expect((await store.listModelCalls(job.jobId))[0].metadata).toEqual({ latencyMs: 1200 });
  });
});
