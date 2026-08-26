import { ShowBibleLoader, type LoadedShowBible } from '../showBibleLoader/index.js';
import { OpenRouterClient, type OpenRouterResponse } from '../openRouterClient/index.js';
import {
  episodeBatchSchema,
  episodeShotSpecSchema,
  type EpisodeBatch,
  type EpisodeShotSpec
} from '../../schemas/episodeBatch.js';
import { crossReferenceShotManifest } from '../../schemas/shotManifest.js';

/**
 * LlmDirector — the "one prompt -> episode" neural director.
 *
 * Turns a raw script into a ShowBible-gated EpisodeBatch:
 *
 *   script + loaded ShowBible vocabulary
 *     -> strict JSON prompt to an OpenRouter :free model
 *     -> episodeBatchSchema validation + cross-reference pre-check
 *       (+ bounded self-repair: rejected outputs are fed back with their
 *        violations until maxAttempts is exhausted)
 *     -> EpisodeBatch ready for EpisodeBatchCompiler
 *
 * Also supports surgical shot revision: reviseShot() rewrites ONE shot of an
 * existing batch against director feedback, under the same gates.
 *
 * Honesty contract:
 *   - The LLM is only allowed to choose INSIDE the declared vocabulary.
 *     Anything unknown is refused before compilation (the compiler gate would
 *     reject it anyway; refusing early saves a wasted compile and reports the
 *     offending value verbatim).
 *   - No batch is ever synthesized to hide a failure. On refusal you get a
 *     compact summary of every attempt's violations so a human can see what
 *     went wrong.
 */

const DEFAULT_MAX_ATTEMPTS = 3;
const MAX_REFUSAL_LINES_PER_ATTEMPT = 4;

export interface ReviseShotInput {
  episodeBatch: EpisodeBatch;
  shotId: string;
  feedback: string;
  showBiblePath: string;
}

export type ReviseShotResult =
  | { status: 'ok'; shot: EpisodeShotSpec }
  | { status: 'refused'; refusals: string[] };

/** Immutable single-shot replacement: returns a NEW batch, never mutates. */
export function replaceShot(batch: EpisodeBatch, newShot: EpisodeShotSpec): EpisodeBatch {
  const index = batch.shots.findIndex(s => s.shotId === newShot.shotId);
  if (index === -1) {
    throw new Error(`replaceShot: shot "${newShot.shotId}" not found in episode batch`);
  }
  const shots = batch.shots.slice();
  shots[index] = newShot;
  return { ...batch, shots };
}

export interface DirectEpisodeInput {
  script: string;
  episodeId?: string;
  production?: string;
  director?: string;
  /** Deterministic timestamp baked into provenance (defaults fixed). */
  createdAt?: string;
  /** Continuity block from SeriesMemoryStore; empty for the first episode. */
  seriesContext?: string;
}

export interface DirectEpisodeResult {
  status: 'ok' | 'refused';
  episodeBatch?: EpisodeBatch;
  refusals: string[];
  warnings: string[];
  meta: {
    model: string;
    usageTokens: number;
    attempts: number;
    showBibleShowId: string;
    vocabulary: {
      characters: string[];
      shotSizes: string[];
      cameraMoves: string[];
      emotions: string[];
      gestures: string[];
    };
  };
}

function extractJson(text: string): { json?: unknown; error?: string } {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return { error: 'no JSON object found in model output' };
  }
  try {
    return { json: JSON.parse(cleaned.slice(start, end + 1)) };
  } catch (e) {
    return { error: `JSON.parse failed: ${(e as Error).message}` };
  }
}

export class LlmDirector {
  constructor(
    private readonly loader: ShowBibleLoader = new ShowBibleLoader(),
    private readonly client: OpenRouterClient | null = null
  ) {}

