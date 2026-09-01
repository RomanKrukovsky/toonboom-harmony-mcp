import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  AnthropicProductionProvider,
  OpenAiArtworkProvider,
  OpenRouterProductionProvider,
  ProductionProviderError
} from '../src/adapters/mohoProductionProviders/index.js';

describe('Moho Production v3 cloud adapters', () => {
  it('uses Claude structured output, adaptive thinking, and prompt caching', async () => {
    const requests: any[] = [];
    const client = {
      messages: {
        create: async (request: any) => {
          requests.push(request);
          return { id: 'msg-1', content: [{ type: 'text', text: '{"answer":"ok"}' }] };
        }
      }
    };
    const provider = new AnthropicProductionProvider({ apiKey: 'test-key', client: client as any });
    const result = await provider.generateStructured({
      system: 'Stable production planner instructions.',
      prompt: 'Plan this rig.',
      schemaName: 'test_answer',
      schema: z.object({ answer: z.string() }).strict()
    });

    expect(result.data).toEqual({ answer: 'ok' });
    expect(requests[0]).toMatchObject({
      model: 'claude-opus-4-7',
      thinking: { type: 'adaptive' },
      cache_control: { type: 'ephemeral' },
      output_config: { effort: 'high', format: { type: 'json_schema' } }
    });
  });

  it('sends local images through the OpenAI Responses API and validates structured output', async () => {
    const root = fs.mkdtempSync(path.join(process.cwd(), 'output', 'v3-openai-'));
    const imagePath = path.join(root, 'hero.png');
    fs.writeFileSync(imagePath, 'png-bytes');
    const requests: any[] = [];
    const client = {
      responses: {
        parse: async (request: any) => {
          requests.push(request);
          return { id: 'resp-1', output_parsed: { confidence: 0.91 } };
        }
      },
      images: { edit: jest.fn() }
    };
    const provider = new OpenAiArtworkProvider({ apiKey: 'test-key', client: client as any });
    const result = await provider.analyzeStructured({
      prompt: 'Analyze separable body parts.',
      imagePaths: [imagePath],
      schemaName: 'artwork_analysis',
      schema: z.object({ confidence: z.number().min(0).max(1) }).strict()
    });

    expect(result.data.confidence).toBe(0.91);
    expect(requests[0].model).toBe('gpt-5.6');
    expect(requests[0].input[0].content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'input_image', image_url: expect.stringMatching(/^data:image\/png;base64,/) })
    ]));
  });

  it('writes generated transparent artwork only when the image API returns real bytes', async () => {
    const root = fs.mkdtempSync(path.join(process.cwd(), 'output', 'v3-image-edit-'));
    const sourcePath = path.join(root, 'source.png');
    const outputPath = path.join(root, 'generated.png');
    fs.writeFileSync(sourcePath, 'source-bytes');
    const pngBytes = Buffer.from('generated-png-bytes');
    const client = {
      responses: { parse: jest.fn() },
      images: {
        edit: async () => ({ data: [{ b64_json: pngBytes.toString('base64') }] })
      }
    };
    const provider = new OpenAiArtworkProvider({ apiKey: 'test-key', client: client as any });
    const result = await provider.synthesizeTransparentPart({
      sourceImagePath: sourcePath,
      outputPath,
      prompt: 'Reconstruct the complete left forearm, preserving the source style.'
    });

    expect(fs.readFileSync(outputPath)).toEqual(pngBytes);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('never falls back to mock output when provider credentials are absent', async () => {
    const provider = new AnthropicProductionProvider({ apiKey: '' });
    await expect(provider.generateStructured({
      system: 'Planner.',
      prompt: 'Plan.',
      schemaName: 'answer',
      schema: z.object({ answer: z.string() })
    })).rejects.toBeInstanceOf(ProductionProviderError);
  });

  it('uses only free OpenRouter models for structured planning and vision', async () => {
    const root = fs.mkdtempSync(path.join(process.cwd(), 'output', 'v3-openrouter-production-'));
    const imagePath = path.join(root, 'hero.png');
    fs.writeFileSync(imagePath, 'png-bytes');
    const requests: Array<{ url: string; body: any }> = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      requests.push({ url, body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({
        id: `call-${requests.length}`,
        model: requests.length === 1 ? 'nvidia/nemotron-3-super-120b-a12b:free' : 'dots-studio/dots-3-note-preview:free',
        choices: [{ message: { content: '{"answer":"ok"}' } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    const provider = new OpenRouterProductionProvider({ apiKey: 'test-key', fetchImpl: fetchImpl as typeof fetch });
    const schema = z.object({ answer: z.string() }).strict();

    await provider.generateStructured({ prompt: 'Plan.', schemaName: 'answer', schema });
    await provider.analyzeStructured({ prompt: 'Inspect.', imagePaths: [imagePath], schemaName: 'answer', schema });

    expect(requests[0].body.model).toMatch(/:free$/);
    expect(requests[0].body.response_format).toMatchObject({ type: 'json_schema' });
    expect(requests[0].body.provider).toEqual({ require_parameters: true });
    expect(requests[1].body.model).toMatch(/:free$/);
    expect(requests[1].body.messages[0].content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'image_url', image_url: { url: expect.stringMatching(/^data:image\/png;base64,/) } })
    ]));
  });

  it('refuses paid OpenRouter models and unavailable free image generation', async () => {
    expect(() => new OpenRouterProductionProvider({ apiKey: 'test', plannerModel: 'anthropic/claude-opus-4.1' })).toThrow(/:free/);
    const provider = new OpenRouterProductionProvider({ apiKey: 'test', imageModel: '' });
    await expect(provider.synthesizeTransparentPart({
      sourceImagePath: path.join(process.cwd(), 'package.json'),
      outputPath: path.join(process.cwd(), 'output', 'should-not-exist.png'),
      prompt: 'isolate'
    })).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  });
});
