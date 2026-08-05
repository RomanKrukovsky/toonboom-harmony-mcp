import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  ModelCatalog,
  getModelCatalog,
  validateCatalogSemantics,
  looksFabricated,
  catalogPath,
  modelCacheRoot,
  type CatalogEntry
} from '../../src/services/modelCatalog/index.js';
import { LicensePolicyEngine, readLicensePolicyConfig } from '../../src/services/licensePolicyEngine/index.js';
import { MlError } from '../../src/errors/mlErrorRegistry.js';

const REAL_CATALOG = getModelCatalog();

function baseEntry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    modelId: 'test-model',
    providerId: 'test',
    taskTypes: ['pose_estimation'],
    displayName: 'Test',
    upstreamRepository: 'https://example.invalid/repo',
    upstreamCommit: null,
    revision: 'v1',
    cacheKey: 'test/v1',
    weightsFiles: [{
      role: 'main', fileName: 'w.onnx', url: 'https://example.invalid/w.onnx',
      sizeBytes: 1, format: 'onnx', sha256: 'a1b2c3d4'.repeat(8),
      hashSource: 'upstream_published_checksum', requiresQuarantineReview: false
    }],
    runtime: { kind: 'onnxruntime', trustRemoteCode: false, requiresPickle: false },
    hardware: { devices: ['cpu'], minRamGb: 1 },
    license: {
      codeLicense: 'MIT', weightsLicense: 'MIT', datasetLicense: 'allowed',
      commercialUse: 'allowed', derivativeWeights: 'allowed', redistribution: 'allowed',
      attribution: 'Test', territorialRestrictions: [], personalDataRisk: 'none',
      biometricDataRisk: 'none', consentRequired: false, status: 'production_allowed',
      legalNotes: '', verifiedSourceUrls: [], verifiedAt: '2026-07-27', verifiedBy: 'tester'
    },
    maturity: 'planned',
    ...overrides
  } as CatalogEntry;
}

describe('the committed catalog is clean', () => {
  it('contains no absolute path and no user home directory', () => {
    const raw = fs.readFileSync(catalogPath(), 'utf-8');
    expect(raw).not.toContain('/Users/');
    expect(raw).not.toContain('C:\\Users');
    expect(raw).not.toMatch(/"cacheKey"\s*:\s*"\//);
  });

  it('contains no digest with the repeating pattern the old registry had', () => {
    for (const model of REAL_CATALOG.list()) {
      for (const file of model.weightsFiles) {
        if (file.sha256) expect(looksFabricated(file.sha256)).toBe(false);
      }
    }
  });

  it('passes its own semantic validation with zero errors', () => {
    const issues = validateCatalogSemantics(REAL_CATALOG.list());
    expect(issues.filter(i => i.severity === 'error')).toEqual([]);
  });

  it('resolves the weight cache root from HARMONY_MODEL_CACHE, not from a baked-in path', () => {
    const previous = process.env.HARMONY_MODEL_CACHE;
    process.env.HARMONY_MODEL_CACHE = path.join(os.tmpdir(), 'harmony-cache-test');
    expect(modelCacheRoot()).toBe(path.resolve(path.join(os.tmpdir(), 'harmony-cache-test')));
    if (previous === undefined) delete process.env.HARMONY_MODEL_CACHE;
    else process.env.HARMONY_MODEL_CACHE = previous;
  });
});

describe('fabricated digest detection', () => {
  it.each([
    ['d04c4dbb75a1c028ba49156a02b3769c7cc45a90ac8cf8cf8cf8cf8cf8cf8cf8'],
    ['a28b030438cfceee1534b1239aa8dfce00124a91924192419241924192419241'],
    ['0'.repeat(64)]
  ])('flags %s', (digest) => {
    expect(looksFabricated(digest)).toBe(true);
  });

  it.each([
    ['724f4ff2439ed61afb86fb8a1951ec39c6220682803b4a8bd4f598cd913b1843'],
    ['7860ae79de6c89a3c1eb72ae9a2756c0ccfbe04b7791bb5880afabd97855a411'],
    ['ed3a0b6b245efebe5dc0f030193843f9c05e99f78d4d5d326bcba2ac9f5c76b0']
  ])('accepts the real digest %s', (digest) => {
    expect(looksFabricated(digest)).toBe(false);
  });
});

describe('catalog semantic rules', () => {
  it('rejects a duplicate model id', () => {
    const issues = validateCatalogSemantics([baseEntry(), baseEntry()]);
    expect(issues.some(i => i.code === 'DUPLICATE_MODEL_ID')).toBe(true);
  });

  it('rejects two models claiming the same cache key', () => {
    const issues = validateCatalogSemantics([baseEntry(), baseEntry({ modelId: 'other' })]);
    expect(issues.some(i => i.code === 'CACHE_KEY_COLLISION')).toBe(true);
  });

  it('rejects real_model_verified with no trusted digest', () => {
    const entry = baseEntry({
      maturity: 'real_model_verified',
      weightsFiles: [{
        role: 'main', fileName: 'w.pt', url: 'https://example.invalid/w.pt', sizeBytes: null,
        format: 'pytorch_pickle', sha256: null, hashSource: 'not_published_upstream', requiresQuarantineReview: true
      }]
    });
    const issues = validateCatalogSemantics([entry]);
    expect(issues.some(i => i.code === 'UNSUPPORTED_MATURITY_CLAIM')).toBe(true);
  });

  it('refuses to load a structurally invalid catalog rather than substituting defaults', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cat-')), 'catalog.json');
    fs.writeFileSync(file, JSON.stringify({ schemaVersion: '1.0', generatedAt: 'x', models: [] }));
    expect(() => ModelCatalog.load(file)).toThrow(MlError);
  });
});

