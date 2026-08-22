/**
 * Tests for qualityEngineTools — real scoring instead of a fixed 92.
 *
 * The placeholders returned `score: 92`, `similarityScore: 0.94` and
 * `Auto-fix: ${issue}` regardless of input, while `QualityDirector.scoreScene()`
 * already implemented genuine structural scoring and was never called.
 *
 * Each test proves the tool responds to its input: constants would fail.
 */

import fs from 'fs';
import path from 'path';

import { qualityEngineTools } from '../src/tools/qualityEngineTools.js';
import { requireTool } from './helpers/toolInvocation.js';

const reviewScene = requireTool(qualityEngineTools, 'harmony.quality.review_scene');
const reviewEpisode = requireTool(qualityEngineTools, 'harmony.quality.review_episode');
const compareRefs = requireTool(qualityEngineTools, 'harmony.quality.compare_to_references');
const fixPlan = requireTool(qualityEngineTools, 'harmony.quality.generate_fix_plan');
const applySafe = requireTool(qualityEngineTools, 'harmony.quality.apply_safe_fixes');
const requestReview = requireTool(qualityEngineTools, 'harmony.quality.request_human_review');
const approve = requireTool(qualityEngineTools, 'harmony.quality.approve');

const ROOT = path.resolve(process.cwd(), 'output', 'quality-tests');

const COMPLETE_SCENE = {
  sceneId: 'SC_010',
  location: 'lab',
  characters: ['Hero', 'Robot'],
  durationFrames: 120,
  mood: 'tense',
  cameraNotes: 'slow dolly in'
};

beforeAll(() => fs.mkdirSync(ROOT, { recursive: true }));
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

describe('review_scene', () => {
  it('scores a complete scene higher than an empty one', async () => {
    const good: any = await reviewScene.handler({ scene: COMPLETE_SCENE });
    const empty: any = await reviewScene.handler({ scene: { sceneId: 'SC_bare' } });
    // A constant 92 would make these equal.
    expect(good.details.score).toBeGreaterThan(empty.details.score);
    expect(empty.details.score).toBeLessThan(70);
  });

  it('reports the specific structural gaps it found', async () => {
    const result: any = await reviewScene.handler({ scene: { sceneId: 'SC_bare' } });
    const findings = result.details.technicalCheck.structuralFindings.join(' ');
    expect(findings).toMatch(/локация/i);
    expect(findings).toMatch(/персонаж/i);
    expect(findings).toMatch(/[Дд]лительность/);
  });

  it('lowers the score in proportion to issue severity', async () => {
    const base: any = await reviewScene.handler({ scene: COMPLETE_SCENE });
    const minor: any = await reviewScene.handler({
      scene: COMPLETE_SCENE,
      knownIssues: [{ category: 'timing', severity: 'minor', detail: 'slight drift' }]
    });
    const critical: any = await reviewScene.handler({
      scene: COMPLETE_SCENE,
      knownIssues: [{ category: 'broken_node', severity: 'critical', detail: 'composite detached' }]
    });
    expect(minor.details.score).toBeLessThan(base.details.score);
    expect(critical.details.score).toBeLessThan(minor.details.score);
  });

  it('fails the technical check when a critical issue exists', async () => {
    const result: any = await reviewScene.handler({
      scene: COMPLETE_SCENE,
      knownIssues: [{ category: 'broken_node', severity: 'critical', detail: 'broken' }]
    });
    expect(result.details.technicalCheck.pass).toBe(false);
    expect(result.status).toBe('partial_success');
  });

  it('does not claim a visual check it never performed', async () => {
    // The placeholder reported driftScore: 0.01 with no render involved.
    const result: any = await reviewScene.handler({ scene: COMPLETE_SCENE });
    expect(result.details.visualCheck.evaluated).toBe(false);
    expect(result.details.visualCheck.reason).toMatch(/рендер/i);
  });

  it('rewards a dynamic camera over a static note', async () => {
    const dynamic: any = await reviewScene.handler({
      scene: { ...COMPLETE_SCENE, cameraNotes: 'crane up and pan' }
    });
    const plain: any = await reviewScene.handler({
      scene: { ...COMPLETE_SCENE, cameraNotes: 'locked off' }
    });
    expect(dynamic.details.breakdown.composition).toBeGreaterThan(plain.details.breakdown.composition);
  });
});

describe('review_episode', () => {
  it('aggregates real per-scene scores rather than returning 90', async () => {
    const result: any = await reviewEpisode.handler({
      scenes: [COMPLETE_SCENE, { sceneId: 'SC_weak' }]
    });
    expect(result.details.sceneCount).toBe(2);
    const scores = result.details.sceneReports.map((r: any) => r.sceneScore);
    // Average of two genuinely different scores.
    expect(Math.round((scores[0] + scores[1]) / 2)).toBe(result.details.overallEpisodeScore);
  });

  it('identifies the weakest scene and those below threshold', async () => {
    const result: any = await reviewEpisode.handler({
      scenes: [COMPLETE_SCENE, { sceneId: 'SC_weak' }],
      passThreshold: 70
    });
    expect(result.details.weakestScene.sceneId).toBe('SC_weak');
    expect(result.details.failedCount).toBe(1);
    expect(result.status).toBe('partial_success');
  });

  it('passes cleanly when every scene clears the threshold', async () => {
    const result: any = await reviewEpisode.handler({
      scenes: [COMPLETE_SCENE, { ...COMPLETE_SCENE, sceneId: 'SC_011' }],
      passThreshold: 50
    });
    expect(result.details.failedCount).toBe(0);
    expect(result.status).toBe('success');
  });
});

