import { afterEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { MohoNativeProductionBackend } from '../src/services/mohoProductionV3NativeBackend/index.js';
import type { MohoCommandPlan } from '../src/schemas/mohoCommandPlan.js';

const plan: MohoCommandPlan = {
  schemaVersion: 'toon-boom-mcp/moho-command-plan-v1',
  planId: 'PRODV3-1234567890AB',
  documentPath: null,
  createdAt: '1970-01-01T00:00:00.000Z',
  status: 'implemented_unverified',
  requiresRealMoho: true,
  sourceManifestSha256: 'a'.repeat(64),
  operations: [{
    commandId: 'mcmd_0001', type: 'save_document', params: {}, preconditions: ['rig_open'],
    destructiveLevel: 'none', idempotencyKey: 'save_document',
    rollback: { strategy: 'none', snapshotRequired: false },
    expectedArtifact: { kind: 'document', path: null, nonempty: true },
    verification: { method: 'native', required: true, acceptance: ['verified'] }
  }],
  acceptanceGates: ['a', 'b', 'c', 'd', 'e', 'f'],
  provenance: { compiler: 'MohoRigPlanCompiler v1', source: 'test', characterName: 'Hero' }
};

describe('Moho Production v3 native backend', () => {
  const cleanup: string[] = [];
  afterEach(() => {
    for (const directory of cleanup.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('enforces build, audit, fresh-process round-trip, render and ffprobe order', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-v3-native-'));
    cleanup.push(outputDir);
    const order: string[] = [];
    const backend = new MohoNativeProductionBackend({
      detectMohoExecutable: () => '/fake/Moho',
      executeFile: async (_executable, args) => {
        if (args[0] === '-r' && args[1]?.includes('license-probe')) {
          order.push('license_preflight');
          return { stdout: '', stderr: 'Could not open file' };
        }
        if (args.length === 1) {
          order.push('build');
          fs.writeFileSync(path.join(outputDir, `${plan.planId}.moho`), 'native project');
          return { stdout: '[SUMMARY] done=1 failed=0', stderr: '' };
        }
        order.push('render');
        const outputIndex = args.indexOf('-o');
        fs.writeFileSync(args[outputIndex + 1], 'native video');
        return { stdout: '', stderr: '' };
      },
      auditProject: projectPath => {
        order.push(fs.existsSync(path.join(outputDir, 'roundtrip.moho')) ? 'audit_roundtrip' : 'audit_source');
        return { projectPath, productionReady: true, errors: [] };
      },
      runNativeAcceptance: async projectPath => {
        order.push('roundtrip');
        const roundtripPath = path.join(outputDir, 'roundtrip.moho');
        fs.copyFileSync(projectPath, roundtripPath);
        return { opened: true, saved: true, reopened: true, rendered_frames: ['frame.png'], preview_frames: [], render_status: 'rendered', errors: [], stdout: '', stderr: '', roundtrip_path: roundtripPath };
      },
      probeRender: async () => {
        order.push('ffprobe');
        return { fps: 24, durationSec: 1, resolution: { width: 1920, height: 1080 }, codec: 'h264', matches: { fps: true, duration: true }, issues: [] };
      }
    });

    const result = await backend.buildRoundTripAndRender({ plan, outputDir, startFrame: 1, endFrame: 24, fps: 24, width: 1920, height: 1080 });

    expect(order).toEqual(['license_preflight', 'build', 'audit_source', 'roundtrip', 'audit_roundtrip', 'render', 'ffprobe']);
    expect(result.freshProcessRoundTrip).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.mp4Path).toMatch(/\.mp4$/);
  });

  it('stops on Lua [FAIL] even if Moho exits with code zero', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-v3-native-fail-'));
    cleanup.push(outputDir);
    const backend = new MohoNativeProductionBackend({
      detectMohoExecutable: () => '/fake/Moho',
      executeFile: async () => ({ stdout: '[FAIL] mesh is empty\n[SUMMARY] done=3 failed=1', stderr: '' })
    });
    await expect(backend.buildRoundTripAndRender({ plan, outputDir, startFrame: 1, endFrame: 24, fps: 24, width: 1920, height: 1080 }))
      .rejects.toMatchObject({ code: 'LUA_FAILED' });
  });

  it('reports missing Moho separately', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-v3-native-missing-'));
    cleanup.push(outputDir);
    const backend = new MohoNativeProductionBackend({ detectMohoExecutable: () => null });
    await expect(backend.buildRoundTripAndRender({ plan, outputDir, startFrame: 1, endFrame: 24, fps: 24, width: 1920, height: 1080 }))
      .rejects.toMatchObject({ code: 'MOHO_NOT_FOUND' });
  });

  it('reports a missing Pro license before running any build Lua', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-v3-native-license-'));
    cleanup.push(outputDir);
    const calls: string[][] = [];
    const backend = new MohoNativeProductionBackend({
      detectMohoExecutable: () => '/fake/Moho',
      executeFile: async (_executable, args) => {
        calls.push(args);
        return {
          stdout: '',
          stderr: 'Unable to launch the command-line renderer as it is a Pro level feature only. You must upgrade.'
        };
      }
    });

    await expect(backend.buildRoundTripAndRender({ plan, outputDir, startFrame: 1, endFrame: 24, fps: 24, width: 1920, height: 1080 }))
      .rejects.toMatchObject({ code: 'MOHO_PRO_REQUIRED' });
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('-r');
  });
});
