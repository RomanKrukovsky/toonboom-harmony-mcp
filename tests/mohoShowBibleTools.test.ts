import fs from 'fs';
import os from 'os';
import path from 'path';
import { mohoShowBibleTools } from '../src/tools/mohoShowBibleTools.js';
import { mohoShowBibleScaffoldTools } from '../src/tools/mohoShowBibleScaffold.js';
import { config } from '../src/config.js';
import {
  validMohoShowBible,
  validMohoCharacterBible,
  validMohoPaletteManifest,
  validMohoCameraRules,
  validMohoMotionGrammar,
  validMohoQaThresholds,
  validAssetLicense
} from './fixtures/mohoShowBible.valid.js';

interface BundleFiles {
  mohoShowBiblePath: string;
  characterBiblePath: string;
  palettePath: string;
  cameraRulesPath: string;
  motionGrammarPath: string;
  qaThresholdsPath: string;
  licensePath: string;
}

function writeJson(p: string, obj: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj), 'utf8');
}

function buildValidBundle(root: string): BundleFiles {
  const showDir = path.join(root, 'show');
  const mohoShowBiblePath = path.join(showDir, 'moho_show_bible.json');
  const biblesDir = path.join(showDir, 'bibles');
  const palettePath = path.join(biblesDir, 'palette_manifest.json');
  const cameraRulesPath = path.join(biblesDir, 'camera_rules.json');
  const motionGrammarPath = path.join(biblesDir, 'motion_grammar.json');
  const qaThresholdsPath = path.join(biblesDir, 'qa_thresholds.json');

  const characterId = 'char_test_humanoid';
  const characterBiblePath = path.join(biblesDir, `${characterId}.json`);
  const licensePath = path.join(showDir, 'licenses', `${characterId}.license.json`);

  const characterBible = validMohoCharacterBible('humanoid_2leg');
  const license = validAssetLicense();

  writeJson(licensePath, license);
  writeJson(palettePath, validMohoPaletteManifest());
  writeJson(characterBiblePath, characterBible);
  writeJson(cameraRulesPath, validMohoCameraRules());
  writeJson(motionGrammarPath, validMohoMotionGrammar());
  writeJson(qaThresholdsPath, validMohoQaThresholds());
  writeJson(mohoShowBiblePath, validMohoShowBible({ characterId }));

  return {
    mohoShowBiblePath,
    characterBiblePath,
    palettePath,
    cameraRulesPath,
    motionGrammarPath,
    qaThresholdsPath,
    licensePath
  };
}

