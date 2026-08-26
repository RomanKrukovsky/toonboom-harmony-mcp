import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { z } from 'zod';
import type { EpisodeBatch } from '../../schemas/episodeBatch.js';

/**
 * SeriesMemoryStore — the show's continuity memory ("память шоу").
 *
 * Every compiled episode is recorded under
 *   output/series_memory/<production>/
 *     season.json       — ordered episode ledger (ids, digests, beat counts)
 *     episodes/<id>.json — full directed batch for that episode
 *     characters.json   — per-character continuity state (status/location/relationships)
 *
 * The compact ledger is what gets injected back into the director prompt so
 * later episodes continue earlier ones instead of restarting from zero.
 * Storage is deterministic JSON + SHA-256 digests; nothing is invented here.
 */

export const SERIES_MEMORY_SCHEMA_VERSION = '1.0';

export const seriesEpisodeRecordSchema = z.object({
  episodeId: z.string().min(1),
  digest: z.string().min(1),
  shots: z.number().int().positive(),
  beats: z.number().int().nonnegative(),
  commands: z.number().int().nonnegative(),
  totalFrames: z.number().int().positive(),
  logline: z.string().min(1),
  recordedAt: z.string().datetime()
});

export const seriesSeasonSchema = z.object({
  schemaVersion: z.literal(SERIES_MEMORY_SCHEMA_VERSION),
  production: z.string().min(1),
  episodes: z.array(seriesEpisodeRecordSchema).default([])
});

export type SeriesEpisodeRecord = z.infer<typeof seriesEpisodeRecordSchema>;
export type SeriesSeason = z.infer<typeof seriesSeasonSchema>;

export const characterRelationshipSchema = z.object({
  withCharacterId: z.string().min(1),
  stance: z.enum(['ally', 'rival', 'neutral', 'unknown']),
  note: z.string().optional()
});

export const characterRecordSchema = z.object({
  characterId: z.string().min(1),
  status: z.enum(['active', 'absent', 'departed']),
  location: z.string(),
  relationships: z.array(characterRelationshipSchema).default([]),
  lastEpisodeId: z.string().min(1)
});

export const characterStateSchema = z.object({
  schemaVersion: z.literal(SERIES_MEMORY_SCHEMA_VERSION),
  production: z.string().min(1),
  characters: z.array(characterRecordSchema).default([])
});

export type CharacterRelationship = z.infer<typeof characterRelationshipSchema>;
export type CharacterRecord = z.infer<typeof characterRecordSchema>;
export type CharacterState = z.infer<typeof characterStateSchema>;

export interface CharacterStatePatch {
  characterId: string;
  status?: 'active' | 'absent' | 'departed';
  location?: string;
  relationships?: CharacterRelationship[];
}

export function episodeLogline(batch: EpisodeBatch): string {
  // Deterministic compact recap: scene names + beat intents per shot.
  return batch.shots
    .map(s => `${s.sceneName}: ${s.description}`)
    .join(' | ');
}

export class SeriesMemoryStore {
  constructor(private readonly rootDir: string) {}

  private dirFor(production: string): string {
    const safe = production.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return path.join(this.rootDir, 'series_memory', safe);
  }

  private seasonPath(production: string): string {
    return path.join(this.dirFor(production), 'season.json');
  }

  private charactersPath(production: string): string {
    return path.join(this.dirFor(production), 'characters.json');
  }

