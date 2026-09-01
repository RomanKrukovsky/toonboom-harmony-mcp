import {
  AnthropicProductionProvider,
  OpenAiArtworkProvider,
  OpenRouterProductionProvider
} from '../src/adapters/mohoProductionProviders/index.js';
import { createMohoProductionProvidersFromEnv } from '../src/adapters/mohoProductionProviders/factory.js';

describe('Moho Production v3 provider factory', () => {
  it('routes OpenRouter planning and OpenAI artwork explicitly', () => {
    const providers = createMohoProductionProvidersFromEnv({
      MOHO_PLANNER_PROVIDER: 'openrouter',
      MOHO_ARTWORK_PROVIDER: 'openai',
      MOHO_MAX_IMAGE_CALLS_PER_SHOT: '24',
      OPENROUTER_API_KEY: 'openrouter-test',
      OPENAI_API_KEY: 'openai-test'
    });

    expect(providers.planner).toBeInstanceOf(OpenRouterProductionProvider);
    expect(providers.artworkProvider).toBeInstanceOf(OpenAiArtworkProvider);
    expect(providers.maxImageCallsPerShot).toBe(24);
  });

  it('routes Anthropic planning and free-only OpenRouter artwork', () => {
    const providers = createMohoProductionProvidersFromEnv({
      MOHO_PLANNER_PROVIDER: 'anthropic',
      MOHO_ARTWORK_PROVIDER: 'openrouter',
      MOHO_MAX_IMAGE_CALLS_PER_SHOT: '12',
      ANTHROPIC_API_KEY: 'anthropic-test',
      OPENROUTER_API_KEY: 'openrouter-test',
      MOHO_OPENROUTER_IMAGE_MODEL: 'example/image-model:free'
    });

    expect(providers.planner).toBeInstanceOf(AnthropicProductionProvider);
    expect(providers.artworkProvider).toBeInstanceOf(OpenRouterProductionProvider);
    expect(providers.maxImageCallsPerShot).toBe(12);
  });

  it('fails before construction when credentials or image-call budget are missing', () => {
    expect(() => createMohoProductionProvidersFromEnv({
      MOHO_PLANNER_PROVIDER: 'openrouter',
      MOHO_ARTWORK_PROVIDER: 'openai',
      MOHO_MAX_IMAGE_CALLS_PER_SHOT: '24',
      OPENROUTER_API_KEY: 'openrouter-test'
    })).toThrow(/OPENAI_API_KEY/);

    expect(() => createMohoProductionProvidersFromEnv({
      MOHO_PLANNER_PROVIDER: 'openrouter',
      MOHO_ARTWORK_PROVIDER: 'openrouter',
      OPENROUTER_API_KEY: 'openrouter-test'
    })).toThrow(/MOHO_MAX_IMAGE_CALLS_PER_SHOT/);
  });

  it('rejects unknown providers and non-positive budgets', () => {
    expect(() => createMohoProductionProvidersFromEnv({
      MOHO_PLANNER_PROVIDER: 'other',
      MOHO_ARTWORK_PROVIDER: 'openrouter',
      MOHO_MAX_IMAGE_CALLS_PER_SHOT: '24',
      OPENROUTER_API_KEY: 'openrouter-test'
    })).toThrow(/MOHO_PLANNER_PROVIDER/);

    expect(() => createMohoProductionProvidersFromEnv({
      MOHO_PLANNER_PROVIDER: 'openrouter',
      MOHO_ARTWORK_PROVIDER: 'openrouter',
      MOHO_MAX_IMAGE_CALLS_PER_SHOT: '0',
      OPENROUTER_API_KEY: 'openrouter-test'
    })).toThrow(/MOHO_MAX_IMAGE_CALLS_PER_SHOT/);
  });
});