describe('mohoShowBibleTools', () => {
  let tmpDir: string;
  let originalAllowedRoots: string[];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-showbible-tools-test-'));
    originalAllowedRoots = [...config.allowedRoots];
    config.allowedRoots = [tmpDir];
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    config.allowedRoots = originalAllowedRoots;
  });

  describe('moho.show_bible.load', () => {
    it('returns { status: "success", loaded } for a valid bundle', async () => {
      const { mohoShowBiblePath } = buildValidBundle(tmpDir);
      const tool = mohoShowBibleTools.find(t => t.name === 'moho.show_bible.load');
      expect(tool).toBeDefined();

      const result: any = await tool!.handler({ showBiblePath: mohoShowBiblePath });
      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.loaded).toBeDefined();
        expect(result.loaded.mohoShowBible.showId).toBe('show_test_v1');
        expect(result.loaded.characterBibles).toHaveLength(1);
        expect(result.loaded.characterBibles[0].characterId).toBe('char_test_humanoid');
        expect(result.loaded.crossRefs).toBeDefined();
        expect(result.loaded.fingerprint).toMatch(/^[a-f0-9]{64}$/);
      }
    });
  });

  describe('moho.show_bible.validate', () => {
    it('returns { status: "valid", fingerprint } for a valid bundle', async () => {
      const { mohoShowBiblePath } = buildValidBundle(tmpDir);
      const tool = mohoShowBibleTools.find(t => t.name === 'moho.show_bible.validate');
      expect(tool).toBeDefined();

      const result: any = await tool!.handler({ showBiblePath: mohoShowBiblePath });
      expect(result.status).toBe('valid');
      if (result.status === 'valid') {
        expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
        expect(result.fingerprint).toHaveLength(64);
      }
    });

    it('returns { status: "invalid", errors } when a referenced file is missing', async () => {
      const showDir = path.join(tmpDir, 'show');
      fs.mkdirSync(showDir, { recursive: true });
      const mohoShowBiblePath = path.join(showDir, 'moho_show_bible.json');
      writeJson(mohoShowBiblePath, validMohoShowBible());

      const tool = mohoShowBibleTools.find(t => t.name === 'moho.show_bible.validate');
      expect(tool).toBeDefined();

      const result: any = await tool!.handler({ showBiblePath: mohoShowBiblePath });
      expect(result.status).toBe('invalid');
      if (result.status === 'invalid') {
        expect(Array.isArray(result.errors)).toBe(true);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('moho.show_bible.fingerprint', () => {
    it('returns the same fingerprint when called twice with the same bundle', async () => {
      const { mohoShowBiblePath } = buildValidBundle(tmpDir);
      const tool = mohoShowBibleTools.find(t => t.name === 'moho.show_bible.fingerprint');
      expect(tool).toBeDefined();

      const first: any = await tool!.handler({ showBiblePath: mohoShowBiblePath });
      const second: any = await tool!.handler({ showBiblePath: mohoShowBiblePath });

      expect(first.status).toBe('success');
      expect(second.status).toBe('success');
      if (first.status === 'success' && second.status === 'success') {
        expect(first.fingerprint).toBe(second.fingerprint);
        expect(first.fingerprint).toMatch(/^[a-f0-9]{64}$/);
      }
    });
  });

  describe('moho.show_bible.get_cross_refs', () => {
    it('returns crossRefs with allowedRigTypes', async () => {
      const { mohoShowBiblePath } = buildValidBundle(tmpDir);
      const tool = mohoShowBibleTools.find(t => t.name === 'moho.show_bible.get_cross_refs');
      expect(tool).toBeDefined();

      const result: any = await tool!.handler({ showBiblePath: mohoShowBiblePath });
      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.crossRefs).toBeDefined();
        expect(Array.isArray(result.crossRefs.allowedRigTypes)).toBe(true);
        expect(result.crossRefs.allowedRigTypes).toEqual(
          expect.arrayContaining(['humanoid_2leg', 'quadruped', 'creature', 'mechanical'])
        );
        expect(result.crossRefs.characterIds).toEqual(['char_test_humanoid']);
        expect(result.crossRefs.cameraRules.allowedShotSizes).toContain('close_up');
        expect(result.crossRefs.motionGrammar.allowedEmotions).toEqual(expect.arrayContaining(['neutral']));
      }
    });
  });

  describe('moho.show_bible.list_allowed_rig_types', () => {
    it('returns the list of allowedRigTypes', async () => {
      const { mohoShowBiblePath } = buildValidBundle(tmpDir);
      const tool = mohoShowBibleTools.find(t => t.name === 'moho.show_bible.list_allowed_rig_types');
      expect(tool).toBeDefined();

      const result: any = await tool!.handler({ showBiblePath: mohoShowBiblePath });
      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(Array.isArray(result.allowedRigTypes)).toBe(true);
        expect(result.allowedRigTypes).toEqual(
          expect.arrayContaining(['humanoid_2leg', 'quadruped', 'creature', 'mechanical'])
        );
      }
    });
  });

  describe('moho.show_bible.scaffold', () => {
    it('writes 6 files to the output directory', async () => {
      const outputDir = path.join(tmpDir, 'scaffold-out');
      const tool = mohoShowBibleScaffoldTools.find(t => t.name === 'moho.show_bible.scaffold');
      expect(tool).toBeDefined();

      const result: any = await tool!.handler({
        outputDir,
        showId: 'scaffold_test_v1',
        title: 'Scaffold Test',
        rigTypes: ['humanoid_2leg'],
        includeCharacterTemplate: false,
        includeExamples: false
      });

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.filesWritten).toHaveLength(6);
        expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
      }

      const expectedNames = [
        'moho_show_bible.json',
        'palette.json',
        'camera_rules.json',
        'motion_grammar.json',
        'qa_thresholds.json',
        'asset_license.json'
      ];
      for (const name of expectedNames) {
        expect(fs.existsSync(path.join(outputDir, name))).toBe(true);
      }
    });

    it('does not write files when dryRun is true but lists them in the response', async () => {
      const outputDir = path.join(tmpDir, 'scaffold-dryrun');
      const tool = mohoShowBibleScaffoldTools.find(t => t.name === 'moho.show_bible.scaffold');
      expect(tool).toBeDefined();

      const result: any = await tool!.handler({
        outputDir,
        showId: 'scaffold_dryrun_v1',
        title: 'Scaffold DryRun',
        rigTypes: ['humanoid_2leg'],
        includeCharacterTemplate: false,
        includeExamples: false,
        dryRun: true
      });

      expect(result.status).toBe('dry_run');
      if (result.status === 'dry_run') {
        expect(result.filesToWrite).toHaveLength(6);
        for (const f of result.filesToWrite) {
          expect(path.isAbsolute(f)).toBe(true);
          expect(f.startsWith(outputDir)).toBe(true);
        }
      }

      expect(fs.existsSync(outputDir)).toBe(false);
    });
  });

  describe('tool registration', () => {
    it('exports 5 tools from mohoShowBibleTools', () => {
      expect(Array.isArray(mohoShowBibleTools)).toBe(true);
      expect(mohoShowBibleTools).toHaveLength(5);

      const expectedNames = [
        'moho.show_bible.load',
        'moho.show_bible.validate',
        'moho.show_bible.fingerprint',
        'moho.show_bible.get_cross_refs',
        'moho.show_bible.list_allowed_rig_types'
      ];
      const actualNames = mohoShowBibleTools.map(t => t.name);
      for (const name of expectedNames) {
        expect(actualNames).toContain(name);
      }
    });

    it('exposes the scaffold tool alongside the 5 core tools (6 total)', () => {
      const allToolNames = [
        ...mohoShowBibleTools.map(t => t.name),
        ...mohoShowBibleScaffoldTools.map(t => t.name)
      ];
      const expectedNames = [
        'moho.show_bible.load',
        'moho.show_bible.validate',
        'moho.show_bible.fingerprint',
        'moho.show_bible.get_cross_refs',
        'moho.show_bible.list_allowed_rig_types',
        'moho.show_bible.scaffold'
      ];
      for (const name of expectedNames) {
        expect(allToolNames).toContain(name);
      }
      expect(allToolNames).toHaveLength(6);
    });

    it('every registered tool has name, description, inputSchema, and handler', () => {
      const allTools = [...mohoShowBibleTools, ...mohoShowBibleScaffoldTools];
      for (const tool of allTools) {
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.handler).toBe('function');
      }
    });
  });
});