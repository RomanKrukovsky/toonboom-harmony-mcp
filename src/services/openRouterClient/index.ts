import { config } from '../../config.js';
import { z } from 'zod';

export const openRouterRequestSchema = z.object({
  prompt: z.string().min(1),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().optional().default(0.7),
  maxTokens: z.number().optional().default(1000)
});

export const openRouterResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  content: z.string(),
  // Machine-readable degradation flags. Previously the only signal that no LLM
  // had run was a `:offline_fallback` suffix inside `model` plus a marker string
  // in `content` — easy for a caller to miss, and the copy claimed the prompt was
  // "processed deterministically" when nothing processed it at all.
  llmCallSucceeded: z.boolean().default(true),
  degradedReason: z.enum(['missing_api_key', 'http_error', 'network_error']).optional(),
  usage: z.object({
    promptTokens: z.number().default(0),
    completionTokens: z.number().default(0),
    totalTokens: z.number().default(0)
  }).optional()
});

export type OpenRouterRequest = z.input<typeof openRouterRequestSchema>;
export type OpenRouterResponse = z.infer<typeof openRouterResponseSchema>;

export class OpenRouterClient {
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly baseUrl: string = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(apiKey?: string, defaultModel?: string) {
    this.apiKey = apiKey !== undefined ? apiKey : (config.backends.apiKeys.openrouter || process.env.OPENROUTER_API_KEY || '');
    this.defaultModel = defaultModel || config.backends.openrouterModel || 'nvidia/nemotron-3-super:free';
  }

  /**
   * Sends a completion request to OpenRouter API (defaults to nvidia/nemotron-3-super:free).
   */
  public async complete(request: OpenRouterRequest): Promise<OpenRouterResponse> {
    const validated = openRouterRequestSchema.parse(request);
    const modelToUse = validated.model || this.defaultModel;

    const messages = [];
    if (validated.systemPrompt) {
      messages.push({ role: 'system', content: validated.systemPrompt });
    }
    messages.push({ role: 'user', content: validated.prompt });

    try {
      if (!this.apiKey) {
        return openRouterResponseSchema.parse({
          id: `offline-${Date.now()}`,
          model: `${modelToUse}:offline_fallback`,
          llmCallSucceeded: false,
          degradedReason: 'missing_api_key',
          content: `[OFFLINE FALLBACK MODE]: no OPENROUTER_API_KEY, so no model was called and no text was generated.\nInput prompt summary: ${validated.prompt.slice(0, 100)}...`,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        });
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/RomanKrukovsky/toonboom-harmony-mcp',
          'X-Title': 'Toon Boom Harmony MCP Engine',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelToUse,
          messages,
          temperature: validated.temperature,
          max_tokens: validated.maxTokens
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return openRouterResponseSchema.parse({
          id: `fallback-${Date.now()}`,
          model: `${modelToUse}:offline_fallback`,
          llmCallSucceeded: false,
          degradedReason: 'http_error',
          content: `[OFFLINE FALLBACK MODE]: OpenRouter returned HTTP ${response.status}; no text was generated.\nDetail: ${errText.slice(0, 200)}\nInput prompt: ${validated.prompt.slice(0, 100)}...`,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        });
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content || '';

      return openRouterResponseSchema.parse({
        id: data.id || `or-${Date.now()}`,
        model: data.model || modelToUse,
        content: content,
        llmCallSucceeded: true,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        }
      });
    } catch (error) {
      return openRouterResponseSchema.parse({
        id: `offline-err-${Date.now()}`,
        model: `${modelToUse}:offline_fallback`,
        llmCallSucceeded: false,
        degradedReason: 'network_error',
        content: `[OFFLINE FALLBACK MODE]: request failed (${error instanceof Error ? error.message : String(error)}); no text was generated.`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      });
    }
  }
}
