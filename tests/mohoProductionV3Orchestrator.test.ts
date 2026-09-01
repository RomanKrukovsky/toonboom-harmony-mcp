import fs from 'fs';
import path from 'path';
import { FactoryFoundationStore, type Principal } from '../src/adapters/factoryFoundation/index.js';
import {
  MohoProductionV3Orchestrator,
  type MohoProductionV3StageExecutor
} from '../src/orchestrators/mohoProductionV3/index.js';
import type { MohoProductionV3Stage } from '../src/schemas/mohoProductionV3.js';

const director: Principal = { id: 'director-1', role: 'director', authMode: 'token' };

describe('Moho Production v3 orchestrator', () => {
  function fixture(name: string): { root: string; image: string; executor: MohoProductionV3StageExecutor } {
    const root = fs.mkdtempSync(path.join(process.cwd(), 'output', `${name}-`));
    const image = path.join(root, 'hero.png');
    fs.writeFileSync(image, 'png-source');
    const executor: MohoProductionV3StageExecutor = async context => {
      const extension = context.stage === 'native_rig'
        ? '.moho'
        : context.stage === 'native_render'
          ? '.mp4'
          : '.json';
      const artifactPath = path.join(context.input.outputDir, `${context.stage}${extension}`);
      fs.mkdirSync(context.input.outputDir, { recursive: true });
      fs.writeFileSync(artifactPath, `${context.stage}-artifact`);
      const checkpoint: Record<string, unknown> = { verified: true, stage: context.stage };
      if (context.stage === 'native_rig') checkpoint.freshProcessRoundTrip = true;
      if (context.stage === 'native_render') {
        checkpoint.ffprobe = { codec: 'h264', fps: context.input.fps, width: context.input.width, height: context.input.height, frames: context.input.durationFrames };
      }
      if (context.stage === 'qa') checkpoint.passed = true;
      return {
        checkpoint,
        confidence: context.stage === 'decomposition' ? 0.92 : undefined,
        artifacts: [{
          path: artifactPath,
          mediaType: extension === '.mp4' ? 'video/mp4' : 'application/json',
          provenance: { executor: 'test-native', verified: true }
        }]
      };
    };
    return { root, image, executor };
  }

  function startInput(root: string, image: string) {
    return {
      shotId: 'shot-100',
      outputDir: path.join(root, 'delivery'),
      artwork: { mode: 'flat_characters' as const, imagePaths: [image] },
      brief: 'Hero notices the camera and waves.',
      durationFrames: 72
    };
  }

  async function approvePending(orchestrator: MohoProductionV3Orchestrator, jobId: string) {
    const status = await orchestrator.status(jobId);
    expect(status.pendingApproval).not.toBeNull();
    await orchestrator.approve(jobId, status.pendingApproval!.approvalId, 'approve', director, { text: 'Approved.' });
  }

  it('stops at all three gates and completes only with verified MOHO and MP4 evidence', async () => {
    const { root, image, executor } = fixture('v3-lifecycle');
    const orchestrator = new MohoProductionV3Orchestrator({ store: new FactoryFoundationStore(root), executor });

    const first = await orchestrator.start(startInput(root, image));
    expect(first.status).toBe('awaiting_approval');
    expect(first.pendingApproval?.gate).toBe('rig_blueprint');

    await approvePending(orchestrator, first.jobId);
    const second = await orchestrator.resume(first.jobId);
    expect(second.pendingApproval?.gate).toBe('key_pose_animatic');

    await approvePending(orchestrator, first.jobId);
    const third = await orchestrator.resume(first.jobId);
    expect(third.pendingApproval?.gate).toBe('final_render');

    await approvePending(orchestrator, first.jobId);
    const completed = await orchestrator.resume(first.jobId);
    expect(completed.status).toBe('completed');
    expect(completed.delivery?.mohoPath).toMatch(/\.moho$/);
    expect(completed.delivery?.mp4Path).toMatch(/\.mp4$/);
  });

  it('resumes from the last completed checkpoint after a new orchestrator instance is created', async () => {
    const { root, image, executor } = fixture('v3-resume');
    const store = new FactoryFoundationStore(root);
    const firstProcess = new MohoProductionV3Orchestrator({ store, executor });
    const started = await firstProcess.start(startInput(root, image));
    await approvePending(firstProcess, started.jobId);

    const calls: MohoProductionV3Stage[] = [];
    const resumedExecutor: MohoProductionV3StageExecutor = async context => {
      calls.push(context.stage);
      return executor(context);
    };
    const secondProcess = new MohoProductionV3Orchestrator({ store: new FactoryFoundationStore(root), executor: resumedExecutor });
    await secondProcess.resume(started.jobId);

    expect(calls).not.toContain('ingest');
    expect(calls).not.toContain('decomposition');
    expect(calls).not.toContain('rig_blueprint');
    expect(calls[0]).toBe('native_rig');
  });

  it('blocks decomposition below 0.6 confidence', async () => {
    const { root, image, executor } = fixture('v3-confidence');
    const lowConfidence: MohoProductionV3StageExecutor = async context => {
      const result = await executor(context);
      return context.stage === 'decomposition' ? { ...result, confidence: 0.59 } : result;
    };
    const orchestrator = new MohoProductionV3Orchestrator({ store: new FactoryFoundationStore(root), executor: lowConfidence });
    const result = await orchestrator.start(startInput(root, image));

    expect(result.status).toBe('blocked');
    expect(result.error?.code).toBe('DECOMPOSITION_LOW_CONFIDENCE');
  });

  it('blocks publication after the second reject across all gates', async () => {
    const { root, image, executor } = fixture('v3-retakes');
    const orchestrator = new MohoProductionV3Orchestrator({ store: new FactoryFoundationStore(root), executor });
    const started = await orchestrator.start(startInput(root, image));

    await orchestrator.approve(started.jobId, started.pendingApproval!.approvalId, 'reject', director, { text: 'Move the pivot.' });
    const rerun = await orchestrator.resume(started.jobId);
    await orchestrator.approve(rerun.jobId, rerun.pendingApproval!.approvalId, 'reject', director, { text: 'The pivot is still wrong.' });
    const blocked = await orchestrator.status(started.jobId);

    expect(blocked.status).toBe('blocked');
    expect(blocked.error?.code).toBe('RETAKE_BUDGET_EXHAUSTED');
    expect(blocked.delivery).toBeNull();
  });
});
