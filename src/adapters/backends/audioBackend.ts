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
