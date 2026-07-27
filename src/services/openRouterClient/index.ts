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
          content: `[OFFLINE FALLBACK MODE]: Prompt processed deterministically without network call.\nInput prompt summary: ${validated.prompt.slice(0, 100)}...`,
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
          content: `[OFFLINE FALLBACK MODE]: OpenRouter HTTP ${response.status}. Processed deterministically.\nInput prompt: ${validated.prompt.slice(0, 100)}...`,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        });
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content || '';

      return openRouterResponseSchema.parse({
        id: data.id || `or-${Date.now()}`,
        model: data.model || modelToUse,
        content: content,
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
        content: `[OFFLINE FALLBACK MODE]: ${error instanceof Error ? error.message : String(error)}. Processed deterministically.`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      });
    }
  }
}
