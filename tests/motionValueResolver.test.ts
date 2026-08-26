import fs from 'fs';
import path from 'path';
import stringify from 'fast-json-stable-stringify';
import { MotionValueResolver } from '../src/services/motionValueResolver/index.js';
import { gestureTrackLibrarySchema } from '../src/schemas/gestureTracks.js';
import {
  shotManifestSchema,
  type ShotManifest
} from '../src/schemas/shotManifest.js';
import type { PerformancePIR } from '../src/schemas/performancePir.js';

const ROOT = process.cwd();

function baseManifest(): ShotManifest {
  return shotManifestSchema.parse({
    schemaVersion: '1.0',
    shotId: 'shot_mvr_test',
    showBibleRef: 'fixtures/show_bible/show_bible.json',
    production: 'polygon_show',
    episode: 'E01',
    sceneName: 'S01',
    description: 'resolver unit fixture',
    staging: {
      positions: [{ characterId: 'char_main_v1', preset: 'center' }],
      shotSize: 'medium_shot',
      cameraMove: 'static',
      backgroundRef: 'bg/room_v1.png'
    },
    timing: {
      totalFrames: 24,
      fps: 24,
      minBeatFrames: 2,
      maxBeatFrames: 96,
      anticipationFrames: 4,
      followThroughFrames: 6,
      pauseBeforeBeats: {}
    },
    beats: [
      { beatId: 'b1', startFrame: 1, endFrame: 12, characterId: 'char_main_v1', intent: 'point', emotion: 'neutral', gestureId: 'point' },
      { beatId: 'b2', startFrame: 13, endFrame: 24, characterId: 'char_main_v1', intent: 'settle', emotion: 'neutral', gestureId: 'unknown_gesture' }
    ],
    provenance: {
      director: 'unit_test',
      createdAt: '2026-07-27T12:00:00Z',
      sourceScriptRef: 'scripts/E01/S01.txt'
    }
  });
}

function basePerformance(): PerformancePIR {
  return {
    schema: 'toon-boom-mcp/performance-pir-v1',
    performanceId: 'PERF-UNITTEST0000000',
    characterId: 'char_main_v1',
    durationFrames: 24,
    fps: 24,
    tracks: [
      { nodeId: 'NODE_ARM_R_PEG', keys: [{ frame: 1, interpolation: 'LINEAR' }, { frame: 12, interpolation: 'LINEAR' }] },
      { nodeId: 'NODE_HEAD_PEG', keys: [{ frame: 1, interpolation: 'LINEAR' }, { frame: 12, interpolation: 'LINEAR' }] }
    ],
    holds: [],
    shotManifestRef: 'shot_mvr_test'
  };
}

const controllerMaps = {
  char_main_v1: [
    { controllerId: 'HEAD_ROT', nodePath: 'NODE_HEAD_PEG' },
    { controllerId: 'ARM_POINT', nodePath: 'NODE_ARM_R_PEG' }
  ]
};

const library = gestureTrackLibrarySchema.parse(
  JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', 'show_bible', 'gesture_tracks_mira.json'), 'utf-8'))
);

