import { EpisodeIR } from '../../schemas/countryballs/episodeIR.js';

export interface ComedyLintIssue {
  severity: 'warning' | 'error' | 'info';
  code: string;
  shotId: string;
  frame?: number;
  message: string;
  suggestedFix: string;
}

export interface ComedyMetricsReport {
  episodeId: string;
  totalDurationSeconds: number;
  jokesPerMinute: number;
  longestUnbrokenDialogueFrames: number;
  deadpanReactionRatio: number;
  visualGagCount: number;
  issues: ComedyLintIssue[];
  isPacingApproved: boolean;
}

export class ComedyTimingLinter {
  public static lintEpisode(episode: EpisodeIR): ComedyMetricsReport {
    const fps = episode.fps || 24;
    const totalDurationSeconds = episode.totalDurationFrames / fps;
    const issues: ComedyLintIssue[] = [];

    let totalDialogueEvents = 0;
    let totalJokesDetected = 0;
    let totalReactionHolds = 0;
    let visualGagCount = 0;
    let longestDialogueStreakFrames = 0;

    for (const scene of episode.scenes) {
      for (const shot of scene.shots) {
        let currentDialogueStreak = 0;
        let lastSpeechEventFrame = -1;

        for (const evt of shot.events) {
          if (evt.action && (evt.action.type.includes('slapstick') || evt.action.type.includes('take') || evt.action.type.includes('gag'))) {
            visualGagCount++;
          }

          if (evt.hold) {
            totalReactionHolds++;
          }

          if (evt.speech) {
            totalDialogueEvents++;
            const wordCount = evt.speech.text.split(/\s+/).length;
            const estimatedSpeechDuration = Math.ceil((wordCount * 8) / (evt.speech.pace || 1.0));

            currentDialogueStreak += estimatedSpeechDuration;
            if (currentDialogueStreak > longestDialogueStreakFrames) {
              longestDialogueStreakFrames = currentDialogueStreak;
            }

            // Detect punchline
            if (
              evt.speech.text.includes('!') ||
              evt.speech.text.includes('?') ||
              evt.speech.intensity > 0.8
            ) {
              totalJokesDetected++;

              // Check if followed by a hold or reaction within 24 frames
              const punchlineEnd = evt.frame + estimatedSpeechDuration;
              const hasSubsequentReaction = shot.events.some(
                other =>
                  other !== evt &&
                  other.frame >= punchlineEnd &&
                  other.frame <= punchlineEnd + 24 &&
                  (other.hold || (other.action && other.action.type.includes('take')))
              );

              if (!hasSubsequentReaction) {
                issues.push({
                  severity: 'warning',
                  code: 'RUSHED_PUNCHLINE',
                  shotId: shot.shotId,
                  frame: evt.frame,
                  message: `Punchline delivered by ${evt.actor} has no reaction beat or hold afterward.`,
                  suggestedFix: `Insert a 14-frame hold or awkward_side_eye reaction after frame ${punchlineEnd}.`
                });
              }
            }

            lastSpeechEventFrame = evt.frame;
          } else {
            // Action or hold breaks dialogue streak
            currentDialogueStreak = 0;
          }
        }

        // Check if shot is too static (> 144 frames / 6 seconds with no camera move or framing change)
        if (shot.durationFrames > 144 && shot.cameraMove === 'static' && shot.framing === 'wide') {
          issues.push({
            severity: 'info',
            code: 'STATIC_CAMERA_FATIGUE',
            shotId: shot.shotId,
            message: `Shot ${shot.shotId} is static for ${shot.durationFrames} frames. Consider cutting to a medium or reaction close-up.`,
            suggestedFix: `Split shot into a 2-shot cut or add a slow_push camera motion.`
          });
        }
      }
    }

    // Check dialogue streak limit (e.g. > 120 frames / 5 seconds without pause or visual gag)
    if (longestDialogueStreakFrames > 120) {
      issues.push({
        severity: 'error',
        code: 'DIALOGUE_TOO_DENSE',
        shotId: 'global',
        message: `Dialogue runs uninterrupted for ${longestDialogueStreakFrames} frames (${(longestDialogueStreakFrames / fps).toFixed(1)}s).`,
        suggestedFix: `Break up dialogue with a visual gag or character reaction.`
      });
    }

    const jokesPerMinute = totalDurationSeconds > 0 ? Number(((totalJokesDetected / totalDurationSeconds) * 60).toFixed(2)) : 0;
    const deadpanReactionRatio = totalJokesDetected > 0 ? Number((totalReactionHolds / totalJokesDetected).toFixed(2)) : 1.0;

    const hasErrors = issues.some(i => i.severity === 'error');

    return {
      episodeId: episode.episodeId,
      totalDurationSeconds: Number(totalDurationSeconds.toFixed(2)),
      jokesPerMinute,
      longestUnbrokenDialogueFrames: longestDialogueStreakFrames,
      deadpanReactionRatio,
      visualGagCount,
      issues,
      isPacingApproved: !hasErrors && jokesPerMinute >= 2.5
    };
  }
}
