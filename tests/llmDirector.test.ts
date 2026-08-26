/**
 * LLM Director tests — "one prompt -> gated EpisodeBatch".
 *
 * Network is hermetically blocked in tests; global fetch is mocked with
 * OpenRouter-shaped responses (same pattern as openRouterIntegration.test).
 * The director must:
 *   - send requests ONLY for :free models (policy guard),
 *   - validate model JSON against episodeBatchSchema,
 *   - refuse any value outside the ShowBible vocabulary with the exact reason,
 *   - refuse offline-fallback content instead of pretending it directed.
 */

import fs from 'fs';
import path from 'path';
import { LlmDirector, replaceShot } from '../src/services/llmDirector/index.js';
import { OpenRouterClient } from '../src/services/openRouterClient/index.js';
import type { EpisodeBatch } from '../src/schemas/episodeBatch.js';

const ROOT = process.cwd();
const SHOW_BIBLE = path.join(ROOT, 'fixtures', 'show_bible', 'show_bible.json');

const VALID_BATCH = {
  schemaVersion: '1.0',
  episodeId: 'E01',
  production: 'polygon_show',
  showBibleRef: 'fixtures/show_bible/show_bible.json',
  director: 'openrouter_free_llm',
  createdAt: '1970-01-01T00:00:00Z',
  shots: [
    {
      shotId: 'E01_S01_SH01',
      sceneName: 'S01',
      description: 'Mira looks up.',
      staging: {
        positions: [{ characterId: 'char_main_v1', preset: 'center' }],
        shotSize: 'medium_shot',
        cameraMove: 'static',
        backgroundRef: 'bg/room_v1.png'
      },
      timing: { totalFrames: 24, fps: 24, minBeatFrames: 2, maxBeatFrames: 96, anticipationFrames: 4, followThroughFrames: 6, pauseBeforeBeats: {} },
      beats: [
        { beatId: 'b1', startFrame: 1, endFrame: 24, characterId: 'char_main_v1', intent: 'look_up', emotion: 'neutral' }
      ],
      fx: [],
      render: { preview: true, format: 'mp4', quality: 'standard' },
      sourceScriptRef: 'scripts/E01/S01.txt'
    }
  ]
};

