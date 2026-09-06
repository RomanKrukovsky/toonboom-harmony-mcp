import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  findMohoV3DirectorApproval,
  resolveMohoV3BenchmarkDirector
} from '../src/services/mohoProductionV3BenchmarkApprovals/index.js';

describe('Moho Production v3 benchmark director approvals', () => {
  it('returns only an explicit decision for the exact shot, gate and approval ID', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-v3-approvals-'));
    const filePath = path.join(directory, 'director-approvals.json');
    fs.writeFileSync(filePath, JSON.stringify({
      schemaVersion: '1.0',
      approvals: [
        {
          shotId: 'p95-01',
          gate: 'rig_blueprint',
          approvalId: 'old-approval',
          decision: 'approve',
          feedbackText: 'Stale decision.',
          reviewerId: 'director-1',
          decidedAt: '2026-09-01T12:00:00.000Z'
        },
        {
          shotId: 'p95-01',
          gate: 'rig_blueprint',
          approvalId: 'approval-current',
          decision: 'reject',
          feedbackText: 'Move the hand silhouette away from the torso.',
          reviewerId: 'director-1',
          decidedAt: '2026-09-01T12:05:00.000Z'
        }
      ]
    }));

    expect(findMohoV3DirectorApproval(filePath, {
      shotId: 'p95-01',
      gate: 'rig_blueprint',
      approvalId: 'approval-current'
    })).toEqual({
      decision: 'reject',
      feedbackText: 'Move the hand silhouette away from the torso.',
      reviewerId: 'director-1',
      decidedAt: '2026-09-01T12:05:00.000Z'
    });
    expect(findMohoV3DirectorApproval(filePath, {
      shotId: 'p95-01',
      gate: 'rig_blueprint',
      approvalId: 'unknown-approval'
    })).toBeNull();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('does not invent an approval when the director file is absent', () => {
    expect(findMohoV3DirectorApproval('/missing/director-approvals.json', {
      shotId: 'p95-01',
      gate: 'final_render',
      approvalId: 'approval-final'
    })).toBeNull();
  });

  it('requires the benchmark token to identify a configured director', () => {
    expect(resolveMohoV3BenchmarkDirector({
      benchmarkToken: 'director-secret',
      tokenRegistryJson: JSON.stringify({
        'director-secret': { id: 'director-1', role: 'director' }
      })
    })).toEqual({ id: 'director-1', role: 'director' });

    expect(() => resolveMohoV3BenchmarkDirector({
      benchmarkToken: 'director-secret',
      tokenRegistryJson: undefined
    })).toThrow(/HARMONY_FACTORY_TOKENS/);
    expect(() => resolveMohoV3BenchmarkDirector({
      benchmarkToken: 'artist-secret',
      tokenRegistryJson: JSON.stringify({
        'artist-secret': { id: 'artist-1', role: 'artist' }
      })
    })).toThrow(/director/);
  });
});
