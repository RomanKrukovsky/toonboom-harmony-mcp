import stringify from 'fast-json-stable-stringify';
import { LipsyncKeyService } from '../src/services/lipsyncKeys/index.js';
import type { PerformancePIR } from '../src/schemas/performancePir.js';

function freshPir(): PerformancePIR {
  return {
    schema: 'toon-boom-mcp/performance-pir-v1',
    performanceId: 'PERF-LIPSYNC0000001',
    characterId: 'char_main_v1',
    durationFrames: 24,
    fps: 24,
    tracks: [
      { nodeId: 'NODE_MOUTH_PEG', keys: [] },
      { nodeId: 'NODE_HEAD_PEG', keys: [] }
    ],
    holds: []
  };
}

const DIALOGUE = [
  { startFrame: 1, endFrame: 12, phonemes: ['A', 'E', 'I'] },
  { startFrame: 13, endFrame: 24, phonemes: ['O', 'U', 'A'] }
];

const MOUTH_NODE = 'NODE_MOUTH_PEG';

describe('LipsyncKeyService', () => {
  it('emits openness keys on the mouth track for dialogue', () => {
    const { performance, warnings, keysAdded } = new LipsyncKeyService().applyLipsync(freshPir(), {
      mouthNodeId: MOUTH_NODE,
      dialogue: DIALOGUE
    });

    expect(warnings).toEqual([]);
    expect(keysAdded).toBeGreaterThan(0);

    const mouth = performance.tracks.find(t => t.nodeId === MOUTH_NODE)!;
    expect(mouth.keys.length).toBeGreaterThan(0);
    expect(mouth.keys[0].frame).toBe(1);
    for (const k of mouth.keys) {
      expect(k.scaleY!).toBeGreaterThan(0);
      expect(k.scaleY!).toBeLessThanOrEqual(1);
      expect(k.scaleX!).toBeCloseTo(1 + 0.15 * (k.scaleY as number), 10);
      expect(k.interpolation).toBe('LINEAR');
    }

    // rest key closes the mouth between the two words
    expect(mouth.keys.find(k => k.frame === 12)?.scaleY).toBeCloseTo(0.15, 10);

    // other tracks stay untouched
    expect(performance.tracks.find(t => t.nodeId === 'NODE_HEAD_PEG')!.keys).toEqual([]);
  });

  it('is deterministic across repeated runs', () => {
    const service = new LipsyncKeyService();
    const a = service.applyLipsync(freshPir(), { mouthNodeId: MOUTH_NODE, dialogue: DIALOGUE });
    const b = service.applyLipsync(freshPir(), { mouthNodeId: MOUTH_NODE, dialogue: DIALOGUE });
    expect(stringify(a.performance)).toBe(stringify(b.performance));
    expect(a.warnings).toEqual(b.warnings);
    expect(a.keysAdded).toBe(b.keysAdded);
  });

  it('warns and uses rest value for unknown phonemes', () => {
    const dialogue = [{ startFrame: 1, endFrame: 6, phonemes: ['ZZZ'] }];
    const { performance, warnings } = new LipsyncKeyService().applyLipsync(freshPir(), {
      mouthNodeId: MOUTH_NODE,
      dialogue
    });
    expect(warnings.some(w => w.includes('"ZZZ"'))).toBe(true);
    const mouth = performance.tracks.find(t => t.nodeId === MOUTH_NODE)!;
    expect(mouth.keys.find(k => k.frame === 1)?.scaleY).toBeCloseTo(0.15, 10);
  });

  it('overwrites an existing key at the same frame instead of duplicating', () => {
    const pir = freshPir();
    pir.tracks[0].keys.push({
      frame: 5,
      scaleY: 0.99,
      scaleX: 2,
      rotation: 42,
      interpolation: 'BEZIER'
    });

    const baseline = new LipsyncKeyService().applyLipsync(freshPir(), {
      mouthNodeId: MOUTH_NODE,
      dialogue: DIALOGUE
    });
    const { performance, keysAdded } = new LipsyncKeyService().applyLipsync(pir, {
      mouthNodeId: MOUTH_NODE,
      dialogue: DIALOGUE
    });

    const atFive = performance.tracks[0].keys.filter(k => k.frame === 5);
    expect(atFive).toHaveLength(1);
    const expected = baseline.performance.tracks[0].keys.find(k => k.frame === 5)!;
    expect(atFive[0].scaleY).toBe(expected.scaleY);
    expect(atFive[0].rotation).toBe(42);
    expect(keysAdded).toBe(baseline.keysAdded - 1);
  });
});
