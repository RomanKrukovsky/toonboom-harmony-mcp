import { VoxCPMOrchestrator } from '../src/services/voxcpmOrchestrator/index.js';

describe('VoxCPM2 Audio Synthesis Engine Integration', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should call ML Runtime /infer/voxcpm and return generated audio metadata', async () => {
    const mockResponse = {
      status: 'success',
      realInferenceExecuted: true,
      outputWavPath: '/tmp/test_voxcpm_dialogue.wav',
      sampleRate: 48000,
      durationSec: 3.42,
      provider: 'voxcpm_provider',
      errors: []
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const orchestrator = new VoxCPMOrchestrator('http://127.0.0.1:8000');
    const result = await orchestrator.generateAudio({
      text: 'Привет, мир! Это тестовая озвучка персонажа.',
      outputWavPath: '/tmp/test_voxcpm_dialogue.wav',
      voiceDescription: 'young male hero, enthusiastic tone',
      guidanceScale: 2.5,
      numSteps: 12
    });

    expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/infer/voxcpm', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        text: 'Привет, мир! Это тестовая озвучка персонажа.',
        outputWavPath: '/tmp/test_voxcpm_dialogue.wav',
        voiceDescription: 'young male hero, enthusiastic tone',
        referenceWavPath: undefined,
        instruct: undefined,
        guidanceScale: 2.5,
        numSteps: 12
      })
    }));

    expect(result.status).toBe('success');
    expect(result.sampleRate).toBe(48000);
    expect(result.durationSec).toBe(3.42);
    expect(result.outputWavPath).toBe('/tmp/test_voxcpm_dialogue.wav');
  });
});
