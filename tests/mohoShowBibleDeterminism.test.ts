import fs from 'fs';
import os from 'os';
import path from 'path';
import { MohoShowBibleLoader } from '../src/services/mohoShowBibleLoader/index.js';
import { config } from '../src/config.js';
import {
  validMohoShowBible,
  validMohoCharacterBible,
  validMohoPaletteManifest,
  validMohoCameraRules,
  validMohoMotionGrammar,
  validMohoQaThresholds,
  validAssetLicense,
  VALID_DATE
} from './fixtures/mohoShowBible.valid.js';

interface BundleFiles {
  mohoShowBiblePath: string;
  characterBiblePath: string;
  licensePath: string;
  palettePath: string;
  cameraRulesPath: string;
  motionGrammarPath: string;
  qaThresholdsPath: string;
}

function writeJson(p: string, obj: unknown, indent?: number): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(
    p,
    indent !== undefined ? JSON.stringify(obj, null, indent) : JSON.stringify(obj),
    'utf8'
  );
}

function buildBundle(
  root: string,
  opts: {
    rigType?: 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical';
    indent?: number;
    showBibleMutator?: (show: ReturnType<typeof validMohoShowBible>) => ReturnType<typeof validMohoShowBible>;
    characterBibleMutator?: (cb: ReturnType<typeof validMohoCharacterBible>) => ReturnType<typeof validMohoCharacterBible>;
    paletteMutator?: (p: ReturnType<typeof validMohoPaletteManifest>) => ReturnType<typeof validMohoPaletteManifest>;
  } = {}
): BundleFiles {
  const indent = opts.indent;
  const showDir = path.join(root, 'show');
  const mohoShowBiblePath = path.join(showDir, 'moho_show_bible.json');
  const palettePath = path.join(showDir, 'bibles', 'palette_manifest.json');
  const characterBiblePath = path.join(showDir, 'bibles', 'char_test_humanoid.json');
  const cameraRulesPath = path.join(showDir, 'bibles', 'camera_rules.json');
  const motionGrammarPath = path.join(showDir, 'bibles', 'motion_grammar.json');
  const qaThresholdsPath = path.join(showDir, 'bibles', 'qa_thresholds.json');
  const licensePath = path.join(showDir, 'licenses', 'char_test_humanoid.license.json');

  const rigType = opts.rigType ?? 'humanoid_2leg';

  let characterBible = validMohoCharacterBible(rigType);
  if (opts.characterBibleMutator) characterBible = opts.characterBibleMutator(characterBible);

  let palette = validMohoPaletteManifest();
  if (opts.paletteMutator) palette = opts.paletteMutator(palette);

  const cameraRules = validMohoCameraRules();
  const motionGrammar = validMohoMotionGrammar();
  const qaThresholds = validMohoQaThresholds();
  const license = validAssetLicense();

  writeJson(licensePath, license, indent);
  if (rigType === 'quadruped') {
    writeJson(
      path.join(showDir, 'licenses', 'char_test_quadruped.license.json'),
      { ...license, assetId: 'char_test_quadruped' },
      indent
    );
  }
  writeJson(palettePath, palette, indent);
  writeJson(characterBiblePath, characterBible, indent);
  writeJson(cameraRulesPath, cameraRules, indent);
  writeJson(motionGrammarPath, motionGrammar, indent);
  writeJson(qaThresholdsPath, qaThresholds, indent);

  let show = validMohoShowBible({ rigType });
  if (opts.showBibleMutator) show = opts.showBibleMutator(show);
  writeJson(mohoShowBiblePath, show, indent);

  return {
    mohoShowBiblePath,
    characterBiblePath,
    licensePath,
    palettePath,
    cameraRulesPath,
    motionGrammarPath,
    qaThresholdsPath
  };
}

