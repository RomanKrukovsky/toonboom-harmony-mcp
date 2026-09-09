import { EpisodeIR, IRPhonemeCue } from '../../schemas/countryballs/episodeIR.js';
import { CountryballsSeriesBible, CountryballMouthState } from '../../schemas/countryballs/seriesBible.js';

export interface TTSVoiceClipConfig {
  clipId: string;
  actorId: string;
  text: string;
  voiceId: string;
  pitch: number;
  rate: number;
  emotion: string;
  intensity: number;
  expectedDurationFrames: number;
}

export interface AudioProductionManifest {
  episodeId: string;
  clips: TTSVoiceClipConfig[];
  sfxCues: Array<{ frame: number; shotId: string; sfxId: string; volume: number }>;
  musicCues: Array<{ sceneId: string; trackId: string; volume: number }>;
}

export class CountryballsAudioLipsyncCompiler {
  private bible: CountryballsSeriesBible;

  constructor(bible: CountryballsSeriesBible) {
    this.bible = bible;
  }

  /**
   * Compiles audio requirements and forced-alignment phoneme data into the Episode IR.
   */
  public compileAudioAndLipsync(episode: EpisodeIR): {
    updatedEpisode: EpisodeIR;
    manifest: AudioProductionManifest;
  } {
    const fps = episode.fps || 24;
    const clips: TTSVoiceClipConfig[] = [];
    const sfxCues: Array<{ frame: number; shotId: string; sfxId: string; volume: number }> = [];
    const musicCues: Array<{ sceneId: string; trackId: string; volume: number }> = [];

    const updatedScenes = episode.scenes.map(scene => {
      musicCues.push({
        sceneId: scene.sceneId,
        trackId: 'bg_music_comedy_accordion',
        volume: 0.35
      });

      const updatedShots = scene.shots.map(shot => {
        const updatedEvents = shot.events.map(evt => {
          if (!evt.speech) return evt;

          const actorDef = this.bible.characters[evt.actor];
          const voiceCfg = actorDef?.voice || {
            voiceId: 'narrator',
            basePitch: 1.0,
            speechRate: 1.0,
            volumeGain: 1.0
          };

          const wordCount = evt.speech.text.split(' ').length;
          const durationFrames = Math.max(12, Math.ceil((wordCount * 8) / (evt.speech.pace * voiceCfg.speechRate)));
          const clipId = evt.speech.audioRef || `${shot.shotId}_${evt.actor}_f${evt.frame}.wav`;

          clips.push({
            clipId,
            actorId: evt.actor,
            text: evt.speech.text,
            voiceId: voiceCfg.voiceId,
            pitch: voiceCfg.basePitch,
            rate: voiceCfg.speechRate * (evt.speech.pace || 1.0),
            emotion: evt.speech.emotion,
            intensity: evt.speech.intensity,
            expectedDurationFrames: durationFrames
          });

          // Generate synthetic phoneme / speech bounce timing cues
          const phonemes: IRPhonemeCue[] = [];
          const phonemeSequence: CountryballMouthState[] = [
            'phoneme_A',
            'phoneme_B',
            'phoneme_C',
            'phoneme_D',
            'phoneme_E',
            'phoneme_F'
          ];

          const segmentLen = Math.max(2, Math.floor(durationFrames / wordCount));
          for (let w = 0; w < wordCount; w++) {
            const startF = w * segmentLen;
            const endF = Math.min(durationFrames, startF + segmentLen);
            phonemes.push({
              startFrame: startF,
              endFrame: endF,
              phoneme: phonemeSequence[w % phonemeSequence.length]
            });
          }

          return {
            ...evt,
            speech: {
              ...evt.speech,
              audioRef: clipId,
              phonemes
            }
          };
        });

        // Collect SFX
        shot.events.forEach(evt => {
          if (evt.sfx) {
            sfxCues.push({
              frame: evt.frame,
              shotId: shot.shotId,
              sfxId: evt.sfx.sfxId,
              volume: evt.sfx.volume
            });
          }
        });

        return {
          ...shot,
          events: updatedEvents
        };
      });

      return {
        ...scene,
        shots: updatedShots
      };
    });

    const updatedEpisode: EpisodeIR = {
      ...episode,
      scenes: updatedScenes
    };

    const manifest: AudioProductionManifest = {
      episodeId: episode.episodeId,
      clips,
      sfxCues,
      musicCues
    };

    return { updatedEpisode, manifest };
  }
}
