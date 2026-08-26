import {
  LlmDirector,
  type DirectEpisodeResult
} from '../llmDirector/index.js';
import { EpisodeBatchCompiler } from '../episodeBatchCompiler/index.js';
import { ShowBibleLoader } from '../showBibleLoader/index.js';
import {
  SeriesMemoryStore,
  type SeriesEpisodeRecord
} from '../seriesMemory/index.js';
import { type GestureTrackLibrary } from '../../schemas/gestureTracks.js';

/**
 * SeasonDirector — one prompt -> a season of episodes with show memory.
 *
 *   script + episodeCount
 *     -> per-episode: LlmDirector (with accumulated series context)
 *                     -> EpisodeBatchCompiler -> record into SeriesMemoryStore
 *
 * Continuity: each episode's prompt carries the ledger of all previous
 * episodes, so the director continues the story instead of restarting.
 *
 * Honesty contract: if any episode is refused or rejected, the season stops
 * there and reports exactly which episode failed and why. No placeholder
 * episodes are produced to fill the count.
 */

export interface DirectSeasonInput {
  script: string;
  episodeCount: number;
  production?: string;
  director?: string;
}

export interface SeasonEpisodeOutcome {
  episodeId: string;
  status: 'compiled' | 'refused' | 'rejected';
  refusals: string[];
  totals?: { shots: number; beats: number; commands: number; totalFrames: number };
  digest?: string;
  model: string;
}

export interface DirectSeasonResult {
  status: 'completed' | 'partial';
  completedEpisodes: number;
  requestedEpisodes: number;
  episodes: SeasonEpisodeOutcome[];
  seasonDigest?: string;
  warnings: string[];
}

const DEFAULT_EPISODE_IDS = ['E01', 'E02', 'E03', 'E04', 'E05', 'E06'];

export class SeasonDirector {
  private readonly loader = new ShowBibleLoader();
  private readonly compiler = new EpisodeBatchCompiler();

  constructor(
    private readonly llmDirector: LlmDirector,
    private readonly memory: SeriesMemoryStore,
    private readonly client: Parameters<LlmDirector['directEpisode']>[2] extends
      | { client?: infer C }
      | undefined
      ? C
      : never
  ) {}

  async directSeason(
    input: DirectSeasonInput,
    showBiblePath: string,
    gestureLibraries: GestureTrackLibrary[]
  ): Promise<DirectSeasonResult> {
    const count = Math.max(1, Math.min(6, Math.floor(input.episodeCount)));
    const loaded = this.loader.load(showBiblePath);
    const controllerMaps = this.loader.buildControllerMaps(loaded);
    const production = input.production ?? 'polygon_show';
    const warnings: string[] = [];
    const episodes: SeasonEpisodeOutcome[] = [];

    for (let i = 0; i < count; i += 1) {
      const episodeId = DEFAULT_EPISODE_IDS[i] ?? `E${String(i + 1).padStart(2, '0')}`;
      const seriesContext = this.memory.contextBlock(production);

      let directed: DirectEpisodeResult;
      try {
        directed = await this.llmDirector.directEpisode(
          {
            script:
              i === 0
                ? input.script
                : `${input.script}\n\nThis is episode ${episodeId}; continue the storyline naturally from the previous episodes.`,
            episodeId,
            production,
            director: input.director ?? 'openrouter_free_llm',
            seriesContext
          },
          showBiblePath,
          { client: this.client }
        );
      } catch (e) {
        return this.finish(count, episodes, warnings, `episode ${episodeId}: director threw: ${(e as Error).message}`);
      }

      if (directed.status !== 'ok' || !directed.episodeBatch) {
        episodes.push({ episodeId, status: 'refused', refusals: directed.refusals, model: directed.meta.model });
        return this.finish(count, episodes, warnings, `episode ${episodeId} refused by vocabulary/schema gate`);
      }

      const compiled = this.compiler.compile(directed.episodeBatch, loaded.crossRefs, {
        controllerMaps,
        gestureLibraries
      });
      if (compiled.status !== 'compiled') {
        episodes.push({
          episodeId,
          status: 'rejected',
          refusals: compiled.rejections.map(r => `${r.shotId}: ${r.violations.map(v => v.kind).join(',')}`),
          model: directed.meta.model
        });
        return this.finish(count, episodes, warnings, `episode ${episodeId} failed the compiler gate`);
      }

      const record: SeriesEpisodeRecord = this.memory.recordEpisode(directed.episodeBatch, compiled);
      episodes.push({
        episodeId,
        status: 'compiled',
        refusals: [],
        totals: compiled.totals,
        digest: record.digest,
        model: directed.meta.model
      });
      warnings.push(...directed.warnings.map(w => `${episodeId}: ${w}`));
    }

    return {
      status: 'completed',
      completedEpisodes: episodes.filter(e => e.status === 'compiled').length,
      requestedEpisodes: count,
      episodes,
      seasonDigest: this.memory.seasonDigest(production),
      warnings
    };
  }

  private finish(
    requested: number,
    episodes: SeasonEpisodeOutcome[],
    warnings: string[],
    reason: string
  ): DirectSeasonResult {
    warnings.push(`season stopped early: ${reason}`);
    return {
      status: 'partial',
      completedEpisodes: episodes.filter(e => e.status === 'compiled').length,
      requestedEpisodes: requested,
      episodes,
      warnings
    };
  }
}
