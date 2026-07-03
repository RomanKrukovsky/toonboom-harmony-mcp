import fs from 'fs';
import path from 'path';
import { config } from '../../config.js';

export interface ImageGenerationResult {
  status: 'success' | 'error' | 'placeholder';
  origin: 'real' | 'placeholder';
  outputPath?: string;
  prompt: string;
  error?: string;
}

/**
 * Generate a character turnaround drawing for a single view.
 * Honors HARMONY_BACKEND_IMAGE / OPENAI_API_KEY feature flags.
 * Falls back to a transparent placeholder PNG when no backend is enabled.
 */
export async function generateCharacterTurnaround(
  characterName: string,
  view: string,
  style: string,
  outputPath?: string
): Promise<ImageGenerationResult> {
  const prompt = `A ${view} view turnaround drawing of "${characterName}". ${style}. Clean line art, white background, animation-ready.`;
  return generateImage(prompt, outputPath, `character_${view}`);
}

/**
 * Generate a background illustration for a location.
 */
export async function generateBackground(
  location: string,
  style: string,
  outputPath?: string
): Promise<ImageGenerationResult> {
  const prompt = `Background illustration of "${location}". ${style}. Flat color, layered, animation production art.`;
  return generateImage(prompt, outputPath, 'background');
}

async function generateImage(
  prompt: string,
  outputPath: string | undefined,
  kind: string
): Promise<ImageGenerationResult> {
  const backend = config.backends.image;

  if (backend === 'none' || backend === 'mock') {
    return writePlaceholder(prompt, outputPath, kind);
  }

  if (backend === 'openai') {
    const key = config.backends.apiKeys.openai;
    if (!key) {
      return { status: 'error', origin: 'placeholder', prompt, error: 'OpenAI API key not configured (OPENAI_API_KEY)' };
    }

    try {
      const fetch = (globalThis as any).fetch;
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, n: 1, size: '1024x1024', response_format: 'b64_json' })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenAI error ${res.status}: ${text}`);
      }

      const data = await res.json();
      const b64: string | undefined = data.data?.[0]?.b64_json;
      if (!b64) throw new Error('No image data returned');

      const finalPath = outputPath || path.join(process.cwd(), 'output', `gen_image_${kind}_${Date.now()}.png`);
      const dir = path.dirname(finalPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(finalPath, Buffer.from(b64, 'base64'));

      return { status: 'success', origin: 'real', outputPath: finalPath, prompt };
    } catch (e: any) {
      return { status: 'error', origin: 'placeholder', prompt, error: e.message };
    }
  }

  return writePlaceholder(prompt, outputPath, kind);
}

function writePlaceholder(
  prompt: string,
  outputPath: string | undefined,
  kind: string
): ImageGenerationResult {
  const finalPath = outputPath || path.join(process.cwd(), 'output', `placeholder_image_${kind}_${Date.now()}.png`);
  const dir = path.dirname(finalPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // 1x1 transparent PNG
  const transparentPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync(finalPath, transparentPng);

  return { status: 'success', origin: 'placeholder', outputPath: finalPath, prompt };
}
