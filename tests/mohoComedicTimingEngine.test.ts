import { describe, expect, it } from '@jest/globals';
import { MohoComedicTimingEngine } from '../src/services/mohoComedicTimingEngine/index.js';
import type { ComedicTimingInput } from '../src/schemas/mohoComedicTimingSpec.js';

describe('MohoComedicTimingEngine', () => {
  const sampleInput: ComedicTimingInput = {
    characterId: 'comedic_hero',
    baseDurationFrames: 72,
    events: [
      {
        triggerFrame: 20,
        type: 'comedic_hold',
        durationFrames: 14,
        intensity: 1.0
      },
      {
        triggerFrame: 40,
        type: 'eye_dart_anticipation',
        durationFrames: 4,
        intensity: 1.0
      },
      {
        triggerFrame: 40,
        type: 'delayed_blink',
        durationFrames: 4,
        intensity: 1.0
      },
      {
        triggerFrame: 50,
        type: 'anticipation_squash',
        durationFrames: 4,
        intensity: 1.0
      }
    ]
  };

  it('inserts deadpan hold and dilates total timeline duration', () => {
    const result = MohoComedicTimingEngine.applyComedicTiming(sampleInput);

    expect(result.eventsApplied).toBe(4);
    // Base duration was 72; comedic_hold added 14 frames
    expect(result.totalDurationFrames).toBe(72 + 14);

    const headTrack = result.tracks.find(t => t.channel === 'head_angle')!;
    const holdStartKey = headTrack.keys.find(k => k.tag === 'comedic_hold_start')!;
    const holdEndKey = headTrack.keys.find(k => k.tag === 'comedic_hold_end')!;

    expect(holdStartKey).toBeDefined();
    expect(holdEndKey).toBeDefined();
    expect(holdEndKey.frame - holdStartKey.frame).toBe(14);
    expect(holdEndKey.value).toEqual(holdStartKey.value);
  });

  it('triggers eye-dart anticipation 3 frames before head movement', () => {
    const result = MohoComedicTimingEngine.applyComedicTiming(sampleInput);

    const eyeTrack = result.tracks.find(t => t.channel === 'pupil_offset')!;
    const headTrack = result.tracks.find(t => t.channel === 'head_angle')!;

    const eyeDartKey = eyeTrack.keys.find(k => k.tag === 'eye_dart_anticipation')!;
    const headTurnKey = headTrack.keys.find(k => k.tag === 'head_follow_through')!;

    expect(eyeDartKey).toBeDefined();
    expect(headTurnKey).toBeDefined();
    expect(headTurnKey.frame - eyeDartKey.frame).toBe(3);
  });

  it('delays blink after movement settles', () => {
    const result = MohoComedicTimingEngine.applyComedicTiming(sampleInput);

    const blinkTrack = result.tracks.find(t => t.channel === 'eye_blink')!;
    const blinkKey = blinkTrack.keys.find(k => k.tag === 'delayed_blink')!;

    expect(blinkKey).toBeDefined();
    expect(blinkKey.value).toBe(1.0);
  });

  it('compresses scale during anticipation squash', () => {
    const result = MohoComedicTimingEngine.applyComedicTiming(sampleInput);

    const squashTrack = result.tracks.find(t => t.channel === 'torso_squash')!;
    const squashKey = squashTrack.keys.find(k => k.tag === 'anticipation_squash')!;

    expect(squashKey).toBeDefined();
    expect(squashKey.value).toBeLessThan(1.0);
    expect(squashKey.value).toBeCloseTo(0.85, 2);
  });
});
