import { z } from 'zod';
import type { PerformancePIR, TransformTrack } from '../../schemas/performancePir.js';

export const motionQualityReportSchema = z.object({
  schemaVersion: z.literal('1.0'),
  performanceId: z.string(),
  tracks: z.array(z.object({
    nodeId: z.string(),
    keyCount: z.number().int().min(0),
    avgSpeedPxPerFrame: z.number().min(0),
    maxJerk: z.number().min(0),
    smoothnessScore: z.number().min(0).max(1)
  })),
  overallSmoothness: z.number().min(0).max(1),
  measuredAt: z.string()
});

export type MotionQualityReport = z.infer<typeof motionQualityReportSchema>;
export type TrackQuality = MotionQualityReport['tracks'][number];

interface Vec2 {
  x: number;
  y: number;
}

const vecSub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const vecLen = (a: Vec2): number => Math.sqrt(a.x * a.x + a.y * a.y);

const clamp01 = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
};

function sortedKeys(track: TransformTrack): TransformTrack['keys'] {
  return [...track.keys].sort((a, b) => a.frame - b.frame);
}

function usesTranslation(keys: TransformTrack['keys']): boolean {
  return keys.some(k => k.x !== undefined || k.y !== undefined);
}

function keyValue(key: TransformTrack['keys'][number], translation: boolean): Vec2 {
  if (translation) {
    return { x: key.x ?? 0, y: key.y ?? 0 };
  }
  return { x: key.rotation ?? 0, y: 0 };
}

function analyzeTrack(track: TransformTrack): TrackQuality {
  const keys = sortedKeys(track);
  const translation = usesTranslation(keys);
  const values = keys.map(k => keyValue(k, translation));

  const speeds: number[] = [];
  const velocities: Array<{ vec: Vec2; spanFrames: number }> = [];

  for (let i = 1; i < keys.length; i++) {
    const df = keys[i].frame - keys[i - 1].frame;
    if (df <= 0) continue;
    const vec = {
      x: (values[i].x - values[i - 1].x) / df,
      y: (values[i].y - values[i - 1].y) / df
    };
    velocities.push({ vec, spanFrames: df });
    speeds.push(vecLen(vec));
  }

  const accelerations: Vec2[] = [];
  for (let i = 1; i < velocities.length; i++) {
    const midSpan = (velocities[i].spanFrames + velocities[i - 1].spanFrames) / 2;
    const d = vecSub(velocities[i].vec, velocities[i - 1].vec);
    accelerations.push({ x: d.x / midSpan, y: d.y / midSpan });
  }

  const jerks: number[] = [];
  for (let i = 1; i < accelerations.length; i++) {
    jerks.push(vecLen(vecSub(accelerations[i], accelerations[i - 1])));
  }

  const avgSpeed = speeds.length > 0
    ? speeds.reduce((s, v) => s + v, 0) / speeds.length
    : 0;
  const meanJerk = jerks.length > 0
    ? jerks.reduce((s, j) => s + j, 0) / jerks.length
    : 0;
  const maxJerk = jerks.length > 0 ? Math.max(...jerks) : 0;

  const speedScale = speeds.length > 0 ? Math.max(...speeds) : 0;
  const normalizedJerk = speedScale > 0 ? meanJerk / speedScale : 0;
  const smoothnessScore = clamp01(1 - normalizedJerk);

  return {
    nodeId: track.nodeId,
    keyCount: keys.length,
    avgSpeedPxPerFrame: avgSpeed,
    maxJerk,
    smoothnessScore
  };
}

export class MotionQualityAnalyzer {
  analyze(performance: PerformancePIR): MotionQualityReport {
    const tracks = performance.tracks.map(analyzeTrack);
    const overallSmoothness = tracks.length > 0
      ? tracks.reduce((s, t) => s + t.smoothnessScore, 0) / tracks.length
      : 1;

    return {
      schemaVersion: '1.0',
      performanceId: performance.performanceId,
      tracks,
      overallSmoothness,
      measuredAt: `deterministic-static-analysis:durationFrames=${performance.durationFrames};fps=${performance.fps}`
    };
  }
}
