/**
 * Immutable per-session evidence store for the Harmony Action Recorder.
 *
 * Guarantees:
 *  - one directory per session, never reused (`artifacts/harmony-captures/<session-id>/`);
 *  - write-once artifacts: re-writing an existing artifact raises CAPTURE_ARTIFACT_IMMUTABLE;
 *  - events are appended as JSONL with a monotonic sequence number, so a process crash
 *    leaves a truncated-but-readable log instead of nothing.
 *
 * `session.json` is the only mutable file: it carries the lifecycle status. Everything a
 * consumer would learn from — instruction, states, patch, approval — is write-once.
 */

import fs from 'fs';
import path from 'path';
import { HarmonyError } from '../../security.js';
import { HarmonyRawEvent, canonicalHash } from '../../schemas/harmonyActionDataset.js';

export const SESSION_ARTIFACTS = {
  session: 'session.json',
  instruction: 'instruction.json',
  sceneBefore: 'scene-before.json',
  events: 'events.jsonl',
  sceneAfter: 'scene-after.json',
  scenePatch: 'scene-patch.json',
  inversePatch: 'inverse-patch.json',
  approval: 'approval.json',
  environment: 'environment.json',
  executionReport: 'execution-report.json',
  hashes: 'hashes.json',
  datasetEntry: 'dataset-entry.json'
} as const;

export type SessionArtifactName = (typeof SESSION_ARTIFACTS)[keyof typeof SESSION_ARTIFACTS];

/** Artifacts that may legitimately be rewritten as the session progresses. */
const MUTABLE_ARTIFACTS: ReadonlySet<string> = new Set([SESSION_ARTIFACTS.session, SESSION_ARTIFACTS.hashes]);

export class CaptureSessionStore {
  readonly sessionDir: string;

  constructor(
    private readonly artifactRoot: string,
    readonly sessionId: string
  ) {
    if (!/^[A-Za-z0-9._-]+$/.test(sessionId)) {
      throw new HarmonyError('INVALID_INPUT', `Unsafe session id: "${sessionId}".`);
    }
    this.sessionDir = path.join(path.resolve(artifactRoot), sessionId);
  }

  /** Create the session directory. Refuses to touch an existing one. */
  create(): void {
    if (fs.existsSync(this.sessionDir)) {
      throw new HarmonyError(
        'CAPTURE_ARTIFACT_IMMUTABLE',
        `Evidence directory for session "${this.sessionId}" already exists; sessions are never overwritten.`,
        { sessionDir: this.sessionDir }
      );
    }
    fs.mkdirSync(this.sessionDir, { recursive: true });
  }

  exists(): boolean {
    return fs.existsSync(this.sessionDir);
  }

  artifactPath(name: SessionArtifactName): string {
    return path.join(this.sessionDir, name);
  }

  has(name: SessionArtifactName): boolean {
    return fs.existsSync(this.artifactPath(name));
  }

  writeJson(name: SessionArtifactName, value: unknown): string {
    const target = this.artifactPath(name);
    if (fs.existsSync(target) && !MUTABLE_ARTIFACTS.has(name)) {
      throw new HarmonyError(
        'CAPTURE_ARTIFACT_IMMUTABLE',
        `Artifact "${name}" of session "${this.sessionId}" already exists and cannot be rewritten.`,
        { path: target }
      );
    }
    fs.writeFileSync(target, JSON.stringify(value, null, 2), 'utf-8');
    return target;
  }

  readJson<T>(name: SessionArtifactName): T | undefined {
    const target = this.artifactPath(name);
    if (!fs.existsSync(target)) return undefined;
    try {
      return JSON.parse(fs.readFileSync(target, 'utf-8')) as T;
    } catch (error: any) {
      throw new HarmonyError(
        'CAPTURE_SESSION_INVALID_STATE',
        `Artifact "${name}" of session "${this.sessionId}" is not readable JSON: ${error.message}`,
        { path: target }
      );
    }
  }

  /** Append one event. Never rewrites earlier lines. */
  appendEvent(event: HarmonyRawEvent): void {
    fs.appendFileSync(this.artifactPath(SESSION_ARTIFACTS.events), JSON.stringify(event) + '\n', 'utf-8');
  }

  /**
   * Read the spool. A trailing partial line (process killed mid-write) is dropped and
   * reported instead of being silently accepted or throwing the whole log away.
   */
  readEvents(): { events: HarmonyRawEvent[]; truncatedTailBytes: number } {
    const target = this.artifactPath(SESSION_ARTIFACTS.events);
    if (!fs.existsSync(target)) return { events: [], truncatedTailBytes: 0 };

    const raw = fs.readFileSync(target, 'utf-8');
    const lines = raw.split('\n');
    const events: HarmonyRawEvent[] = [];
    let truncatedTailBytes = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().length === 0) continue;
      try {
        events.push(JSON.parse(line) as HarmonyRawEvent);
      } catch {
        // Only the final line may be a legitimate crash artifact.
        if (i === lines.length - 1) {
          truncatedTailBytes = Buffer.byteLength(line, 'utf-8');
        } else {
          throw new HarmonyError(
            'CAPTURE_SESSION_INVALID_STATE',
            `Event spool of session "${this.sessionId}" is corrupt at line ${i + 1}.`,
            { path: target }
          );
        }
      }
    }

    return { events, truncatedTailBytes };
  }

  /** Content hashes of every artifact currently on disk. */
  writeHashes(): Record<string, string> {
    const hashes: Record<string, string> = {};
    for (const name of Object.values(SESSION_ARTIFACTS)) {
      if (name === SESSION_ARTIFACTS.hashes) continue;
      const target = this.artifactPath(name);
      if (!fs.existsSync(target)) continue;
      hashes[name] = canonicalHash(fs.readFileSync(target, 'utf-8'));
    }
    fs.writeFileSync(
      this.artifactPath(SESSION_ARTIFACTS.hashes),
      JSON.stringify({ sessionId: this.sessionId, generatedAt: new Date().toISOString(), hashes }, null, 2),
      'utf-8'
    );
    return hashes;
  }

  static listSessionIds(artifactRoot: string): string[] {
    const root = path.resolve(artifactRoot);
    if (!fs.existsSync(root)) return [];
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort();
  }
}
