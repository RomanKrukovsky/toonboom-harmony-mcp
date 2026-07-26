import { OpenRouterClient } from '../src/services/openRouterClient/index.js';

describe('OpenRouter Nemotron Integration', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should format request correctly to OpenRouter with nvidia/nemotron-3-super:free', async () => {
    const mockResponse = {
      id: 'gen-or-12345',
      model: 'nvidia/nemotron-3-super:free',
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Hello! I am Nemotron 3 Super.'
          }
        }
      ],
      usage: {
        prompt_tokens: 15,
        completion_tokens: 10,
        total_tokens: 25
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const client = new OpenRouterClient('sk-or-v1-testkey', 'nvidia/nemotron-3-super:free');
    const result = await client.complete({
      prompt: 'Write a quick scene description',
      systemPrompt: 'You are an animation scriptwriter.'
    });

    expect(global.fetch).toHaveBeenCalledWith('https://openrouter.ai/api/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Authorization': 'Bearer sk-or-v1-testkey'
      }),
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-super:free',
        messages: [
          { role: 'system', content: 'You are an animation scriptwriter.' },
          { role: 'user', content: 'Write a quick scene description' }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    }));

    expect(result.id).toBe('gen-or-12345');
    expect(result.model).toBe('nvidia/nemotron-3-super:free');
    expect(result.content).toBe('Hello! I am Nemotron 3 Super.');
  });
});
