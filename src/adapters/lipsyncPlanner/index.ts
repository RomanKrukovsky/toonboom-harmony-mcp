import type { EpisodePlan } from '../../schemas/episodePlan.js';

export interface DialogueLine {
  character: string;
  text: string;
  startFrame: number;
  endFrame: number;
  audioFile?: string;
}

export interface PhonemeKeyframe {
  frame: number;
  shape: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'X';
  character: string;
}

export interface LipsyncDialogue {
  character: string;
  text: string;
  startFrame: number;
  endFrame: number;
  audioFile?: string;
  phonemes: PhonemeKeyframe[];
}

export interface LipsyncPlan {
  sceneId: string;
  totalFrames: number;
  fps: number;
  engine: 'placeholder' | 'rhubarb' | 'papagayo';
  dialogues: LipsyncDialogue[];
  mouthLayerPattern: string;
  generatedAt: string;
  quality: 'draft' | 'production';
  origin: 'planned' | 'placeholder' | 'requires_external_model';
  missingAssets: string[];
}

/**
 * LipsyncPlanner — generates lipsync timing plans from scene dialogue.
 *
 * Per ACTOR §2.14: without real audio we produce a placeholder phoneme
 * timing table that a human or Rhubarb can refine later. The plan is
 * honest about being heuristic/placeholder.
 */
export class LipsyncPlanner {
  generatePlans(script: any, episodePlan: EpisodePlan): LipsyncPlan[] {
    return episodePlan.scenes.map(scene => {
      const sceneScript = script.scenes.find((s: any) => s.sceneId === scene.sceneId);
      const dialogues = this.extractDialogueLines(sceneScript, scene);
      return this.buildPlan(scene, dialogues, episodePlan.fps);
    });
  }

  generatePlanForScene(scene: any, fps: number = 24): LipsyncPlan {
    const dialogues = this.extractDialogueLines(null, scene);
    return this.buildPlan(scene, dialogues, fps);
  }

  private buildPlan(scene: any, dialogues: DialogueLine[], fps: number): LipsyncPlan {
    const processed = dialogues.map(d => ({
      ...d,
      phonemes: this.generatePhonemes(d)
    }));

    const hasAudio = dialogues.some(d => d.audioFile);
    const missingAssets: string[] = [];
    if (!hasAudio) missingAssets.push('recorded dialogue audio');
    if (dialogues.length === 0) missingAssets.push('final dialogue text');

    return {
      sceneId: scene.sceneId,
      totalFrames: scene.durationFrames,
      fps,
      engine: 'placeholder',
      dialogues: processed,
      mouthLayerPattern: '{character}/mouth',
      generatedAt: new Date().toISOString(),
      quality: 'draft',
      origin: hasAudio ? 'planned' : 'placeholder',
      missingAssets
    };
  }

  private extractDialogueLines(sceneScript: any, scene: any): DialogueLine[] {
    const lines: DialogueLine[] = [];
    const beats = sceneScript?.dialogue || [];
    if (beats.length === 0) {
      // No dialogue text — still emit a placeholder line for timing coverage
      lines.push({
        character: scene.characters[0] || 'Hero',
        text: '[placeholder dialogue]',
        startFrame: scene.startFrame ?? 0,
        endFrame: scene.endFrame ?? (scene.startFrame ?? 0) + scene.durationFrames,
        audioFile: undefined
      });
      return lines;
    }

    const beatCount = beats.length;
    const chunk = Math.floor(scene.durationFrames / beatCount);

    for (let i = 0; i < beatCount; i++) {
      const beat = beats[i];
      const startFrame = scene.startFrame + i * chunk;
      const endFrame = Math.min(scene.startFrame + (i + 1) * chunk, scene.endFrame ?? scene.startFrame + scene.durationFrames);
      lines.push({
        character: beat.speaker || scene.characters[i % scene.characters.length] || 'Hero',
        text: beat.text || '[placeholder dialogue]',
        startFrame,
        endFrame,
        audioFile: beat.audioFile
      });
    }
    return lines;
  }

  private generatePhonemes(dialogue: DialogueLine): PhonemeKeyframe[] {
    const phonemes: PhonemeKeyframe[] = [];
    const { startFrame, endFrame, character, text } = dialogue;
    const duration = endFrame - startFrame;
    const words = text.split(/\s+/).filter(Boolean);

    // Opening rest
    phonemes.push({ frame: startFrame, shape: 'X', character });

    if (words.length === 0 || text.startsWith('[placeholder')) {
      // No real dialogue — hold rest
      phonemes.push({ frame: endFrame, shape: 'X', character });
      return phonemes;
    }

    let frame = startFrame + 2;
    for (const word of words) {
      const syllables = Math.max(1, Math.ceil(word.length / 2.5));
      for (let s = 0; s < syllables; s++) {
        const char = word[Math.floor((s / syllables) * word.length)] || 'a';
        const shape = this.shapeForChar(char);
        phonemes.push({ frame: Math.min(frame, endFrame - 1), shape, character });
        frame += Math.max(2, Math.round(duration / (words.length * syllables)));
      }
      // Rest between words
      phonemes.push({ frame: Math.min(frame, endFrame - 1), shape: 'X', character });
      frame += 2;
    }

    // Closing rest
    phonemes.push({ frame: endFrame, shape: 'X', character });
    return phonemes;
  }

  private shapeForChar(char: string): PhonemeKeyframe['shape'] {
    const lower = char.toLowerCase();
    if ('pbm'.includes(lower)) return 'B';
    if ('fv'.includes(lower)) return 'F';
    if ('ln'.includes(lower)) return 'G';
    if ('ae'.includes(lower)) return 'A';
    if ('ou'.includes(lower)) return 'E';
    if ('i'.includes(lower)) return 'C';
    if ('r'.includes(lower)) return 'D';
    return 'A';
  }
}
