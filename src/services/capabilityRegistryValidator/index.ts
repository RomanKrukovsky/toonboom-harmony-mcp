/**
 * Capability registry + evidence promotion gate.
 *
 * `docs/capability_registry.json` is the machine-readable source of truth for what this
 * system can actually do. Unenforced, it is just another document that drifts ahead of
 * reality — the exact failure mode this repository has already hit: fabricated keypoint
 * confidence reported as `verified_real`, 71 non-decodable "preview" MP4s, and a weight
 * downloader whose declared SHA-256 values were never compared.
 *
 * This module encodes the evidence each verification level requires and refuses a level
 * that is not backed by artifacts on disk.
 *
 * Distinct from `src/services/capabilityRegistry`, which is an unrelated in-memory matrix
 * of Harmony operation backends consumed by `capabilityTools.ts`.
 *
 * Run via `npm run test:registry` and `npm run test:evidence`.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';

export const REGISTRY_PATH = 'docs/capability_registry.json';

/** Ordered weakest to strongest; evidence requirements are cumulative. */
export const VERIFICATION_LEVELS = [
  'not_implemented',
  'unaudited',
  'contract_verified',
  'offline_verified',
  'simulator_verified',
  'real_model_verified',
  'real_harmony_smoke_verified',
  'real_harmony_repeatably_verified',
  'shot_verified',
  'episode_verified'
] as const;

export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

/** At or above this level, evidence paths must exist on disk. */
export const EVIDENCE_REQUIRED_FROM: VerificationLevel = 'offline_verified';
/** At or above this level, the models used must be named with hashes, plus measurements. */
export const MODEL_EVIDENCE_REQUIRED_FROM: VerificationLevel = 'real_model_verified';

export function levelRank(level: string): number {
  return VERIFICATION_LEVELS.indexOf(level as VerificationLevel);
}

export function atOrAbove(level: string, floor: VerificationLevel): boolean {
  const rank = levelRank(level);
  return rank >= 0 && rank >= levelRank(floor);
}

const modelSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/, 'model sha256 must be a full lowercase digest'),
  sizeBytes: z.number().int().positive().optional(),
  hashVerified: z.boolean().optional()
});

export const capabilitySchema = z.object({
  capabilityId: z.string().min(1),
  productionStage: z.string().min(1),
  implementationFiles: z.array(z.string()),
  publicTools: z.array(z.string()),
  backendType: z.string().min(1),
  verificationLevel: z.enum(VERIFICATION_LEVELS),
  evidencePaths: z.array(z.string()),
  knownFailures: z.array(z.string()),
  blockingReason: z.string().nullable(),
  lastVerifiedAt: z.string().min(1),
  nextRequiredProof: z.string().min(1),
  models: z.array(modelSchema).optional(),
  measured: z.record(z.any()).optional()
});

export const registrySchema = z.object({
  schemaVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  verificationLevels: z.array(z.string()),
  capabilities: z.array(capabilitySchema).min(1),
  fixtureNotes: z.array(z.record(z.any())).optional()
});

export type Capability = z.infer<typeof capabilitySchema>;
export type CapabilityRegistry = z.infer<typeof registrySchema>;

export interface RegistryViolation {
  capabilityId: string;
  rule: string;
  detail: string;
}

/** Evidence entries may carry a trailing note; only the leading token is a path. */
export function evidencePathOf(entry: string): string {
  return entry.split(' ')[0];
}

/** True when an entry is explicitly declared as not committed to the repository. */
export function isLocalOnlyEvidence(entry: string): boolean {
  return /local only|gitignored/i.test(entry);
}

