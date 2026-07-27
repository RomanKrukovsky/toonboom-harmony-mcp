import { performancePirSchema, type PerformancePIR } from '../src/schemas/performancePir.js';

describe('PerformancePIR v1 additive fields', () => {
  const v1Minimal: PerformancePIR = {
    schema: 'toon-boom-mcp/performance-pir-v1',
    performanceId: 'PERF-01',
    characterId: 'char_main_v1',
    durationFrames: 48,
    fps: 24,
    tracks: [
      {
        nodeId: 'NODE_HEAD_PEG',
        keys: [
          { frame: 1, rotation: 0, interpolation: 'LINEAR' },
          { frame: 24, rotation: 10, x: 0.1, y: 0.2, interpolation: 'CONSTANT' }
        ]
      }
    ],
    holds: [{ startFrame: 40, endFrame: 48 }]
  };

  it('still parses a v1-minimal PerformancePIR (backward compatible)', () => {
    expect(performancePirSchema.safeParse(v1Minimal).success).toBe(true);
  });

  it('parses a PerformancePIR carrying ShotManifest staging/timing context', () => {
    const withStaging: PerformancePIR = {
      ...v1Minimal,
      shotManifestRef: 'shots/shot_001/shot_manifest.json',
      staging: { shotSize: 'close_up', cameraMove: 'static', backgroundRef: 'bg/room_v1.png' },
      timing: { totalFrames: 48, minBeatFrames: 2, maxBeatFrames: 96, anticipationFrames: 4, followThroughFrames: 6 },
      beatFrameMap: [
        { beatId: 'b1', startFrame: 1, endFrame: 24 },
        { beatId: 'b2', startFrame: 25, endFrame: 48 }
      ]
    };
    expect(performancePirSchema.safeParse(withStaging).success).toBe(true);
  });

  it('rejects a PerformancePIR with an unknown camera move', () => {
    const bad = { ...v1Minimal, staging: { shotSize: 'close_up', cameraMove: 'teleport' } } as any;
    expect(performancePirSchema.safeParse(bad).success).toBe(false);
  });
});