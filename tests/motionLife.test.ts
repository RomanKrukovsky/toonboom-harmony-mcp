import stringify from 'fast-json-stable-stringify';
import { MotionLifeService } from '../src/services/motionLife/index.js';
import {
  shotManifestSchema,
  type ShotManifest
} from '../src/schemas/shotManifest.js';
import type { PerformancePIR } from '../src/schemas/performancePir.js';

function baseManifest(): ShotManifest {
  return shotManifestSchema.parse({
    schemaVersion: '1.0',
    shotId: 'shot_motion_life_test',
    showBibleRef: 'fixtures/show_bible/show_bible.json',
    production: 'polygon_show',
    episode: 'E01',
    sceneName: 'S01',
    description: 'motion life unit fixture',
    staging: {
      positions: [{ characterId: 'char_main_v1', preset: 'center' }],
      shotSize: 'medium_close_up',
      cameraMove: 'static',
      backgroundRef: 'bg/room_v1.png'
    },
    timing: {
      totalFrames: 40,
      fps: 24,
      minBeatFrames: 2,
      maxBeatFrames: 96,
      anticipationFrames: 4,
      followThroughFrames: 6,
      pauseBeforeBeats: {}
    },
    beats: [
      // Long hold: 24 frames -> gets life.
      { beatId: 'long_beat', startFrame: 1, endFrame: 24, characterId: 'char_main_v1', intent: 'hold_gaze', emotion: 'neutral' },
      // Short beat: 4 frames -> untouched.
      { beatId: 'short_beat', startFrame: 25, endFrame: 28, characterId: 'char_main_v1', intent: 'react', emotion: 'neutral' }
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
    performanceId: 'PERF-MOTIONLIFE0000',
    characterId: 'char_main_v1',
    durationFrames: 40,
    fps: 24,
    tracks: [
      { nodeId: 'NODE_HEAD_PEG', keys: [{ frame: 1, interpolation: 'LINEAR' }, { frame: 24, interpolation: 'LINEAR' }] },
      { nodeId: 'NODE_EYES_PEG', keys: [{ frame: 1, interpolation: 'CONSTANT' }, { frame: 24, interpolation: 'CONSTANT' }] }
    ],
    holds: [],
    shotManifestRef: 'shot_motion_life_test'
  };
}

describe('MotionLifeService.applyHoldLife', () => {
  it('is deterministic across repeated calls', () => {
    const service = new MotionLifeService();
    const a = service.applyHoldLife(baseManifest(), basePerformance(), {
      headNodeId: 'NODE_HEAD_PEG',
      blinkNodeId: 'NODE_EYES_PEG'
    });
    const b = service.applyHoldLife(baseManifest(), basePerformance(), {
      headNodeId: 'NODE_HEAD_PEG',
      blinkNodeId: 'NODE_EYES_PEG'
    });
    expect(stringify(a.performance)).toBe(stringify(b.performance));
    expect(stringify(a.beatsEnlivened)).toBe(stringify(b.beatsEnlivened));
    expect(stringify(a.addedKeys)).toBe(stringify(b.addedKeys));
  });

  it('adds micro-motion keys only inside long beats', () => {
    const { performance, beatsEnlivened } = new MotionLifeService().applyHoldLife(
      baseManifest(),
      basePerformance(),
      { headNodeId: 'NODE_HEAD_PEG', blinkNodeId: 'NODE_EYES_PEG' }
    );

    expect(beatsEnlivened).toEqual(['long_beat']);

    const head = performance.tracks.find(t => t.nodeId === 'NODE_HEAD_PEG')!;
    const originalHeadFrames = [1, 24];
    const addedHeadKeys = head.keys.filter(k => !originalHeadFrames.includes(k.frame));
    expect(addedHeadKeys.length).toBe(3);
    for (const key of addedHeadKeys) {
      expect(key.frame).toBeGreaterThan(1);
      expect(key.frame).toBeLessThan(24); // strictly inside the long beat span
      expect(key.interpolation).toBe('LINEAR');
      expect(Math.abs(key.rotation!)).toBeLessThanOrEqual(2);
    }

    const eyes = performance.tracks.find(t => t.nodeId === 'NODE_EYES_PEG')!;
    const dipKeys = eyes.keys.filter(k => !originalHeadFrames.includes(k.frame));
    expect(dipKeys.length).toBe(6); // two dips x three frames
    expect(dipKeys.every(k => k.interpolation === 'CONSTANT')).toBe(true);
    const dipRotations = [...new Set(dipKeys.map(k => k.rotation ?? 0))];
    expect(dipRotations.sort((a, b) => a - b)).toEqual([0, 10]);
    for (const key of dipKeys) {
      expect(key.frame).toBeGreaterThanOrEqual(1);
      expect(key.frame).toBeLessThan(24);
    }

    // Short beat span (25..28) gained nothing on any track.
    for (const track of performance.tracks) {
      expect(track.keys.filter(k => k.frame >= 25 && k.frame <= 28)).toEqual([]);
    }
  });

  it('does not mutate the input performance and skips short beats when minHoldFrames raised', () => {
    const perf = basePerformance();
    const { performance, beatsEnlivened, addedKeys } = new MotionLifeService().applyHoldLife(
      baseManifest(),
      perf,
      { headNodeId: 'NODE_HEAD_PEG', blinkNodeId: 'NODE_EYES_PEG', minHoldFrames: 30 }
    );
    expect(perf.tracks[0].keys.length).toBe(2); // input untouched
    expect(beatsEnlivened).toEqual([]);
    expect(addedKeys).toBe(0);
    expect(performance.tracks.map(t => t.keys.length)).toEqual([2, 2]);
  });
});

describe('MotionLifeService.generateWalkCycle', () => {
  const nodeIdMap = {
    hipNodeId: 'NODE_HIP_PEG',
    kneeNodeId: 'NODE_KNEE_PEG',
    footNodeId: 'NODE_FOOT_PEG'
  };

  it('is deterministic across repeated calls', () => {
    const service = new MotionLifeService();
    const a = service.generateWalkCycle('char_main_v1', nodeIdMap, 10, 3, 12);
    const b = service.generateWalkCycle('char_main_v1', nodeIdMap, 10, 3, 12);
    expect(stringify(a)).toBe(stringify(b));
  });

  it('produces cycles * framesPerCycle LINEAR keys per track starting at startFrame', () => {
    const tracks = new MotionLifeService().generateWalkCycle('char_main_v1', nodeIdMap, 10, 3, 12);
    expect(tracks.map(t => t.nodeId)).toEqual(['NODE_HIP_PEG', 'NODE_KNEE_PEG', 'NODE_FOOT_PEG']);
    for (const track of tracks) {
      expect(track.keys.length).toBe(36);
      expect(track.keys[0].frame).toBe(10);
      expect(track.keys.at(-1)!.frame).toBe(45);
      expect(track.keys.every(k => k.interpolation === 'LINEAR')).toBe(true);
    }
  });

  it('keeps knee in 0..-45deg with half-cycle phase offset from the hip sinusoid', () => {
    const tracks = new MotionLifeService().generateWalkCycle('char_main_v1', nodeIdMap, 1, 2, 12);
    const hip = tracks.find(t => t.nodeId === 'NODE_HIP_PEG')!;
    const knee = tracks.find(t => t.nodeId === 'NODE_KNEE_PEG')!;
    const foot = tracks.find(t => t.nodeId === 'NODE_FOOT_PEG')!;

    for (const key of knee.keys) {
      expect(key.rotation!).toBeLessThanOrEqual(0);
      expect(key.rotation!).toBeGreaterThanOrEqual(-45);
    }
    for (const key of hip.keys) {
      expect(Math.abs(key.rotation!)).toBeLessThanOrEqual(25);
    }
    for (const key of foot.keys) {
      expect(Math.abs(key.rotation!)).toBeLessThanOrEqual(15);
    }

    // Same frame, different phase: hip peaks where knee bottoms out.
    for (let i = 0; i < hip.keys.length; i++) {
      expect(hip.keys[i].rotation).not.toBe(knee.keys[i].rotation);
    }
    // Half-cycle offset: knee(t) = -22.5 * (1 - sin(phase)) mirrors the hip
    // sinusoid one half cycle later -> knee bottoms out where hip peaks.
    for (let i = 0; i < hip.keys.length; i++) {
      const hipSin = (hip.keys[i].rotation ?? 0) / 25;
      expect(knee.keys[i].rotation).toBeCloseTo(-22.5 * (1 - hipSin), 3);
    }
    expect(knee.keys[3].rotation).toBe(0);   // hip peak frame
    expect(knee.keys[9].rotation).toBe(-45); // hip trough frame
    // Foot leads hip by a quarter cycle: cos vs sin.
    expect(foot.keys[0].rotation).toBeCloseTo(15, 3);
    expect(hip.keys[0].rotation).toBe(0);
  });
});
