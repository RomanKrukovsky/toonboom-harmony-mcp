import { describe, expect, it } from '@jest/globals';
import { DEFAULT_COUNTRYBALLS_SERIES_BIBLE } from '../../src/countryballs/seriesBible/defaultBible.js';
import { ContinuityLedger } from '../../src/countryballs/seriesBible/continuityLedger.js';
import { countryballEyeStateSchema, countryballMouthStateSchema } from '../../src/schemas/countryballs/seriesBible.js';

describe('Countryballs Series Bible & Canon Memory', () => {
  it('loads canonical characters with valid physics and dialects', () => {
    const characters = DEFAULT_COUNTRYBALLS_SERIES_BIBLE.characters;
    expect(characters.Poland).toBeDefined();
    expect(characters.USA).toBeDefined();
    expect(characters.Russia).toBeDefined();
    expect(characters.Germany).toBeDefined();
    expect(characters.UK).toBeDefined();

    expect(characters.Poland.dialect).toBe('broken_english');
    expect(characters.Russia.dialect).toBe('slavic_dry');
    expect(characters.USA.dialect).toBe('american_boisterous');

    expect(characters.Poland.accessories.some(a => a.id === 'plunger')).toBe(true);
    expect(characters.Russia.accessories.some(a => a.id === 'ushanka')).toBe(true);
    expect(characters.UK.accessories.some(a => a.id === 'monocle')).toBe(true);
  });

  it('verifies 14 canonical eye states and 18 mouth/scream states', () => {
    const eyeOptions = countryballEyeStateSchema.options;
    expect(eyeOptions.length).toBe(14);
    expect(eyeOptions).toContain('squint_suspicious');
    expect(eyeOptions).toContain('wide_shock');
    expect(eyeOptions).toContain('deadpan_flat');
    expect(eyeOptions).toContain('dramatic_wobble');

    const mouthOptions = countryballMouthStateSchema.options;
    expect(mouthOptions.length).toBe(18);
    expect(mouthOptions).toContain('none');
    expect(mouthOptions).toContain('scream_wide');
    expect(mouthOptions).toContain('dropped_jaw');
  });

  it('records jokes and prevents duplicates across episodes in ContinuityLedger', () => {
    const ledger = new ContinuityLedger();
    const setup = 'Poland builds rocket from cardboard';
    const punchline = 'Russia laughs in blyat';
    const actors = ['Poland', 'Russia'];

    expect(ledger.hasJokeBeenUsed(setup, punchline, actors)).toBe(false);

    ledger.recordJoke('EP_001', 'setup_silence_reaction', actors, setup, punchline);

    expect(ledger.hasJokeBeenUsed(setup, punchline, actors)).toBe(true);

    ledger.recordLoreEvent({
      episodeId: 'EP_001',
      description: 'Poland rocket crashed into German potato field',
      affectedCharacters: ['Poland', 'Germany']
    });

    const polandLore = ledger.getLoreForCharacter('Poland');
    expect(polandLore.length).toBe(1);
    expect(polandLore[0].affectedCharacters).toContain('Germany');
  });
});
