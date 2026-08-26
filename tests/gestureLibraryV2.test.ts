/**
 * gesture_library_v2 fixture guard.
 *
 * Validates the placeholder gesture library for char_main_v1 against the
 * gestureTracks schema and pins the invariants MotionValueResolver relies
 * on: exactly the declared 20 gestures, only known controller ids, keys
 * sorted and spanning the full duration, honest placeholder provenance,
 * and byte-deterministic content.
 */

import fs from 'fs';
import path from 'path';
import { gestureTrackLibrarySchema } from '../src/schemas/gestureTracks.js';

const ROOT = process.cwd();
const FIXTURE = path.join(ROOT, 'fixtures', 'gesture_library', 'gesture_library_v2.json');

const EXPECTED_GESTURE_IDS = [
  'point',
  'wave',
  'shrug',
  'nod',
  'head_shake',
  'thumbs_up',
  'facepalm',
  'reach_out',
  'pull_back',
  'lean_forward',
  'lean_back',
  'cower',
  'perk_up',
  'slump',
  'straighten',
  'step_forward',
  'step_back',
  'turn_away',
  'turn_toward',
  'look_around'
];

describe('gesture library v2 fixture', () => {
  const raw = fs.readFileSync(FIXTURE, 'utf-8');
  const library = gestureTrackLibrarySchema.parse(JSON.parse(raw));

  it('parses against gestureTrackLibrarySchema for char_main_v1', () => {
    expect(library.schemaVersion).toBe('1.0');
    expect(library.characterId).toBe('char_main_v1');
    expect(library.gestures.length).toBe(20);
  });

  it('contains exactly the 20 expected unique gestureIds', () => {
    expect(new Set(library.gestures.map((g) => g.gestureId)).size).toBe(20);
    expect([...library.gestures.map((g) => g.gestureId)].sort()).toEqual(
      [...EXPECTED_GESTURE_IDS].sort()
    );
  });

  it('uses only ARM_POINT or HEAD_ROT controllerIds', () => {
    for (const gesture of library.gestures) {
      for (const track of gesture.tracks) {
        expect(['ARM_POINT', 'HEAD_ROT']).toContain(track.controllerId);
      }
    }
  });

  it('has keys sorted by offsetFrame spanning 0..durationFrames-1', () => {
    for (const gesture of library.gestures) {
      for (const track of gesture.tracks) {
        const offsets = track.keys.map((k) => k.offsetFrame);
        const sorted = [...offsets].sort((a, b) => a - b);
        expect(offsets).toEqual(sorted);
        expect(track.keys[0].offsetFrame).toBe(0);
        expect(track.keys[track.keys.length - 1].offsetFrame).toBe(
          gesture.durationFrames - 1
        );
      }
    }
  });

  it('marks every gesture as placeholder_curve', () => {
    for (const gesture of library.gestures) {
      expect(gesture.provenance).toBe('placeholder_curve');
    }
  });

  it('is deterministic: parsing twice yields identical stringify', () => {
    const a = JSON.stringify(JSON.parse(raw));
    const b = JSON.stringify(JSON.parse(raw));
    expect(a).toBe(b);
  });
});
