export type DialogueEmotion = 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised' | 'scheming' | 'sarcastic';

export interface DialogueUtterance {
  speaker: string;
  text: string;
  startFrame: number;
  endFrame: number;
  emotion?: DialogueEmotion;
  stressedWords?: string[];
}

export interface PhonemeKeyframe {
  frame: number;
  phoneme: 'Rest' | 'A_I' | 'E' | 'O' | 'U' | 'F_V' | 'L' | 'W_Q' | 'M_B_P' | 'Smile';
}

export interface FacialActingTrack {
  boneOrLayerName: string;
  type: 'switch' | 'angle' | 'pos' | 'scale';
  keyframes: Array<{
    frame: number;
    value?: string | number;
    posX?: number;
    posY?: number;
    scaleX?: number;
    scaleY?: number;
  }>;
}

export interface SynthesizedActingPerformance {
  characterName: string;
  totalDurationFrames: number;
  phonemeKeyframes: PhonemeKeyframe[];
  actingTracks: FacialActingTrack[];
  summary: {
    totalWords: number;
    totalPhonemes: number;
    emotionalBeatsCount: number;
    gesturesCount: number;
  };
}

/**
 * MohoDialogueActingSynthesizer — Fully automated dialogue acting performance generator.
 * Synchronizes mouth phonemes, emotional micro-expressions, head tilts, gaze shifts,
 * and upper-body gestural accents to audio timing.
 */
export class MohoDialogueActingSynthesizer {
  public static synthesizeActing(
    utterance: DialogueUtterance,
    fps = 24
  ): SynthesizedActingPerformance {
    const duration = Math.max(utterance.endFrame - utterance.startFrame, 24);
    const emotion = utterance.emotion ?? 'neutral';

    // 1. Synthesize Mouth Phonemes
    const phonemes = this.synthesizePhonemeTrack(utterance.text, utterance.startFrame, utterance.endFrame);

    // 2. Synthesize Eyes and Eyelid Blinks
    const eyesTrack = this.synthesizeEyesTrack(utterance.startFrame, utterance.endFrame, emotion);

    // 3. Synthesize Head Tilt & Syllable Nods
    const headNodTrack = this.synthesizeHeadNodTrack(utterance.startFrame, utterance.endFrame, utterance.text);

    // 4. Synthesize 2D Face Joystick Gaze Shifts
    const gazeJoystickTrack = this.synthesizeGazeTrack(utterance.startFrame, utterance.endFrame, emotion);

    // 5. Synthesize Gestural Accents (Hands and Clavicles)
    const gestureTracks = this.synthesizeGestureTracks(utterance.startFrame, utterance.endFrame, emotion);

    // 6. Synthesize Chest Breathing Intake
    const chestBreathingTrack = this.synthesizeBreathingTrack(utterance.startFrame, utterance.endFrame);

    const allTracks: FacialActingTrack[] = [
      eyesTrack,
      headNodTrack,
      gazeJoystickTrack,
      chestBreathingTrack,
      ...gestureTracks
    ];

    const words = utterance.text.split(/\s+/).filter(w => w.length > 0);

    return {
      characterName: utterance.speaker,
      totalDurationFrames: utterance.endFrame,
      phonemeKeyframes: phonemes,
      actingTracks: allTracks,
      summary: {
        totalWords: words.length,
        totalPhonemes: phonemes.length,
        emotionalBeatsCount: Math.ceil(duration / 36),
        gesturesCount: gestureTracks.length
      }
    };
  }

  private static synthesizePhonemeTrack(text: string, startFrame: number, endFrame: number): PhonemeKeyframe[] {
    const words = text.toLowerCase().replace(/[^a-zа-я0-9\s]/gi, '').split(/\s+/).filter(w => w.length > 0);
    const phonemes: PhonemeKeyframe[] = [];
    const totalFrames = Math.max(endFrame - startFrame, 24);
    const framePerWord = totalFrames / Math.max(words.length, 1);

    phonemes.push({ frame: Math.max(1, startFrame - 2), phoneme: 'Rest' });

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const word = words[wIdx];
      const wordStart = Math.round(startFrame + wIdx * framePerWord);
      const chars = word.split('');
      const charStep = Math.max(Math.floor(framePerWord / Math.max(chars.length, 1)), 2);

      for (let cIdx = 0; cIdx < chars.length; cIdx++) {
        const c = chars[cIdx];
        const f = wordStart + cIdx * charStep;
        if (f < endFrame) {
          const ph = this.charToPhoneme(c);
          phonemes.push({ frame: f, phoneme: ph });
        }
      }
    }

