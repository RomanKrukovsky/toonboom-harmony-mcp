import { describe, it, expect } from '@jest/globals';
import { MohoTurnaroundBuilder } from '../src/services/mohoTurnaroundBuilder/index.js';
import { TURNAROUND_ANGLES } from '../src/schemas/mohoProductionRig.js';

describe('MohoTurnaroundBuilder', () => {
  it('generates 8 standard camera views covering 360 degrees', () => {
    const result = MohoTurnaroundBuilder.buildTurnaroundMatrix({
      characterName: 'Hero',
      includeHead: true,
      includeBody: true
    });

    expect(result.headTurn.angles).toHaveLength(8);
    expect(result.headTurn.angles).toEqual(TURNAROUND_ANGLES);
    expect(result.bodyTurn.angles).toHaveLength(8);
    expect(result.bodyTurn.angles).toEqual(TURNAROUND_ANGLES);
  });

  it('maps smart bone dials to 315 deg total angle span with correct offsets', () => {
    const result = MohoTurnaroundBuilder.buildTurnaroundMatrix({
      characterName: 'Hero',
      includeHead: true,
      includeBody: true
    });

    expect(result.smartDials).toHaveLength(2);
    const headDial = result.smartDials.find(d => d.dialName === 'Head switch');
    expect(headDial).toBeDefined();
    expect(headDial?.minAngleDeg).toBe(-45);
    expect(headDial?.maxAngleDeg).toBe(315);
    expect(headDial?.poses).toHaveLength(8);

    // Verify angle offsets match Girl.moho standard
    expect(headDial?.poses[0].angleDeg).toBe(0);   // Front
    expect(headDial?.poses[1].angleDeg).toBe(45);  // 3/4 R
    expect(headDial?.poses[4].angleDeg).toBe(180); // Back
    expect(headDial?.poses[7].angleDeg).toBe(315); // 3/4 L
  });

  it('includes sublayer templates for all 8 views', () => {
    const result = MohoTurnaroundBuilder.buildTurnaroundMatrix({
      characterName: 'Hero'
    });

    expect(result.headTurn.sublayerTemplate).toContain('head_base');
    expect(result.headTurn.sublayerTemplate).toContain('mouth');
    expect(result.headTurn.sublayerTemplate).toContain('eyes_L');
    expect(result.bodyTurn.sublayerTemplate).toContain('torso_base');
  });
});
