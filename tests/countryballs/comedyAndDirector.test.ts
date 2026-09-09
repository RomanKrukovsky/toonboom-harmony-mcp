import { describe, expect, it } from '@jest/globals';
import { CountryballsWritersRoom } from '../../src/countryballs/writersRoom/writersRoom.js';
import { CountryballsDirectorEngine } from '../../src/countryballs/director/directorEngine.js';
import { ComedyEngine } from '../../src/countryballs/comedy/comedyEngine.js';
import { ComedyTimingLinter } from '../../src/countryballs/comedy/timingLinter.js';
import { DEFAULT_COUNTRYBALLS_SERIES_BIBLE } from '../../src/countryballs/seriesBible/defaultBible.js';

describe('Countryballs Writers Room, Director & Comedy Engine', () => {
  it('generates a 3-act screenplay with authentic character dialects', () => {
    const room = new CountryballsWritersRoom(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
    const screenplay = room.produceScreenplay({
      topic: 'Moon landing race',
      mainCharacters: ['Poland', 'Russia', 'USA', 'Germany']
    });

    expect(screenplay.beats.length).toBe(3);
    expect(screenplay.screenplayMarkdown).toContain('Act 1');
    expect(screenplay.screenplayMarkdown).toContain('Act 2');
    expect(screenplay.screenplayMarkdown).toContain('Act 3');

    // Dialect verification
    const polandLine = screenplay.beats[0].dialogues.find(d => d.speaker === 'Poland');
    expect(polandLine?.text).toContain('Kurwa!');

    const russiaLine = screenplay.beats[0].dialogues.find(d => d.speaker === 'Russia');
    expect(russiaLine?.text).toContain('Blyat.');
  });

  it('compiles screenplay into multi-shot Episode IR with staging and cuts', () => {
    const room = new CountryballsWritersRoom(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
    const screenplay = room.produceScreenplay({
      topic: 'Space race expedition'
    });

    const director = new CountryballsDirectorEngine(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
    const ir = director.directEpisode(screenplay);

    expect(ir.scenes.length).toBe(3);
    expect(ir.scenes[0].shots.length).toBe(2); // Establishing medium shot + reaction close-up
    expect(ir.scenes[0].shots[0].framing).toBe('medium');
    expect(ir.scenes[0].shots[1].framing).toBe('close_up');

    // Staging test
    const stageActors = ir.scenes[0].shots[0].actorsOnStage;
    expect(stageActors.length).toBe(2);
    expect(stageActors[0].x).not.toEqual(stageActors[1].x);
  });

  it('injects comedic holds and evaluates comedic timing metrics', () => {
    const room = new CountryballsWritersRoom(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
    const screenplay = room.produceScreenplay({ topic: 'Space treaty' });
    const director = new CountryballsDirectorEngine(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
    const ir = director.directEpisode(screenplay);

    const initialDuration = ir.totalDurationFrames;
    const comedyEngine = new ComedyEngine();
    const tunedIR = comedyEngine.injectComedicTiming(ir, 14);

    // Duration should expand to accommodate punchline reaction holds
    expect(tunedIR.totalDurationFrames).toBeGreaterThan(initialDuration);

    const metrics = ComedyTimingLinter.lintEpisode(tunedIR);
    expect(metrics.jokesPerMinute).toBeGreaterThan(0);
    expect(metrics.deadpanReactionRatio).toBeGreaterThan(0);
  });
});
