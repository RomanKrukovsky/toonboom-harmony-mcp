import { describe, it, expect } from '@jest/globals';

import {
  mohoCharacterBibleSchema,
  type MohoCharacterBible,
  type MohoMouthShape
} from '../src/schemas/mohoCharacterBible.js';

import {
  mohoShowBibleSchema,
  type MohoShowBible
} from '../src/schemas/mohoShowBible.js';

import {
  shotManifestSchema,
  type ShotManifest
} from '../src/schemas/shotManifest.js';

import {
  mohoPerformancePirSchema,
  type MohoPerformancePir
} from '../src/schemas/mohoPerformancePir.js';

import {
  mohoPaletteManifestSchema,
  type MohoPaletteManifest
} from '../src/schemas/mohoPaletteManifest.js';

import {
  PRESTON_BLAIR_MOUTH_SHAPES
} from '../src/services/mohoLipsyncSynthesizer/index.js';

/**
 * mohoRigTypeInvariants.test.ts — DRIFT-detection tests.
 *
 * Purpose: prevent accidental divergence between schemas that must stay
 * perfectly aligned. If somebody adds a new rigType in one file but not
 * the others, the production pipeline will silently accept a value that
 * another layer will then reject at runtime — these tests catch that.
 *
 * Each test should fail with a self-explanatory error if a schema
 * changes in a way that breaks cross-schema consistency.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Canonical rigType enum — what every site MUST agree on.
// ─────────────────────────────────────────────────────────────────────────────

const CANONICAL_RIG_TYPES = [
  'humanoid_2leg',
  'quadruped',
  'creature',
  'mechanical'
] as const;

const APPROVER = { approver: 'td_lead', approvedAt: '2026-07-27T12:00:00Z' };

function validCharacterBible(): MohoCharacterBible {
  return {
    schemaVersion: '1.0',
    characterId: 'char_main_v1',
    name: 'Mira',
    role: 'protagonist',
    rigType: 'humanoid_2leg',
    rigPath: 'rigs/mira/mira.moho',
    turnaroundViews: ['front', 'side_left'],
    controllers: [
      {
        controllerId: 'HEAD_ROT',
        boneId: 1,
        boneName: 'Head_Peg',
        purpose: 'head rotation',
        range: { min: -45, max: 45, units: 'degrees' },
        channel: 'rotation'
      }
    ],
    switchLayers: [],
    mouthShapes: [],
    expressions: [],
    gestureLibrary: [],
    paletteRef: 'palette_main_v1',
    provenance: { ...APPROVER, rigAuthor: 'rigger_a', licensePath: 'legal/contracts/mira.pdf' }
  };
}

function validShowBible(): MohoShowBible {
  return mohoShowBibleSchema.parse({
    schemaVersion: '1.0',
    showId: 'polygon_show_v1',
    title: 'Polygon Show',
    logLine: 'One character, one room, one gesture at a time.',
    fps: 24,
    resolution: { width: 1920, height: 1080 },
    visualStyle: 'flat editorial',
    lineRules: { defaultThicknessPt: 2.0, lineColourId: 'line_main', fillColourId: 'fill_skin' },
    lighting: { type: 'soft_top_left', shadowColourId: 'shadow_soft' },
    allowedDeformations: ['peg_transform', 'bone_deformer'],
    allowedRigTypes: [...CANONICAL_RIG_TYPES],
    characterBibles: [{ characterId: 'char_main_v1', ref: 'show/character_bible_mira.json' }],
    paletteManifestRef: 'show/palette_manifest.json',
    cameraRulesRef: 'show/camera_rules.json',
    motionGrammarRef: 'show/motion_grammar.json',
    qaThresholdsRef: 'show/qa_thresholds.json',
    forbiddenSources: ['NC'],
    provenance: APPROVER
  });
}

function validShotManifest(): ShotManifest {
  return shotManifestSchema.parse({
    schemaVersion: '1.0',
    shotId: 'shot_001',
    showBibleRef: 'show/show_bible.json',
    production: 'polygon_show_v1',
    episode: 'ep_01',
    sceneName: 'scene_intro',
    description: 'Mira looks at the camera.',
    staging: {
      positions: [{ characterId: 'char_main_v1', preset: 'center' }],
      shotSize: 'medium_shot',
      cameraMove: 'static',
      backgroundRef: 'bg/room.moho'
    },
    timing: { totalFrames: 48, fps: 24 },
    beats: [
      {
        beatId: 'beat_look',
        startFrame: 1,
        endFrame: 24,
        characterId: 'char_main_v1',
        intent: 'look_at_camera',
        emotion: 'neutral'
      }
    ],
    provenance: { director: 'llm_director', createdAt: '2026-07-27T12:00:00Z', sourceScriptRef: 'scripts/ep01.scene01.txt' }
  });
}

function validPalette(): MohoPaletteManifest {
  return mohoPaletteManifestSchema.parse({
    schemaVersion: '1.0',
    paletteId: 'palette_main_v1',
    name: 'Polygon Show Palette',
    paletteType: 'rgb',
    maxColours: 256,
    colours: [
      { colourId: 'line_main', name: 'Outline', rgba: '#1A1A1AFF', usage: 'line', locked: true, mohoColourIndex: 0 },
      { colourId: 'fill_skin', name: 'Skin', rgba: '#FF8C6BFF', usage: 'skin', locked: true, mohoColourIndex: 1 }
    ],
    provenance: APPROVER
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod introspection helpers — Zod 3.23 wraps arrays in ZodDefault/ZodOptional,
// so we must peel through `_def.innerType` to reach the inner enum's values.
// `_def` and `def` are aliases in 3.23; we use `def` per the public type and
// fall back to `_def` defensively.
// ─────────────────────────────────────────────────────────────────────────────

function _def(s: any): any {
  return s?.def ?? s?._def;
}

function unwrapSchema(schema: any): any {
  let s = schema;
  while (s && _def(s) && (_def(s).typeName === 'ZodOptional' || _def(s).typeName === 'ZodDefault')) {
    s = _def(s).innerType;
  }
  return s;
}

function getEnumOptions(schema: any): string[] {
  let s = schema;
  const def = _def(s);
  if (def && def.typeName === 'ZodArray') {
    s = def.type ?? def.innerType;
  }
  s = unwrapSchema(s);
  if (_def(s) && _def(s).typeName === 'ZodEnum') {
    return (_def(s).values as readonly string[]).map(String).sort();
  }
  throw new Error(`Cannot extract enum options from schema: ${_def(s)?.typeName ?? typeof s}`);
}

function getArrayElementSchema(schema: any): any {
  let s = schema;
  s = unwrapSchema(s);
  const def = _def(s);
  if (!def) return undefined;
  if (def.typeName === 'ZodArray') {
    // ZodArray stores its element under `.type`, not `.innerType`
    return def.type ?? def.innerType;
  }
  throw new Error(`Expected ZodArray, got: ${def.typeName ?? typeof s}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. rigType enum consistency
// ─────────────────────────────────────────────────────────────────────────────

describe('INVARIANT: rigType enum consistency', () => {
  it('mohoCharacterBible.rigType === canonical rigType enum', () => {
    const charRigTypes = getEnumOptions(mohoCharacterBibleSchema.shape.rigType);
    expect(charRigTypes).toEqual([...CANONICAL_RIG_TYPES].sort());
  });

  it('mohoShowBible.allowedRigTypes enum === canonical rigType enum', () => {
    const showRigTypes = getEnumOptions(mohoShowBibleSchema.shape.allowedRigTypes);
    expect(showRigTypes).toEqual([...CANONICAL_RIG_TYPES].sort());
  });

  it('shotManifest.rigType enum === canonical rigType enum', () => {
    const shotRigTypes = getEnumOptions(shotManifestSchema.shape.rigType);
    expect(shotRigTypes).toEqual([...CANONICAL_RIG_TYPES].sort());
  });

  it('mohoPerformancePir.rigType enum === canonical rigType enum', () => {
    const pirRigTypes = getEnumOptions(mohoPerformancePirSchema.shape.rigType);
    expect(pirRigTypes).toEqual([...CANONICAL_RIG_TYPES].sort());
  });

  it('mohoCharacterBible.rigType values exactly equal mohoShowBible.allowedRigTypes values', () => {
    const charRigTypes = getEnumOptions(mohoCharacterBibleSchema.shape.rigType);
    const showRigTypes = getEnumOptions(mohoShowBibleSchema.shape.allowedRigTypes);
    expect(charRigTypes).toEqual(showRigTypes);
  });

  it('mohoCharacterBible.rigType values exactly equal shotManifest.rigType values', () => {
    const charRigTypes = getEnumOptions(mohoCharacterBibleSchema.shape.rigType);
    const shotRigTypes = getEnumOptions(shotManifestSchema.shape.rigType);
    expect(charRigTypes).toEqual(shotRigTypes);
  });

  it('mohoCharacterBible.rigType values exactly equal mohoPerformancePir.rigType values', () => {
    const charRigTypes = getEnumOptions(mohoCharacterBibleSchema.shape.rigType);
    const pirRigTypes = getEnumOptions(mohoPerformancePirSchema.shape.rigType);
    expect(charRigTypes).toEqual(pirRigTypes);
  });

  it('a valid humanoid_2leg character round-trips through the schema', () => {
    expect(mohoCharacterBibleSchema.safeParse(validCharacterBible()).success).toBe(true);
  });

  it('a valid show bible with all canonical rig types round-trips', () => {
    expect(mohoShowBibleSchema.safeParse(validShowBible()).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Preston Blair mouth shapes consistency
// ─────────────────────────────────────────────────────────────────────────────

describe('INVARIANT: Preston Blair mouth shape superset', () => {
  it('PRESTON_BLAIR_MOUTH_SHAPES is non-empty', () => {
    expect(PRESTON_BLAIR_MOUTH_SHAPES.length).toBeGreaterThan(0);
  });

  it('MohoMouthShape.shapeId enum is a superset of PRESTON_BLAIR_MOUTH_SHAPES', () => {
    const mouthShapeObj = getArrayElementSchema(mohoCharacterBibleSchema.shape.mouthShapes);
    const shapeIdOptions = (_def(mouthShapeObj.shape.shapeId)?.values as readonly string[]).map(String).sort();
    const pbShapes = [...PRESTON_BLAIR_MOUTH_SHAPES].sort();
    for (const shape of pbShapes) {
      expect(shapeIdOptions).toContain(shape);
    }
  });

  it('MohoMouthShape.shapeId enum equals PRESTON_BLAIR_MOUTH_SHAPES exactly (canonical 12)', () => {
    const mouthShapeObj = getArrayElementSchema(mohoCharacterBibleSchema.shape.mouthShapes);
    const schemaShapes = (_def(mouthShapeObj.shape.shapeId)?.values as readonly string[]).map(String).sort();
    const pbShapes = [...PRESTON_BLAIR_MOUTH_SHAPES].sort();
    expect(schemaShapes).toEqual(pbShapes);
  });

  it('every PRESTON_BLAIR_MOUTH_SHAPES entry is accepted by the character bible schema', () => {
    for (const shape of PRESTON_BLAIR_MOUTH_SHAPES) {
      const fixture: MohoCharacterBible = {
        ...validCharacterBible(),
        mouthShapes: [{ shapeId: shape, drawingName: `mouth_${shape}`, phonemes: [] }]
      };
      const result = mohoCharacterBibleSchema.safeParse(fixture);
      expect(result.success).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Bone channel consistency between controller binding and performance PIR
// ─────────────────────────────────────────────────────────────────────────────

const CANONICAL_BONE_CHANNELS = ['rotation', 'translation', 'scale', 'opacity'] as const;

describe('INVARIANT: bone channel enum consistency', () => {
  it('MohoControllerBinding.channel enum matches CANONICAL_BONE_CHANNELS', () => {
    const controllerObj = getArrayElementSchema(mohoCharacterBibleSchema.shape.controllers);
    const channelOptions = (_def(controllerObj.shape.channel)?.values as readonly string[]).map(String).sort();
    expect(channelOptions).toEqual([...CANONICAL_BONE_CHANNELS].sort());
  });

  it('MohoPerformancePir.boneKeys[].channel enum matches CANONICAL_BONE_CHANNELS', () => {
    const boneKeyObj = getArrayElementSchema(mohoPerformancePirSchema.shape.boneKeys);
    const channelOptions = (_def(boneKeyObj.shape.channel)?.values as readonly string[]).map(String).sort();
    expect(channelOptions).toEqual([...CANONICAL_BONE_CHANNELS].sort());
  });

  it('MohoControllerBinding.channel === MohoPerformancePir.boneKeys[].channel', () => {
    const controllerObj = getArrayElementSchema(mohoCharacterBibleSchema.shape.controllers);
    const boneKeyObj = getArrayElementSchema(mohoPerformancePirSchema.shape.boneKeys);
    const controllerChannels = (_def(controllerObj.shape.channel)?.values as readonly string[]).map(String).sort();
    const pirChannels = (_def(boneKeyObj.shape.channel)?.values as readonly string[]).map(String).sort();
    expect(controllerChannels).toEqual(pirChannels);
  });

  it('every MohoBoneKey.channel value is accepted by MohoControllerBinding', () => {
    for (const channel of CANONICAL_BONE_CHANNELS) {
      const controllerFixture = {
        ...validCharacterBible(),
        controllers: [
          {
            controllerId: `CTRL_${channel}`,
            boneId: 1,
            boneName: 'TestBone',
            purpose: `test ${channel}`,
            channel
          }
        ]
      };
      expect(mohoCharacterBibleSchema.safeParse(controllerFixture).success).toBe(true);

      const pirFixture = {
        ...mohoPerformancePirSchema.parse({
          schemaVersion: '1.0',
          performanceId: 'perf_test',
          rigType: 'humanoid_2leg',
          shotManifestRef: 'show/shot_001.json',
          mohoShowBibleRef: 'show/show_bible.json',
          deterministicFingerprint: 'a'.repeat(64),
          provenance: { compiledAt: '2026-07-27T12:00:00Z', compilerVersion: '1.0' }
        }),
        boneKeys: [
          { boneId: 1, boneName: 'TestBone', channel, frame: 1, value: 0.0 }
        ]
      };
      expect(mohoPerformancePirSchema.safeParse(pirFixture).success).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Rig switch layer names match mouth chart
// ─────────────────────────────────────────────────────────────────────────────

const CANONICAL_MOUTH_SWITCH_NAMES = ['Mouth switch', 'mouth_switch', 'MouthSwitch'];

export function assertCharacterHasMouthSwitch(
  characterBible: MohoCharacterBible,
  options: { canonicalNames?: readonly string[] } = {}
): void {
  const canonicalNames = options.canonicalNames ?? CANONICAL_MOUTH_SWITCH_NAMES;

  if (!characterBible.mouthShapes || characterBible.mouthShapes.length === 0) {
    return;
  }

  const hasMouthSwitch = characterBible.switchLayers.some((sw) =>
    canonicalNames.some((canonical) => sw.layerName.toLowerCase() === canonical.toLowerCase())
  );

  if (!hasMouthSwitch) {
    const declared = characterBible.switchLayers.map((sw) => sw.layerName);
    throw new Error(
      `Character "${characterBible.characterId}" declares ${characterBible.mouthShapes.length} mouth shape(s) ` +
      `(${characterBible.mouthShapes.map((m: MohoMouthShape) => m.shapeId).join(', ')}) ` +
      `but has NO switch layer with a canonical mouth-switch name. ` +
      `Expected one of [${canonicalNames.join(', ')}]; found [${declared.join(', ') || '(none)'}]. ` +
      `Add a switchLayers entry named "Mouth switch" (or canonical variant) so the lipsync synthesizer can drive it.`
    );
  }
}

describe('INVARIANT: assertCharacterHasMouthSwitch helper', () => {
  it('passes silently when no mouth shapes are declared (no requirement)', () => {
    const char = validCharacterBible();
    expect(() => assertCharacterHasMouthSwitch(char)).not.toThrow();
  });

  it('passes when a humanoid_2leg character has a "Mouth switch" switch layer', () => {
    const char: MohoCharacterBible = {
      ...validCharacterBible(),
      switchLayers: [
        {
          switchId: 'mouth',
          layerName: 'Mouth switch',
          choices: [{ choiceId: 'rest', drawingName: 'mouth_rest' }]
        }
      ],
      mouthShapes: [{ shapeId: 'Rest', drawingName: 'mouth_rest', phonemes: [] }]
    };
    expect(() => assertCharacterHasMouthSwitch(char)).not.toThrow();
  });

  it('passes with the alternate "mouth_switch" naming', () => {
    const char: MohoCharacterBible = {
      ...validCharacterBible(),
      switchLayers: [
        {
          switchId: 'mouth',
          layerName: 'mouth_switch',
          choices: [{ choiceId: 'rest', drawingName: 'mouth_rest' }]
        }
      ],
      mouthShapes: [{ shapeId: 'A', drawingName: 'mouth_A', phonemes: [] }]
    };
    expect(() => assertCharacterHasMouthSwitch(char)).not.toThrow();
  });

  it('throws a self-explanatory error when mouth shapes are declared but no mouth switch layer exists', () => {
    const char: MohoCharacterBible = {
      ...validCharacterBible(),
      switchLayers: [
        {
          switchId: 'eyes',
          layerName: 'Eye switch',
          choices: [{ choiceId: 'open', drawingName: 'eye_open' }]
        }
      ],
      mouthShapes: [{ shapeId: 'O', drawingName: 'mouth_O', phonemes: [] }]
    };
    expect(() => assertCharacterHasMouthSwitch(char)).toThrow(/Mouth switch/);
    expect(() => assertCharacterHasMouthSwitch(char)).toThrow(/char_main_v1/);
  });

  it('error message lists the missing canonical names and present switch layers', () => {
    const char: MohoCharacterBible = {
      ...validCharacterBible(),
      switchLayers: [
        {
          switchId: 'hands',
          layerName: 'Hand switch',
          choices: [{ choiceId: 'open', drawingName: 'hand_open' }]
        }
      ],
      mouthShapes: [{ shapeId: 'B', drawingName: 'mouth_B', phonemes: [] }]
    };
    expect(() => assertCharacterHasMouthSwitch(char)).toThrow(/Hand switch/);
    expect(() => assertCharacterHasMouthSwitch(char)).toThrow(/Mouth switch, mouth_switch, MouthSwitch/);
  });

  it('respects custom canonical name options', () => {
    const char: MohoCharacterBible = {
      ...validCharacterBible(),
      switchLayers: [
        {
          switchId: 'mouth',
          layerName: 'Lipsync',
          choices: [{ choiceId: 'rest', drawingName: 'mouth_rest' }]
        }
      ],
      mouthShapes: [{ shapeId: 'Rest', drawingName: 'mouth_rest', phonemes: [] }]
    };
    expect(() => assertCharacterHasMouthSwitch(char)).toThrow();
    expect(() => assertCharacterHasMouthSwitch(char, { canonicalNames: ['Lipsync'] })).not.toThrow();
  });

  it('skips the check for quadruped/creature/mechanical characters that have no mouth', () => {
    const quadruped: MohoCharacterBible = {
      ...validCharacterBible(),
      rigType: 'quadruped',
      mouthShapes: []
    };
    expect(() => assertCharacterHasMouthSwitch(quadruped)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Color ID resolution between character bible line rules and palette
// ─────────────────────────────────────────────────────────────────────────────

export function assertCharacterLineColourIdsResolve(
  characterBible: MohoCharacterBible,
  palette: MohoPaletteManifest
): void {
  if (!characterBible.lineRules) {
    return;
  }

  const paletteIds = new Set(palette.colours.map((c) => c.colourId));
  const declared = characterBible.lineRules.lineColourId;

  if (!paletteIds.has(declared)) {
    throw new Error(
      `Character "${characterBible.characterId}" lineRules.lineColourId "${declared}" ` +
      `is NOT present in palette "${palette.paletteId}". ` +
      `Available colourIds: [${Array.from(paletteIds).sort().join(', ') || '(empty)'}]. ` +
      `Either add the colour to the palette manifest, or fix the character bible to reference an existing colour.`
    );
  }
}

describe('INVARIANT: assertCharacterLineColourIdsResolve helper', () => {
  it('passes when lineColourId is present in the palette', () => {
    const char: MohoCharacterBible = {
      ...validCharacterBible(),
      lineRules: { lineThicknessPt: 2.0, lineColourId: 'line_main' }
    };
    const palette = validPalette();
    expect(() => assertCharacterLineColourIdsResolve(char, palette)).not.toThrow();
  });

  it('passes when no lineRules are declared (no requirement)', () => {
    const char = validCharacterBible();
    expect(() => assertCharacterLineColourIdsResolve(char, validPalette())).not.toThrow();
  });

  it('throws a self-explanatory error when lineColourId is missing from palette', () => {
    const char: MohoCharacterBible = {
      ...validCharacterBible(),
      lineRules: { lineThicknessPt: 1.5, lineColourId: 'line_neon_pink' }
    };
    const palette = validPalette();
    expect(() => assertCharacterLineColourIdsResolve(char, palette)).toThrow(/line_neon_pink/);
    expect(() => assertCharacterLineColourIdsResolve(char, palette)).toThrow(/line_main/);
    expect(() => assertCharacterLineColourIdsResolve(char, palette)).toThrow(/char_main_v1/);
  });

  it('error message lists the available colourIds for quick debugging', () => {
    const char: MohoCharacterBible = {
      ...validCharacterBible(),
      lineRules: { lineThicknessPt: 1.0, lineColourId: 'missing_colour' }
    };
    const palette = validPalette();
    let caught: Error | null = null;
    try {
      assertCharacterLineColourIdsResolve(char, palette);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).not.toBeNull();
    expect(caught!.message).toContain('fill_skin');
    expect(caught!.message).toContain('line_main');
  });

  it('integrity round-trip: every palette colourId satisfies an empty character with no lineRules', () => {
    const palette = validPalette();
    for (const colour of palette.colours) {
      const char: MohoCharacterBible = {
        ...validCharacterBible(),
        lineRules: { lineThicknessPt: 1.0, lineColourId: colour.colourId }
      };
      expect(() => assertCharacterLineColourIdsResolve(char, palette)).not.toThrow();
    }
  });
});