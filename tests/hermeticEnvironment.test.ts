/**
 * Locks in the hermetic test environment.
 *
 * Regression guard for the defect that made `npm test -- --runInBand` — the exact command
 * in .github/workflows/ci.yml — hang forever: the unit suite was issuing live HTTPS calls
 * to the OpenRouter API with the real key from `.env`, leaking TLS sockets that kept the
 * event loop alive.
 *
 * It also guarded a false-green test. `OpenRouterClient` emits `[OFFLINE FALLBACK MODE]`
 * for three different situations — no API key, non-ok HTTP response, thrown request error —
 * so a test asserting that string passed whether or not the network had actually been used.
 *
 * See tests/setup/hermetic.ts.
 */

import { OpenRouterClient } from '../src/services/openRouterClient/index.js';

describe('hermetic test environment', () => {
  it('removes credentials from the environment before modules load', () => {
    for (const name of [
      'OPENROUTER_API_KEY',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'STABILITY_API_KEY',
      'ELEVENLABS_API_KEY'
    ]) {
      expect(process.env[name]).toBeUndefined();
    }
  });

  it('blocks outbound requests to external hosts', async () => {
    await expect(fetch('https://openrouter.ai/api/v1/chat/completions')).rejects.toThrow(
      /Blocked outbound request/
    );
  });

  it('names the offending host so the failure is diagnosable', async () => {
    await expect(fetch('https://example.com/whatever')).rejects.toThrow(/example\.com/);
  });

  it('still permits loopback requests used by local services', async () => {
    // Nothing is listening, so this fails to connect — but it must NOT be blocked by the
    // guard, otherwise local ml-core / reconstruction-core tests could not run.
    await expect(fetch('http://127.0.0.1:1/health')).rejects.not.toThrow(
      /Blocked outbound request/
    );
  });

  it('drives OpenRouterClient down its genuine offline path, not a failed network call', async () => {
    const client = new OpenRouterClient();
    const response = await client.complete({ prompt: 'anything' });

    expect(response.content).toContain('[OFFLINE FALLBACK MODE]');
    // The no-key branch reports zero token usage and an `offline-` id. A failed network call
    // would produce `fallback-` or `offline-err-` instead, which is what previously made the
    // assertion meaningless.
    expect(response.id.startsWith('offline-')).toBe(true);
    expect(response.id.startsWith('offline-err-')).toBe(false);
    expect(response.usage?.totalTokens).toBe(0);
  });

  it('lets a test install its own fetch mock', async () => {
    const original = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ mocked: true }) }) as any;
    try {
      const result: any = await (await fetch('https://openrouter.ai/x')).json();
      expect(result.mocked).toBe(true);
    } finally {
      global.fetch = original;
    }
  });
});
