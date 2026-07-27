/**
 * Sprint 0 promotion gate — capability registry.
 *
 * Enforces that docs/capability_registry.json cannot claim a verification level it has no
 * evidence for. Run standalone via `npm run test:registry`.
 */

import fs from 'fs';
import path from 'path';
import {
  VERIFICATION_LEVELS,
  atOrAbove,
  capabilitySchema,
  evidencePathOf,
  isLocalOnlyEvidence,
  levelRank,
  loadRegistry,
  validateRegistry
} from '../src/services/capabilityRegistryValidator/index.js';

const REPO_ROOT = process.cwd();

describe('capability registry gate', () => {
  const registry = loadRegistry(REPO_ROOT);

  it('parses against the registry schema', () => {
    expect(registry.capabilities.length).toBeGreaterThan(0);
    for (const capability of registry.capabilities) {
      expect(capabilitySchema.safeParse(capability).success).toBe(true);
    }
  });

  it('has no promotion violations', () => {
    const violations = validateRegistry(registry, REPO_ROOT);
    if (violations.length > 0) {
      const rendered = violations.map(v => `  [${v.rule}] ${v.capabilityId}: ${v.detail}`).join('\n');
      throw new Error(`capability registry promotion violations:\n${rendered}`);
    }
    expect(violations).toEqual([]);
  });

  it('declares only known verification levels', () => {
    for (const capability of registry.capabilities) {
      expect(VERIFICATION_LEVELS).toContain(capability.verificationLevel as any);
    }
    for (const level of registry.verificationLevels) {
      expect(VERIFICATION_LEVELS).toContain(level as any);
    }
  });

  it('backs every level at or above offline_verified with evidence that exists', () => {
    for (const capability of registry.capabilities) {
      if (!atOrAbove(capability.verificationLevel, 'offline_verified')) continue;
      expect(capability.evidencePaths.length).toBeGreaterThan(0);
      for (const entry of capability.evidencePaths) {
        if (isLocalOnlyEvidence(entry)) continue;
        expect(fs.existsSync(path.join(REPO_ROOT, evidencePathOf(entry)))).toBe(true);
      }
    }
  });

  it('requires named models with hashes for any real_model_verified claim', () => {
    for (const capability of registry.capabilities) {
      if (!atOrAbove(capability.verificationLevel, 'real_model_verified')) continue;
      expect(capability.models && capability.models.length).toBeTruthy();
      for (const model of capability.models!) {
        expect(model.sha256).toMatch(/^[a-f0-9]{64}$/);
      }
      expect(Object.keys(capability.measured ?? {}).length).toBeGreaterThan(0);
    }
  });

  it('states a blocking reason for everything not implemented or unaudited', () => {
    for (const capability of registry.capabilities) {
      if (['not_implemented', 'unaudited'].includes(capability.verificationLevel)) {
        expect(capability.blockingReason).toBeTruthy();
        expect((capability.blockingReason ?? '').length).toBeGreaterThan(15);
      }
    }
  });

  it('gives every capability a next required proof', () => {
    for (const capability of registry.capabilities) {
      expect(capability.nextRequiredProof.length).toBeGreaterThan(10);
    }
  });

  it('points implementationFiles at files that exist', () => {
    for (const capability of registry.capabilities) {
      for (const file of capability.implementationFiles) {
        expect(fs.existsSync(path.join(REPO_ROOT, file))).toBe(true);
      }
    }
  });

  it('claims no Harmony level while Harmony execution is blocked', () => {
    // Guards the specific overclaim this project is prone to: Harmony is installed but
    // unlicensed, so nothing may sit at a real_harmony_* level.
    const harmony = registry.capabilities.find(c => c.capabilityId === 'harmony.scene_execution');
    expect(harmony).toBeDefined();
    if (harmony!.verificationLevel === 'not_implemented') {
      for (const capability of registry.capabilities) {
        expect(atOrAbove(capability.verificationLevel, 'real_harmony_smoke_verified')).toBe(false);
      }
    }
  });

  it('contains no absolute user paths', () => {
    expect(JSON.stringify(registry)).not.toContain('/Users/');
  });

  describe('rule enforcement (synthetic registries)', () => {
    const base = {
      schemaVersion: '1.0.0',
      generatedAt: '2026-07-27',
      verificationLevels: [...VERIFICATION_LEVELS],
      capabilities: [
        {
          capabilityId: 'test.cap',
          productionStage: 'test',
          implementationFiles: [],
          publicTools: [],
          backendType: 'none',
          verificationLevel: 'contract_verified' as const,
          evidencePaths: [],
          knownFailures: [],
          blockingReason: null,
          lastVerifiedAt: '2026-07-27',
          nextRequiredProof: 'something concrete and measurable'
        }
      ]
    };

    it('rejects promotion to offline_verified with no evidence', () => {
      const registry = {
        ...base,
        capabilities: [{ ...base.capabilities[0], verificationLevel: 'offline_verified' as const }]
      };
      const violations = validateRegistry(registry as any, REPO_ROOT);
      expect(violations.some(v => v.rule === 'evidence-required')).toBe(true);
    });

    it('rejects evidence paths that do not exist', () => {
      const registry = {
        ...base,
        capabilities: [
          {
            ...base.capabilities[0],
            verificationLevel: 'offline_verified' as const,
            evidencePaths: ['docs/evidence/does-not-exist.json']
          }
        ]
      };
      expect(validateRegistry(registry as any, REPO_ROOT).some(v => v.rule === 'evidence-exists')).toBe(true);
    });

    it('rejects real_model_verified without models or measurements', () => {
      const registry = {
        ...base,
        capabilities: [
          {
            ...base.capabilities[0],
            verificationLevel: 'real_model_verified' as const,
            evidencePaths: ['docs/capability_registry.json']
          }
        ]
      };
      const violations = validateRegistry(registry as any, REPO_ROOT);
      expect(violations.some(v => v.rule === 'model-evidence-required')).toBe(true);
      expect(violations.some(v => v.rule === 'measurement-required')).toBe(true);
    });

    it('rejects an implementation file that does not exist', () => {
      const registry = {
        ...base,
        capabilities: [{ ...base.capabilities[0], implementationFiles: ['src/nope/missing.ts'] }]
      };
      expect(
        validateRegistry(registry as any, REPO_ROOT).some(v => v.rule === 'implementation-exists')
      ).toBe(true);
    });

    it('rejects absolute paths', () => {
      const registry = {
        ...base,
        capabilities: [{ ...base.capabilities[0], implementationFiles: ['/Users/someone/x.ts'] }]
      };
      expect(validateRegistry(registry as any, REPO_ROOT).some(v => v.rule === 'portable-paths')).toBe(true);
    });

    it('rejects not_implemented with no blocking reason', () => {
      const registry = {
        ...base,
        capabilities: [{ ...base.capabilities[0], verificationLevel: 'not_implemented' as const }]
      };
      expect(
        validateRegistry(registry as any, REPO_ROOT).some(v => v.rule === 'blocking-reason-required')
      ).toBe(true);
    });

    it('rejects duplicate capability ids', () => {
      const registry = { ...base, capabilities: [base.capabilities[0], base.capabilities[0]] };
      expect(validateRegistry(registry as any, REPO_ROOT).some(v => v.rule === 'unique-id')).toBe(true);
    });

    it('orders verification levels monotonically', () => {
      expect(levelRank('not_implemented')).toBeLessThan(levelRank('offline_verified'));
      expect(levelRank('offline_verified')).toBeLessThan(levelRank('real_model_verified'));
      expect(levelRank('real_model_verified')).toBeLessThan(levelRank('real_harmony_smoke_verified'));
      expect(levelRank('real_harmony_smoke_verified')).toBeLessThan(levelRank('shot_verified'));
    });
  });
});
