import { describe, expect, it } from '@jest/globals';
import { CountryballsAiCritic } from '../../src/countryballs/critic/aiCritic.js';
import { CountryballsRevisionPatcher } from '../../src/countryballs/critic/revisionPatcher.js';
import { DEFAULT_COUNTRYBALLS_SERIES_BIBLE } from '../../src/countryballs/seriesBible/defaultBible.js';
import { EpisodeIR } from '../../src/schemas/countryballs/episodeIR.js';

describe('Countryballs AI Critic & Self-Healing QA Loop', () => {
  const buggyEpisode: EpisodeIR = {
    episodeId: 'EP_TEST_BUG',
    title: 'Collision Test Episode',
    fps: 24,
    canvas: { width: 1920, height: 1080 },
    totalDurationFrames: 96,
    characters: ['Poland', 'Russia'],
    scenes: [
      {
        sceneId: 'SC_01',
        locationId: 'un_hall',
        backgroundPreset: 'bg_un_assembly',
        shots: [
          {
            shotId: 'SC01_SH01',
            framing: 'medium',
            cameraMove: 'static',
            durationFrames: 96,
            actorsOnStage: [
              // Two actors directly colliding at the exact same X coordinate!
              {
                actorId: 'Poland',
                x: 500,
                y: 780,
                scale: 1.0,
                zOrder: 1,
                facing: 'right',
                initialEyeState: 'normal',
                initialMouthState: 'none'
              },
              {
                actorId: 'Russia',
                x: 520, // Only 20px apart, collision!
                y: 780,
                scale: 1.0,
                zOrder: 2,
                facing: 'left',
                initialEyeState: 'normal',
                initialMouthState: 'none'
              }
            ],
            events: [
              // Dialogue collision at frame 10!
              {
                frame: 10,
                actor: 'Poland',
                speech: { text: 'Hello', emotion: 'neutral', intensity: 0.5, pace: 1.0, pauseBeforeFrames: 0, pauseAfterFrames: 0 }
              },
              {
                frame: 12,
                actor: 'Russia',
                speech: { text: 'Nyet', emotion: 'neutral', intensity: 0.5, pace: 1.0, pauseBeforeFrames: 0, pauseAfterFrames: 0 }
              }
            ]
          }
        ]
      }
    ],
    metadata: {
      tone: 'absurd_comedy',
      targetAudience: 'general',
      jokesPerMinute: 3.0,
      visualGagCount: 0,
      generatedAt: new Date().toISOString()
    }
  };

  it('detects staging overlaps and dialogue clashes in buggy episode', () => {
    const critic = new CountryballsAiCritic(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
    const report = critic.audit(buggyEpisode);

    expect(report.passed).toBe(false);
    expect(report.issues.some(i => i.type === 'staging_overlap')).toBe(true);
    expect(report.issues.some(i => i.type === 'dialogue_clash')).toBe(true);
  });

  it('generates revision plan and automatically fixes detected defects', () => {
    const critic = new CountryballsAiCritic(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
    const report = critic.audit(buggyEpisode);
    const plan = CountryballsRevisionPatcher.generateRevisionPlan(report);

    expect(plan.totalPatches).toBeGreaterThanOrEqual(2);

    const patchedEpisode = CountryballsRevisionPatcher.applyRevisionPlan(buggyEpisode, plan);
    const stageActors = patchedEpisode.scenes[0].shots[0].actorsOnStage;

    // Characters should now be pushed apart safely
    const distAfter = Math.abs(stageActors[0].x - stageActors[1].x);
    expect(distAfter).toBeGreaterThan(150);

    // Re-auditing should have fewer or no blockers
    const reReport = critic.audit(patchedEpisode);
    expect(reReport.issues.filter(i => i.severity === 'blocker').length).toBe(0);
  });
});
