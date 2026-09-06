import {
  AnthropicProductionProvider,
  OpenAiArtworkProvider,
  OpenRouterProductionProvider,
  ProductionProviderError
} from './index.js';
import type {
  ArtworkProvider,
  PlannerProvider
} from '../../services/mohoProductionV3StageExecutor/index.js';

export interface MohoProductionProviderEnvironment {
  MOHO_PLANNER_PROVIDER?: string;
  MOHO_ARTWORK_PROVIDER?: string;
  MOHO_MAX_IMAGE_CALLS_PER_SHOT?: string;
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  MOHO_OPENROUTER_PLANNER_MODEL?: string;
  MOHO_OPENROUTER_VISION_MODEL?: string;
  MOHO_OPENROUTER_IMAGE_MODEL?: string;
  MOHO_ALLOW_PAID_OPENROUTER_IMAGE?: string;
  MOHO_OPENAI_VISION_MODEL?: string;
  MOHO_OPENAI_IMAGE_MODEL?: string;
  MOHO_CLAUDE_MODEL?: string;
}

export interface MohoProductionProviders {
  planner: PlannerProvider;
  artworkProvider: ArtworkProvider;
  maxImageCallsPerShot: number;
}

function required(environment: MohoProductionProviderEnvironment, key: keyof MohoProductionProviderEnvironment): string {
  const value = environment[key]?.trim();
  if (!value) {
    throw new ProductionProviderError('PROVIDER_UNAVAILABLE', `${key} is required for Moho Production v3.`);
  }
  return value;
}

function imageCallBudget(environment: MohoProductionProviderEnvironment): number {
  const raw = required(environment, 'MOHO_MAX_IMAGE_CALLS_PER_SHOT');
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ProductionProviderError(
      'PROVIDER_UNAVAILABLE',
      'MOHO_MAX_IMAGE_CALLS_PER_SHOT must be a positive integer.'
    );
  }
  return value;
}

export function createMohoProductionProvidersFromEnv(
  environment: MohoProductionProviderEnvironment = process.env
): MohoProductionProviders {
  const plannerName = required(environment, 'MOHO_PLANNER_PROVIDER');
  const artworkName = required(environment, 'MOHO_ARTWORK_PROVIDER');
  const maxImageCallsPerShot = imageCallBudget(environment);

  if (plannerName !== 'openrouter' && plannerName !== 'anthropic') {
    throw new ProductionProviderError(
      'PROVIDER_UNAVAILABLE',
      `MOHO_PLANNER_PROVIDER must be openrouter or anthropic, received "${plannerName}".`
    );
  }
  if (artworkName !== 'openrouter' && artworkName !== 'openai') {
    throw new ProductionProviderError(
      'PROVIDER_UNAVAILABLE',
      `MOHO_ARTWORK_PROVIDER must be openrouter or openai, received "${artworkName}".`
    );
  }

  const openRouter = plannerName === 'openrouter' || artworkName === 'openrouter'
    ? new OpenRouterProductionProvider({
      apiKey: required(environment, 'OPENROUTER_API_KEY'),
      plannerModel: environment.MOHO_OPENROUTER_PLANNER_MODEL ?? 'nvidia/nemotron-3-super-120b-a12b:free',
      visionModel: environment.MOHO_OPENROUTER_VISION_MODEL ?? 'dots-studio/dots-3-note-preview:free',
      imageModel: artworkName === 'openrouter'
        ? required(environment, 'MOHO_OPENROUTER_IMAGE_MODEL')
        : environment.MOHO_OPENROUTER_IMAGE_MODEL ?? '',
      allowPaidImageModel: environment.MOHO_ALLOW_PAID_OPENROUTER_IMAGE === 'true'
    })
    : null;

  const planner: PlannerProvider = plannerName === 'openrouter'
    ? openRouter as OpenRouterProductionProvider
    : new AnthropicProductionProvider({
      apiKey: required(environment, 'ANTHROPIC_API_KEY'),
      model: environment.MOHO_CLAUDE_MODEL ?? 'claude-opus-4-7'
    });

  const artworkProvider: ArtworkProvider = artworkName === 'openrouter'
    ? openRouter as OpenRouterProductionProvider
    : new OpenAiArtworkProvider({
      apiKey: required(environment, 'OPENAI_API_KEY'),
      visionModel: environment.MOHO_OPENAI_VISION_MODEL ?? 'gpt-5.6',
      imageModel: environment.MOHO_OPENAI_IMAGE_MODEL ?? 'gpt-image-2'
    });

  return { planner, artworkProvider, maxImageCallsPerShot };
}
