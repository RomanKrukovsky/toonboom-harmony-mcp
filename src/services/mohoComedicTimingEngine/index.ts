import type {
  ComedicTimingInput,
  RetimedKeyframe,
  RetimedTrack
} from '../../schemas/mohoComedicTimingSpec.js';

export interface ComedicTimingResult {
  characterId: string;
  totalDurationFrames: number;
  tracks: RetimedTrack[];
  eventsApplied: number;
}

export class MohoComedicTimingEngine {
  /**
   * Modifies timeline animation tracks with comedic and dramatic acting modifiers
   * (deadpan holds, eye-dart anticipation, delayed blinks, anticipation squash).
   */
  public static applyComedicTiming(input: ComedicTimingInput): ComedicTimingResult {
    let currentDuration = input.baseDurationFrames;
    const sortedEvents = [...input.events].sort((a, b) => a.triggerFrame - b.triggerFrame);

    const headKeys: RetimedKeyframe[] = [];
    const eyeKeys: RetimedKeyframe[] = [];
    const blinkKeys: RetimedKeyframe[] = [];
    const squashKeys: RetimedKeyframe[] = [];

    // Initialize default keys
    headKeys.push({ frame: 1, value: 0, isHold: false });
    eyeKeys.push({ frame: 1, value: 0, isHold: false });
    blinkKeys.push({ frame: 1, value: 0, isHold: false });
    squashKeys.push({ frame: 1, value: 1.0, isHold: false });

    let cumulativeFrameOffset = 0;

    for (const event of sortedEvents) {
      const effectiveTrigger = event.triggerFrame + cumulativeFrameOffset;

      switch (event.type) {
        case 'comedic_hold': {
          // Deadpan freeze: hold head at current position for durationFrames
          headKeys.push({
            frame: effectiveTrigger,
            value: 15 * event.intensity,
            isHold: true,
            tag: 'comedic_hold_start'
          });
          headKeys.push({
            frame: effectiveTrigger + event.durationFrames,
            value: 15 * event.intensity,
            isHold: true,
            tag: 'comedic_hold_end'
          });
          cumulativeFrameOffset += event.durationFrames;
          break;
        }

        case 'eye_dart_anticipation': {
          // Eyes dart 3 frames BEFORE head turn
          const eyeDartFrame = Math.max(1, effectiveTrigger - 3);
          eyeKeys.push({
            frame: eyeDartFrame,
            value: 1.0 * event.intensity,
            isHold: false,
            tag: 'eye_dart_anticipation'
          });
          headKeys.push({
            frame: effectiveTrigger,
            value: 25 * event.intensity,
            isHold: false,
            tag: 'head_follow_through'
          });
          break;
        }

        case 'delayed_blink': {
          // Blink delayed until 2 frames after pose settles
          blinkKeys.push({
            frame: effectiveTrigger + 2,
            value: 1.0,
            isHold: false,
            tag: 'delayed_blink'
          });
          blinkKeys.push({
            frame: effectiveTrigger + 4,
            value: 0.0,
            isHold: false,
            tag: 'blink_open'
          });
          break;
        }

        case 'anticipation_squash': {
          // Squash 2 frames before movement
          const squashFrame = Math.max(1, effectiveTrigger - 2);
          squashKeys.push({
            frame: squashFrame,
            value: +(1.0 - 0.15 * event.intensity).toFixed(3),
            isHold: false,
            tag: 'anticipation_squash'
          });
          squashKeys.push({
            frame: effectiveTrigger,
            value: +(1.0 + 0.1 * event.intensity).toFixed(3),
            isHold: false,
            tag: 'stretch_overshoot'
          });
          squashKeys.push({
            frame: effectiveTrigger + 4,
            value: 1.0,
            isHold: false,
            tag: 'squash_settle'
          });
          break;
        }

        default: {
          const exhaustive: never = event.type;
          throw new Error(`Unhandled comedic event type: ${exhaustive}`);
        }
      }
    }

    currentDuration += cumulativeFrameOffset;

    // Settle keys at end of duration
    headKeys.push({ frame: currentDuration, value: 0, isHold: false });
    eyeKeys.push({ frame: currentDuration, value: 0, isHold: false });
    blinkKeys.push({ frame: currentDuration, value: 0, isHold: false });
    squashKeys.push({ frame: currentDuration, value: 1.0, isHold: false });

    return {
      characterId: input.characterId,
      totalDurationFrames: currentDuration,
      tracks: [
        { channel: 'head_angle', keys: headKeys },
        { channel: 'pupil_offset', keys: eyeKeys },
        { channel: 'eye_blink', keys: blinkKeys },
        { channel: 'torso_squash', keys: squashKeys }
      ],
      eventsApplied: sortedEvents.length
    };
  }
}