describe('model readiness is measured, not assumed', () => {
  it('reports DWPose as installed and hash-verified from the legacy weights directory', () => {
    const readiness = REAL_CATALOG.getModelReadiness('dwpose-ll-ucoco-384', {
      extraSearchDirs: [path.join(process.cwd(), 'services', 'ml-runtime', 'weights', 'dwpose')]
    });
    expect(readiness.installed).toBe(true);
    expect(readiness.hashVerified).toBe(true);
    expect(readiness.blockingReason).toBeNull();
  });

  it('reports an uninstalled model as blocked with the missing filenames', () => {
    const readiness = REAL_CATALOG.getModelReadiness('sam2.1_hiera_tiny');
    expect(readiness.hashVerified).toBe(false);
    expect(readiness.missingFiles).toContain('sam2.1_hiera_tiny.pt');
    expect(readiness.blockingReason).toMatch(/weights not installed/);
  });

  it('never reports hashVerified for a file the catalog has no digest for', () => {
    for (const model of REAL_CATALOG.list()) {
      const readiness = REAL_CATALOG.getModelReadiness(model.modelId);
      if (readiness.untrustedFiles.length > 0) expect(readiness.hashVerified).toBe(false);
    }
  });
});

describe('LicensePolicyEngine', () => {
  const commercial = new LicensePolicyEngine(REAL_CATALOG, { commercialBuild: true, studioRegion: null, allowResearchModels: false, allowLegalReviewPending: false });
  const nonCommercial = new LicensePolicyEngine(REAL_CATALOG, { commercialBuild: false, studioRegion: null, allowResearchModels: false, allowLegalReviewPending: false });

  it('defaults COMMERCIAL_BUILD to true', () => {
    const previous = process.env.COMMERCIAL_BUILD;
    delete process.env.COMMERCIAL_BUILD;
    expect(readLicensePolicyConfig().commercialBuild).toBe(true);
    if (previous !== undefined) process.env.COMMERCIAL_BUILD = previous;
  });

  it('blocks a review-pending model in a commercial build, and says why in machine-readable codes', () => {
    const decision = commercial.evaluate('dwpose-ll-ucoco-384', 'before_inference', 'inference');
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCodes).toContain('LICENSE_REVIEW_PENDING');
    expect(decision.reasonCodes).toContain('COMMERCIAL_BUILD_REQUIRES_CLEARED_LICENSE');
  });

  it('blocks research-only models unless the operator opts in', () => {
    const decision = nonCommercial.evaluate('audiocraft-musicgen', 'before_inference', 'inference');
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCodes).toContain('LICENSE_RESEARCH_ONLY');
  });

  it('keeps preview_only output out of a deliverable even in a non-commercial build', () => {
    const decision = nonCommercial.evaluate('liveportrait', 'before_packaging', 'commercial_delivery');
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCodes).toContain('LICENSE_PREVIEW_ONLY');
  });

  it('treats inference permission as separate from fine-tuning and redistribution', () => {
    const catalog = fakeCatalog(baseEntry({
      license: { ...baseEntry().license, derivativeWeights: 'forbidden', redistribution: 'forbidden' }
    }));
    const engine = new LicensePolicyEngine(catalog, { commercialBuild: true, studioRegion: null, allowResearchModels: false, allowLegalReviewPending: false });
    expect(engine.evaluate('test-model', 'before_inference', 'inference').allowed).toBe(true);
    expect(engine.evaluate('test-model', 'before_inference', 'fine_tuning').reasonCodes).toContain('DERIVATIVE_WEIGHTS_NOT_PERMITTED');
    expect(engine.evaluate('test-model', 'before_packaging', 'derivative_weight_distribution').reasonCodes).toContain('REDISTRIBUTION_NOT_PERMITTED');
  });

  it('treats a missing STUDIO_REGION as refusal, not as permission', () => {
    const catalog = fakeCatalog(baseEntry({
      license: { ...baseEntry().license, territorialRestrictions: ['DE', 'FR'] }
    }));
    const withoutRegion = new LicensePolicyEngine(catalog, { commercialBuild: true, studioRegion: null, allowResearchModels: false, allowLegalReviewPending: false });
    expect(withoutRegion.evaluate('test-model', 'before_inference', 'inference').reasonCodes).toContain('STUDIO_REGION_UNDECLARED');

    const wrongRegion = new LicensePolicyEngine(catalog, { commercialBuild: true, studioRegion: 'US', allowResearchModels: false, allowLegalReviewPending: false });
    expect(wrongRegion.evaluate('test-model', 'before_inference', 'inference').reasonCodes).toContain('TERRITORY_NOT_PERMITTED');

    const rightRegion = new LicensePolicyEngine(catalog, { commercialBuild: true, studioRegion: 'DE', allowResearchModels: false, allowLegalReviewPending: false });
    expect(rightRegion.evaluate('test-model', 'before_inference', 'inference').allowed).toBe(true);
  });

  it('never lets the evaluation override reach the packaging gate', () => {
    const engine = new LicensePolicyEngine(REAL_CATALOG, { commercialBuild: false, studioRegion: null, allowResearchModels: false, allowLegalReviewPending: true });
    const inference = engine.evaluate('dwpose-ll-ucoco-384', 'before_inference', 'inference');
    expect(inference.allowed).toBe(true);
    expect(inference.reasonCodes).toContain('LICENSE_REVIEW_PENDING_OVERRIDDEN');

    const packaging = engine.evaluate('dwpose-ll-ucoco-384', 'before_packaging', 'commercial_delivery');
    expect(packaging.allowed).toBe(false);
  });

  it('cannot enable the override in a commercial build at all', () => {
    const previousCommercial = process.env.COMMERCIAL_BUILD;
    const previousOverride = process.env.ALLOW_LEGAL_REVIEW_PENDING;
    process.env.COMMERCIAL_BUILD = 'true';
    process.env.ALLOW_LEGAL_REVIEW_PENDING = 'true';
    expect(readLicensePolicyConfig().allowLegalReviewPending).toBe(false);
    restore('COMMERCIAL_BUILD', previousCommercial);
    restore('ALLOW_LEGAL_REVIEW_PENDING', previousOverride);
  });

  it('blocks the whole package when any contributing model is refused', () => {
    const outcome = commercial.evaluatePackage(['dwpose-ll-ucoco-384', 'liveportrait']);
    expect(outcome.allowed).toBe(false);
    expect(outcome.blockedModelIds).toEqual(expect.arrayContaining(['dwpose-ll-ucoco-384', 'liveportrait']));
  });

  it('throws ML_LICENSE_BLOCKED from requireAllowed rather than returning a warning', () => {
    expect(() => commercial.requireAllowed('dwpose-ll-ucoco-384', 'before_inference', 'inference')).toThrow(MlError);
  });

  it('records the digest of the licence record it decided against', () => {
    const decision = commercial.evaluate('dwpose-ll-ucoco-384', 'before_inference', 'inference');
    expect(decision.licenseRecordSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});

function restore(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function fakeCatalog(...entries: CatalogEntry[]): ModelCatalog {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-'));
  const file = path.join(dir, 'catalog.json');
  fs.writeFileSync(file, JSON.stringify({ schemaVersion: '2.0', generatedAt: '2026-07-27', models: entries }));
  return ModelCatalog.load(file);
}
