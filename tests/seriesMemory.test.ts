import fs from 'fs';
import path from 'path';
import { episodeBatchSchema, type EpisodeBatch } from '../src/schemas/episodeBatch.js';
import { SeriesMemoryStore } from '../src/services/seriesMemory/index.js';

const BASE = path.join('output', '__series_memory_test');

let counter = 0;

function makeRoot(): string {
  return path.join(BASE, `run-${++counter}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

function makeBatch(episodeId: string, production: string): EpisodeBatch {
  // Shape copied from fixtures/show_bible/episode_e01_batch.json (first shot).
  return episodeBatchSchema.parse({
    schemaVersion: '1.0',
    episodeId,
    production,
    showBibleRef: 'fixtures/show_bible/show_bible.json',
    director: 'llm_director_v1',
    createdAt: '2026-07-27T12:00:00Z',
    shots: [
      {
        shotId: `${episodeId}_S01_SH01`,
        sceneName: 'S01',
        description: 'Mira looks up from her desk.',
        staging: {
          positions: [{ characterId: 'char_main_v1', preset: 'center' }],
          shotSize: 'medium_shot',
          cameraMove: 'static',
          backgroundRef: 'bg/room_v1.png'
        },
        timing: {
          totalFrames: 48,
          fps: 24,
          minBeatFrames: 2,
          maxBeatFrames: 96,
          anticipationFrames: 4,
          followThroughFrames: 6,
          pauseBeforeBeats: {}
        },
        beats: [
          { beatId: 'b1', startFrame: 1, endFrame: 24, characterId: 'char_main_v1', intent: 'look_up', emotion: 'neutral' },
          { beatId: 'b2', startFrame: 25, endFrame: 48, characterId: 'char_main_v1', intent: 'react', emotion: 'surprise', gestureId: 'point' }
        ],
        fx: [],
        render: { preview: true, format: 'mp4', quality: 'standard' },
        sourceScriptRef: 'scripts/E01/S01.txt'
      }
    ]
  });
}

describe('SeriesMemoryStore', () => {
  afterAll(() => {
    fs.rmSync(BASE, { recursive: true, force: true });
  });

  test('recordEpisode writes season.json and episode file; contextBlock contains logline', () => {
    const root = makeRoot();
    const store = new SeriesMemoryStore(root);
    const prod = 'polygon_show_test';
    const batch = makeBatch('E01', prod);

    const record = store.recordEpisode(batch, {
      totals: { shots: 1, beats: 2, commands: 4, totalFrames: 48 },
      episodeContentDigest: 'digest-e01'
    });

    expect(record.episodeId).toBe('E01');
    const dir = path.join(root, 'series_memory', prod);
    expect(fs.existsSync(path.join(dir, 'season.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'episodes', 'E01.json'))).toBe(true);

    const context = store.contextBlock(prod);
    expect(context).toContain('S01: Mira looks up from her desk.');
  });

  test('updateCharacterState merges per character across calls; getCharacterContext renders both lines', () => {
    const root = makeRoot();
    const store = new SeriesMemoryStore(root);
    const prod = 'polygon_show_chars';

    store.updateCharacterState(prod, 'E01', [
      { characterId: 'Mira', status: 'active', location: 'room', relationships: [{ withCharacterId: 'Bob', stance: 'ally' }] }
    ]);
    store.updateCharacterState(prod, 'E02', [
      { characterId: 'Bob', status: 'active', location: 'lab', relationships: [{ withCharacterId: 'Mira', stance: 'rival' }] },
      { characterId: 'Mira', location: 'office' }
    ]);

    const context = store.getCharacterContext(prod);
    expect(context.startsWith('CHARACTER CONTINUITY (do not contradict):')).toBe(true);
    expect(context).toContain('- Mira:');
    expect(context).toContain('- Bob:');
    expect(context).toContain('ally');
    // Merge semantics: omitted status kept, location overwritten, lastEpisodeId advanced.
    expect(context).toContain('- Mira: active, location=office; ally with Bob (since E02)');
    expect(context).toContain('- Bob: active, location=lab; rival with Mira (since E02)');

    // Persisted to characters.json and re-readable from a fresh store.
    const fresh = new SeriesMemoryStore(root);
    expect(fresh.getCharacterContext(prod)).toBe(context);
  });

  test('stateDigest is stable across calls and changes when state changes', () => {
    const root = makeRoot();
    const store = new SeriesMemoryStore(root);
    const prod = 'polygon_show_digest';

    expect(store.getCharacterContext(prod)).toBe('');

    store.updateCharacterState(prod, 'E01', [{ characterId: 'Mira', status: 'active', location: 'room' }]);

    const d1 = store.stateDigest(prod);
    const d2 = store.stateDigest(prod);
    expect(d1).toBe(d2);
    expect(d1).toMatch(/^sha256:[0-9a-f]{64}$/);

    store.updateCharacterState(prod, 'E02', [{ characterId: 'Mira', location: 'tower' }]);
    expect(store.stateDigest(prod)).not.toBe(d1);
  });

  test('corrupted season.json throws with "corrupted"', () => {
    const root = makeRoot();
    const store = new SeriesMemoryStore(root);
    const prod = 'polygon_show_corrupt';
    store.recordEpisode(makeBatch('E01', prod), {
      totals: { shots: 1, beats: 2, commands: 4, totalFrames: 48 },
      episodeContentDigest: 'digest-e01'
    });

    const seasonPath = path.join(root, 'series_memory', prod, 'season.json');
    fs.writeFileSync(seasonPath, '{ this is not valid json ');

    expect(() => store.loadSeason(prod)).toThrow(/corrupted/);
    expect(() => store.contextBlock(prod)).toThrow(/corrupted/);
  });
});
