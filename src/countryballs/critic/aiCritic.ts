import { EpisodeIR } from '../../schemas/countryballs/episodeIR.js';
import { CountryballsSeriesBible } from '../../schemas/countryballs/seriesBible.js';
import { ComedyTimingLinter, ComedyMetricsReport } from '../comedy/timingLinter.js';

export interface QaIssue {
  id: string;
  severity: 'blocker' | 'warning' | 'info';
  type: 'staging_overlap' | 'offscreen_clipping' | 'dialogue_clash' | 'rushed_pacing' | 'static_shot';
  shotId: string;
  frame?: number;
  description: string;
  suggestedPatch: Record<string, any>;
}

export interface CountryballsQaReport {
  episodeId: string;
  overallScore: number; // 0-100
  scores: {
    stagingAndComposition: number;
    comedyTiming: number;
    dialogueAndAudio: number;
    characterConsistency: number;
  };
  passed: boolean;
  issues: QaIssue[];
  comedyReport: ComedyMetricsReport;
  timestamp: string;
}

export class CountryballsAiCritic {
  private bible: CountryballsSeriesBible;

  constructor(bible: CountryballsSeriesBible) {
    this.bible = bible;
  }

  /**
   * Conducts an automated QA audit on the Episode IR.
   */
  public audit(episode: EpisodeIR): CountryballsQaReport {
    const issues: QaIssue[] = [];
    const canvas = episode.canvas;

    // 1. Audit Staging and Composition
    for (const scene of episode.scenes) {
      for (const shot of scene.shots) {
        // Check character overlaps on stage
        const actors = shot.actorsOnStage;
        for (let i = 0; i < actors.length; i++) {
          const a1 = actors[i];
          const char1 = this.bible.characters[a1.actorId];
          const r1 = (char1?.physical.radius || 100) * a1.scale;

          // Check boundary clipping
          if (a1.x - r1 < 50 || a1.x + r1 > canvas.width - 50) {
            issues.push({
              id: `clip_${shot.shotId}_${a1.actorId}`,
              severity: 'warning',
              type: 'offscreen_clipping',
              shotId: shot.shotId,
              description: `Actor ${a1.actorId} is too close to screen edge (x: ${a1.x}).`,
              suggestedPatch: {
                action: 'reposition',
                actorId: a1.actorId,
                targetX: a1.x < canvas.width / 2 ? 250 : canvas.width - 250
              }
            });
          }

          for (let j = i + 1; j < actors.length; j++) {
            const a2 = actors[j];
            const char2 = this.bible.characters[a2.actorId];
            const r2 = (char2?.physical.radius || 100) * a2.scale;

            const dist = Math.abs(a1.x - a2.x);
            const minSafeDist = (r1 + r2) * 1.1;

            if (dist < minSafeDist) {
              issues.push({
                id: `overlap_${shot.shotId}_${a1.actorId}_${a2.actorId}`,
                severity: 'blocker',
                type: 'staging_overlap',
                shotId: shot.shotId,
                description: `Actors ${a1.actorId} and ${a2.actorId} overlap on stage (dist: ${dist.toFixed(1)}px, min: ${minSafeDist.toFixed(1)}px).`,
                suggestedPatch: {
                  action: 'separate_actors',
                  actor1: a1.actorId,
                  actor2: a2.actorId,
                  minDistance: minSafeDist
                }
              });
            }
          }
        }

        // Check dialogue collisions (multiple characters speaking at same frame)
        const speechEvents = shot.events.filter(e => e.speech);
        for (let s1 = 0; s1 < speechEvents.length; s1++) {
          for (let s2 = s1 + 1; s2 < speechEvents.length; s2++) {
            if (speechEvents[s1].actor !== speechEvents[s2].actor) {
              if (Math.abs(speechEvents[s1].frame - speechEvents[s2].frame) < 12) {
                issues.push({
                  id: `clash_${shot.shotId}_${speechEvents[s1].frame}`,
                  severity: 'blocker',
                  type: 'dialogue_clash',
                  shotId: shot.shotId,
                  frame: speechEvents[s1].frame,
                  description: `Dialogue clash between ${speechEvents[s1].actor} and ${speechEvents[s2].actor} at frame ${speechEvents[s1].frame}.`,
                  suggestedPatch: {
                    action: 'shift_speech',
                    actor: speechEvents[s2].actor,
                    delayFrames: 18
                  }
                });
              }
            }
          }
        }
      }
    }

    // 2. Audit Comedy Timing
    const comedyReport = ComedyTimingLinter.lintEpisode(episode);
    for (const cIssue of comedyReport.issues) {
      if (cIssue.severity === 'error' || cIssue.severity === 'warning') {
        issues.push({
          id: `comedy_${cIssue.code}_${cIssue.shotId}`,
          severity: cIssue.severity === 'error' ? 'blocker' : 'warning',
          type: 'rushed_pacing',
          shotId: cIssue.shotId,
          frame: cIssue.frame,
          description: cIssue.message,
          suggestedPatch: {
            action: 'insert_hold',
            shotId: cIssue.shotId,
            atFrame: cIssue.frame || 0,
            holdDuration: 14
          }
        });
      }
    }

    // Compute composite scores
    const blockerCount = issues.filter(i => i.severity === 'blocker').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    const stagingScore = Math.max(20, 100 - blockerCount * 25 - warningCount * 10);
    const comedyScore = comedyReport.isPacingApproved ? 95 : 70;
    const dialogueScore = 90 - issues.filter(i => i.type === 'dialogue_clash').length * 20;
    const consistencyScore = 95;

    const overallScore = Math.round((stagingScore + comedyScore + dialogueScore + consistencyScore) / 4);
    const passed = blockerCount === 0 && overallScore >= 80;

    return {
      episodeId: episode.episodeId,
      overallScore,
      scores: {
        stagingAndComposition: stagingScore,
        comedyTiming: comedyScore,
        dialogueAndAudio: dialogueScore,
        characterConsistency: consistencyScore
      },
      passed,
      issues,
      comedyReport,
      timestamp: new Date().toISOString()
    };
  }
}
