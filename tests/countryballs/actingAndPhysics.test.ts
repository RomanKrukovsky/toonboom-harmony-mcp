import { describe, expect, it } from '@jest/globals';
import { ALL_COUNTRYBALL_ACTIONS, ACTION_VOCABULARY_MAP, getActionDefinition } from '../../src/countryballs/acting/actionVocabulary.js';
import { CountryballsPhysicsSolver } from '../../src/countryballs/acting/physicsSolver.js';
import { DEFAULT_COUNTRYBALLS_SERIES_BIBLE } from '../../src/countryballs/seriesBible/defaultBible.js';

describe('Countryballs Acting Vocabulary & Physics Solver', () => {
  it('provides a rich library of over 300 reusable animation actions', () => {
    expect(ALL_COUNTRYBALL_ACTIONS.length).toBeGreaterThanOrEqual(300);

    const categories = new Set(ALL_COUNTRYBALL_ACTIONS.map(a => a.category));
    expect(categories.has('locomotion')).toBe(true);
    expect(categories.has('reaction_take')).toBe(true);
    expect(categories.has('emotional_idle')).toBe(true);
    expect(categories.has('gaze_micro')).toBe(true);
    expect(categories.has('slapstick_gag')).toBe(true);

    const doubleTake = getActionDefinition('double_take');
    expect(doubleTake.recommendedEyeState).toBe('wide_shock');
    expect(doubleTake.stretchFactor).toBeGreaterThan(1.0);
  });

  it('computes realistic squash and stretch and secondary motion for jumps and takes', () => {
    const poland = DEFAULT_COUNTRYBALLS_SERIES_BIBLE.characters.Poland;
    const poses = CountryballsPhysicsSolver.solveActionCurves('hop_forward', 0, 18, poland, 1.0);

    expect(poses.length).toBe(18);

    // Initial anticipation squash
    expect(poses[0].scaleY).toBeLessThan(1.0);
    expect(poses[0].scaleX).toBeGreaterThan(1.0);

    // Apex stretch
    const midPose = poses[9];
    expect(midPose.deltaY).toBeLessThan(0); // Jumped upward
    expect(midPose.scaleY).toBeGreaterThan(1.0);

    // Secondary accessory motion computed
    expect(midPose.secondaryMotion.accessoryDeltaY).not.toBe(0);
  });

  it('computes extreme cartoon deformation for slapstick flatten_pancake', () => {
    const usa = DEFAULT_COUNTRYBALLS_SERIES_BIBLE.characters.USA;
    const poses = CountryballsPhysicsSolver.solveActionCurves('flatten_pancake', 10, 24, usa, 1.0);

    expect(poses.length).toBe(24);
    // Severe pancake squash
    const pancakeFrame = poses[5];
    expect(pancakeFrame.scaleY).toBeLessThan(0.4);
    expect(pancakeFrame.scaleX).toBeGreaterThan(2.0);
    expect(pancakeFrame.eyeState).toBe('dizzy_spiral');
  });
});
