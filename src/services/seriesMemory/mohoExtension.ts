import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { z } from 'zod';

export const MOHO_CONTINUITY_LEDGER_SCHEMA_VERSION = '1.0';

export const mohoRigTypeSchema = z.enum(['humanoid_2leg', 'quadruped', 'creature', 'mechanical']);

export const mohoContinuityEntrySchema = z.object({
  shotId: z.string().min(1),
  rigType: mohoRigTypeSchema,
  characterId: z.string().min(1),
  beforeFingerprint: z.string().min(1),
  afterFingerprint: z.string().min(1),
  retakeCount: z.number().int().nonnegative(),
  autoApplicableCount: z.number().int().nonnegative(),
  manualFixCount: z.number().int().nonnegative(),
  recordedAt: z.string().datetime()
}).strict();

export const mohoContinuityLedgerSchema = z.object({
  schemaVersion: z.literal(MOHO_CONTINUITY_LEDGER_SCHEMA_VERSION),
  production: z.string().min(1),
  entries: z.array(mohoContinuityEntrySchema).default([]),
  fingerprint: z.string().describe('SHA-256 of canonicalised entries')
}).strict();

export type MohoRigType = z.infer<typeof mohoRigTypeSchema>;
export type MohoContinuityEntry = z.infer<typeof mohoContinuityEntrySchema>;
export type MohoContinuityLedgerData = z.infer<typeof mohoContinuityLedgerSchema>;

export class MohoContinuityLedger {
  constructor(private readonly ledgerPath: string) {}

  load(): MohoContinuityLedgerData {
    if (!fs.existsSync(this.ledgerPath)) {
      const inferredProduction = this.inferProductionFromPath();
      return MohoContinuityLedger.createEmpty(inferredProduction);
    }
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(this.ledgerPath, 'utf8'));
    } catch (err) {
      throw new Error(`moho continuity ledger corrupted at "${this.ledgerPath}": ${err instanceof Error ? err.message : String(err)}`);
    }
    const parsed = mohoContinuityLedgerSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`moho continuity ledger corrupted at "${this.ledgerPath}": ${parsed.error.message}`);
    }
    return parsed.data;
  }

  save(ledger: MohoContinuityLedgerData): void {
    const dir = path.dirname(this.ledgerPath);
    fs.mkdirSync(dir, { recursive: true });
    const stamped: MohoContinuityLedgerData = { ...ledger, fingerprint: this.computeFingerprint(ledger) };
    fs.writeFileSync(this.ledgerPath, JSON.stringify(stamped, null, 2) + '\n');
  }

  appendEntry(entry: MohoContinuityEntry): MohoContinuityLedgerData {
    const validated = mohoContinuityEntrySchema.parse(entry);
    const ledger = this.load();
    const idx = ledger.entries.findIndex(e => e.shotId === validated.shotId);
    if (idx >= 0) ledger.entries[idx] = validated;
    else ledger.entries.push(validated);
    this.save(ledger);
    return this.load();
  }

  queryByCharacter(characterId: string): MohoContinuityEntry[] {
    return this.load().entries.filter(e => e.characterId === characterId);
  }

  queryByRigType(rigType: string): MohoContinuityEntry[] {
    const validated = mohoRigTypeSchema.parse(rigType);
    return this.load().entries.filter(e => e.rigType === validated);
  }

  totalRetakesForCharacter(characterId: string): number {
    return this.queryByCharacter(characterId).reduce((sum, e) => sum + e.retakeCount, 0);
  }

  totalRetakesForRigType(rigType: string): number {
    return this.queryByRigType(rigType).reduce((sum, e) => sum + e.retakeCount, 0);
  }

  computeFingerprint(ledger: MohoContinuityLedgerData): string {
    const canonicalInput = {
      schemaVersion: ledger.schemaVersion,
      production: ledger.production,
      entries: ledger.entries.map(e => ({
        shotId: e.shotId,
        rigType: e.rigType,
        characterId: e.characterId,
        beforeFingerprint: e.beforeFingerprint,
        afterFingerprint: e.afterFingerprint,
        retakeCount: e.retakeCount,
        autoApplicableCount: e.autoApplicableCount,
        manualFixCount: e.manualFixCount,
        recordedAt: e.recordedAt
      }))
    };
    const canonical = stringify(canonicalInput) ?? '';
    return `sha256:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
  }

  private inferProductionFromPath(): string {
    return path.basename(path.dirname(this.ledgerPath));
  }

  static defaultPath(evidenceRoot: string, production: string): string {
    return path.join(evidenceRoot, production, 'moho_continuity.json');
  }

  static createEmpty(production: string): MohoContinuityLedgerData {
    const seed: MohoContinuityLedgerData = {
      schemaVersion: MOHO_CONTINUITY_LEDGER_SCHEMA_VERSION,
      production,
      entries: [],
      fingerprint: ''
    };
    const fingerprint = new MohoContinuityLedger(path.join('/dev/null', 'unused')).computeFingerprint(seed);
    return { ...seed, fingerprint };
  }
}