describe('compare_to_references', () => {
  it('returns null similarity when the service is unreachable', async () => {
    const a = path.join(ROOT, 'render.png');
    const b = path.join(ROOT, 'ref.png');
    fs.writeFileSync(a, 'RENDER');
    fs.writeFileSync(b, 'REFERENCE');

    const result: any = await compareRefs.handler({ renderPath: a, referencePath: b });
    // The placeholder always answered 0.94.
    expect(result.details.similarityScore).toBeNull();
    expect(['blocked', 'partial_success']).toContain(result.status);
  });

  it('blocks on a missing file instead of scoring it', async () => {
    const result: any = await compareRefs.handler({
      renderPath: path.join(ROOT, 'ghost.png'),
      referencePath: path.join(ROOT, 'ref.png')
    });
    expect(result.status).toBe('blocked');
    expect(result.details.similarityScore).toBeNull();
    expect(result.errors.join(' ')).toMatch(/FILE_NOT_FOUND/);
  });
});

describe('generate_fix_plan', () => {
  it('separates mechanically safe fixes from ones needing a human', async () => {
    const result: any = await fixPlan.handler({
      sceneId: 'SC', issues: [
        { category: 'missing_asset', severity: 'critical', target: 'BG', detail: 'no bg' },
        { category: 'composition', severity: 'minor', target: 'Camera', detail: 'cramped' }
      ]
    });
    expect(result.details.safeFixCount).toBe(1);
    expect(result.details.manualFixCount).toBe(1);
    expect(result.details.requiresHumanReview).toBe(true);
  });

  it('orders critical fixes before minor ones', async () => {
    const result: any = await fixPlan.handler({
      issues: [
        { category: 'palette', severity: 'minor', detail: 'off-model colour' },
        { category: 'missing_asset', severity: 'critical', detail: 'missing rig' }
      ]
    });
    expect(result.details.fixPlan[0].severity).toBe('critical');
    expect(result.details.fixPlan[1].severity).toBe('minor');
  });

  it('gives each step a concrete action and a rationale', async () => {
    // The placeholder emitted `Auto-fix: [object Object]`.
    const result: any = await fixPlan.handler({
      issues: [{ category: 'lip_sync', severity: 'major', target: 'Hero_Mouth', detail: 'drift' }]
    });
    const step = result.details.fixPlan[0];
    expect(step.action).toMatch(/виземы/i);
    expect(step.action).toContain('Hero_Mouth');
    expect(step.rationale).toBeTruthy();
    expect(step.action).not.toMatch(/\[object Object\]/);
  });

  it('never marks composition or continuity as auto-fixable', async () => {
    const result: any = await fixPlan.handler({
      issues: [
        { category: 'composition', severity: 'major', detail: 'a' },
        { category: 'continuity', severity: 'major', detail: 'b' }
      ]
    });
    expect(result.details.safeFixCount).toBe(0);
  });
});

describe('apply_safe_fixes', () => {
  it('builds a validated plan and does not claim Harmony ran', async () => {
    const result: any = await applySafe.handler({
      sceneId: 'SC', issues: [{ category: 'timing', severity: 'major', target: 'Hero', detail: 'drift' }]
    });
    expect(result.details.safeFixesPlannedCount).toBe(1);
    expect(result.isRealHarmonyExecution).toBe(false);
    expect(result.requiresRealHarmony).toBe(true);
    expect(result.verification).toBe('implemented_unverified');
  });

  it('escalates to a human when nothing is safe', async () => {
    // The placeholder always reported safeFixesAppliedCount: 2.
    const result: any = await applySafe.handler({
      sceneId: 'SC', issues: [{ category: 'composition', severity: 'minor', detail: 'x' }]
    });
    expect(result.status).toBe('requires_human');
    expect(result.details.safeFixesAppliedCount).toBe(0);
  });

  it('produces a deterministic plan id', async () => {
    const args = { sceneId: 'SC', issues: [{ category: 'palette' as const, severity: 'minor' as const, detail: 'c' }] };
    const a: any = await applySafe.handler(args);
    const b: any = await applySafe.handler(args);
    expect(a.details.planId).toBe(b.details.planId);
  });
});

describe('request_human_review and approve', () => {
  it('writes a real queue entry', async () => {
    const queueDir = path.join(ROOT, 'queue');
    const result: any = await requestReview.handler({
      sceneId: 'SC_020', reason: 'Композиция требует решения режиссёра',
      priority: 'high', reviewQueueDir: queueDir
    });
    expect(result.status).toBe('requires_human');
    expect(fs.existsSync(result.details.queueEntryPath)).toBe(true);

    const onDisk = JSON.parse(fs.readFileSync(result.details.queueEntryPath, 'utf-8'));
    expect(onDisk.sceneId).toBe('SC_020');
    expect(onDisk.priority).toBe('high');
    expect(onDisk.status).toBe('pending_human_review');
  });

  it('writes an approval record with a tamper-evident digest', async () => {
    const approvalsDir = path.join(ROOT, 'approvals');
    const result: any = await approve.handler({
      sceneId: 'SC_030', approver: 'Director', score: 88, approvalsDir
    });
    expect(fs.existsSync(result.details.recordPath)).toBe(true);

    const onDisk = JSON.parse(fs.readFileSync(result.details.recordPath, 'utf-8'));
    expect(onDisk.approver).toBe('Director');
    expect(onDisk.score).toBe(88);
    expect(onDisk.approvalDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('records a null score when none was supplied', async () => {
    const result: any = await approve.handler({
      sceneId: 'SC_031', approvalsDir: path.join(ROOT, 'approvals')
    });
    expect(result.details.score).toBeNull();
  });
});
