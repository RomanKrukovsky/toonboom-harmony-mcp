import { describe, it, expect } from '@jest/globals';
import { Universal2DStudioDirector } from '../src/services/universal2DStudioDirector/index.js';

describe('Universal2DStudioDirector', () => {
  it('directs a complete multi-scene animated production from screenplay text', () => {
    const script = `
      INT. LAB - DAY
      Rick: Morty, hand me the portal gun right now!
      Morty: Aw jeez Rick, are you sure about this?
      PAN RIGHT TO PORTAL

      EXT. ALIEN DESERT - NIGHT
      Rick: See Morty, 100 years Rick and Morty!
      TRACK FORWARD CAMERA
    `;

    const result = Universal2DStudioDirector.directProduction({
      productionName: 'RickAndMortyAdventures',
      episodeCode: 'EP101',
      scriptText: script,
      targetEngine: 'dual',
      fps: 24
    });

    expect(result.productionName).toBe('RickAndMortyAdventures');
    expect(result.episodeCode).toBe('EP101');
    expect(result.totalScenes).toBeGreaterThanOrEqual(2);
    expect(result.totalDurationSeconds).toBeGreaterThan(0);
    expect(result.totalFrames).toBeGreaterThan(0);
    expect(result.estimatedFreelanceCostSavedUsd).toBeGreaterThan(1000);
    expect(result.estimatedLaborHoursSaved).toBeGreaterThan(20);

    const firstScene = result.scenes[0];
    expect(firstScene.characters).toContain('Rick');
    expect(firstScene.mohoFile).toBeDefined();
    expect(firstScene.harmonyPlanId).toBeDefined();
  });
});
