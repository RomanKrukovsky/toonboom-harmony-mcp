import type {
  PerformancePIR,
  TransformTrack
} from '../../schemas/performancePir.js';
import { performancePirSchema } from '../../schemas/performancePir.js';

/**
 * LipsyncKeyService — compiles dialogue phonemes into mouth openness keys.
 *
 * For each dialogue entry the frame span is chunked evenly across its
 * phonemes; every chunk start emits a key on the mouth node's transform
 * track where scaleY = openness and scaleX = 1 + 0.15 * openness, with
 * LINEAR interpolation. Between consecutive words a rest key closes the
 * mouth. Keys landing on an existing frame overwrite that key's values
 * (other transform fields are preserved) instead of duplicating it.
 *
 * Honesty contract:
 *   - A phoneme absent from the openness map produces a warning and falls
 *     back to the rest openness. Nothing is guessed.
 *   - Pure deterministic function: same inputs -> byte-identical output.
 */

export interface DialogueEntry {
  startFrame: number;
  endFrame: number;
  phonemes: string[];
}

export interface LipsyncOptions {
  mouthNodeId: string;
  dialogue: DialogueEntry[];
  phonemeToOpenness?: Record<string, number>;
}

export interface LipsyncResult {
  performance: PerformancePIR;
  warnings: string[];
  keysAdded: number;
}

export const DEFAULT_PHONEME_OPENNESS: Record<string, number> = {
  A: 0.9,
  E: 0.7,
  I: 0.5,
  O: 0.8,
  U: 0.4,
  MBP: 0.1,
  FV: 0.3,
  L: 0.6,
  WQ: 0.35,
  X: 0.2,
  rest: 0.15
};

type MouthKey = TransformTrack['keys'][number];

function clampOpenness(value: number): number {
  return Math.min(1, Math.max(Number.EPSILON, value));
}

const SCALE_X_SPREAD = 0.15;

export class LipsyncKeyService {
  applyLipsync(performance: PerformancePIR, options: LipsyncOptions): LipsyncResult {
    const warnings: string[] = [];
    const opennessMap = { ...DEFAULT_PHONEME_OPENNESS, ...(options.phonemeToOpenness ?? {}) };
    const restOpenness = clampOpenness(opennessMap.rest ?? DEFAULT_PHONEME_OPENNESS.rest);

    const tracksByKey = new Map<string, TransformTrack>();
    for (const t of performance.tracks) {
      tracksByKey.set(t.nodeId, { nodeId: t.nodeId, keys: t.keys.map(k => ({ ...k })) });
    }

    const track = tracksByKey.get(options.mouthNodeId) ?? { nodeId: options.mouthNodeId, keys: [] };
    const byFrame = new Map<number, MouthKey>();
    for (const k of track.keys) byFrame.set(k.frame, { ...k });

    let keysAdded = 0;

    const writeKey = (frame: number, openness: number): void => {
      if (!byFrame.has(frame)) keysAdded++;
      byFrame.set(frame, {
        ...(byFrame.get(frame) ?? {}),
        frame,
        scaleY: openness,
        scaleX: 1 + SCALE_X_SPREAD * openness,
        interpolation: 'LINEAR'
      });
    };

    const opennessOf = (phoneme: string): number => {
      const hit = opennessMap[phoneme] ?? opennessMap[phoneme.toUpperCase()];
      if (hit !== undefined) return clampOpenness(hit);
      warnings.push(
        `phoneme "${phoneme}" not found in openness map — using rest openness (${restOpenness})`
      );
      return restOpenness;
    };

    for (let w = 0; w < options.dialogue.length; w++) {
      const line = options.dialogue[w];
      const span = line.endFrame - line.startFrame;
      const count = line.phonemes.length;
      if (count <= 0 || span < 0) continue;
      for (let i = 0; i < count; i++) {
        const frame = line.startFrame + Math.round((i * span) / count);
        writeKey(frame, opennessOf(line.phonemes[i]));
      }
      if (w < options.dialogue.length - 1) writeKey(line.endFrame, restOpenness);
    }

    track.keys = Array.from(byFrame.values()).sort((a, b) => a.frame - b.frame);
    tracksByKey.set(options.mouthNodeId, track);

    const out: PerformancePIR = {
      ...performance,
      tracks: Array.from(tracksByKey.values()).map(t => ({
        nodeId: t.nodeId,
        keys: [...t.keys].sort((a, b) => a.frame - b.frame)
      }))
    };

    return { performance: performancePirSchema.parse(out), warnings, keysAdded };
  }
}