function mockFetchWith(content: string) {
  return (async (_url: any, init?: any) => ({
    ok: true,
    status: 200,
    json: async () => {
      const body = JSON.parse(init.body);
      return {
        id: 'or-mock',
        model: body.model,
        choices: [{ message: { role: 'assistant', content } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      };
    }
  })) as any;
}

function client(): OpenRouterClient {
  return new OpenRouterClient('test-key', 'nvidia/nemotron-3-super:free');
}

const TWO_SHOT_BATCH: EpisodeBatch = (() => {
  const batch = JSON.parse(JSON.stringify(VALID_BATCH));
  batch.shots.push({
    shotId: 'E01_S01_SH02',
    sceneName: 'S01',
    description: 'Mira turns away.',
    staging: {
      positions: [{ characterId: 'char_main_v1', preset: 'left' }],
      shotSize: 'close_up',
      cameraMove: 'static',
      backgroundRef: 'bg/room_v1.png'
    },
    timing: batch.shots[0].timing,
    beats: [
      { beatId: 'b1', startFrame: 1, endFrame: 12, characterId: 'char_main_v1', intent: 'look_away', emotion: 'neutral' }
    ],
    fx: [],
    render: { preview: true, format: 'mp4', quality: 'standard' },
    sourceScriptRef: 'scripts/E01/S01.txt'
  });
  return batch;
})();

describe('LlmDirector — one prompt to a gated episode batch', () => {
  afterEach(() => {
    delete (globalThis as any).fetch;
  });

  it('produces a validated EpisodeBatch from well-formed model output and stays inside the :free policy', async () => {
    let requestedModel = '';
    (globalThis as any).fetch = mockFetchWith(JSON.stringify(VALID_BATCH));
    const orig = (globalThis as any).fetch;
    (globalThis as any).fetch = async (url: any, init: any) => {
      requestedModel = JSON.parse(init.body).model;
      return orig(url, init);
    };

    const result = await new LlmDirector().directEpisode(
      { script: 'Mira looks up from her desk and reacts with surprise.' },
      SHOW_BIBLE,
      { client: client() }
    );

    expect(result.status).toBe('ok');
    expect(requestedModel.endsWith(':free')).toBe(true);
    expect(result.episodeBatch!.shots.length).toBe(1);
    expect(result.meta.model.endsWith(':free')).toBe(true);
    expect(result.meta.attempts).toBe(1);
  });

  it('refuses values outside the ShowBible vocabulary with the exact offending value', async () => {
    const rogue = JSON.parse(JSON.stringify(VALID_BATCH));
    rogue.shots[0].staging.shotSize = 'dutch_angle_dolly_zoom';
    (globalThis as any).fetch = mockFetchWith(JSON.stringify(rogue));

    const result = await new LlmDirector().directEpisode(
      { script: 'Mira looks up from her desk.' },
      SHOW_BIBLE,
      { client: client() }
    );
    expect(result.status).toBe('refused');
    expect(result.refusals.join('\n')).toContain('dutch_angle_dolly_zoom');
    expect(result.episodeBatch).toBeUndefined();
  });

  it('refuses unparsable model output instead of guessing', async () => {
    (globalThis as any).fetch = mockFetchWith('I cannot produce JSON today, sorry!');
    const result = await new LlmDirector().directEpisode(
      { script: 'Mira looks up from her desk.' },
      SHOW_BIBLE,
      { client: client() }
    );
    expect(result.status).toBe('refused');
    expect(result.refusals.some(r => r.includes('no JSON object'))).toBe(true);
  });

  it('refuses offline-fallback content instead of treating it as direction', async () => {
    (globalThis as any).fetch = mockFetchWith('[OFFLINE FALLBACK MODE]: no network.');
    const result = await new LlmDirector().directEpisode(
      { script: 'Mira looks up from her desk.' },
      SHOW_BIBLE,
      { client: client() }
    );
    expect(result.status).toBe('refused');
    expect(result.refusals[0]).toContain('fell back offline');
  });
});

describe('LlmDirector — self-repair loop and shot revision', () => {
  afterEach(() => {
    delete (globalThis as any).fetch;
  });

  it('repairs a vocabulary-violating first attempt and succeeds on the second', async () => {
    const rogue = JSON.parse(JSON.stringify(VALID_BATCH));
    rogue.shots[0].staging.shotSize = 'dutch_angle_dolly_zoom';

    const userPrompts: string[] = [];
    let call = 0;
    (globalThis as any).fetch = async (_url: any, init: any) => {
      const body = JSON.parse(init.body);
      userPrompts.push(body.messages.find((m: any) => m.role === 'user').content);
      const content = call++ === 0 ? JSON.stringify(rogue) : JSON.stringify(VALID_BATCH);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'or-mock',
          model: body.model,
          choices: [{ message: { role: 'assistant', content } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        })
      };
    };

    const result = await new LlmDirector().directEpisode(
      { script: 'Mira looks up from her desk.' },
      SHOW_BIBLE,
      { client: client() }
    );

    expect(result.status).toBe('ok');
    expect(result.meta.attempts).toBe(2);
    expect(userPrompts.length).toBe(2);
    expect(userPrompts[1]).toContain('YOUR PREVIOUS OUTPUT WAS REJECTED');
    expect(userPrompts[1]).toContain('dutch_angle_dolly_zoom');
    expect(userPrompts[1]).toContain('Mira looks up from her desk.');
    expect(userPrompts[1]).toContain('Return the corrected JSON object only.');
  });

  it('reviseShot rewrites one validated shot; replaceShot swaps it immutably', async () => {
    const revisedShot = { ...TWO_SHOT_BATCH.shots[0], description: 'Mira looks up, startled.' };
    (globalThis as any).fetch = mockFetchWith(JSON.stringify({ shots: [revisedShot] }));

    const result = await new LlmDirector().reviseShot(
      {
        episodeBatch: TWO_SHOT_BATCH,
        shotId: 'E01_S01_SH01',
        feedback: 'Make the look-up more startled.',
        showBiblePath: SHOW_BIBLE
      },
      { client: client() }
    );

    if (result.status !== 'ok') throw new Error(`expected ok, got refused: ${result.refusals.join('\n')}`);
    expect(result.shot.description).toBe('Mira looks up, startled.');

    const next = replaceShot(TWO_SHOT_BATCH, result.shot);
    expect(next).not.toBe(TWO_SHOT_BATCH);
    expect(next.shots.length).toBe(2);
    expect(next.shots[0].description).toBe('Mira looks up, startled.');
    expect(next.shots[1]).toEqual(TWO_SHOT_BATCH.shots[1]);
    expect(TWO_SHOT_BATCH.shots[0].description).toBe('Mira looks up.');
  });

  it('reviseShot refuses a revision outside the ShowBible vocabulary', async () => {
    // 'pan_left' is a legal staging enum but forbidden by camera_rules.json,
    // so this exercises the cross-reference gate (not the zod enum gate).
    const badShot = {
      ...TWO_SHOT_BATCH.shots[0],
      staging: { ...TWO_SHOT_BATCH.shots[0].staging, cameraMove: 'pan_left' }
    };
    (globalThis as any).fetch = mockFetchWith(JSON.stringify(badShot));

    const result = await new LlmDirector().reviseShot(
      {
        episodeBatch: TWO_SHOT_BATCH,
        shotId: 'E01_S01_SH01',
        feedback: 'Pan the camera left.',
        showBiblePath: SHOW_BIBLE
      },
      { client: client() }
    );

    if (result.status !== 'refused') throw new Error('expected refusal');
    expect(result.refusals.join('\n')).toContain('unknown_camera_move');
    expect(result.refusals.join('\n')).toContain('pan_left');
    expect(result.refusals.join('\n')).toContain('E01_S01_SH01');
  });
});

describe('OpenRouterClient :free policy guard', () => {
  it('throws before any network call for a paid default model', () => {
    expect(() => new OpenRouterClient('k', 'anthropic/claude-3-opus')).toThrow(/not a :free model/);
  });

  it('throws for a paid per-request model without sending a request', async () => {
    let called = false;
    (globalThis as any).fetch = async () => {
      called = true;
      throw new Error('network reached');
    };
    const c = new OpenRouterClient('k', 'nvidia/nemotron-3-super:free');
    await expect(c.complete({ prompt: 'x', model: 'openai/gpt-4o' })).rejects.toThrow(/not a :free model/);
    expect(called).toBe(false);
  });
});