describe('MohoShowBibleLoader — fingerprint determinism', () => {
  let tmpDir: string;
  let originalAllowedRoots: string[];
  let loader: MohoShowBibleLoader;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-showbible-det-'));
    originalAllowedRoots = [...config.allowedRoots];
    config.allowedRoots = [tmpDir];
    loader = new MohoShowBibleLoader();
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    config.allowedRoots = originalAllowedRoots;
  });

  it('produces identical fingerprints when the same bundle content is written three times', () => {
    const rootA = path.join(tmpDir, 'a');
    const rootB = path.join(tmpDir, 'b');
    const rootC = path.join(tmpDir, 'c');
    const { mohoShowBiblePath: pA } = buildBundle(rootA);
    const { mohoShowBiblePath: pB } = buildBundle(rootB);
    const { mohoShowBiblePath: pC } = buildBundle(rootC);

    const fpA = loader.load(pA).fingerprint;
    const fpB = loader.load(pB).fingerprint;
    const fpC = loader.load(pC).fingerprint;

    expect(fpA).toMatch(/^[a-f0-9]{64}$/);
    expect(fpA).toBe(fpB);
    expect(fpB).toBe(fpC);
    expect(fpA).toBe(fpC);
  });

  it('produces the same fingerprint regardless of object key order in the on-disk JSON', () => {
    const reorderKeys = <T extends Record<string, unknown>>(obj: T): T => {
      const keys = Object.keys(obj);
      const reversed: Record<string, unknown> = {};
      for (const k of [...keys].reverse()) reversed[k] = obj[k];
      return reversed as T;
    };

    const rootCanonical = path.join(tmpDir, 'canonical');
    const rootReordered = path.join(tmpDir, 'reordered');

    const { mohoShowBiblePath: canonicalShowPath } = buildBundle(rootCanonical, {
      indent: 2
    });

    const { mohoShowBiblePath: reorderedShowPath } = buildBundle(rootReordered, {
      indent: 2,
      showBibleMutator: (s) => reorderKeys({ ...s }) as ReturnType<typeof validMohoShowBible>,
      characterBibleMutator: (c) => reorderKeys({ ...c }) as ReturnType<typeof validMohoCharacterBible>,
      paletteMutator: (p) => reorderKeys({ ...p }) as ReturnType<typeof validMohoPaletteManifest>
    });

    const fpCanonical = loader.load(canonicalShowPath).fingerprint;
    const fpReordered = loader.load(reorderedShowPath).fingerprint;

    expect(fpCanonical).toMatch(/^[a-f0-9]{64}$/);
    expect(fpReordered).toMatch(/^[a-f0-9]{64}$/);
    expect(fpCanonical).toBe(fpReordered);
  });

  it('produces the same fingerprint regardless of JSON whitespace/indentation', () => {
    const rootTwoSpace = path.join(tmpDir, 'two_space');
    const rootFourSpace = path.join(tmpDir, 'four_space');
    const rootCompact = path.join(tmpDir, 'compact');

    const { mohoShowBiblePath: pTwo } = buildBundle(rootTwoSpace, { indent: 2 });
    const { mohoShowBiblePath: pFour } = buildBundle(rootFourSpace, { indent: 4 });
    const { mohoShowBiblePath: pCompact } = buildBundle(rootCompact, { indent: undefined });

    const fpTwo = loader.load(pTwo).fingerprint;
    const fpFour = loader.load(pFour).fingerprint;
    const fpCompact = loader.load(pCompact).fingerprint;

    expect(fpTwo).toMatch(/^[a-f0-9]{64}$/);
    expect(fpTwo).toBe(fpFour);
    expect(fpFour).toBe(fpCompact);
    expect(fpTwo).toBe(fpCompact);
  });

  it('produces a different fingerprint when the character rigType changes', () => {
    const rootHumanoid = path.join(tmpDir, 'humanoid');
    const rootQuadruped = path.join(tmpDir, 'quadruped');

    const { mohoShowBiblePath: pHuman } = buildBundle(rootHumanoid, { rigType: 'humanoid_2leg' });
    const { mohoShowBiblePath: pQuad } = buildBundle(rootQuadruped, {
      rigType: 'quadruped',
      showBibleMutator: (s) => ({
        ...s,
        characterBibles: [{ characterId: 'char_test_quadruped', ref: 'bibles/char_test_humanoid.json' }]
      })
    });

    const fpHuman = loader.load(pHuman).fingerprint;
    const fpQuad = loader.load(pQuad).fingerprint;

    expect(fpHuman).toMatch(/^[a-f0-9]{64}$/);
    expect(fpQuad).toMatch(/^[a-f0-9]{64}$/);
    expect(fpHuman).not.toBe(fpQuad);
  });

  it('produces a different fingerprint when an extra colour is added to the palette', () => {
    const rootBase = path.join(tmpDir, 'base');
    const rootExtra = path.join(tmpDir, 'extra');

    const { mohoShowBiblePath: pBase } = buildBundle(rootBase);
    const { mohoShowBiblePath: pExtra } = buildBundle(rootExtra, {
      paletteMutator: (p) => ({
        ...p,
        colours: [
          ...p.colours,
          {
            colourId: 'char_accent_extra',
            name: 'Accent Extra',
            rgba: '#A0C8FFFF',
            usage: 'accent',
            locked: false,
            mohoColourIndex: 5
          }
        ]
      })
    });

    const fpBase = loader.load(pBase).fingerprint;
    const fpExtra = loader.load(pExtra).fingerprint;

    expect(fpBase).toMatch(/^[a-f0-9]{64}$/);
    expect(fpExtra).toMatch(/^[a-f0-9]{64}$/);
    expect(fpBase).not.toBe(fpExtra);
  });

  it('produces a different fingerprint when a new controller is added to a character', () => {
    const rootBase = path.join(tmpDir, 'base');
    const rootExtra = path.join(tmpDir, 'extra');

    const { mohoShowBiblePath: pBase } = buildBundle(rootBase);
    const { mohoShowBiblePath: pExtra } = buildBundle(rootExtra, {
      characterBibleMutator: (cb) => ({
        ...cb,
        controllers: [
          ...cb.controllers,
          {
            controllerId: 'EXTRA_ROT',
            boneId: 99,
            boneName: 'extra_bone',
            purpose: 'Extra controller for determinism test',
            range: { min: -10, max: 10, units: 'degrees' },
            channel: 'rotation'
          }
        ]
      })
    });

    const fpBase = loader.load(pBase).fingerprint;
    const fpExtra = loader.load(pExtra).fingerprint;

    expect(fpBase).toMatch(/^[a-f0-9]{64}$/);
    expect(fpExtra).toMatch(/^[a-f0-9]{64}$/);
    expect(fpBase).not.toBe(fpExtra);
  });

  it('produces the same fingerprint on a second load of the same on-disk bundle', () => {
    const { mohoShowBiblePath } = buildBundle(tmpDir);

    const fp1 = loader.load(mohoShowBiblePath).fingerprint;
    const fp2 = loader.load(mohoShowBiblePath).fingerprint;

    expect(fp1).toMatch(/^[a-f0-9]{64}$/);
    expect(fp2).toMatch(/^[a-f0-9]{64}$/);
    expect(fp1).toBe(fp2);
  });
});