    phonemes.push({ frame: endFrame, phoneme: 'Rest' });
    return phonemes;
  }

  private static charToPhoneme(char: string): 'Rest' | 'A_I' | 'E' | 'O' | 'U' | 'F_V' | 'L' | 'W_Q' | 'M_B_P' | 'Smile' {
    if (['a', 'i', 'а', 'я', 'и', 'ай'].includes(char)) return 'A_I';
    if (['e', 'е', 'э'].includes(char)) return 'E';
    if (['o', 'о', 'ё'].includes(char)) return 'O';
    if (['u', 'у', 'ю'].includes(char)) return 'U';
    if (['f', 'v', 'ф', 'в'].includes(char)) return 'F_V';
    if (['l', 'л', 'r', 'р'].includes(char)) return 'L';
    if (['w', 'q'].includes(char)) return 'W_Q';
    if (['m', 'b', 'p', 'м', 'б', 'п'].includes(char)) return 'M_B_P';
    return 'E';
  }

  private static synthesizeEyesTrack(startFrame: number, endFrame: number, emotion: DialogueEmotion): FacialActingTrack {
    const keyframes: FacialActingTrack['keyframes'] = [
      { frame: startFrame, value: emotion === 'angry' ? 'Angry' : emotion === 'surprised' ? 'Wide' : 'Open' }
    ];

    // Add natural blinks every ~36-48 frames
    let curr = startFrame + 18;
    while (curr < endFrame - 6) {
      keyframes.push({ frame: curr, value: 'Blink' });
      keyframes.push({ frame: curr + 3, value: 'Open' });
      curr += 36 + Math.floor((curr % 12));
    }

    keyframes.push({ frame: endFrame, value: 'Open' });

    return {
      boneOrLayerName: 'Eyes Switch',
      type: 'switch',
      keyframes
    };
  }

  private static synthesizeHeadNodTrack(startFrame: number, endFrame: number, text: string): FacialActingTrack {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const keyframes: FacialActingTrack['keyframes'] = [];
    const totalFrames = endFrame - startFrame;
    const step = Math.max(Math.floor(totalFrames / Math.max(words.length, 1)), 6);

    for (let i = 0; i < words.length; i++) {
      const f = startFrame + i * step;
      if (f <= endFrame) {
        // Subtle rhythmic nod down on stressed syllable, then ease up
        keyframes.push({ frame: f, value: 87 });  // 3 deg nod forward
        keyframes.push({ frame: f + 3, value: 92 }); // rebound
        keyframes.push({ frame: f + 6, value: 90 }); // neutral
      }
    }

    return {
      boneOrLayerName: 'Head',
      type: 'angle',
      keyframes
    };
  }

  private static synthesizeGazeTrack(startFrame: number, endFrame: number, emotion: DialogueEmotion): FacialActingTrack {
    const keyframes: FacialActingTrack['keyframes'] = [
      { frame: startFrame, posX: 0, posY: 0 }
    ];

    // Saccadic eye/gaze shift mid-speech
    const midFrame = Math.round((startFrame + endFrame) * 0.5);
    const gazeOffset = emotion === 'scheming' ? -8 : emotion === 'surprised' ? 6 : 4;

    keyframes.push({ frame: midFrame - 4, posX: 0, posY: 0 });
    keyframes.push({ frame: midFrame, posX: gazeOffset, posY: 2 });
    keyframes.push({ frame: endFrame, posX: 0, posY: 0 });

    return {
      boneOrLayerName: 'Face_XY_Joystick',
      type: 'pos',
      keyframes
    };
  }

  private static synthesizeGestureTracks(startFrame: number, endFrame: number, emotion: DialogueEmotion): FacialActingTrack[] {
    const isDramatic = emotion === 'angry' || emotion === 'surprised' || emotion === 'scheming';
    const liftAngle = isDramatic ? 220 : 255;

    const armLTrack: FacialActingTrack = {
      boneOrLayerName: 'UpperArm_L',
      type: 'angle',
      keyframes: [
        { frame: startFrame, value: 250 },
        { frame: startFrame + 12, value: liftAngle }, // Gestural rise
        { frame: endFrame - 6, value: 250 }          // Return to rest
      ]
    };

    const handLTrack: FacialActingTrack = {
      boneOrLayerName: 'Hand_L Switch',
      type: 'switch',
      keyframes: [
        { frame: startFrame, value: 'Relaxed' },
        { frame: startFrame + 10, value: emotion === 'angry' ? 'Fist' : 'Point' },
        { frame: endFrame - 6, value: 'Relaxed' }
      ]
    };

    return [armLTrack, handLTrack];
  }

  private static synthesizeBreathingTrack(startFrame: number, endFrame: number): FacialActingTrack {
    return {
      boneOrLayerName: 'Chest',
      type: 'scale',
      keyframes: [
        { frame: Math.max(1, startFrame - 6), scaleX: 1.0, scaleY: 1.0 },
        { frame: startFrame, scaleX: 1.04, scaleY: 1.03 }, // Inhale before speaking
        { frame: endFrame, scaleX: 1.0, scaleY: 1.0 }       // Exhale
      ]
    };
  }
}
