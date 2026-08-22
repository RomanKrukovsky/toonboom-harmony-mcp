/**
 * Harmony Action Recorder — capture session lifecycle.
 *
 * Records an animator's work in Toon Boom Harmony as structured scene deltas:
 *
 *   start -> record_instruction -> (notifier events + debounced dirty snapshots) -> stop
 *         -> scene patch -> approve/reject -> dataset entry
 *
 * The recorder is read-only with respect to scene content. It reads scene state through a
 * pluggable provider and writes only into its own immutable evidence directory.
 */
import { HarmonyActionDatasetEntry, HarmonyApprovalRecord, HarmonyCaptureSession, HarmonyExecutionReport, HarmonyInstruction, HarmonyScenePatch, RawEventSignal, RenderStatus } from '../../schemas/harmonyActionDataset.js';
import { SceneStateProvider } from '../sceneStateCapture/index.js';
import { McpOperationClaim } from '../sceneDiffEngine/semantic.js';
import { HarmonyRecorderConfig } from './config.js';
export interface StartCaptureRequest {
    scenePath: string;
    sceneId?: string;
    provider: SceneStateProvider;
    sessionId?: string;
    configOverrides?: Partial<HarmonyRecorderConfig>;
    /** Nothing beyond structured scene state is captured. Present for explicitness in logs. */
    captureNotes?: string;
}
export interface StartCaptureResult {
    session: HarmonyCaptureSession;
    observedExecutionMode: 'offline_fixture' | 'real_harmony_bridge' | 'harmony_notifier';
    beforeStateHash: string;
    evidenceDir: string;
    notifierStatus: 'attached' | 'not_attached' | 'blocked' | 'unknown';
    notifierBlockingReason?: string;
    providerAvailable: boolean;
    providerBlockingReason?: string;
}
export interface StopCaptureResult {
    session: HarmonyCaptureSession;
    patch: HarmonyScenePatch;
    inversePatch: HarmonyScenePatch;
    executionReport: HarmonyExecutionReport;
    summary: {
        operationCount: number;
        nodesChanged: string[];
        columnsChanged: string[];
        framesTouched: number[];
        originCounts: Record<string, number>;
    };
    artifacts: Record<string, string>;
}
export declare class HarmonyActionRecorder {
    private readonly baseConfig;
    private readonly live;
    private readonly diffEngine;
    constructor(baseConfig?: HarmonyRecorderConfig);
    get artifactRoot(): string;
    start(request: StartCaptureRequest): Promise<StartCaptureResult>;
    recordInstruction(input: {
        sessionId: string;
        text: string;
        language?: string;
        author?: string;
        tags?: string[];
        externalDemoRef?: string;
        transcriptRef?: string;
    }): HarmonyInstruction;
    /**
     * Ingest notifier signals. A signal only marks entities dirty — it is never treated as
     * proof that an operation happened. State is re-read after the debounce interval.
     */
    ingestNotifierEvents(sessionId: string, events: Array<{
        signal: RawEventSignal;
        targets?: string[];
        timestamp?: string;
    }>): {
        accepted: number;
        dirtyNodes: number;
        dirtyColumns: number;
    };
    /** Register an MCP tool call so its operations can later be attributed exactly. */
    registerMcpClaim(sessionId: string, claim: McpOperationClaim): void;
    /**
     * Take an intermediate snapshot. Waits for the dirty queue to settle, then reads either
     * the dirty entities (when the provider supports scoping) or the whole scene.
     */
    snapshot(sessionId: string, options?: {
        force?: boolean;
    }): Promise<{
        stateHash: string;
        captureMode: 'full' | 'dirty_incremental';
        dirtyNodes: string[];
        dirtyColumns: string[];
        file: string;
    }>;
    /**
     * Report a session's true status. A session that is marked `recording` on disk but is not
     * live in this process crashed; it is reported and persisted as `interrupted`.
     */
    status(sessionId: string): {
        session: HarmonyCaptureSession;
        live: boolean;
        pendingDirty: number;
        debounceRemainingMs: number;
        eventCount: number;
        truncatedTailBytes: number;
        artifactsPresent: string[];
    };
    listSessions(): Array<{
        sessionId: string;
        status: HarmonyCaptureSession['status'];
        startedAt: string;
    }>;
    stop(sessionId: string, options?: {
        renderStatus?: RenderStatus;
        renderBlockingReason?: string;
    }): Promise<StopCaptureResult>;
    /**
     * Record an approval decision. The decision is a separate write-once artifact bound to the
     * patch hash; it never edits the patch, and it is refused for interrupted sessions.
     */
    decide(input: {
        sessionId: string;
        decision: 'approved' | 'rejected';
        reviewer?: string;
        note?: string;
        qualityTags?: string[];
    }): {
        approval: HarmonyApprovalRecord;
        session: HarmonyCaptureSession;
    };
    exportDatasetEntry(sessionId: string, options?: {
        includeRejected?: boolean;
    }): HarmonyActionDatasetEntry;
    /** Compare two finished sessions by their patches — useful for retake / variant analysis. */
    compareSessions(sessionIdA: string, sessionIdB: string): {
        sameScene: boolean;
        identicalPatch: boolean;
        onlyInA: string[];
        onlyInB: string[];
        shared: string[];
        summaryA: HarmonyScenePatch['summary'];
        summaryB: HarmonyScenePatch['summary'];
    };
    private providerContext;
    private waitForSettle;
    private requireRecording;
    private appendEvent;
    private buildSession;
    private buildEnvironmentReport;
    private readSessionFile;
    private markInterrupted;
    private readBeforeState;
    private readPatch;
    /** Guard against leaking an absolute scene path or a configured secret into an export. */
    private assertNoRedactedContent;
}
/** Process-wide recorder used by the MCP tools. */
export declare function getRecorder(): HarmonyActionRecorder;
/** Replace the process-wide recorder. Tests use this to simulate a process restart. */
export declare function setRecorder(recorder: HarmonyActionRecorder | undefined): void;
