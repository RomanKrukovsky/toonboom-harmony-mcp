import { describe, it, expect } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import { MohoSmartPsdSemanticParser } from '../src/services/mohoSmartPsdSemanticParser/index.js';

describe('Smart PSD Semantic Layer Classifier & Inpainter', () => {
  const psdFixture = path.resolve(process.cwd(), 'fixtures/moho_reference/gramps.psd');
  const outMoho = path.resolve(process.cwd(), 'output/Gramps_Test_Rig.moho');

  it('ingests multi-layer PSD, classifies body parts, and compiles valid Moho 14 rig', () => {
    expect(fs.existsSync(psdFixture)).toBe(true);

    const result = MohoSmartPsdSemanticParser.ingestPsdToRig({
      psdPath: psdFixture,
      characterName: 'Gramps_Hero',
      outputMohoPath: outMoho
    });

    expect(result.characterName).toBe('Gramps_Hero');
    expect(result.fileSizeBytes).toBeGreaterThan(10000);
    expect(result.isProductionReady).toBe(true);
    expect(fs.existsSync(outMoho)).toBe(true);
  });
});
