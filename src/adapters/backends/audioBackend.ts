import fs from 'fs';
import path from 'path';
import { config } from '../../config.js';

export interface AudioGenerationResult {
  status: 'success' | 'error' | 'placeholder';
  origin: 'real' | 'placeholder';
  outputPath?: string;
  text: string;
  error?: string;
}

/**
 * Synthesize spoken dialogue audio.
 * Honors HARMONY_BACKEND_AUDIO / OPENAI_API_KEY feature flags.
 * Falls back to a silent marker file when no backend is enabled.
 */
export async function synthesizeDialogue(
  text: string,
  voice: string = 'alloy',
  outputPath?: string
): Promise<AudioGenerationResult> {
  const backend = config.backends.audio;

  if (backend === 'none' || backend === 'mock') {
    return writePlaceholderAudio(text, outputPath);
  }

  if (backend === 'openai') {
    const key = config.backends.apiKeys.openai;
    if (!key) {
      return { status: 'error', origin: 'placeholder', text, error: 'OpenAI API key not configured (OPENAI_API_KEY)' };
    }

    try {
      const fetch = (globalThis as any).fetch;
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: 'tts-1', input: text, voice })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI TTS error ${res.status}: ${errText}`);
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      const finalPath = outputPath || path.join(process.cwd(), 'output', `gen_audio_${Date.now()}.mp3`);
      const dir = path.dirname(finalPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(finalPath, buffer);

      return { status: 'success', origin: 'real', outputPath: finalPath, text };
    } catch (e: any) {
      return { status: 'error', origin: 'placeholder', text, error: e.message };
    }
  }

  return writePlaceholderAudio(text, outputPath);
}

export interface PhonemeTiming {
  startFrame: number;
  endFrame: number;
  mouthShape: 'A' | 'E' | 'I' | 'O' | 'U' | 'M' | 'F' | 'L' | 'S' | 'rest';
}

/**
 * Generate automatic lip-sync mouth shape exposures for dialogue.
 */
export function generatePhonemeTimings(text: string, fps: number = 24): PhonemeTiming[] {
  const words = text.trim().split(/\s+/);
  const result: PhonemeTiming[] = [];
  let currentFrame = 1;
  const shapes: Array<'A'|'E'|'I'|'O'|'U'|'M'|'F'|'L'|'S'> = ['A','E','I','O','U','M','F','L','S'];

  for (const word of words) {
    const wordDurationFrames = Math.max(3, Math.round((word.length * 0.08) * fps));
    const subFrames = Math.max(1, Math.floor(wordDurationFrames / Math.min(word.length, 4)));

    for (let i = 0; i < word.length; i++) {
      const char = word[i].toUpperCase();
      let shape: 'A'|'E'|'I'|'O'|'U'|'M'|'F'|'L'|'S'|'rest' = 'rest';

      if (['A','E','I','O','U'].includes(char)) shape = char as any;
      else if (['M','B','P'].includes(char)) shape = 'M';
      else if (['F','V'].includes(char)) shape = 'F';
      else if (['L','R','N'].includes(char)) shape = 'L';
      else if (['S','Z','T','D','C','K'].includes(char)) shape = 'S';
      else shape = shapes[i % shapes.length];

      result.push({
        startFrame: currentFrame,
        endFrame: currentFrame + subFrames - 1,
        mouthShape: shape
      });
      currentFrame += subFrames;
    }

    // Short rest between words
    result.push({
      startFrame: currentFrame,
      endFrame: currentFrame + 1,
      mouthShape: 'rest'
    });
    currentFrame += 2;
  }

  return result;
}

function writePlaceholderAudio(text: string, outputPath: string | undefined): AudioGenerationResult {
  const finalPath = outputPath || path.join(process.cwd(), 'output', `placeholder_audio_${Date.now()}.wav`);
  const dir = path.dirname(finalPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Minimal valid WAV header for a silent 1-second mono 16-bit 44100Hz file
  const sampleRate = 44100;
  const durationSeconds = 1;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  fs.writeFileSync(finalPath, buffer);

  return { status: 'success', origin: 'placeholder', outputPath: finalPath, text };
}
