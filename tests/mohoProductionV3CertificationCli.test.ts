import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { MohoProductionV3BenchmarkCase } from '../src/services/mohoProductionV3Certification/index.js';

function sha256(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function writeManifest(root: string): string {
  const cases: MohoProductionV3BenchmarkCase[] = Array.from({ length: 40 }, (_, index) => {
    const shotId = `cli95-${String(index + 1).padStart(2, '0')}`;
    const mohoPath = path.join(root, `${shotId}.moho`);
    const mp4Path = path.join(root, `${shotId}.mp4`);
    fs.writeFileSync(mohoPath, shotId);
    fs.writeFileSync(mp4Path, shotId);
    return {
      shotId,
      artworkMode: index < 14 ? 'layered_manifest' : index < 27 ? 'flat_characters' : 'flat_scene',
      hasDialogue: index < 20,
      subjectKind: ['human', 'animal', 'creature', 'mechanical'][index % 4] as MohoProductionV3BenchmarkCase['subjectKind'],
      activeCharacterCount: (index % 10) + 1,
      status: index < 2 ? 'failed' : 'completed',
      retakesUsed: index % 3,
      approvals: { rig_blueprint: true, key_pose_animatic: true, final_render: true },
      jobId: `job-${shotId}`,
      directorDecisions: (['rig_blueprint', 'key_pose_animatic', 'final_render'] as const).map((gate, gateIndex) => ({
        shotId,
        gate,
        approvalId: `${shotId}-${gate}`,
        decision: 'approve' as const,
        feedbackText: `Approved ${gate}.`,
        reviewerId: 'benchmark-director',
        decidedAt: `2026-08-31T12:0${gateIndex}:00.000Z`,
        source: 'director_file' as const
      })),
      evidence: {
        mohoPath,
        mohoSha256: sha256(mohoPath),
        mp4Path,
        mp4Sha256: sha256(mp4Path),
        nativeRoundTripPassed: true,
        technicalQaPassed: true,
        artisticQaPassed: true,
        ffprobePassed: true,
        manualMohoEdits: 0,
        riggerParticipation: false,
        animatorParticipation: false
      },
      metrics: { wallTimeMs: 1000, modelCalls: 0, modelCostUsd: 0 },
      modelCallEvidence: [],
      failure: null
    } as MohoProductionV3BenchmarkCase;
  });
  const manifestPath = path.join(root, 'benchmark.json');
  fs.writeFileSync(manifestPath, JSON.stringify(cases));
  return manifestPath;
}

describe('Moho Production v3 certification CLI', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-v3-cert-cli-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('rejects asserted flags when artifacts are text masquerading as MOHO and MP4', () => {
    const result = spawnSync(process.execPath, [
      'scripts/certify_moho_v3_benchmark.mjs',
      '--profile',
      'production95',
      writeManifest(root)
    ], { cwd: process.cwd(), encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      profile: 'production95',
      certified: false,
      totalShots: 40,
      autonomousPasses: 0
    });
    expect(JSON.parse(result.stdout).failures).toEqual(expect.arrayContaining([
      expect.stringContaining('MP4 failed real ffprobe validation'),
      expect.stringContaining('MOHO artifact is not a valid native project archive')
    ]));
  });

  it('rejects an unknown certification profile before reading a manifest', () => {
    const result = spawnSync(process.execPath, [
      'scripts/certify_moho_v3_benchmark.mjs',
      '--profile',
      'optimistic',
      path.join(root, 'missing.json')
    ], { cwd: process.cwd(), encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Unknown certification profile: optimistic');
  });

  it('refuses to certify the not-run production95 evidence file', () => {
    const result = spawnSync(process.execPath, [
      'scripts/certify_moho_v3_benchmark.mjs',
      '--profile',
      'production95',
      'docs/evidence/moho-production-v3/production95-report.json'
    ], { cwd: process.cwd(), encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      profile: 'production95',
      certified: false,
      totalShots: 0,
      autonomousPasses: 0
    });
  });
});
