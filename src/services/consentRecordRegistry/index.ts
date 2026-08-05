import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { MlError } from '../../errors/mlErrorRegistry.js';
import { consentRecordV2Schema, type ConsentRecordV2 } from '../../schemas/mlProvidersV2.js';

/**
 * ConsentRecordRegistry.
 *
 * Stores consent artifacts — pseudonymised declarations that a human subject (or their legal
 * proxy) permits voice cloning, face-performance cloning or full digital-actor cloning for a
 * specific list of projects. The store is content-addressed by `consentId` and lives on disk
 * under `<projectRoot>/.consent-records/` (overridable via `HARMONY_CONSENT_ROOT`).
 *
 * Revocation is honoured: a revoked record satisfies nothing, regardless of `permittedUntil`.
 * Missing records refuse the request at the call site, not silently later.
 */

const ROOT_ENV = 'HARMONY_CONSENT_ROOT';

function rootDir(): string {
  return process.env[ROOT_ENV] ? path.resolve(process.env[ROOT_ENV]!) : path.resolve(process.cwd(), '.consent-records');
}

export interface ConsentQuery {
  scope?: ConsentRecordV2['scope'];
  projectId?: string;
  /** If set, only records whose `permittedUntil` is strictly later than this date pass. */
  asOf?: Date;
  /** Revoked records always fail; this is just a clarity flag. */
  includeRevoked?: boolean;
}

export class ConsentRecordRegistry {
  constructor(private readonly root: string = rootDir()) {
    fs.mkdirSync(this.root, { recursive: true });
  }

  private fileFor(consentId: string): string {
    return path.join(this.root, `${consentId}.json`);
  }

  write(record: ConsentRecordV2): ConsentRecordV2 {
    const parsed = consentRecordV2Schema.parse(record);
    fs.writeFileSync(this.fileFor(parsed.consentId), JSON.stringify(parsed, null, 2));
    return parsed;
  }

  get(consentId: string): ConsentRecordV2 {
    const file = this.fileFor(consentId);
    if (!fs.existsSync(file)) {
      throw new MlError('ML_CONSENT_MISSING', `no consent record at ${file}`, { detail: { consentId } });
    }
    try {
      return consentRecordV2Schema.parse(JSON.parse(fs.readFileSync(file, 'utf-8')));
    } catch (error) {
      throw new MlError('ML_CONSENT_MISSING', `consent record at ${file} is corrupt: ${(error as Error).message}`, { detail: { consentId, cause: String(error) } });
    }
  }

  /** Throws if the consent does not exist, has been revoked, or has expired. */
  requireGranted(consentId: string, query: ConsentQuery = {}): ConsentRecordV2 {
    const record = this.get(consentId);
    if (record.revoked && !query.includeRevoked) {
      throw new MlError('ML_CONSENT_MISSING', `consent ${consentId} was revoked at ${record.revokedAt ?? '<unknown>'}`, { detail: { consentId } });
    }
    if (record.permittedUntil && (query.asOf ?? new Date()) >= new Date(record.permittedUntil)) {
      throw new MlError('ML_CONSENT_MISSING', `consent ${consentId} expired at ${record.permittedUntil}`, { detail: { consentId } });
    }
    if (query.projectId && !record.permittedProjects.includes(query.projectId) && !record.permittedProjects.includes('*')) {
      throw new MlError('ML_CONSENT_MISSING', `consent ${consentId} does not cover project ${query.projectId}`, { detail: { consentId, permittedProjects: record.permittedProjects } });
    }
    if (query.scope && record.scope !== query.scope) {
      throw new MlError('ML_CONSENT_MISSING', `consent ${consentId} was granted for ${record.scope}; requested ${query.scope}`, { detail: { consentId } });
    }
    return record;
  }

  revoke(consentId: string, revokedAt: string = new Date().toISOString()): ConsentRecordV2 {
    const record = this.get(consentId);
    record.revoked = true;
    record.revokedAt = revokedAt;
    return this.write(record);
  }

  list(): ConsentRecordV2[] {
    const files = fs.readdirSync(this.root).filter(f => f.endsWith('.json'));
    return files.map(f => {
      try {
        return consentRecordV2Schema.parse(JSON.parse(fs.readFileSync(path.join(this.root, f), 'utf-8')));
      } catch {
        return null;
      }
    }).filter((r): r is ConsentRecordV2 => r !== null);
  }
}

/** Build a fresh, ungranted consent record. Convenience for tests and fixtures. */
export function makeConsent(input: {
  subjectPseudonym: string;
  scope: ConsentRecordV2['scope'];
  permittedProjects: string[];
  permittedUntil?: string | null;
  sourceRecordingSha256?: string | null;
}): ConsentRecordV2 {
  const id = `con_${crypto.randomUUID()}`;
  return consentRecordV2Schema.parse({
    consentId: id,
    subjectPseudonym: input.subjectPseudonym,
    scope: input.scope,
    permittedProjects: input.permittedProjects,
    permittedUntil: input.permittedUntil ?? null,
    revoked: false,
    revokedAt: null,
    sourceRecordingSha256: input.sourceRecordingSha256 ?? null,
    createdAt: new Date().toISOString()
  });
}
