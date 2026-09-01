import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  certifyMohoProductionV3At95Percent,
  type MohoProductionV3BenchmarkCase
} from '../src/services/mohoProductionV3Certification/index.js';

function sha256(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function makeCases(root: string): MohoProductionV3BenchmarkCase[] {
  return Array.from({ length: 40 }, (_, index) => {
    const shotId = `production95-${String(index + 1).padStart(2, '0')}`;
    const mohoPath = path.join(root, `${shotId}.moho`);
    const mp4Path = path.join(root, `${shotId}.mp4`);
    fs.writeFileSync(mohoPath, `native-moho-${shotId}`);
    fs.writeFileSync(mp4Path, `native-mp4-${shotId}`);
    return {
      shotId,
      artworkMode: index < 14 ? 'layered_manifest' : index < 27 ? 'flat_characters' : 'flat_scene',
      hasDialogue: index < 20,
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

describe('Moho Production v3 95 percent certification', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-v3-cert95-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('certifies 38 autonomous passes out of exactly 40 shots', () => {
    const cases = makeCases(root);
    cases[0].status = 'failed';
    cases[1].status = 'blocked';

    const report = certifyMohoProductionV3At95Percent(cases);

    expect(report.certified).toBe(true);
    expect(report.totalShots).toBe(40);
    expect(report.autonomousPasses).toBe(38);
    expect(report.autonomousRate).toBe(0.95);
    expect(report.failedShotIds).toEqual(['production95-01', 'production95-02']);
  });

  it('rejects 37 autonomous passes out of 40 shots', () => {
    const cases = makeCases(root);
    cases[0].status = 'failed';
    cases[1].status = 'blocked';
    cases[2].status = 'cancelled';

    const report = certifyMohoProductionV3At95Percent(cases);

    expect(report.certified).toBe(false);
    expect(report.autonomousPasses).toBe(37);
    expect(report.autonomousRate).toBe(0.925);
    expect(report.failures).toContain('Benchmark requires at least 38 autonomous passes; found 37.');
  });

  it('does not count manual edits or animator participation as autonomous passes', () => {
    const cases = makeCases(root);
    cases[0].evidence.manualMohoEdits = 1;
    cases[1].evidence.animatorParticipation = true;

    const report = certifyMohoProductionV3At95Percent(cases);

    expect(report.certified).toBe(true);
    expect(report.autonomousPasses).toBe(38);
    expect(report.failedShotIds).toEqual(['production95-01', 'production95-02']);
    expect(report.failures).toEqual(expect.arrayContaining([
      expect.stringContaining('manual Moho edits'),
      expect.stringContaining('animator participation')
    ]));
  });

  it('rejects an unbalanced 40-shot suite even when every shot passes', () => {
    const cases = makeCases(root);
    for (const benchmarkCase of cases) benchmarkCase.artworkMode = 'layered_manifest';

    const report = certifyMohoProductionV3At95Percent(cases);

    expect(report.certified).toBe(false);
    expect(report.autonomousPasses).toBe(40);
    expect(report.failures).toEqual(expect.arrayContaining([
      'Benchmark requires at least 10 flat_characters shots; found 0.',
      'Benchmark requires at least 10 flat_scene shots; found 0.'
    ]));
  });
});
