import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';
import {
  certifyMohoProductionV3Benchmark,
  type MohoProductionV3BenchmarkCase
} from '../src/services/mohoProductionV3Certification/index.js';

function sha256(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function makeCases(root: string): MohoProductionV3BenchmarkCase[] {
  return Array.from({ length: 30 }, (_, index) => {
    const shotId = `benchmark-${String(index + 1).padStart(2, '0')}`;
    const mohoPath = path.join(root, `${shotId}.moho`);
    const mp4Path = path.join(root, `${shotId}.mp4`);
    fs.writeFileSync(mohoPath, `real-moho-${shotId}`);
    fs.writeFileSync(mp4Path, `real-mp4-${shotId}`);
    return {
      shotId,
      artworkMode: index < 10 ? 'layered_manifest' : index < 20 ? 'flat_characters' : 'flat_scene',
      hasDialogue: index < 15,
      subjectKind: ['human', 'animal', 'creature', 'mechanical'][index % 4] as MohoProductionV3BenchmarkCase['subjectKind'],
      activeCharacterCount: (index % 10) + 1,
      status: 'completed',
      retakesUsed: index % 3,
      approvals: {
        rig_blueprint: true,
        key_pose_animatic: true,
        final_render: true
      },
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
      }
    };
  });
}

describe('Moho Production v3 benchmark certification', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-v3-cert-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('certifies only a complete 30-shot native evidence set', () => {
    const report = certifyMohoProductionV3Benchmark(makeCases(root));

    expect(report.certified).toBe(true);
    expect(report.passedShots).toBe(30);
    expect(report.failures).toEqual([]);
  });

  it('rejects missing distribution, manual edits, and forged artifact hashes', () => {
    const cases = makeCases(root);
    cases[0].artworkMode = 'flat_scene';
    cases[1].evidence.manualMohoEdits = 1;
    cases[2].evidence.mp4Sha256 = '0'.repeat(64);

    const report = certifyMohoProductionV3Benchmark(cases);

    expect(report.certified).toBe(false);
    expect(report.failures).toEqual(expect.arrayContaining([
      expect.stringContaining('10 layered_manifest'),
      expect.stringContaining('manual Moho edits'),
      expect.stringContaining('MP4 SHA-256')
    ]));
  });

  it('rejects any shot above the shared two-retake budget or without all gates', () => {
    const cases = makeCases(root);
    cases[4].retakesUsed = 3;
    cases[5].approvals.final_render = false;

    const report = certifyMohoProductionV3Benchmark(cases);

    expect(report.certified).toBe(false);
    expect(report.passedShots).toBe(28);
  });
});
