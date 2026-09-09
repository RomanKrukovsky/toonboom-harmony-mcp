import { z } from 'zod';

export const countryballEyeStateSchema = z.enum([
  'normal',
  'squint_suspicious',
  'wide_shock',
  'deadpan_flat',
  'tearful_puppy',
  'angry_slanted',
  'look_up_left',
  'look_up_right',
  'look_down',
  'blink_regular',
  'blink_stutter',
  'dramatic_wobble',
  'happy_closed',
  'dizzy_spiral'
]);
export type CountryballEyeState = z.infer<typeof countryballEyeStateSchema>;

export const countryballMouthStateSchema = z.enum([
  'none',              // Traditional countryballs have no mouth
  'phoneme_A',
  'phoneme_B',
  'phoneme_C',
  'phoneme_D',
  'phoneme_E',
  'phoneme_F',
  'phoneme_G',
  'phoneme_H',
  'phoneme_X',         // Rest
  'scream_wide',
  'dropped_jaw',
  'smug_smirk',
  'nervous_grimace',
  'teeth_chatter',
  'tongue_out',
  'wobbly_whimper',
  'gasp_circle'
]);
export type CountryballMouthState = z.infer<typeof countryballMouthStateSchema>;

export const countryballDialectSchema = z.enum([
  'broken_english',    // Classic Engrish ("cannot into space", "polan stronk")
  'germanic_clipped',   // Terse, bureaucratic, compound words ("Wörk wörk", "Nein")
  'slavic_dry',         // Suspicious, cynical, dry humor ("Blyat", "Is of Western trick")
  'american_boisterous',// Loud, confident, oil-obsessed, patronizing ("Freedom!", "Y'all need democracy")
  'british_snobbish',   // Polite insults, tea-obsessed, nostalgic ("I say", "Pip pip", "Barbaric")
  'french_melodramatic',// Existential, strikes, surrender jokes ("Hon hon hon", "Sacrebleu")
  'neutral_english'
]);
export type CountryballDialect = z.infer<typeof countryballDialectSchema>;

export const countryballCharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  flagPreset: z.string().describe('ID of the flag artwork or vector SVG/symbol'),
  personality: z.array(z.string()).min(1),
  dialect: countryballDialectSchema.default('broken_english'),
  voice: z.object({
    voiceId: z.string().default('default_narrator'),
    basePitch: z.number().default(1.0),
    speechRate: z.number().default(1.0),
    volumeGain: z.number().default(1.0)
  }),
  physical: z.object({
    radius: z.number().default(100),
    scale: z.number().default(1.0),
    weight: z.enum(['light', 'medium', 'heavy']).default('medium'),
    bounciness: z.number().min(0).max(1).default(0.7)
  }),
  accessories: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['hat', 'eyewear', 'handheld', 'badge', 'moustache']),
      anchorPoint: z.enum(['top', 'eyes', 'left', 'right', 'bottom']),
      symbolName: z.string()
    })
  ).default([]),
  relationships: z.record(z.string()).default({}),
  actingDefaults: z.object({
    idle: z.string().default('slow_bob'),
    angry: z.string().default('angry_shake'),
    shock: z.string().default('shock_recoil'),
    happy: z.string().default('jump_excited'),
    sad: z.string().default('deflate_sad')
  })
});
export type CountryballCharacter = z.infer<typeof countryballCharacterSchema>;

export const countryballsSeriesBibleSchema = z.object({
  title: z.string().min(1),
  version: z.string().default('1.0.0'),
  fps: z.number().int().positive().default(24),
  canvas: z.object({
    width: z.number().int().positive().default(1920),
    height: z.number().int().positive().default(1080)
  }),
  visualRules: z.object({
    mouthAllowed: z.boolean().default(false).describe('If false, uses eye expressions and speech bobs only'),
    lineArtStyle: z.enum(['rough_brush', 'clean_vector', 'crayon_wobbly']).default('rough_brush'),
    lineWidth: z.number().default(4),
    shadowIntensity: z.number().min(0).max(1).default(0.35)
  }),
  comedyRules: z.object({
    targetJokesPerMinute: z.number().default(4.5),
    minPunchlineHoldFrames: z.number().int().default(14),
    maxUnbrokenDialogueSeconds: z.number().default(5.0),
    allowSlapstickPayoffs: z.boolean().default(true)
  }),
  characters: z.record(countryballCharacterSchema),
  recurringLocations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      backgroundSymbol: z.string(),
      groundY: z.number().default(780)
    })
  ).default([])
});
export type CountryballsSeriesBible = z.infer<typeof countryballsSeriesBibleSchema>;
