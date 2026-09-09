import { EpisodeIR, IRTimelineEvent } from '../../schemas/countryballs/episodeIR.js';
import { CountryballsQaReport, QaIssue } from './aiCritic.js';

export interface RevisionPlan {
  episodeId: string;
  totalPatches: number;
  patches: Array<{
    issueId: string;
    type: string;
    shotId: string;
    description: string;
    patchDetails: Record<string, any>;
  }>;
  createdAt: string;
}

export class CountryballsRevisionPatcher {
  /**
   * Generates a formal Revision Plan from a QA audit report.
   */
  public static generateRevisionPlan(qaReport: CountryballsQaReport): RevisionPlan {
    const patches = qaReport.issues.map(issue => ({
      issueId: issue.id,
      type: issue.type,
      shotId: issue.shotId,
      description: issue.description,
      patchDetails: issue.suggestedPatch
    }));

    return {
      episodeId: qaReport.episodeId,
      totalPatches: patches.length,
      patches,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Automatically applies the revision patches to the Episode IR.
   */
  public static applyRevisionPlan(episode: EpisodeIR, plan: RevisionPlan): EpisodeIR {
    let patchedEpisode = JSON.parse(JSON.stringify(episode)) as EpisodeIR;

    for (const patch of plan.patches) {
      const { patchDetails, shotId } = patch;

      for (const scene of patchedEpisode.scenes) {
        for (const shot of scene.shots) {
          if (shot.shotId !== shotId && shotId !== 'global') continue;

          if (patchDetails.action === 'reposition') {
            const actor = shot.actorsOnStage.find(a => a.actorId === patchDetails.actorId);
            if (actor) {
              actor.x = patchDetails.targetX;
            }
          }

          if (patchDetails.action === 'separate_actors') {
            const a1 = shot.actorsOnStage.find(a => a.actorId === patchDetails.actor1);
            const a2 = shot.actorsOnStage.find(a => a.actorId === patchDetails.actor2);
            if (a1 && a2) {
              const mid = (a1.x + a2.x) / 2;
              const safeGap = (patchDetails.minDistance || 300) + 40; // Add 40px visual staging buffer
              const halfGap = safeGap / 2;
              a1.x = Math.max(150, Number((mid - halfGap).toFixed(1)));
              a2.x = Math.min(patchedEpisode.canvas.width - 150, Number((mid + halfGap).toFixed(1)));
            }
          }

          if (patchDetails.action === 'shift_speech') {
            const evt = shot.events.find(
              e => e.actor === patchDetails.actor && e.speech
            );
            if (evt) {
              evt.frame += patchDetails.delayFrames || 18;
            }
          }

          if (patchDetails.action === 'insert_hold') {
            const insertFrame = patchDetails.atFrame || 24;
            const holdDur = patchDetails.holdDuration || 14;

            shot.events.push({
              frame: insertFrame,
              actor: shot.actorsOnStage[0]?.actorId || 'actor',
              hold: {
                durationFrames: holdDur,
                reason: 'Auto-patched comedic timing hold'
              }
            });

            // Extend shot duration
            shot.durationFrames += holdDur;
          }
        }
      }
    }

    // Recompute total duration
    patchedEpisode.totalDurationFrames = patchedEpisode.scenes.reduce(
      (sum, s) => sum + s.shots.reduce((shSum, sh) => shSum + sh.durationFrames, 0),
      0
    );

    return patchedEpisode;
  }
}