  loadCharacterState(production: string): CharacterState {
    const p = this.charactersPath(production);
    if (!fs.existsSync(p)) {
      return { schemaVersion: SERIES_MEMORY_SCHEMA_VERSION, production, characters: [] };
    }
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (err) {
      throw new Error(`series memory corrupted for "${production}" (characters.json): ${err instanceof Error ? err.message : String(err)}`);
    }
    const parsed = characterStateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`series memory corrupted for "${production}" (characters.json): ${parsed.error.message}`);
    }
    return parsed.data;
  }

  private saveCharacterState(state: CharacterState): void {
    const dir = this.dirFor(state.production);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.charactersPath(state.production), JSON.stringify(state, null, 2) + '\n');
  }

  loadSeason(production: string): SeriesSeason {
    const p = this.seasonPath(production);
    if (!fs.existsSync(p)) {
      return { schemaVersion: SERIES_MEMORY_SCHEMA_VERSION, production, episodes: [] };
    }
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (err) {
      throw new Error(`series memory corrupted for "${production}": ${err instanceof Error ? err.message : String(err)}`);
    }
    const parsed = seriesSeasonSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`series memory corrupted for "${production}": ${parsed.error.message}`);
    }
    return parsed.data;
  }

  private saveSeason(season: SeriesSeason): void {
    const dir = this.dirFor(season.production);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.seasonPath(season.production), JSON.stringify(season, null, 2) + '\n');
  }

  recordEpisode(
    batch: EpisodeBatch,
    compileResult: { totals: { shots: number; beats: number; commands: number; totalFrames: number }; episodeContentDigest: string }
  ): SeriesEpisodeRecord {
    const season = this.loadSeason(batch.production);
    const record: SeriesEpisodeRecord = {
      episodeId: batch.episodeId,
      digest: compileResult.episodeContentDigest,
      shots: compileResult.totals.shots,
      beats: compileResult.totals.beats,
      commands: compileResult.totals.commands,
      totalFrames: compileResult.totals.totalFrames,
      logline: episodeLogline(batch),
      recordedAt: new Date().toISOString()
    };
    const idx = season.episodes.findIndex(e => e.episodeId === batch.episodeId);
    if (idx >= 0) season.episodes[idx] = record;
    else season.episodes.push(record);

    const dir = this.dirFor(batch.production);
    fs.mkdirSync(path.join(dir, 'episodes'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'episodes', `${batch.episodeId}.json`),
      JSON.stringify({ batch, compileDigest: compileResult.episodeContentDigest }, null, 2) + '\n'
    );
    this.saveSeason(season);
    return record;
  }

  /** Compact prior-context block injected into the director prompt. */
  contextBlock(production: string, upToExclusive?: string): string {
    const season = this.loadSeason(production);
    const eps = upToExclusive
      ? season.episodes.slice(0, season.episodes.findIndex(e => e.episodeId === upToExclusive))
      : season.episodes;
    if (eps.length === 0) return '';
    return [
      'PREVIOUS EPISODES (continue the story consistently; do not retcon them):',
      ...eps.map(e => `- ${e.episodeId}: ${e.logline}`)
    ].join('\n');
  }

  /** Stable digest of the whole season ledger for evidence/reporting. */
  seasonDigest(production: string): string {
    const canonical = stringify(this.loadSeason(production)) ?? '';
    return `sha256:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
  }

  /**
   * Merge per-character continuity patches (upsert). Omitted fields keep their
   * previous value; every touched character gets lastEpisodeId = episodeId.
   */
  updateCharacterState(production: string, episodeId: string, states: CharacterStatePatch[]): CharacterState {
    const state = this.loadCharacterState(production);
    for (const patch of states) {
      const idx = state.characters.findIndex(c => c.characterId === patch.characterId);
      if (idx >= 0) {
        const prev = state.characters[idx];
        state.characters[idx] = {
          characterId: patch.characterId,
          status: patch.status ?? prev.status,
          location: patch.location ?? prev.location,
          relationships: patch.relationships ?? prev.relationships,
          lastEpisodeId: episodeId
        };
      } else {
        state.characters.push({
          characterId: patch.characterId,
          status: patch.status ?? 'active',
          location: patch.location ?? '',
          relationships: patch.relationships ?? [],
          lastEpisodeId: episodeId
        });
      }
    }
    this.saveCharacterState(state);
    return state;
  }

  /** Compact character-continuity block injected into the director prompt. */
  getCharacterContext(production: string): string {
    const state = this.loadCharacterState(production);
    if (state.characters.length === 0) return '';
    return [
      'CHARACTER CONTINUITY (do not contradict):',
      ...state.characters.map(c => {
        const rels = c.relationships
          .map(r => `${r.stance} with ${r.withCharacterId} (since ${c.lastEpisodeId})`)
          .join(', ');
        return `- ${c.characterId}: ${c.status}, location=${c.location}${rels ? `; ${rels}` : ''}`;
      })
    ].join('\n');
  }

  /** Stable digest of the character-state ledger for evidence/reporting. */
  stateDigest(production: string): string {
    const canonical = stringify(this.loadCharacterState(production)) ?? '';
    return `sha256:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
  }
}