describe('MotionValueResolver', () => {
  it('fills declared gesture curves into beat-boundary keys', () => {
    const { performance, warnings, appliedGestures } = new MotionValueResolver().apply(
      baseManifest(),
      basePerformance(),
      { gestureLibraries: [library], controllerMaps }
    );

    expect(warnings.filter(w => w.includes('beat "b1"'))).toEqual([]);
    expect(appliedGestures.map(a => a.beatId)).toEqual(['b1']);

    const arm = performance.tracks.find(t => t.nodeId === 'NODE_ARM_R_PEG')!;
    // Boundary endpoints take curve endpoint values.
    expect(arm.keys.find(k => k.frame === 1)?.rotation).toBe(0);
    expect(arm.keys.find(k => k.frame === 12)?.rotation).toBe(0);
    // Interior control point resampled into (1..12): offset 5/11 -> ~frame 5.
    const interior = arm.keys.filter(k => k.frame > 1 && k.frame < 12);
    expect(interior.length).toBeGreaterThan(0);

    const head = performance.tracks.find(t => t.nodeId === 'NODE_HEAD_PEG')!;
    expect(head.keys.some(k => k.rotation === 6)).toBe(true);
  });

  it('keeps HOLD and warns for an unknown gestureId', () => {
    const { performance, warnings } = new MotionValueResolver().apply(
      baseManifest(),
      basePerformance(),
      { gestureLibraries: [library], controllerMaps }
    );
    expect(warnings.some(w => w.includes('unknown_gesture') && w.includes('HOLD'))).toBe(true);
    // b2 span has no dedicated track here; nothing new invented.
    expect(performance.tracks.length).toBe(2);
  });

  it('warns and skips controllers missing from the map', () => {
    const partialMaps = { char_main_v1: [{ controllerId: 'HEAD_ROT', nodePath: 'NODE_HEAD_PEG' }] };
    const { warnings } = new MotionValueResolver().apply(baseManifest(), basePerformance(), {
      gestureLibraries: [library],
      controllerMaps: partialMaps
    });
    expect(warnings.some(w => w.includes('"ARM_POINT"') && w.includes('not mapped'))).toBe(true);
  });

  it('is deterministic across repeated applications', () => {
    const resolver = new MotionValueResolver();
    const a = resolver.apply(baseManifest(), basePerformance(), { gestureLibraries: [library], controllerMaps });
    const b = resolver.apply(baseManifest(), basePerformance(), { gestureLibraries: [library], controllerMaps });
    expect(stringify(a.performance)).toBe(stringify(b.performance));
  });

  it('leaves input untouched when no libraries are provided', () => {
    const perf = basePerformance();
    const { performance, warnings, appliedGestures } = new MotionValueResolver().apply(
      baseManifest(),
      perf,
      {}
    );
    expect(performance).toBe(perf);
    expect(warnings).toEqual([]);
    expect(appliedGestures).toEqual([]);
  });
});

describe('MotionValueResolver — overshoot (follow-through)', () => {
  const manifest = shotManifestSchema.parse({
    schemaVersion: '1.0',
    shotId: 'shot_overshoot',
    showBibleRef: 'fixtures/show_bible/show_bible.json',
    production: 'polygon_show',
    episode: 'E01',
    sceneName: 'S01',
    description: 'overshoot unit fixture',
    staging: {
      positions: [{ characterId: 'char_main_v1', preset: 'center' }],
      shotSize: 'medium_shot',
      cameraMove: 'static',
      backgroundRef: 'bg/room_v1.png'
    },
    timing: { totalFrames: 24, fps: 24, minBeatFrames: 2, maxBeatFrames: 96, anticipationFrames: 4, followThroughFrames: 6, pauseBeforeBeats: {} },
    beats: [
      { beatId: 'b1', startFrame: 1, endFrame: 24, characterId: 'char_main_v1', intent: 'point', emotion: 'neutral', gestureId: 'point' }
    ],
    provenance: { director: 'unit_test', createdAt: '2026-07-27T12:00:00Z', sourceScriptRef: 'scripts/E01/S01.txt' }
  });

  it('overshoots the first interior key and settles at the boundary', () => {
    const resolver = new MotionValueResolver();
    const base = resolver.apply(manifest, basePerformance(), { gestureLibraries: [library], controllerMaps });
    const over = resolver.apply(manifest, basePerformance(), { gestureLibraries: [library], controllerMaps, overshoot: 0.25 });

    const armBase = base.performance.tracks.find(t => t.nodeId === 'NODE_ARM_R_PEG')!;
    const armOver = over.performance.tracks.find(t => t.nodeId === 'NODE_ARM_R_PEG')!;
    const firstInteriorBase = armBase.keys.find(k => k.frame > 1 && k.rotation !== undefined && k.frame < 24)!;
    const firstInteriorOver = armOver.keys.find(k => k.frame === firstInteriorBase.frame)!;
    expect(firstInteriorOver.rotation).toBeCloseTo(firstInteriorBase.rotation! * 1.25, 2);
    // Settle: end-frame value identical in both.
    const endBase = armBase.keys.find(k => k.frame === 24)!;
    const endOver = armOver.keys.find(k => k.frame === 24)!;
    expect(endOver.rotation).toBe(endBase.rotation);
  });

  it('default overshoot 0 keeps output identical to the legacy behavior', () => {
    const resolver = new MotionValueResolver();
    const a = resolver.apply(manifest, basePerformance(), { gestureLibraries: [library], controllerMaps });
    const b = resolver.apply(manifest, basePerformance(), { gestureLibraries: [library], controllerMaps, overshoot: 0 });
    expect(stringify(a.performance)).toBe(stringify(b.performance));
  });
});