  buildPrompt(loaded: LoadedShowBible, input: DirectEpisodeInput): { systemPrompt: string; prompt: string } {
    const v = this.vocabulary(loaded);
    const systemPrompt = [
      'You are the director of a frozen 2D animation show. You MUST stay strictly inside the approved show bible vocabulary.',
      'Output ONLY one JSON object. No markdown fences, no commentary.',
      'Schema:',
      '{',
      '  "schemaVersion": "1.0", "episodeId": string, "production": string,',
      '  "showBibleRef": string, "director": string, "createdAt": ISO-datetime,',
      '  "shots": [ {',
      '    "shotId": string, "sceneName": string, "description": string,',
      '    "staging": { "positions": [{ "characterId": string, "preset"?: string }],',
      '      "shotSize": enum, "cameraMove": enum, "backgroundRef": string },',
      '    "timing": { "totalFrames": int>0, "fps": int>0, "minBeatFrames": int>0,',
      '      "maxBeatFrames": int>0, "anticipationFrames": int>=0, "followThroughFrames": int>=0,',
      '      "pauseBeforeBeats": {} },',
      '    "beats": [ { "beatId": string, "startFrame": int>=1, "endFrame": int>=startFrame,',
      '      "characterId": enum, "intent": string, "emotion": enum, "gestureId"?: enum } ],',
      '    "fx": [],',
      '    "render": { "preview": true, "format": "mp4", "quality": "standard" },',
      '    "sourceScriptRef": string } ]',
      '}'
    ].join('\n');

    const prompt = [
      `SCRIPT / BRIEF:\n${input.script.trim()}`,
      '',
      'APPROVED VOCABULARY (any other value = automatic rejection):',
      ...this.vocabLines(loaded),
      '',
      'HARD RULES:',
      '- Use ONLY the enums above for staging/beats fields.',
      '- Beats within a shot must not overlap; frames start at 1.',
      '- Keep total per-shot frames between 12 and 120 at fps from timing defaults.',
      '- Produce between 2 and 6 shots for this brief.',
      `- episodeId: "${input.episodeId ?? 'E01'}"; production: "${input.production ?? 'polygon_show'}".`,
      `- director field: "${input.director ?? 'openrouter_free_llm'}".`,
      '- createdAt: use exactly "1970-01-01T00:00:00Z" (the pipeline stamps provenance itself).'
    ].join('\n');

    const contextBlock = input.seriesContext ? `${input.seriesContext}\n\n` : '';
    return { systemPrompt, prompt: `${contextBlock}${prompt}\n\nVOCAB TIMING DEFAULTS: fps=${v.fps}, minBeatFrames=${v.minBeat}, maxBeatFrames=${v.maxBeat}\nNow output the JSON object only.` };
  }

  private vocabulary(loaded: LoadedShowBible) {
    const grammar = loaded.crossRefs.motionGrammar ?? {};
    return {
      characters: loaded.crossRefs.characterIds ?? [],
      shotSizes: loaded.crossRefs.cameraRules?.allowedShotSizes ?? [],
      cameraMoves: loaded.crossRefs.cameraRules?.allowedCameraMoves ?? [],
      emotions: grammar.allowedEmotions ?? [],
      gestures: grammar.allowedGestures ?? [],
      fps: loaded.motionGrammar.defaultTiming?.fps ?? 24,
      minBeat: loaded.motionGrammar.defaultTiming?.minBeatFrames ?? 2,
      maxBeat: loaded.motionGrammar.defaultTiming?.maxBeatFrames ?? 96
    };
  }

  private vocabLines(loaded: LoadedShowBible): string[] {
    const v = this.vocabulary(loaded);
    return [
      `- characterIds: ${v.characters.join(', ')}`,
      `- shotSize enum: ${v.shotSizes.join(', ')}`,
      `- cameraMove enum: ${v.cameraMoves.join(', ')}`,
      `- emotion enum: ${v.emotions.join(', ')}`,
      `- gestureId enum: ${v.gestures.join(', ') || '(none — omit gestureId)'}`,
      `- presets: left, center, right, close_up, background`,
      `- backgroundRef must be exactly: ${loaded.showBible.characterBibles.length ? 'bg/<name>.png style repo-relative path' : ''} bg/room_v1.png`
    ];
  }

