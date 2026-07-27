/**
 * Sprint 0 promotion gate — evidence integrity.
 *
 * Verifies that committed evidence bundles are real: recorded hashes match the bytes on
 * disk, no absolute machine paths leak, and no fabricated media is presented as a produced
 * artifact. Run standalone via `npm run test:evidence`.
 *
 * The fabrication check exists because this repository already contains 71 `.mp4` files
 * that are 17-byte ASCII stubs reading `MOCK_VIDEO_STREAM`, one of which is named
 * `SC_TEST_REAL_preview.mp4`.
 */

import fs from 'fs';
import path from 'path';
import {
  isFabricatedMedia,
  listCommittedEvidenceBundles,
  scanForFabricatedMedia,
  sha256OfFile,
  validateEvidenceBundle
} from '../src/services/capabilityRegistryValidator/index.js';

const REPO_ROOT = process.cwd();

describe('evidence integrity gate', () => {
  const bundles = listCommittedEvidenceBundles(REPO_ROOT);

  it('finds at least one committed evidence bundle', () => {
    expect(bundles.length).toBeGreaterThan(0);
  });

  it('has no violations in any committed evidence bundle', () => {
    const all = bundles.flatMap(bundle => validateEvidenceBundle(bundle));
    if (all.length > 0) {
      const rendered = all
        .map(v => `  [${v.rule}] ${path.relative(REPO_ROOT, v.bundle)}: ${v.detail}`)
        .join('\n');
      throw new Error(`evidence integrity violations:\n${rendered}`);
    }
    expect(all).toEqual([]);
  });

  it('contains no fabricated media in committed evidence', () => {
    const fabricated = scanForFabricatedMedia(path.join(REPO_ROOT, 'docs', 'evidence'));
    expect(fabricated.map(f => path.relative(REPO_ROOT, f.file))).toEqual([]);
  });

  it('keeps absolute user paths out of committed evidence JSON', () => {
    for (const bundle of bundles) {
      for (const entry of fs.readdirSync(bundle)) {
        if (!entry.endsWith('.json')) continue;
        expect(fs.readFileSync(path.join(bundle, entry), 'utf-8')).not.toContain('/Users/');
      }
    }
  });

  describe('fabrication detection', () => {
    const scratch = path.join(REPO_ROOT, 'output', '__evidence_gate_tmp');

    beforeAll(() => fs.mkdirSync(scratch, { recursive: true }));
    afterAll(() => fs.rmSync(scratch, { recursive: true, force: true }));

    it('flags the exact placeholder pattern found in output/', () => {
      const target = path.join(scratch, 'fake.mp4');
      fs.writeFileSync(target, 'MOCK_VIDEO_STREAM');
      const result = isFabricatedMedia(target);
      expect(result.fabricated).toBe(true);
      expect(result.reason).toContain('MOCK_VIDEO_STREAM');
    });

    it('flags the simulated-stream placeholder', () => {
      const target = path.join(scratch, 'sim.mp4');
      fs.writeFileSync(target, 'SIMULATED_VIDEO_STREAM_PLACEHOLDER');
      expect(isFabricatedMedia(target).fabricated).toBe(true);
    });

    it('does not flag real binary media', () => {
      // A PNG header plus binary noise: small, but not printable ASCII.
      const target = path.join(scratch, 'real.png');
      const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      fs.writeFileSync(target, Buffer.concat([header, Buffer.alloc(512, 7)]));
      expect(isFabricatedMedia(target).fabricated).toBe(false);
    });

    it('does not flag a large file even if it is text', () => {
      const target = path.join(scratch, 'big.mp4');
      fs.writeFileSync(target, 'PLACEHOLDER'.repeat(1000));
      expect(isFabricatedMedia(target).fabricated).toBe(false);
    });

    it('detects a corrupted hash record', () => {
      const bundle = path.join(scratch, 'bundle');
      fs.mkdirSync(bundle, { recursive: true });
      const payload = path.join(bundle, 'data.json');
      fs.writeFileSync(payload, JSON.stringify({ value: 1 }));
      fs.writeFileSync(
        path.join(bundle, 'hashes.json'),
        JSON.stringify({ 'data.json': sha256OfFile(payload) })
      );
      expect(validateEvidenceBundle(bundle)).toEqual([]);

      fs.writeFileSync(payload, JSON.stringify({ value: 2 }));
      const violations = validateEvidenceBundle(bundle);
      expect(violations.some(v => v.rule === 'hash-matches')).toBe(true);
    });

    it('detects a hash recorded for a missing file', () => {
      const bundle = path.join(scratch, 'missing');
      fs.mkdirSync(bundle, { recursive: true });
      fs.writeFileSync(
        path.join(bundle, 'hashes.json'),
        JSON.stringify({ 'gone.json': 'a'.repeat(64) })
      );
      expect(validateEvidenceBundle(bundle).some(v => v.rule === 'hashed-file-exists')).toBe(true);
    });

    it('detects an absolute user path in bundle JSON', () => {
      const bundle = path.join(scratch, 'leak');
      fs.mkdirSync(bundle, { recursive: true });
      fs.writeFileSync(path.join(bundle, 'report.json'), JSON.stringify({ p: '/Users/someone/x' }));
      expect(validateEvidenceBundle(bundle).some(v => v.rule === 'portable-paths')).toBe(true);
    });
  });

  describe('known fabricated artifacts elsewhere in the tree', () => {
    it('reports the placeholder MP4s under output/ without failing the suite', () => {
      // output/ is gitignored local scratch, so this is a report, not a gate. It exists so
      // the count cannot quietly grow unnoticed.
      const found = scanForFabricatedMedia(path.join(REPO_ROOT, 'output'), { maxFiles: 4000 });
      if (found.length > 0) {
        console.warn(
          `[evidence gate] ${found.length} fabricated media files under output/ ` +
            `(gitignored, not evidence). Example: ${path.relative(REPO_ROOT, found[0].file)} — ${found[0].reason}`
        );
      }
      expect(Array.isArray(found)).toBe(true);
    });
  });
});