export function loadRegistry(repoRoot: string = process.cwd()): CapabilityRegistry {
  const target = path.join(repoRoot, REGISTRY_PATH);
  const parsed = registrySchema.safeParse(JSON.parse(fs.readFileSync(target, 'utf-8')));
  if (!parsed.success) {
    throw new Error(`capability_registry.json failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * Apply the promotion rules. Collects every violation rather than throwing on the first,
 * so one run reports the whole picture.
 */
export function validateRegistry(
  registry: CapabilityRegistry,
  repoRoot: string = process.cwd()
): RegistryViolation[] {
  const violations: RegistryViolation[] = [];
  const seen = new Set<string>();

  for (const capability of registry.capabilities) {
    const id = capability.capabilityId;
    const add = (rule: string, detail: string) => violations.push({ capabilityId: id, rule, detail });

    if (seen.has(id)) add('unique-id', `duplicate capabilityId "${id}"`);
    seen.add(id);

    // A capability pointing at deleted code misrepresents the system regardless of level.
    for (const file of capability.implementationFiles) {
      if (path.isAbsolute(file)) {
        add('portable-paths', `implementationFile must be repo-relative: ${file}`);
        continue;
      }
      if (!fs.existsSync(path.join(repoRoot, file))) {
        add('implementation-exists', `implementationFile does not exist: ${file}`);
      }
    }

    // Anything not working must say why, so the gap is readable without git archaeology.
    if (
      (capability.verificationLevel === 'not_implemented' || capability.verificationLevel === 'unaudited') &&
      !capability.blockingReason
    ) {
      add('blocking-reason-required', `${capability.verificationLevel} requires a blockingReason`);
    }

    if (atOrAbove(capability.verificationLevel, EVIDENCE_REQUIRED_FROM)) {
      if (capability.evidencePaths.length === 0) {
        add('evidence-required', `level "${capability.verificationLevel}" requires at least one evidencePath`);
      }
      for (const entry of capability.evidencePaths) {
        const candidate = evidencePathOf(entry);
        if (path.isAbsolute(candidate)) {
          add('portable-paths', `evidencePath must be repo-relative: ${candidate}`);
          continue;
        }
        if (isLocalOnlyEvidence(entry)) continue;
        if (!fs.existsSync(path.join(repoRoot, candidate))) {
          add('evidence-exists', `evidencePath does not exist: ${candidate}`);
        }
      }
    }

    // A real-model claim must name the weights and show measurements.
    if (atOrAbove(capability.verificationLevel, MODEL_EVIDENCE_REQUIRED_FROM)) {
      if (!capability.models || capability.models.length === 0) {
        add('model-evidence-required', `level "${capability.verificationLevel}" requires models[] with hashes`);
      }
      if (!capability.measured || Object.keys(capability.measured).length === 0) {
        add('measurement-required', `level "${capability.verificationLevel}" requires a non-empty measured{} block`);
      }
    }
  }

  if (JSON.stringify(registry).includes('/Users/')) {
    violations.push({
      capabilityId: '(registry)',
      rule: 'portable-paths',
      detail: 'registry contains an absolute /Users/ path'
    });
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Evidence bundle integrity
// ---------------------------------------------------------------------------

export interface EvidenceViolation {
  bundle: string;
  rule: string;
  detail: string;
}

/** Markers left behind by generators that fabricate media instead of encoding it. */
export const FABRICATION_MARKERS = [
  'MOCK_VIDEO_STREAM',
  'SIMULATED_VIDEO_STREAM_PLACEHOLDER',
  'PLACEHOLDER',
  'MOCK_IMAGE',
  'FAKE_RENDER'
];

const MEDIA_EXTENSIONS = new Set([
  '.mp4', '.mov', '.avi', '.mkv', '.png', '.jpg', '.jpeg', '.tvg', '.xstage', '.tpl'
]);

export function sha256OfFile(target: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
}

/**
 * A media file is fabricated when it is tiny and its bytes are printable ASCII containing a
 * placeholder marker. Real encoded media is binary and far larger.
 */
export function isFabricatedMedia(target: string): { fabricated: boolean; reason?: string } {
  const stats = fs.statSync(target);
  if (!stats.isFile() || stats.size > 4096) return { fabricated: false };
  const text = fs.readFileSync(target).toString('utf-8');
  // eslint-disable-next-line no-control-regex
  if (!/^[\x09\x0a\x0d\x20-\x7e]*$/.test(text)) return { fabricated: false };
  for (const marker of FABRICATION_MARKERS) {
    if (text.includes(marker)) {
      return { fabricated: true, reason: `${stats.size} bytes of ASCII containing "${marker}"` };
    }
  }
  return { fabricated: false };
}

/**
 * Validate one evidence bundle: hashes.json matches the bytes on disk, no absolute user
 * paths leak into JSON, and no fabricated media masquerades as a produced artifact.
 */
export function validateEvidenceBundle(bundleDir: string): EvidenceViolation[] {
  const violations: EvidenceViolation[] = [];
  const add = (rule: string, detail: string) => violations.push({ bundle: bundleDir, rule, detail });

  if (!fs.existsSync(bundleDir)) {
    add('bundle-exists', `evidence bundle directory not found: ${bundleDir}`);
    return violations;
  }

  for (const entry of fs.readdirSync(bundleDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const full = path.join(bundleDir, entry.name);
    const ext = path.extname(entry.name).toLowerCase();

    if (MEDIA_EXTENSIONS.has(ext)) {
      const check = isFabricatedMedia(full);
      if (check.fabricated) {
        add('no-fabricated-media', `${entry.name} is a placeholder, not real media: ${check.reason}`);
      }
    }

    if (ext === '.json' && fs.readFileSync(full, 'utf-8').includes('/Users/')) {
      add('portable-paths', `${entry.name} contains an absolute /Users/ path`);
    }
  }

  const hashesPath = path.join(bundleDir, 'hashes.json');
  if (fs.existsSync(hashesPath)) {
    let hashes: Record<string, unknown>;
    try {
      const raw = JSON.parse(fs.readFileSync(hashesPath, 'utf-8'));
      hashes = raw.hashes && typeof raw.hashes === 'object' ? raw.hashes : raw;
    } catch (error: any) {
      add('hashes-parsable', `hashes.json is not valid JSON: ${error.message}`);
      return violations;
    }

    for (const [relative, expected] of Object.entries(hashes)) {
      if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) continue;
      const target = path.join(bundleDir, relative);
      if (!fs.existsSync(target)) {
        add('hashed-file-exists', `hashes.json lists a missing file: ${relative}`);
        continue;
      }
      const actual = sha256OfFile(target);
      if (actual !== expected) {
        add(
          'hash-matches',
          `${relative}: recorded ${expected.slice(0, 16)}… but file hashes to ${actual.slice(0, 16)}…`
        );
      }
    }
  }

  return violations;
}

/** Committed evidence bundles: immediate subdirectories of docs/evidence. */
export function listCommittedEvidenceBundles(repoRoot: string = process.cwd()): string[] {
  const root = path.join(repoRoot, 'docs', 'evidence');
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(root, entry.name))
    .sort();
}

/**
 * Scan a directory tree for fabricated media. Used to report — not silently tolerate —
 * placeholder artifacts left in local output directories.
 */
export function scanForFabricatedMedia(
  root: string,
  options: { maxFiles?: number } = {}
): Array<{ file: string; reason: string }> {
  const limit = options.maxFiles ?? 5000;
  const found: Array<{ file: string; reason: string }> = [];
  if (!fs.existsSync(root)) return found;

  const stack: string[] = [root];
  let inspected = 0;
  while (stack.length > 0 && inspected < limit) {
    const current = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!MEDIA_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      inspected += 1;
      if (inspected >= limit) break;
      try {
        const check = isFabricatedMedia(full);
        if (check.fabricated) found.push({ file: full, reason: check.reason! });
      } catch {
        /* unreadable file; ignore */
      }
    }
  }
  return found;
}
