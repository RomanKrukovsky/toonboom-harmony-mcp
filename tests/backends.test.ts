import {
  generateCharacterTurnaround,
  generateBackground,
  synthesizeDialogue,
  generateDialogue
} from '../src/adapters/backends/index.js';
import { config } from '../src/config.js';

describe('Backend adapters (feature-flagged)', () => {
  const originalImage = config.backends.image;
  const originalAudio = config.backends.audio;
  const originalLlm = config.backends.llm;

  beforeEach(() => {
    config.backends.image = 'none';
    config.backends.audio = 'none';
    config.backends.llm = 'none';
  });

  afterAll(() => {
    config.backends.image = originalImage;
    config.backends.audio = originalAudio;
    config.backends.llm = originalLlm;
  });

  test('image backend returns placeholder when disabled', async () => {
    const res = await generateCharacterTurnaround('Hero', 'front', 'cartoon');
    expect(res.origin).toBe('placeholder');
    expect(res.status).toBe('success');
    expect(res.outputPath).toBeDefined();
  });

  test('image backend returns placeholder for backgrounds when disabled', async () => {
    const res = await generateBackground('Lab', 'sci-fi');
    expect(res.origin).toBe('placeholder');
    expect(res.status).toBe('success');
  });

  test('audio backend returns placeholder when disabled', async () => {
    const res = await synthesizeDialogue('Hello world');
    expect(res.origin).toBe('placeholder');
    expect(res.status).toBe('success');
    expect(res.outputPath).toBeDefined();
  });

  test('llm backend returns deterministic placeholder when disabled', async () => {
    const res = await generateDialogue('A robot wakes up in a lab.', ['Unit-7']);
    expect(res.origin).toBe('placeholder');
    expect(res.status).toBe('success');
    expect(res.dialogue.length).toBeGreaterThan(0);
  });

  test('llm backend errors gracefully when enabled without API key', async () => {
    config.backends.llm = 'openai';
    config.backends.apiKeys.openai = undefined;
    const res = await generateDialogue('Test prompt', ['Hero']);
    expect(res.status).toBe('error');
    expect(res.origin).toBe('placeholder');
    expect(res.error).toContain('API key');
  });

  test('image backend errors gracefully when enabled without API key', async () => {
    config.backends.image = 'openai';
    config.backends.apiKeys.openai = undefined;
    const res = await generateCharacterTurnaround('Hero', 'front', 'cartoon');
    expect(res.status).toBe('error');
    expect(res.error).toContain('API key');
  });
});
