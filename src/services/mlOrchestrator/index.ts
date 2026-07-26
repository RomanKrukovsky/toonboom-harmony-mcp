import { MlProviderRegistry } from '../mlProviderRegistry/index.js';

export class MlOrchestrator {
  private providerRegistry: MlProviderRegistry;

  constructor(providerRegistry: MlProviderRegistry) {
    this.providerRegistry = providerRegistry;
  }

  // Orchestrator coordinates calls to Python runtime and forwards them to specific providers
}
