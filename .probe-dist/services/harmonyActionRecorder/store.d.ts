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
import { HarmonyRawEvent } from '../../schemas/harmonyActionDataset.js';
export declare const SESSION_ARTIFACTS: {
    readonly session: "session.json";
    readonly instruction: "instruction.json";
    readonly sceneBefore: "scene-before.json";
    readonly events: "events.jsonl";
    readonly sceneAfter: "scene-after.json";
    readonly scenePatch: "scene-patch.json";
    readonly inversePatch: "inverse-patch.json";
    readonly approval: "approval.json";
    readonly environment: "environment.json";
    readonly executionReport: "execution-report.json";
    readonly hashes: "hashes.json";
    readonly datasetEntry: "dataset-entry.json";
};
export type SessionArtifactName = (typeof SESSION_ARTIFACTS)[keyof typeof SESSION_ARTIFACTS];
export declare class CaptureSessionStore {
    private readonly artifactRoot;
    readonly sessionId: string;
    readonly sessionDir: string;
    constructor(artifactRoot: string, sessionId: string);
    /** Create the session directory. Refuses to touch an existing one. */
    create(): void;
    exists(): boolean;
    artifactPath(name: SessionArtifactName): string;
    has(name: SessionArtifactName): boolean;
    writeJson(name: SessionArtifactName, value: unknown): string;
    readJson<T>(name: SessionArtifactName): T | undefined;
    /** Append one event. Never rewrites earlier lines. */
    appendEvent(event: HarmonyRawEvent): void;
    /**
     * Read the spool. A trailing partial line (process killed mid-write) is dropped and
     * reported instead of being silently accepted or throwing the whole log away.
     */
    readEvents(): {
        events: HarmonyRawEvent[];
        truncatedTailBytes: number;
    };
    /** Content hashes of every artifact currently on disk. */
    writeHashes(): Record<string, string>;
    static listSessionIds(artifactRoot: string): string[];
}
