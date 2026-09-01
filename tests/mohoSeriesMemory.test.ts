import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  MohoContinuityLedger,
  MOHO_CONTINUITY_LEDGER_SCHEMA_VERSION,
  type MohoContinuityEntry
} from '../src/services/seriesMemory/mohoExtension.js';

function makeEntry(overrides: Partial<MohoContinuityEntry> = {}): MohoContinuityEntry {
  return {
    shotId: 'sh010',
    rigType: 'humanoid_2leg',
    characterId: 'mira',
    beforeFingerprint: 'sha256:aaaa',
    afterFingerprint: 'sha256:bbbb',
    retakeCount: 2,
    autoApplicableCount: 1,
    manualFixCount: 1,
    recordedAt: '2026-07-27T12:00:00.000Z',
    ...overrides
  };
}

describe('MohoContinuityLedger', () => {
  let tmpRoot: string;
  let ledgerPath: string;
  let productionDir: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-continuity-'));
    productionDir = path.join(tmpRoot, 'showA');
    fs.mkdirSync(productionDir, { recursive: true });
    ledgerPath = MohoContinuityLedger.defaultPath(tmpRoot, 'showA');
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('createEmpty returns a valid empty ledger', () => {
    const empty = MohoContinuityLedger.createEmpty('showA');
    expect(empty.schemaVersion).toBe(MOHO_CONTINUITY_LEDGER_SCHEMA_VERSION);
    expect(empty.production).toBe('showA');
    expect(empty.entries).toEqual([]);
    expect(empty.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('load returns an empty ledger when the file does not exist (HONEST fallback)', () => {
    expect(fs.existsSync(ledgerPath)).toBe(false);
    const ledger = new MohoContinuityLedger(ledgerPath);
    const loaded = ledger.load();
    expect(loaded.production).toBe('showA');
    expect(loaded.entries).toEqual([]);
    expect(loaded.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(loaded.fingerprint).toBe(MohoContinuityLedger.createEmpty('showA').fingerprint);
  });

  it('appendEntry recomputes the fingerprint', () => {
    const ledger = new MohoContinuityLedger(ledgerPath);
    const before = ledger.load();
    const after = ledger.appendEntry(makeEntry());
    expect(after.fingerprint).not.toBe(before.fingerprint);
    expect(after.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(after.entries).toHaveLength(1);
    expect(after.entries[0]).toEqual(makeEntry());
  });

  it('queryByCharacter returns only entries for the requested character', () => {
    const ledger = new MohoContinuityLedger(ledgerPath);
    ledger.appendEntry(makeEntry({ shotId: 'sh010', characterId: 'mira' }));
    ledger.appendEntry(makeEntry({ shotId: 'sh011', characterId: 'mira' }));
    ledger.appendEntry(makeEntry({ shotId: 'sh020', characterId: 'kestrel' }));

    const mira = ledger.queryByCharacter('mira');
    expect(mira).toHaveLength(2);
    expect(mira.every(e => e.characterId === 'mira')).toBe(true);

    const kestrel = ledger.queryByCharacter('kestrel');
    expect(kestrel).toHaveLength(1);
    expect(kestrel[0].characterId).toBe('kestrel');

    const missing = ledger.queryByCharacter('nobody');
    expect(missing).toEqual([]);
  });

  it('queryByRigType returns only entries for the requested rig type', () => {
    const ledger = new MohoContinuityLedger(ledgerPath);
    ledger.appendEntry(makeEntry({ shotId: 'sh010', rigType: 'humanoid_2leg' }));
    ledger.appendEntry(makeEntry({ shotId: 'sh011', rigType: 'humanoid_2leg' }));
    ledger.appendEntry(makeEntry({ shotId: 'sh020', rigType: 'quadruped' }));
    ledger.appendEntry(makeEntry({ shotId: 'sh030', rigType: 'creature' }));

    const humanoid = ledger.queryByRigType('humanoid_2leg');
    expect(humanoid).toHaveLength(2);
    expect(humanoid.every(e => e.rigType === 'humanoid_2leg')).toBe(true);

    const quad = ledger.queryByRigType('quadruped');
    expect(quad).toHaveLength(1);
    expect(quad[0].rigType).toBe('quadruped');
  });

  it('totalRetakesForCharacter sums retakeCount across matching entries', () => {
    const ledger = new MohoContinuityLedger(ledgerPath);
    ledger.appendEntry(makeEntry({ shotId: 'sh010', characterId: 'mira', retakeCount: 2 }));
    ledger.appendEntry(makeEntry({ shotId: 'sh011', characterId: 'mira', retakeCount: 5 }));
    ledger.appendEntry(makeEntry({ shotId: 'sh012', characterId: 'mira', retakeCount: 1 }));
    ledger.appendEntry(makeEntry({ shotId: 'sh020', characterId: 'kestrel', retakeCount: 9 }));

    expect(ledger.totalRetakesForCharacter('mira')).toBe(8);
    expect(ledger.totalRetakesForCharacter('kestrel')).toBe(9);
    expect(ledger.totalRetakesForCharacter('nobody')).toBe(0);
  });

  it('totalRetakesForRigType sums retakeCount across matching entries', () => {
    const ledger = new MohoContinuityLedger(ledgerPath);
    ledger.appendEntry(makeEntry({ shotId: 'sh010', rigType: 'humanoid_2leg', retakeCount: 3 }));
    ledger.appendEntry(makeEntry({ shotId: 'sh011', rigType: 'humanoid_2leg', retakeCount: 4 }));
    ledger.appendEntry(makeEntry({ shotId: 'sh020', rigType: 'quadruped', retakeCount: 7 }));
    ledger.appendEntry(makeEntry({ shotId: 'sh030', rigType: 'creature', retakeCount: 0 }));

    expect(ledger.totalRetakesForRigType('humanoid_2leg')).toBe(7);
    expect(ledger.totalRetakesForRigType('quadruped')).toBe(7);
    expect(ledger.totalRetakesForRigType('creature')).toBe(0);
  });

  it('produces a deterministic fingerprint for the same entries', () => {
    const sharedDir = path.join(tmpRoot, 'showA');
    fs.mkdirSync(sharedDir, { recursive: true });
    const sharedPath = path.join(sharedDir, 'moho_continuity.json');
    const altPath = path.join(sharedDir, 'moho_continuity_alt.json');
    const ledgerA = new MohoContinuityLedger(sharedPath);
    const ledgerB = new MohoContinuityLedger(altPath);

    const entries: MohoContinuityEntry[] = [
      makeEntry({ shotId: 'sh010', characterId: 'mira', recordedAt: '2026-07-27T12:00:00.000Z' }),
      makeEntry({ shotId: 'sh011', characterId: 'mira', retakeCount: 4, recordedAt: '2026-07-27T13:00:00.000Z' }),
      makeEntry({ shotId: 'sh020', rigType: 'quadruped', characterId: 'kestrel', retakeCount: 1, recordedAt: '2026-07-27T14:00:00.000Z' })
    ];

    for (const e of entries) ledgerA.appendEntry(e);
    for (const e of entries) ledgerB.appendEntry(e);

    const a = ledgerA.load();
    const b = ledgerB.load();
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('save and load roundtrip preserves the ledger exactly', () => {
    const writer = new MohoContinuityLedger(ledgerPath);
    writer.appendEntry(makeEntry({ shotId: 'sh010', characterId: 'mira', retakeCount: 2 }));
    writer.appendEntry(makeEntry({ shotId: 'sh011', characterId: 'mira', retakeCount: 5 }));
    writer.appendEntry(makeEntry({ shotId: 'sh020', rigType: 'quadruped', characterId: 'kestrel', retakeCount: 1 }));

    const written = writer.load();
    const onDisk = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as typeof written;
    expect(onDisk).toEqual(written);

    const reader = new MohoContinuityLedger(ledgerPath);
    const reloaded = reader.load();
    expect(reloaded).toEqual(written);
    expect(reloaded.fingerprint).toBe(written.fingerprint);
    expect(reloaded.entries).toHaveLength(3);
  });
});
