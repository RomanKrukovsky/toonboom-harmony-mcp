import { ContinuityLedger } from '../seriesBible/continuityLedger.js';
import { EpisodeIR, IRTimelineEvent } from '../../schemas/countryballs/episodeIR.js';

export type JokePattern =
  | 'setup_expectation_inversion'
  | 'setup_silence_reaction'
  | 'escalation_rule_of_three'
  | 'dialogue_background_gag'
  | 'confidence_immediate_failure'
  | 'callback_historical';

export interface ComedyBeat {
  pattern: JokePattern;
  setupText: string;
  punchlineText: string;
  initiatorActor: string;
  targetActor?: string;
  visualGagAction?: string;
  suggestedHoldFrames: number;
}

export class ComedyEngine {
  private continuityLedger: ContinuityLedger;

  constructor(continuityLedger?: ContinuityLedger) {
    this.continuityLedger = continuityLedger || new ContinuityLedger();
  }

  /**
   * Evaluates and refines comedic timing across an Episode IR.
   * Ensures that after a punchline or absurd action, adequate reaction hold frames are preserved.
   */
  public injectComedicTiming(episode: EpisodeIR, minHoldFrames: number = 14): EpisodeIR {
    const updatedScenes = episode.scenes.map(scene => {
      const updatedShots = scene.shots.map(shot => {
        const updatedEvents: IRTimelineEvent[] = [];
        let runningFrameShift = 0;

        for (let i = 0; i < shot.events.length; i++) {
          const evt = shot.events[i];
          const shiftedEvt = {
            ...evt,
            frame: evt.frame + runningFrameShift
          };
          updatedEvents.push(shiftedEvt);

          // Check if speech event is high intensity punchline or contains exclamation/question
          const isPunchline =
            evt.speech &&
            (evt.speech.intensity > 0.8 ||
              evt.speech.text.includes('!') ||
              evt.speech.text.includes('?') ||
              evt.speech.emotion === 'triumphant' ||
              evt.speech.emotion === 'shocked');

          if (isPunchline) {
            const holdFrames = Math.max(minHoldFrames, evt.speech?.pauseAfterFrames || minHoldFrames);
            
            // Add a comedic hold event right after the punchline
            const speechDurationEstimate = Math.ceil((evt.speech!.text.split(' ').length * 8) / (evt.speech!.pace || 1));
            const holdStartFrame = shiftedEvt.frame + speechDurationEstimate;

            updatedEvents.push({
              frame: holdStartFrame,
              actor: evt.actor,
              hold: {
                durationFrames: holdFrames,
                reason: 'Comedic beat pause for punchline landing'
              }
            });

            // If there is another actor on stage, add a deadpan reaction for them during the hold
            const otherActor = shot.actorsOnStage.find(a => a.actorId !== evt.actor);
            if (otherActor) {
              updatedEvents.push({
                frame: holdStartFrame + 2,
                actor: otherActor.actorId,
                action: {
                  type: 'awkward_side_eye',
                  durationFrames: holdFrames - 2,
                  intensity: 1.0
                }
              });
            }

            runningFrameShift += holdFrames;
          }
        }

        return {
          ...shot,
          durationFrames: shot.durationFrames + runningFrameShift,
          events: updatedEvents
        };
      });

      return {
        ...scene,
        shots: updatedShots
      };
    });

    const totalDuration = updatedScenes.reduce(
      (sum, s) => sum + s.shots.reduce((shotSum, sh) => shotSum + sh.durationFrames, 0),
      0
    );

    return {
      ...episode,
      totalDurationFrames: totalDuration,
      scenes: updatedScenes
    };
  }

  public registerEpisodeJokes(episodeId: string, beats: ComedyBeat[]): void {
    for (const b of beats) {
      const actors = [b.initiatorActor];
      if (b.targetActor) actors.push(b.targetActor);
      this.continuityLedger.recordJoke(episodeId, b.pattern, actors, b.setupText, b.punchlineText);
    }
  }

  public isJokeDuplicate(setup: string, punchline: string, actors: string[]): boolean {
    return this.continuityLedger.hasJokeBeenUsed(setup, punchline, actors);
  }
}
