/**
 * Hermetic test environment.
 *
 * Runs as a Jest `setupFiles` entry, i.e. before any module under test is imported. That
 * ordering matters: `src/config.ts` reads `process.env` at import time, so credentials must
 * be cleared before it loads.
 *
 * Why this exists
 * ---------------
 * `npm test -- --runInBand` — the exact command in .github/workflows/ci.yml — never exited.
 * `--detectOpenHandles` traced it to leaked `TLSWRAP` handles from
 * `OpenRouterClient.complete` (src/services/openRouterClient/index.ts:59): the unit suite was
 * making live HTTPS calls to the OpenRouter API using the real key from `.env`.
 *
 * Worse, it hid a false-green test. `OpenRouterClient` returns a string containing
 * `[OFFLINE FALLBACK MODE]` in three different situations: no API key, a non-ok HTTP
 * response, and a thrown request error. So the test named *"executes ... cleanly without
 * network calls in fallback mode"* passed whether or not a real call had been made — the
 * assertion could not tell "never called the network" from "called it and failed".
 *
 * Two guarantees are installed here:
 *   1. Credentials are removed from the environment, so code takes its genuine offline path.
 *   2. Outbound requests to non-local hosts throw loudly instead of silently succeeding, so
 *      a future test that reaches for the network fails visibly rather than leaking a socket.
 *
 * A test that needs to exercise HTTP behaviour should replace `global.fetch` with its own
 * mock, as tests/openRouterIntegration.test.ts already does. Doing so overrides this guard.
 */

// 1. Strip credentials before any module captures them.
const CREDENTIAL_ENV_VARS = [
  'OPENROUTER_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'STABILITY_API_KEY',
  'ELEVENLABS_API_KEY',
  'RECONSTRUCTION_API_KEY'
];

for (const name of CREDENTIAL_ENV_VARS) {
  delete process.env[name];
}

// `src/config.ts` calls `dotenv.config()` at import time, which would immediately re-read
// `.env` and put the real credentials back. Neutralise the loader before that happens —
// deleting the variables alone is not enough.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  const noop = () => ({ parsed: {} as Record<string, string> });
  dotenv.config = noop;
  if (dotenv.default) dotenv.default.config = noop;
} catch {
  // dotenv not installed in this context; the deletions above are then sufficient.
}

// 2. Block outbound network access to anything that is not loopback.
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

function hostnameOf(input: unknown): string | undefined {
  try {
    if (typeof input === 'string') return new URL(input).hostname;
    if (input instanceof URL) return input.hostname;
    const url = (input as { url?: string } | undefined)?.url;
    return url ? new URL(url).hostname : undefined;
  } catch {
    return undefined;
  }
}

const realFetch = globalThis.fetch;

if (typeof realFetch === 'function') {
  const guardedFetch = ((input: any, init?: any) => {
    const hostname = hostnameOf(input);
    if (hostname && !LOCAL_HOSTNAMES.has(hostname)) {
      return Promise.reject(
        new Error(
          `[hermetic tests] Blocked outbound request to "${hostname}". ` +
            'Unit tests must not call external services. Mock global.fetch in the test, ' +
            'or move the check into an explicitly env-gated integration test.'
        )
      );
    }
    return realFetch(input, init);
  }) as typeof fetch;

  globalThis.fetch = guardedFetch;
}

export {};
