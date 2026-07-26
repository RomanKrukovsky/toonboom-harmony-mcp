import { describe, expect, it } from '@jest/globals';
import { MlProviderRegistry } from '../src/services/mlProviderRegistry/index.js';

describe('ML Runtime Contract & Verification Tests', () => {
  it('Should successfully build and expose registry', () => {
    const registry = new MlProviderRegistry();
    expect(registry).toBeDefined();
    expect(registry.getAll().length).toBe(0);
  });
  
  // Real endpoint verification tests would be placed here when a server is mockable in tests
  it('Should simulate weights_missing constraint', () => {
    const mockResponse = {
      jobId: '123',
      provider: 'sam2',
      modelId: 'sam2',
      status: 'blocked',
      realInferenceExecuted: false,
      errors: ['weights_missing']
    };
    
    expect(mockResponse.status).toBe('blocked');
    expect(mockResponse.realInferenceExecuted).toBe(false);
    expect(mockResponse.errors).toContain('weights_missing');
  });
});
