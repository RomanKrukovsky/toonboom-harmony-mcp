import { CountryballsSeriesBible } from '../../schemas/countryballs/seriesBible.js';

export const DEFAULT_COUNTRYBALLS_SERIES_BIBLE: CountryballsSeriesBible = {
  title: 'Countryballs Global Chronicles',
  version: '1.0.0',
  fps: 24,
  canvas: {
    width: 1920,
    height: 1080
  },
  visualRules: {
    mouthAllowed: false,
    lineArtStyle: 'rough_brush',
    lineWidth: 4,
    shadowIntensity: 0.35
  },
  comedyRules: {
    targetJokesPerMinute: 4.5,
    minPunchlineHoldFrames: 14,
    maxUnbrokenDialogueSeconds: 5.0,
    allowSlapstickPayoffs: true
  },
  characters: {
    Poland: {
      id: 'Poland',
      name: 'Poland',
      flagPreset: 'flag_poland',
      personality: ['gullible', 'ambitious', 'defensive', 'melodramatic', 'insecure'],
      dialect: 'broken_english',
      voice: {
        voiceId: 'poland_tenor_fast',
        basePitch: 1.18,
        speechRate: 1.1,
        volumeGain: 1.0
      },
      physical: {
        radius: 90,
        scale: 0.9,
        weight: 'light',
        bounciness: 0.85
      },
      accessories: [
        {
          id: 'plunger',
          type: 'handheld',
          anchorPoint: 'right',
          symbolName: 'prop_plunger'
        }
      ],
      relationships: {
        Russia: 'fearful_defensive',
        Germany: 'intimidated_respect',
        USA: 'worshipful_ally'
      },
      actingDefaults: {
        idle: 'anxious_quiver',
        angry: 'shake_fast',
        shock: 'shock_recoil',
        happy: 'jump_excited',
        sad: 'deflate_sad'
      }
    },
    USA: {
      id: 'USA',
      name: 'USA',
      flagPreset: 'flag_usa',
      personality: ['smug', 'oblivious', 'confident', 'materialistic', 'loud'],
      dialect: 'american_boisterous',
      voice: {
        voiceId: 'usa_baritone_confident',
        basePitch: 0.98,
        speechRate: 1.05,
        volumeGain: 1.15
      },
      physical: {
        radius: 110,
        scale: 1.1,
        weight: 'heavy',
        bounciness: 0.6
      },
      accessories: [
        {
          id: 'sunglasses',
          type: 'eyewear',
          anchorPoint: 'eyes',
          symbolName: 'prop_cool_sunglasses'
        }
      ],
      relationships: {
        Russia: 'rivalry_banter',
        Poland: 'patronizing_benefactor',
        UK: 'rebellious_offspring'
      },
      actingDefaults: {
        idle: 'slow_bob',
        angry: 'lean_forward',
        shock: 'double_take',
        happy: 'smug_hover',
        sad: 'deadpan_flat'
      }
    },
    Russia: {
      id: 'Russia',
      name: 'Russia',
      flagPreset: 'flag_russia',
      personality: ['suspicious', 'sarcastic', 'stubborn', 'deadpan', 'fatalistic'],
      dialect: 'slavic_dry',
      voice: {
        voiceId: 'russia_bass_dry',
        basePitch: 0.88,
        speechRate: 0.9,
        volumeGain: 1.05
      },
      physical: {
        radius: 115,
        scale: 1.15,
        weight: 'heavy',
        bounciness: 0.5
      },
      accessories: [
        {
          id: 'ushanka',
          type: 'hat',
          anchorPoint: 'top',
          symbolName: 'prop_ushanka'
        }
      ],
      relationships: {
        USA: 'cold_war_rivalry',
        Poland: 'dismissive_bully',
        Germany: 'pragmatic_distance'
      },
      actingDefaults: {
        idle: 'deadpan_stare',
        angry: 'angry_shake',
        shock: 'suspicious_narrow',
        happy: 'smug_hover',
        sad: 'deflate_sad'
      }
    },
    Germany: {
      id: 'Germany',
      name: 'Germany',
      flagPreset: 'flag_germany',
      personality: ['workaholic', 'bureaucratic', 'orderly', 'anxiety_about_rules', 'stern'],
      dialect: 'germanic_clipped',
      voice: {
        voiceId: 'germany_precise_mid',
        basePitch: 0.95,
        speechRate: 1.0,
        volumeGain: 1.0
      },
      physical: {
        radius: 105,
        scale: 1.05,
        weight: 'medium',
        bounciness: 0.65
      },
      accessories: [],
      relationships: {
        Poland: 'exasperated_patron',
        France: 'exhausted_partner',
        Greece: 'debt_enforcer'
      },
      actingDefaults: {
        idle: 'slow_bob',
        angry: 'furious_pulse',
        shock: 'wide_shock',
        happy: 'slow_bob',
        sad: 'deflate_sad'
      }
    },
    UK: {
      id: 'UK',
      name: 'UK',
      flagPreset: 'flag_uk',
      personality: ['nostalgic', 'snobbish', 'polite_insulting', 'tea_addicted'],
      dialect: 'british_snobbish',
      voice: {
        voiceId: 'uk_gentleman_proper',
        basePitch: 1.02,
        speechRate: 0.95,
        volumeGain: 0.98
      },
      physical: {
        radius: 100,
        scale: 1.0,
        weight: 'medium',
        bounciness: 0.65
      },
      accessories: [
        {
          id: 'top_hat',
          type: 'hat',
          anchorPoint: 'top',
          symbolName: 'prop_top_hat'
        },
        {
          id: 'monocle',
          type: 'eyewear',
          anchorPoint: 'eyes',
          symbolName: 'prop_monocle'
        }
      ],
      relationships: {
        USA: 'ungrateful_colony',
        France: 'ancient_frenemy'
      },
      actingDefaults: {
        idle: 'slow_bob',
        angry: 'tea_cup_tremble',
        shock: 'monocle_pop',
        happy: 'smug_hover',
        sad: 'deflate_sad'
      }
    }
  },
  recurringLocations: [
    {
      id: 'un_hall',
      name: 'UN General Assembly Hall',
      backgroundSymbol: 'bg_un_assembly',
      groundY: 780
    },
    {
      id: 'baikonur_launchpad',
      name: 'Baikonur Cosmodrome Launchpad',
      backgroundSymbol: 'bg_spaceport_sunset',
      groundY: 790
    },
    {
      id: 'border_checkpoint',
      name: 'Border Crossing Gate',
      backgroundSymbol: 'bg_border_crossing',
      groundY: 770
    },
    {
      id: 'white_house_lawn',
      name: 'White House South Lawn',
      backgroundSymbol: 'bg_white_house',
      groundY: 800
    }
  ]
};
