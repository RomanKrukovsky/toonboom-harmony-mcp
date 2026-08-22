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

/**
 * Poll ComfyUI history for a finished job and download the produced image.
 *
 * ComfyUI's /prompt endpoint is fire-and-forget: it returns a prompt_id and the
 * job runs asynchronously. Claiming success at that point (as this module used
 * to) reports an image that does not exist on disk.
 */
async function waitAndDownloadComfyOutput(
  comfyHost: string,
  promptId: string,
  destination: string,
  timeoutMs = 120_000,
  pollIntervalMs = 1_000
): Promise<boolean> {
  const fetch = (globalThis as any).fetch;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const historyRes = await fetch(`${comfyHost}/history/${promptId}`).catch(() => null);
    if (historyRes?.ok) {
      const history = await historyRes.json().catch(() => null);
      const entry = history?.[promptId];
      const outputs = entry?.outputs ?? {};
      for (const nodeOutput of Object.values<any>(outputs)) {
        const image = nodeOutput?.images?.[0];
        if (!image?.filename) continue;

        const params = new URLSearchParams({
          filename: image.filename,
          subfolder: image.subfolder ?? '',
          type: image.type ?? 'output'
        });
        const fileRes = await fetch(`${comfyHost}/view?${params.toString()}`).catch(() => null);
        if (!fileRes?.ok) continue;

        const buffer = Buffer.from(await fileRes.arrayBuffer());
        if (buffer.length === 0) continue;

        const dir = path.dirname(destination);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(destination, buffer);
        return true;
      }
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  return false;
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

  if (backend === 'comfyui' as any) {
    try {
      const comfyHost = process.env.COMFYUI_HOST || 'http://127.0.0.1:8188';
      const fetch = (globalThis as any).fetch;
      const promptRes = await fetch(`${comfyHost}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: {
            "3": {
              "inputs": {
                "seed": Math.floor(Math.random() * 1000000),
                "steps": 20,
                "cfg": 8,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 1,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0]
              },
              "class_type": "KSampler"
            },
            "4": { "inputs": { "ckpt_name": "v1-5-pruned-emaonly.ckpt" }, "class_type": "CheckpointLoaderSimple" },
            "5": { "inputs": { "width": 512, "height": 512, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
            "6": { "inputs": { "text": prompt, "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
            "7": { "inputs": { "text": "blurry, low quality, noise", "clip": ["4", 1] }, "class_type": "CLIPTextEncode" }
          }
        })
      });
      if (promptRes.ok) {
        const data = await promptRes.json();
        const promptId = data?.prompt_id;
        if (!promptId) {
          throw new Error('ComfyUI accepted the request but returned no prompt_id.');
        }

        // /prompt only ENQUEUES the job. The previous code returned
        // `origin: 'real'` plus a synthesised path right here, so callers were
        // handed a filename for an image that was never generated or downloaded.
        const finalPath = outputPath
          || path.join(process.cwd(), 'output', `comfy_${kind}_${Date.now()}.png`);
        const downloaded = await waitAndDownloadComfyOutput(comfyHost, promptId, finalPath);
        if (downloaded) {
          return { status: 'success', origin: 'real', outputPath: finalPath, prompt };
        }
        throw new Error(
          `ComfyUI job ${promptId} did not produce a downloadable image within the timeout.`
        );
      }
    } catch (e: any) {
      console.warn("ComfyUI fetch warning:", e.message);
    }
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

/**
 * Raster → SVG vectorization via the reconstruction-core service.
 *
 * Removed the previous "dynamic contour approximation" fallback: it never read a
 * single pixel. It summed the char codes of the *file name*, derived an ellipse
 * centre from `hash % 100` and radii from the file size, then labelled the output
 * "Vectorized contour dynamically derived from <name>". Any caller would have
 * treated that as a real trace of the artwork.
 *
 * Vectorization needs actual image decoding (OpenCV lives in the Python service),
 * so when the service is unreachable this throws instead of inventing geometry.
 */
export async function vectorizeImageToSVG(imagePath: string, svgOutputPath?: string): Promise<string> {
  const targetPath = svgOutputPath || imagePath.replace(/\.[^/.]+$/, "") + ".svg";
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const reconPort = process.env.RECONSTRUCTION_PORT || '8765';
  let response: any;
  try {
    const fetch = (globalThis as any).fetch;
    response = await fetch(`http://127.0.0.1:${reconPort}/vectorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagePath })
    });
  } catch (err: any) {
    throw new Error(
      `[SERVICE_UNAVAILABLE] Vectorization requires reconstruction-core on ` +
      `127.0.0.1:${reconPort} (start it with \`npm run reconstruction:core\`). ` +
      `Cause: ${err?.message ?? err}`
    );
  }

  if (!response?.ok) {
    throw new Error(
      `[SERVICE_ERROR] reconstruction-core rejected the vectorize request ` +
      `(HTTP ${response?.status ?? 'unknown'}).`
    );
  }

  const data = await response.json();
  if (!data?.svgContent) {
    throw new Error('[INVALID_RESPONSE] reconstruction-core returned no svgContent.');
  }

  fs.writeFileSync(targetPath, data.svgContent, 'utf-8');
  return targetPath;
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
