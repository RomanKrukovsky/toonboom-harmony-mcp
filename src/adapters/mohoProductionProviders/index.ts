import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI, { toFile } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import stringify from 'fast-json-stable-stringify';
import { z, type ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { verifyPathAccess } from '../../security.js';

export type ProductionProviderErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_AUTH_FAILED'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_INVALID_RESPONSE'
  | 'PROVIDER_REQUEST_FAILED';

export class ProductionProviderError extends Error {
  constructor(readonly code: ProductionProviderErrorCode, message: string) {
    super(message);
    this.name = 'ProductionProviderError';
  }
}

export interface StructuredProviderRequest<T> {
  system?: string;
  prompt: string;
  schemaName: string;
  schema: ZodType<T>;
}

export interface StructuredProviderResult<T> {
  data: T;
  provider: 'anthropic' | 'openai' | 'openrouter';
  model: string;
  callId: string;
  requestSha256: string;
  responseSha256: string;
}

function requireFreeOpenRouterModel(model: string, label: string, allowEmpty = false): void {
  if (allowEmpty && model.length === 0) return;
  if (!model.endsWith(':free')) {
    throw new ProductionProviderError('PROVIDER_REQUEST_FAILED', `${label} must use an OpenRouter :free model, received "${model}".`);
  }
}

interface OpenRouterChatResponse {
  id?: string;
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

interface OpenRouterImageResponse {
  data?: Array<{ b64_json?: string; media_type?: string }>;
  error?: { message?: string };
}

export class OpenRouterProductionProvider {
  readonly plannerModel: string;
  readonly visionModel: string;
  readonly imageModel: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  constructor(options: {
    apiKey?: string;
    plannerModel?: string;
    visionModel?: string;
    imageModel?: string;
    fetchImpl?: typeof fetch;
  } = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY ?? '';
    this.plannerModel = options.plannerModel
      ?? process.env.MOHO_OPENROUTER_PLANNER_MODEL
      ?? process.env.OPENROUTER_MODEL
      ?? 'nvidia/nemotron-3-super-120b-a12b:free';
    this.visionModel = options.visionModel
      ?? process.env.MOHO_OPENROUTER_VISION_MODEL
      ?? 'dots-studio/dots-3-note-preview:free';
    this.imageModel = options.imageModel ?? process.env.MOHO_OPENROUTER_IMAGE_MODEL ?? '';
    this.fetchImpl = options.fetchImpl ?? fetch;
    requireFreeOpenRouterModel(this.plannerModel, 'OpenRouter planner model');
    requireFreeOpenRouterModel(this.visionModel, 'OpenRouter vision model');
    requireFreeOpenRouterModel(this.imageModel, 'OpenRouter image model', true);
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/RomanKrukovsky/toonboom-harmony-mcp',
      'X-Title': 'Moho Production v3'
    };
  }

  private async structuredRequest<T>(
    model: string,
    request: StructuredProviderRequest<T>,
    messages: unknown[]
  ): Promise<StructuredProviderResult<T>> {
    if (!this.apiKey) {
      throw new ProductionProviderError('PROVIDER_UNAVAILABLE', 'OPENROUTER_API_KEY is required for production.');
    }
    const jsonSchema = zodToJsonSchema(request.schema, { target: 'jsonSchema7', $refStrategy: 'none' }) as Record<string, unknown>;
    const payload = {
      model,
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: { name: request.schemaName, strict: true, schema: jsonSchema }
      },
      provider: { require_parameters: true },
      temperature: 0.1
    };
    const requestSha256 = requestDigest(payload);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw new ProductionProviderError('PROVIDER_REQUEST_FAILED', error instanceof Error ? error.message : String(error));
    }
    const raw = await response.text();
    if (!response.ok) {
      const code: ProductionProviderErrorCode = response.status === 401 || response.status === 403
        ? 'PROVIDER_AUTH_FAILED'
        : response.status === 429 ? 'PROVIDER_RATE_LIMITED' : 'PROVIDER_REQUEST_FAILED';
      throw new ProductionProviderError(code, `OpenRouter HTTP ${response.status}: ${raw.slice(0, 500)}`);
    }
    let decoded: OpenRouterChatResponse;
    try {
      decoded = JSON.parse(raw) as OpenRouterChatResponse;
    } catch {
      throw new ProductionProviderError('PROVIDER_INVALID_RESPONSE', 'OpenRouter returned invalid JSON.');
    }
    const content = decoded.choices?.[0]?.message?.content;
    if (!content) throw new ProductionProviderError('PROVIDER_INVALID_RESPONSE', 'OpenRouter returned no structured content.');
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ProductionProviderError('PROVIDER_INVALID_RESPONSE', 'OpenRouter structured content is not JSON.');
    }
    let data: T;
    try {
      data = request.schema.parse(parsed);
    } catch (error) {
      throw new ProductionProviderError('PROVIDER_INVALID_RESPONSE', `OpenRouter output failed schema validation: ${error instanceof Error ? error.message : String(error)}`);
    }
    return {
      data,
      provider: 'openrouter',
      model: decoded.model ?? model,
      callId: decoded.id ?? `openrouter_${requestSha256.slice(0, 24)}`,
      requestSha256,
      responseSha256: requestDigest(data)
    };
  }

  async generateStructured<T>(request: StructuredProviderRequest<T>): Promise<StructuredProviderResult<T>> {
    const messages: unknown[] = [];
    if (request.system) messages.push({ role: 'system', content: request.system });
    messages.push({ role: 'user', content: request.prompt });
    return this.structuredRequest(this.plannerModel, request, messages);
  }

  async analyzeStructured<T>(request: Omit<StructuredProviderRequest<T>, 'system'> & {
    imagePaths: string[];
  }): Promise<StructuredProviderResult<T>> {
    const content: unknown[] = [{ type: 'text', text: request.prompt }];
    for (const imagePath of request.imagePaths) {
      const verifiedPath = verifyPathAccess(imagePath);
      const bytes = fs.readFileSync(verifiedPath);
      if (bytes.length === 0) throw new ProductionProviderError('PROVIDER_REQUEST_FAILED', `Artwork image is empty: ${imagePath}`);
      content.push({
        type: 'image_url',
        image_url: { url: `data:${mimeTypeForImage(verifiedPath)};base64,${bytes.toString('base64')}` }
      });
    }
    return this.structuredRequest(this.visionModel, request, [{ role: 'user', content }]);
  }

  async synthesizeTransparentPart(input: {
    sourceImagePath: string;
    outputPath: string;
    prompt: string;
  }): Promise<{
    outputPath: string;
    sha256: string;
    provider: 'openrouter';
    model: string;
    callId: string;
    requestSha256: string;
    responseSha256: string;
  }> {
    if (!this.apiKey) throw new ProductionProviderError('PROVIDER_UNAVAILABLE', 'OPENROUTER_API_KEY is required for production.');
    if (!this.imageModel) {
      throw new ProductionProviderError('PROVIDER_UNAVAILABLE', 'No free OpenRouter image-generation model is available. Set MOHO_OPENROUTER_IMAGE_MODEL only to a verified :free image model.');
    }
    const sourcePath = verifyPathAccess(input.sourceImagePath);
    const outputPath = verifyPathAccess(input.outputPath);
    const sourceBytes = fs.readFileSync(sourcePath);
    const payload = {
      model: this.imageModel,
      prompt: input.prompt,
      n: 1,
      quality: 'high',
      output_format: 'png',
      background: 'transparent',
      input_references: [{
        type: 'image_url',
        image_url: { url: `data:${mimeTypeForImage(sourcePath)};base64,${sourceBytes.toString('base64')}` }
      }]
    };
    const requestSha256 = requestDigest(payload);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/images`, {
        method: 'POST', headers: this.headers(), body: JSON.stringify(payload)
      });
    } catch (error) {
      throw new ProductionProviderError('PROVIDER_REQUEST_FAILED', error instanceof Error ? error.message : String(error));
    }
    const raw = await response.text();
    if (!response.ok) {
      const code: ProductionProviderErrorCode = response.status === 401 || response.status === 403
        ? 'PROVIDER_AUTH_FAILED'
        : response.status === 429 ? 'PROVIDER_RATE_LIMITED' : 'PROVIDER_REQUEST_FAILED';
      throw new ProductionProviderError(code, `OpenRouter image HTTP ${response.status}: ${raw.slice(0, 500)}`);
    }
    const decoded = JSON.parse(raw) as OpenRouterImageResponse;
    const encoded = decoded.data?.[0]?.b64_json;
    if (!encoded) throw new ProductionProviderError('PROVIDER_INVALID_RESPONSE', 'OpenRouter image API returned no image bytes.');
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length === 0) throw new ProductionProviderError('PROVIDER_INVALID_RESPONSE', 'OpenRouter image API returned an empty image.');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, bytes);
    const responseSha256 = sha256(bytes);
    return {
      outputPath,
      sha256: responseSha256,
      provider: 'openrouter',
      model: this.imageModel,
      callId: `openrouter_image_${responseSha256.slice(0, 24)}`,
      requestSha256,
      responseSha256
    };
  }
}

type AnthropicClient = Pick<Anthropic, 'messages'>;
type OpenAiClient = Pick<OpenAI, 'responses' | 'images'>;

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function requestDigest(value: unknown): string {
  return sha256(stringify(value) ?? 'null');
}

function mimeTypeForImage(filePath: string): 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' {
  switch (path.extname(filePath).toLowerCase()) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    default: throw new ProductionProviderError('PROVIDER_REQUEST_FAILED', `Unsupported vision image format: ${filePath}`);
  }
}

export class AnthropicProductionProvider {
  readonly model: string;
  private readonly client: AnthropicClient | null;

  constructor(options: { apiKey?: string; model?: string; client?: AnthropicClient } = {}) {
    const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '';
    this.model = options.model ?? process.env.MOHO_CLAUDE_MODEL ?? 'claude-opus-4-7';
    this.client = options.client ?? (apiKey ? new Anthropic({ apiKey }) : null);
  }

  async generateStructured<T>(request: StructuredProviderRequest<T>): Promise<StructuredProviderResult<T>> {
    if (!this.client) {
      throw new ProductionProviderError('PROVIDER_UNAVAILABLE', 'ANTHROPIC_API_KEY is required for production planning.');
    }
    const requestSha256 = requestDigest({
      model: this.model,
      system: request.system,
      prompt: request.prompt,
      schemaName: request.schemaName
    });
    try {
      const jsonSchema = zodToJsonSchema(request.schema, {
        target: 'jsonSchema7',
        $refStrategy: 'none'
      }) as Record<string, unknown>;
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 16_000,
        cache_control: { type: 'ephemeral' },
        thinking: { type: 'adaptive' },
        output_config: {
          effort: 'high',
          format: { type: 'json_schema', schema: jsonSchema }
        },
        ...(request.system ? { system: request.system } : {}),
        messages: [{ role: 'user', content: request.prompt }]
      });
      const text = response.content
        .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('');
      if (!text) {
        throw new ProductionProviderError('PROVIDER_INVALID_RESPONSE', 'Claude returned no structured text output.');
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new ProductionProviderError('PROVIDER_INVALID_RESPONSE', 'Claude returned invalid JSON.');
      }
      const data = request.schema.parse(parsed);
      return {
        data,
        provider: 'anthropic',
        model: this.model,
        callId: response.id,
        requestSha256,
        responseSha256: requestDigest(data)
      };
    } catch (error) {
      if (error instanceof ProductionProviderError) throw error;
      if (error instanceof Anthropic.AuthenticationError) {
        throw new ProductionProviderError('PROVIDER_AUTH_FAILED', 'Anthropic rejected the configured API key.');
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new ProductionProviderError('PROVIDER_RATE_LIMITED', 'Anthropic rate limit exceeded.');
      }
      if (error instanceof z.ZodError) {
        throw new ProductionProviderError('PROVIDER_INVALID_RESPONSE', `Claude output failed schema validation: ${error.message}`);
      }
      if (error instanceof Anthropic.APIError) {
        throw new ProductionProviderError('PROVIDER_REQUEST_FAILED', `Anthropic API error ${error.status}: ${error.message}`);
      }
      throw new ProductionProviderError('PROVIDER_REQUEST_FAILED', error instanceof Error ? error.message : String(error));
    }
  }
}

export class OpenAiArtworkProvider {
  readonly visionModel: string;
  readonly imageModel: string;
  private readonly client: OpenAiClient | null;

  constructor(options: {
    apiKey?: string;
    visionModel?: string;
    imageModel?: string;
    client?: OpenAiClient;
  } = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.visionModel = options.visionModel ?? process.env.MOHO_OPENAI_VISION_MODEL ?? 'gpt-5.6';
    this.imageModel = options.imageModel ?? process.env.MOHO_OPENAI_IMAGE_MODEL ?? 'gpt-image-2';
    this.client = options.client ?? (apiKey ? new OpenAI({ apiKey }) : null);
  }

  async analyzeStructured<T>(request: Omit<StructuredProviderRequest<T>, 'system'> & {
    imagePaths: string[];
  }): Promise<StructuredProviderResult<T>> {
    if (!this.client) {
      throw new ProductionProviderError('PROVIDER_UNAVAILABLE', 'OPENAI_API_KEY is required for production artwork analysis.');
    }
    const imageContent = request.imagePaths.map(imagePath => {
      const verifiedPath = verifyPathAccess(imagePath);
      const mimeType = mimeTypeForImage(verifiedPath);
      const bytes = fs.readFileSync(verifiedPath);
      if (bytes.length === 0) throw new ProductionProviderError('PROVIDER_REQUEST_FAILED', `Artwork image is empty: ${imagePath}`);
      return {
        type: 'input_image' as const,
        detail: 'original' as const,
        image_url: `data:${mimeType};base64,${bytes.toString('base64')}`
      };
    });
    const requestSha256 = requestDigest({
      model: this.visionModel,
      prompt: request.prompt,
      images: request.imagePaths.map(imagePath => sha256(fs.readFileSync(verifyPathAccess(imagePath))))
    });
    try {
      const response = await this.client.responses.parse({
        model: this.visionModel,
        store: false,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: request.prompt },
            ...imageContent
          ]
        }],
        text: { format: zodTextFormat(request.schema, request.schemaName) }
      });
      if (response.output_parsed === null || response.output_parsed === undefined) {
        throw new ProductionProviderError('PROVIDER_INVALID_RESPONSE', 'OpenAI returned no parsed artwork analysis.');
      }
      const data = request.schema.parse(response.output_parsed);
      return {
        data,
        provider: 'openai',
        model: this.visionModel,
        callId: response.id,
        requestSha256,
        responseSha256: requestDigest(data)
      };
    } catch (error) {
      if (error instanceof ProductionProviderError) throw error;
      if (error instanceof OpenAI.AuthenticationError) {
        throw new ProductionProviderError('PROVIDER_AUTH_FAILED', 'OpenAI rejected the configured API key.');
      }
      if (error instanceof OpenAI.RateLimitError) {
        throw new ProductionProviderError('PROVIDER_RATE_LIMITED', 'OpenAI rate limit exceeded.');
      }
      if (error instanceof z.ZodError) {
        throw new ProductionProviderError('PROVIDER_INVALID_RESPONSE', `OpenAI output failed schema validation: ${error.message}`);
      }
      if (error instanceof OpenAI.APIError) {
        throw new ProductionProviderError('PROVIDER_REQUEST_FAILED', `OpenAI API error ${error.status}: ${error.message}`);
      }
      throw new ProductionProviderError('PROVIDER_REQUEST_FAILED', error instanceof Error ? error.message : String(error));
    }
  }

  async synthesizeTransparentPart(input: {
    sourceImagePath: string;
    outputPath: string;
    prompt: string;
  }): Promise<{
    outputPath: string;
    sha256: string;
    provider: 'openai';
    model: string;
    callId: string;
    requestSha256: string;
    responseSha256: string;
  }> {
    if (!this.client) {
      throw new ProductionProviderError('PROVIDER_UNAVAILABLE', 'OPENAI_API_KEY is required for production artwork synthesis.');
    }
    const sourcePath = verifyPathAccess(input.sourceImagePath);
    const outputPath = verifyPathAccess(input.outputPath);
    const sourceBytes = fs.readFileSync(sourcePath);
    if (sourceBytes.length === 0) throw new ProductionProviderError('PROVIDER_REQUEST_FAILED', `Source artwork is empty: ${sourcePath}`);
    try {
      const requestSha256 = requestDigest({
        model: this.imageModel,
        sourceSha256: sha256(sourceBytes),
        prompt: input.prompt,
        background: 'transparent',
        inputFidelity: 'high',
        quality: 'high'
      });
      const upload = await toFile(sourceBytes, path.basename(sourcePath), { type: mimeTypeForImage(sourcePath) });
      const response = await this.client.images.edit({
        model: this.imageModel,
        image: upload,
        prompt: input.prompt,
        background: 'transparent',
        output_format: 'png',
        input_fidelity: 'high',
        quality: 'high',
        n: 1
      });
      const encoded = response.data?.[0]?.b64_json;
      if (!encoded) {
        throw new ProductionProviderError('PROVIDER_INVALID_RESPONSE', 'OpenAI image edit returned no image bytes.');
      }
      const bytes = Buffer.from(encoded, 'base64');
      if (bytes.length === 0) {
        throw new ProductionProviderError('PROVIDER_INVALID_RESPONSE', 'OpenAI image edit returned an empty image.');
      }
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, bytes);
      const responseSha256 = sha256(bytes);
      return {
        outputPath,
        sha256: responseSha256,
        provider: 'openai',
        model: this.imageModel,
        callId: `image_edit_${responseSha256.slice(0, 24)}`,
        requestSha256,
        responseSha256
      };
    } catch (error) {
      if (error instanceof ProductionProviderError) throw error;
      if (error instanceof OpenAI.AuthenticationError) {
        throw new ProductionProviderError('PROVIDER_AUTH_FAILED', 'OpenAI rejected the configured API key.');
      }
      if (error instanceof OpenAI.RateLimitError) {
        throw new ProductionProviderError('PROVIDER_RATE_LIMITED', 'OpenAI rate limit exceeded.');
      }
      if (error instanceof OpenAI.APIError) {
        throw new ProductionProviderError('PROVIDER_REQUEST_FAILED', `OpenAI image API error ${error.status}: ${error.message}`);
      }
      throw new ProductionProviderError('PROVIDER_REQUEST_FAILED', error instanceof Error ? error.message : String(error));
    }
  }
}
