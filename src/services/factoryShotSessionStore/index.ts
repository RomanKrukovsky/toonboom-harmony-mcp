import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import type { ShotManifest } from '../../schemas/shotManifest.js';
import type { PerformancePIR } from '../../schemas/performancePir.js';
import type { QaReport } from '../../schemas/qaReport.js';

/**
 * FactoryShotSession — one immutable dataset entry that links every artifact
 * produced for a single shot by the factory pipeline.
 *
 * Roadmap contract (ROADMAP §"Записывать все исправления" + §"Action Recorder"):
 *   For each shot the recorder stores:
 *     - the originating ShotManifest
 *     - the compiled PerformancePIR
 *     - the QaReport from the RetakeEngine
 *     - human retake notes (optional)
 *     - the final approved/rejected status
 *   After hundreds of shots this becomes a library of solutions for typical
 *   situations that the LLM director can reference.
 *
 * Entries are content-addressed by a SHA-256 of the stable-serialised
 * (manifest + performance + qaReport + retakeNotes) triple. The store is
 * append-only: once `approve()` or `reject()` is called, the entry is frozen
 * and further mutations throw.
 */

export interface RetakeNote {
  author: string;
  at: string;
  body: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface FactoryShotSession {
  sessionId: string;
  shotId: string;
  showBibleRef: string;
  shotManifest: ShotManifest;
  performancePIR: PerformancePIR;
  qaReport: QaReport;
  retakeNotes: RetakeNote[];
  status: 'pending' | 'approved' | 'rejected';
  contentHash: string;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface StartSessionArgs {
  shotManifest: ShotManifest;
  performancePIR: PerformancePIR;
  qaReport: QaReport;
}

export class FactoryShotSessionStore {
  private sessions = new Map<string, FactoryShotSession>();
  private byShotId = new Map<string, string[]>();

  start(args: StartSessionArgs): FactoryShotSession {
    const contentHash = this.hash({
      shotManifest: args.shotManifest,
      performancePIR: args.performancePIR,
      qaReport: args.qaReport
    });
    const sessionId = `fss_${contentHash.slice(0, 16)}`;
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }
    const session: FactoryShotSession = {
      sessionId,
      shotId: args.shotManifest.shotId,
      showBibleRef: args.shotManifest.showBibleRef,
      shotManifest: args.shotManifest,
      performancePIR: args.performancePIR,
      qaReport: args.qaReport,
      retakeNotes: [],
      status: 'pending',
      contentHash,
      createdAt: new Date().toISOString()
    };
    this.sessions.set(sessionId, session);
    const list = this.byShotId.get(session.shotId) ?? [];
    list.push(sessionId);
    this.byShotId.set(session.shotId, list);
    return session;
  }

  addRetakeNote(sessionId: string, note: RetakeNote): FactoryShotSession {
    const session = this.require(sessionId);
    this.assertNotFrozen(session);
    session.retakeNotes.push(note);
    return session;
  }

  approve(sessionId: string, decidedBy: string): FactoryShotSession {
    const session = this.require(sessionId);
    this.assertNotFrozen(session);
    session.status = 'approved';
    session.decidedAt = new Date().toISOString();
    session.decidedBy = decidedBy;
    return session;
  }

  reject(sessionId: string, decidedBy: string): FactoryShotSession {
    const session = this.require(sessionId);
    this.assertNotFrozen(session);
    session.status = 'rejected';
    session.decidedAt = new Date().toISOString();
    session.decidedBy = decidedBy;
    return session;
  }

  get(sessionId: string): FactoryShotSession | undefined {
    return this.sessions.get(sessionId);
  }

  listByShot(shotId: string): FactoryShotSession[] {
    const ids = this.byShotId.get(shotId) ?? [];
    return ids.map(id => this.sessions.get(id)!).filter(Boolean);
  }

  /**
   * Returns the library of approved sessions — the "library of solutions"
   * described in ROADMAP §"Записывать все исправления".
   */
  approvedLibrary(): FactoryShotSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'approved');
  }

  private require(sessionId: string): FactoryShotSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`FactoryShotSession not found: ${sessionId}`);
    }
    return session;
  }

  private assertNotFrozen(session: FactoryShotSession): void {
    if (session.status !== 'pending') {
      throw new Error(
        `FactoryShotSession "${session.sessionId}" is frozen (status=${session.status}); cannot mutate.`
      );
    }
  }

  private hash(obj: unknown): string {
    const stable = stringify(obj as any) ?? '';
    return crypto.createHash('sha256').update(stable).digest('hex');
  }
}