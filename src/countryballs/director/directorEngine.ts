import { CountryballsScreenplay } from '../writersRoom/writersRoom.js';
import { CountryballsSeriesBible } from '../../schemas/countryballs/seriesBible.js';
import { EpisodeIR, IRScene, IRShot, IRTimelineEvent, IRActorPlacement } from '../../schemas/countryballs/episodeIR.js';

export class CountryballsDirectorEngine {
  private bible: CountryballsSeriesBible;

  constructor(bible: CountryballsSeriesBible) {
    this.bible = bible;
  }

  /**
   * Compiles a creative screenplay into a fully timed, shot-decomposed Episode IR.
   */
  public directEpisode(screenplay: CountryballsScreenplay): EpisodeIR {
    const fps = this.bible.fps || 24;
    const groundY = this.bible.recurringLocations[0]?.groundY || 780;
    const sceneList: IRScene[] = [];
    let totalFrames = 0;

    screenplay.beats.forEach((beat, bIdx) => {
      const sceneId = `SCENE_${String(bIdx + 1).padStart(2, '0')}`;
      const shots: IRShot[] = [];

      // Shot 1: Establishing / Two-Shot
      const shot1Id = `${sceneId}_SHOT_01`;
      const stageActors1: IRActorPlacement[] = screenplay.characters.slice(0, 2).map((charId, idx) => {
        const charDef = this.bible.characters[charId];
        const scale = charDef?.physical.scale || 1.0;
        const xPos = idx === 0 ? 540 : 1380;
        return {
          actorId: charId,
          x: xPos,
          y: groundY,
          scale,
          zOrder: idx + 1,
          facing: idx === 0 ? 'right' : 'left',
          initialEyeState: 'normal',
          initialMouthState: 'none'
        };
      });

      const shot1Events: IRTimelineEvent[] = [];
      let currentFrame = 12;

      // Add entrance or action for first actor
      const firstDialog = beat.dialogues[0];
      if (firstDialog) {
        shot1Events.push({
          frame: currentFrame,
          actor: firstDialog.speaker,
          action: {
            type: firstDialog.suggestedAction || 'jump_excited',
            durationFrames: 24,
            intensity: 1.0
          }
        });

        // Speech event
        const wordCount = firstDialog.text.split(' ').length;
        const speechDuration = Math.ceil(wordCount * 7.5);
        shot1Events.push({
          frame: currentFrame + 8,
          actor: firstDialog.speaker,
          speech: {
            text: firstDialog.text,
            audioRef: `${shot1Id}_dialogue_01.wav`,
            emotion: firstDialog.emotion,
            intensity: 0.85,
            pace: 1.0,
            pauseBeforeFrames: 0,
            pauseAfterFrames: 14
          }
        });

        currentFrame += speechDuration + 20;
      }

      // Add second dialog if present
      const secondDialog = beat.dialogues[1];
      if (secondDialog) {
        shot1Events.push({
          frame: currentFrame,
          actor: secondDialog.speaker,
          action: {
            type: secondDialog.suggestedAction || 'deadpan_stare',
            durationFrames: 18,
            intensity: 1.0
          }
        });

        const wordCount2 = secondDialog.text.split(' ').length;
        const speechDuration2 = Math.ceil(wordCount2 * 7.5);
        shot1Events.push({
          frame: currentFrame + 6,
          actor: secondDialog.speaker,
          speech: {
            text: secondDialog.text,
            audioRef: `${shot1Id}_dialogue_02.wav`,
            emotion: secondDialog.emotion,
            intensity: 0.75,
            pace: 1.0,
            pauseBeforeFrames: 0,
            pauseAfterFrames: 16
          }
        });

        currentFrame += speechDuration2 + 24;
      }

      const shot1Duration = Math.max(96, currentFrame + 12);
      shots.push({
        shotId: shot1Id,
        framing: 'medium',
        cameraMove: 'static',
        durationFrames: shot1Duration,
        focusActor: beat.dialogues[0]?.speaker,
        actorsOnStage: stageActors1,
        events: shot1Events,
        directorNotes: `Beat ${beat.act}: ${beat.description}`
      });
      totalFrames += shot1Duration;

      // Shot 2: Comedic Reaction / Punchline Shot
      const shot2Id = `${sceneId}_SHOT_02`;
      const reactingActor = screenplay.characters[1] || screenplay.characters[0];
      const reactDef = this.bible.characters[reactingActor];
      const stageActors2: IRActorPlacement[] = [
        {
          actorId: reactingActor,
          x: 960,
          y: groundY,
          scale: (reactDef?.physical.scale || 1.0) * 1.35, // Close-up framing
          zOrder: 1,
          facing: 'right',
          initialEyeState: 'wide_shock',
          initialMouthState: 'none'
        }
      ];

      const shot2Events: IRTimelineEvent[] = [
        {
          frame: 4,
          actor: reactingActor,
          action: {
            type: 'double_take',
            durationFrames: 24,
            intensity: 1.2
          }
        },
        {
          frame: 28,
          actor: reactingActor,
          hold: {
            durationFrames: 16,
            reason: 'Punchline absorption pause'
          }
        }
      ];

      const shot2Duration = 48; // 2 seconds reaction beat
      shots.push({
        shotId: shot2Id,
        framing: 'close_up',
        cameraMove: 'slow_push',
        durationFrames: shot2Duration,
        focusActor: reactingActor,
        actorsOnStage: stageActors2,
        events: shot2Events,
        directorNotes: 'Close-up dramatic/deadpan reaction'
      });
      totalFrames += shot2Duration;

      sceneList.push({
        sceneId,
        locationId: this.bible.recurringLocations[0]?.id || 'un_hall',
        backgroundPreset: this.bible.recurringLocations[0]?.backgroundSymbol || 'bg_un_assembly',
        shots
      });
    });

    return {
      episodeId: `EP_${Date.now().toString(36).toUpperCase()}`,
      title: screenplay.title,
      fps,
      canvas: this.bible.canvas,
      totalDurationFrames: totalFrames,
      characters: screenplay.characters,
      scenes: sceneList,
      metadata: {
        tone: 'absurd_comedy',
        targetAudience: 'general',
        jokesPerMinute: Number(((screenplay.beats.length * 2) / (totalFrames / fps / 60)).toFixed(2)),
        visualGagCount: screenplay.beats.length,
        generatedAt: new Date().toISOString()
      }
    };
  }
}
