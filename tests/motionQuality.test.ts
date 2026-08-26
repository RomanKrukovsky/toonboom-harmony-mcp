import { MotionQualityAnalyzer, motionQualityReportSchema } from '../src/services/motionQuality/index.js';
import type { PerformancePIR } from '../src/schemas/performancePir.js';

function makePerformance(overrides: Partial<PerformancePIR>): PerformancePIR {
  return {
    schema: 'toon-boom-mcp/performance-pir-v1',
    performanceId: 'PERF-MQ-01',
    characterId: 'char_main_v1',
    durationFrames: 24,
    fps: 24,
    tracks: [],
    holds: [],
    ...overrides
  };
}

describe('MotionQualityAnalyzer', () => {
  const analyzer = new MotionQualityAnalyzer();

  it('scores a static track (identical keys) with perfect smoothness', () => {
    const performance = makePerformance({
      tracks: [
        {
          nodeId: 'NODE_HEAD_PEG',
          keys: [
            { frame: 1, rotation: 45, interpolation: 'LINEAR' },
            { frame: 13, rotation: 45, interpolation: 'LINEAR' }
          ]
        }
      ]
    });

    const report = analyzer.analyze(performance);

    expect(report.schemaVersion).toBe('1.0');
    expect(report.performanceId).toBe('PERF-MQ-01');
    expect(report.tracks).toHaveLength(1);

    const track = report.tracks[0];
    expect(track.nodeId).toBe('NODE_HEAD_PEG');
    expect(track.keyCount).toBe(2);
    expect(track.avgSpeedPxPerFrame).toBe(0);
    expect(track.maxJerk).toBe(0);
    expect(track.smoothnessScore).toBe(1);
    expect(report.overallSmoothness).toBe(1);
  });

  it('scores a jagged track (alternating ±80deg) below 0.5 smoothness', () => {
    const performance = makePerformance({
      tracks: [
        {
          nodeId: 'NODE_LEFT_ARM_PEG',
          keys: [
            { frame: 1, rotation: 80, interpolation: 'LINEAR' },
            { frame: 3, rotation: -80, interpolation: 'LINEAR' },
            { frame: 5, rotation: 80, interpolation: 'LINEAR' },
            { frame: 7, rotation: -80, interpolation: 'LINEAR' }
          ]
        }
      ]
    });

    const report = analyzer.analyze(performance);
    const track = report.tracks[0];

    expect(track.keyCount).toBe(4);
    expect(track.maxJerk).toBeGreaterThan(0);
    expect(track.smoothnessScore).toBeLessThan(0.5);
    expect(report.overallSmoothness).toBeLessThan(0.5);
  });

  it('is fully deterministic across repeated analyses', () => {
    const performance = makePerformance({
      tracks: [
        {
          nodeId: 'NODE_TORSO_PEG',
          keys: [
            { frame: 1, x: 0, y: 0, interpolation: 'BEZIER' },
            { frame: 6, x: 10, y: 4, interpolation: 'LINEAR' },
            { frame: 11, x: 3, y: 9, interpolation: 'BEZIER' },
            { frame: 16, x: 12, y: 1, interpolation: 'LINEAR' }
          ]
        },
        {
          nodeId: 'NODE_HEAD_PEG',
          keys: [
            { frame: 1, rotation: 0, interpolation: 'LINEAR' },
            { frame: 8, rotation: 30, interpolation: 'LINEAR' },
            { frame: 16, rotation: -15, interpolation: 'LINEAR' }
          ]
        }
      ]
    });

    const a = analyzer.analyze(performance);
    const b = analyzer.analyze(performance);

    expect(b).toEqual(a);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(a.measuredAt).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('produces a report that satisfies motionQualityReportSchema', () => {
    const performance = makePerformance({
      tracks: [
        {
          nodeId: 'NODE_RIGHT_ARM_PEG',
          keys: [
            { frame: 1, rotation: 0, interpolation: 'LINEAR' },
            { frame: 5, rotation: 40, interpolation: 'LINEAR' },
            { frame: 9, rotation: -40, interpolation: 'LINEAR' },
            { frame: 13, rotation: 20, interpolation: 'LINEAR' }
          ]
        }
      ]
    });

    const report = analyzer.analyze(performance);
    const parsed = motionQualityReportSchema.safeParse(report);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.schemaVersion).toBe('1.0');
      expect(parsed.data.tracks[0].smoothnessScore).toBeGreaterThanOrEqual(0);
      expect(parsed.data.tracks[0].smoothnessScore).toBeLessThanOrEqual(1);
      expect(parsed.data.overallSmoothness).toBeGreaterThanOrEqual(0);
      expect(parsed.data.overallSmoothness).toBeLessThanOrEqual(1);
    }
  });
});