  private buildRevisePrompt(
    target: EpisodeShotSpec,
    feedback: string,
    loaded: LoadedShowBible
  ): { systemPrompt: string; prompt: string } {
    const systemPrompt = [
      'You are revising a single shot of a frozen 2D animation show. You MUST stay strictly inside the approved show bible vocabulary.',
      'Output ONLY one JSON object: either the revised shot object itself or {"shots": [ <shot> ]} with exactly one shot. No markdown fences, no commentary.'
    ].join('\n');

    const prompt = [
      'CURRENT SHOT (JSON):',
      JSON.stringify(target, null, 2),
      '',
      `DIRECTOR FEEDBACK:\n${feedback.trim()}`,
      '',
      `Rewrite ONLY this shot. Keep shotId exactly "${target.shotId}".`,
      '',
      'APPROVED VOCABULARY (any other value = automatic rejection):',
      ...this.vocabLines(loaded),
      '',
      'HARD RULES:',
      '- Use ONLY the enums above for staging/beats fields.',
      '- Beats within the shot must not overlap; frames start at 1.',
      '- Keep total frames between 12 and 120 at fps from timing defaults.',
      '- Return the corrected shot JSON object only.'
    ].join('\n');
    return { systemPrompt, prompt };
  }

  async directEpisode(
    input: DirectEpisodeInput,
    showBiblePath: string,
    options: { client?: OpenRouterClient; maxAttempts?: number } = {}
  ): Promise<DirectEpisodeResult> {
    const client = options.client ?? this.client;
    const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    if (!client) {
      return this.refused(['no OpenRouterClient configured'], {
        model: 'none', usageTokens: 0, attempts: 0, showBibleShowId: '', vocabulary: emptyVocab()
      });
    }
    const loaded = this.loader.load(showBiblePath);
    const vocab = this.vocabulary(loaded);
    const metaBase = {
      model: 'unknown',
      usageTokens: 0,
      attempts: 0,
      showBibleShowId: loaded.showBible.showId,
      vocabulary: {
        characters: vocab.characters,
        shotSizes: vocab.shotSizes,
        cameraMoves: vocab.cameraMoves,
        emotions: vocab.emotions,
        gestures: vocab.gestures
      }
    };

    const { systemPrompt, prompt } = this.buildPrompt(loaded, input);

    let currentPrompt = prompt;
    let model = 'unknown';
    let usageTokens = 0;
    const attemptSummaries: string[][] = [];

    for (let attemptNo = 1; attemptNo <= maxAttempts; attemptNo++) {
      const response = await client.complete({
        prompt: currentPrompt,
        systemPrompt,
        maxTokens: 4000,
        temperature: 0.4
      });
      model = response.model;
      usageTokens += response.usage?.totalTokens ?? 0;

      const outcome = this.evaluateAttempt(response, loaded);
      if (outcome.kind === 'ok') {
        return {
          status: 'ok',
          episodeBatch: outcome.batch,
          refusals: [],
          warnings: ['LLM direction is draft-level: human review of beats/staging remains mandatory'],
          meta: { ...metaBase, model, usageTokens, attempts: attemptNo }
        };
      }

      attemptSummaries.push(outcome.refusals);
      if (attemptNo < maxAttempts) {
        currentPrompt = this.buildRepairPrompt(prompt, outcome.refusals);
      }
    }

    const refusals = attemptSummaries.map(
      (lines, i) => `attempt ${i + 1}: ${lines.slice(0, MAX_REFUSAL_LINES_PER_ATTEMPT).join('; ')}`
    );
    return this.refused(refusals, { ...metaBase, model, usageTokens, attempts: maxAttempts });
  }

  async reviseShot(
    input: ReviseShotInput,
    options: { client?: OpenRouterClient } = {}
  ): Promise<ReviseShotResult> {
    const client = options.client ?? this.client;
    if (!client) {
      return { status: 'refused', refusals: ['no OpenRouterClient configured'] };
    }
    const target = input.episodeBatch.shots.find(s => s.shotId === input.shotId);
    if (!target) {
      return { status: 'refused', refusals: [`shot "${input.shotId}" not found in episode batch`] };
    }

    const loaded = this.loader.load(input.showBiblePath);
    const { systemPrompt, prompt } = this.buildRevisePrompt(target, input.feedback, loaded);

    const response = await client.complete({
      prompt,
      systemPrompt,
      maxTokens: 2000,
      temperature: 0.3
    });

    if (response.content.includes('[OFFLINE FALLBACK MODE]')) {
      return { status: 'refused', refusals: ['model call fell back offline — no real revision happened'] };
    }

    const extracted = extractJson(response.content);
    if (extracted.error) {
      return {
        status: 'refused',
        refusals: [
          `unparsable model output: ${extracted.error}`,
          `raw excerpt: ${response.content.slice(0, 400)}`
        ]
      };
    }

    const parsed = episodeShotSpecSchema.safeParse(unwrapSingleShot(extracted.json));
    if (!parsed.success) {
      return {
        status: 'refused',
        refusals: [
          'revised shot failed schema validation:',
          ...parsed.error.errors.slice(0, 8).map(e => `${e.path.join('.')}: ${e.message}`)
        ]
      };
    }
    if (parsed.data.shotId !== input.shotId) {
      return {
        status: 'refused',
        refusals: [`revised shot declares shotId "${parsed.data.shotId}" but revision was requested for "${input.shotId}"`]
      };
    }

    const manifestLike = {
      shotId: parsed.data.shotId,
      staging: parsed.data.staging,
      beats: parsed.data.beats
    };
    const violations = crossReferenceShotManifest(manifestLike as any, loaded.crossRefs);
    if (violations.length > 0) {
      return {
        status: 'refused',
        refusals: violations.map(
          v => `shot "${input.shotId}": ${v.kind} "${v.ref}"${v.beatId ? ` (beat ${v.beatId})` : ''} is not in the ShowBible`
        )
      };
    }

    return { status: 'ok', shot: parsed.data };
  }

  private buildRepairPrompt(originalPrompt: string, violations: string[]): string {
    return `${originalPrompt}\n\nYOUR PREVIOUS OUTPUT WAS REJECTED. Violations:\n${violations
      .map(v => `- ${v}`)
      .join('\n')}\nReturn the corrected JSON object only.`;
  }

  private evaluateAttempt(
    response: OpenRouterResponse,
    loaded: LoadedShowBible
  ): { kind: 'ok'; batch: EpisodeBatch } | { kind: 'failed'; refusals: string[] } {
    const refusals: string[] = [];

    if (response.content.includes('[OFFLINE FALLBACK MODE]')) {
      return { kind: 'failed', refusals: ['model call fell back offline — no real direction happened'] };
    }

    const extracted = extractJson(response.content);
    if (extracted.error) {
      return {
        kind: 'failed',
        refusals: [
          `unparsable model output: ${extracted.error}`,
          `raw excerpt: ${response.content.slice(0, 400)}`
        ]
      };
    }

    const parsed = episodeBatchSchema.safeParse(extracted.json);
    if (!parsed.success) {
      return {
        kind: 'failed',
        refusals: [
          'batch failed schema validation:',
          ...parsed.error.errors.slice(0, 8).map(e => `${e.path.join('.')}: ${e.message}`)
        ]
      };
    }

    // Vocabulary pre-check with exact offending values (compile gate double-checks).
    for (const shot of parsed.data.shots) {
      const manifestLike = {
        shotId: shot.shotId,
        staging: shot.staging,
        beats: shot.beats
      };
      const violations = crossReferenceShotManifest(manifestLike as any, loaded.crossRefs);
      for (const v of violations) {
        refusals.push(`shot "${shot.shotId}": ${v.kind} "${v.ref}"${v.beatId ? ` (beat ${v.beatId})` : ''} is not in the ShowBible`);
      }
    }
    if (refusals.length > 0) {
      return { kind: 'failed', refusals };
    }

    return { kind: 'ok', batch: parsed.data };
  }

  private refused(refusals: string[], meta: DirectEpisodeResult['meta']): DirectEpisodeResult {
    return { status: 'refused', refusals, warnings: [], meta };
  }
}

function emptyVocab() {
  return { characters: [], shotSizes: [], cameraMoves: [], emotions: [], gestures: [] };
}

function unwrapSingleShot(json: unknown): unknown {
  if (json && typeof json === 'object' && Array.isArray((json as any).shots)) {
    const shots = (json as any).shots as unknown[];
    return shots.length > 0 ? shots[0] : undefined;
  }
  return json;
}
