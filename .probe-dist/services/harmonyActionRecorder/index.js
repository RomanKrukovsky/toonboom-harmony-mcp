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
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { HARMONY_ACTION_RECORDER_VERSION, HARMONY_ACTION_SCHEMA_VERSION, canonicalHash, harmonyActionDatasetEntrySchema, harmonyApprovalRecordSchema, harmonyCaptureSessionSchema, harmonyInstructionSchema, harmonyRawEventSchema, harmonyScenePatchSchema, hashScenePath } from '../../schemas/harmonyActionDataset.js';
import { HarmonyError, logOperation } from '../../security.js';
import { config as harmonyConfig } from '../../config.js';
import { DirtyEntityQueue, NOT_CAPTURED_V1, normalizeSceneState, verifySceneState } from '../sceneStateCapture/index.js';
import { SemanticSceneDiffEngine } from '../sceneDiffEngine/semantic.js';
import { loadRecorderConfig, resolveAllowedScenePath } from './config.js';
import { CaptureSessionStore, SESSION_ARTIFACTS } from './store.js';
function nowIso() {
    return new Date().toISOString();
}
function detectHarmonyVersion() {
    const install = harmonyConfig.harmonyInstall;
    if (!install)
        return 'unknown';
    return path.basename(install).replace(/\.app$/, '');
}
/** Signals that name affected columns rather than nodes. */
const COLUMN_SIGNALS = new Set(['columnValuesChanged']);
export class HarmonyActionRecorder {
    baseConfig;
    live = new Map();
    diffEngine = new SemanticSceneDiffEngine();
    constructor(baseConfig = loadRecorderConfig()) {
        this.baseConfig = baseConfig;
    }
    get artifactRoot() {
        return this.baseConfig.artifactRoot;
    }
    // -------------------------------------------------------------------------
    // start
    // -------------------------------------------------------------------------
    async start(request) {
        const cfg = { ...this.baseConfig, ...(request.configOverrides ?? {}) };
        const scenePath = resolveAllowedScenePath(request.scenePath, cfg);
        if (!fs.existsSync(scenePath)) {
            throw new HarmonyError('SCENE_NOT_FOUND', `Scene file does not exist: ${request.scenePath}`);
        }
        const sessionId = request.sessionId ?? `cap-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
        if (this.live.has(sessionId)) {
            throw new HarmonyError('CAPTURE_SESSION_INVALID_STATE', `Session "${sessionId}" is already recording.`);
        }
        const sceneId = request.sceneId ?? path.basename(scenePath, path.extname(scenePath));
        const harmonyVersion = detectHarmonyVersion();
        const availability = await request.provider.describe();
        const store = new CaptureSessionStore(cfg.artifactRoot, sessionId);
        store.create();
        const ctx = { sessionId, sceneId, scenePath, harmonyVersion };
        let beforeState;
        try {
            const raw = await request.provider.captureFull(ctx);
            beforeState = normalizeSceneState(raw, {
                sessionId,
                sceneId,
                scenePath,
                harmonyVersion,
                platform: `${os.platform()}-${os.arch()}`,
                source: request.provider.source,
                captureMode: 'full',
                config: cfg,
                notCaptured: NOT_CAPTURED_V1
            });
        }
        catch (error) {
            // The evidence directory stays on disk with an explicit failure, rather than being
            // silently removed as if the attempt never happened.
            const failed = this.buildSession({
                sessionId,
                sceneId,
                scenePath,
                harmonyVersion,
                source: request.provider.source,
                evidenceDir: store.sessionDir,
                status: 'interrupted',
                startedAt: nowIso(),
                errors: [`initial scene capture failed: ${error.message}`]
            });
            store.writeJson(SESSION_ARTIFACTS.session, failed);
            throw error;
        }
        const session = this.buildSession({
            sessionId,
            sceneId,
            scenePath,
            harmonyVersion,
            source: request.provider.source,
            evidenceDir: store.sessionDir,
            status: 'recording',
            startedAt: nowIso(),
            beforeStateHash: beforeState.deterministicHash,
            warnings: availability.available ? [] : [`state provider unavailable: ${availability.blockingReason}`]
        });
        store.writeJson(SESSION_ARTIFACTS.session, session);
        store.writeJson(SESSION_ARTIFACTS.sceneBefore, beforeState);
        store.writeJson(SESSION_ARTIFACTS.environment, this.buildEnvironmentReport(sessionId, harmonyVersion, cfg));
        const liveSession = {
            session,
            store,
            provider: request.provider,
            config: cfg,
            queue: new DirtyEntityQueue(cfg.debounceMs),
            scenePath,
            sequence: 0,
            mcpClaims: [],
            notifierStatus: request.provider.source === 'harmony_qtscript_notifier' ? 'attached' : 'not_attached'
        };
        this.live.set(sessionId, liveSession);
        this.appendEvent(liveSession, {
            signal: 'recorder.sessionStarted',
            origin: 'recorder_internal',
            targets: [],
            note: request.captureNotes
        });
        logOperation('harmony.capture.start', { sessionId, sceneId }, 'SUCCESS');
        return {
            session,
            observedExecutionMode: request.provider.source === 'fixture'
                ? 'offline_fixture'
                : request.provider.source === 'harmony_qtscript_notifier'
                    ? 'harmony_notifier'
                    : 'real_harmony_bridge',
            beforeStateHash: beforeState.deterministicHash,
            evidenceDir: store.sessionDir,
            notifierStatus: liveSession.notifierStatus,
            notifierBlockingReason: liveSession.notifierStatus === 'not_attached'
                ? 'No Harmony SceneChangeNotifier is attached; state is read on demand by the active provider.'
                : undefined,
            providerAvailable: availability.available,
            providerBlockingReason: availability.blockingReason
        };
    }
    // -------------------------------------------------------------------------
    // instruction
    // -------------------------------------------------------------------------
    recordInstruction(input) {
        const liveSession = this.requireRecording(input.sessionId);
        const instruction = harmonyInstructionSchema.parse({
            schemaVersion: HARMONY_ACTION_SCHEMA_VERSION,
            sessionId: input.sessionId,
            recordedAt: nowIso(),
            text: input.text,
            language: input.language ?? 'und',
            author: input.author,
            tags: input.tags ?? [],
            externalDemoRef: input.externalDemoRef,
            transcriptRef: input.transcriptRef
        });
        liveSession.store.writeJson(SESSION_ARTIFACTS.instruction, instruction);
        this.appendEvent(liveSession, {
            signal: 'recorder.instructionRecorded',
            origin: 'recorder_internal',
            targets: []
        });
        return instruction;
    }
    // -------------------------------------------------------------------------
    // events (from the Harmony-side notifier or from MCP tool calls)
    // -------------------------------------------------------------------------
    /**
     * Ingest notifier signals. A signal only marks entities dirty — it is never treated as
     * proof that an operation happened. State is re-read after the debounce interval.
     */
    ingestNotifierEvents(sessionId, events) {
        const liveSession = this.requireRecording(sessionId);
        for (const event of events) {
            this.appendEvent(liveSession, {
                signal: event.signal,
                origin: 'harmony_notifier',
                targets: event.targets ?? [],
                timestamp: event.timestamp
            });
            if (COLUMN_SIGNALS.has(event.signal)) {
                liveSession.queue.markColumns(event.targets ?? []);
            }
            else {
                liveSession.queue.markNodes(event.targets ?? []);
            }
        }
        const counts = liveSession.queue.snapshotCounts();
        return { accepted: events.length, ...counts };
    }
    /** Register an MCP tool call so its operations can later be attributed exactly. */
    registerMcpClaim(sessionId, claim) {
        const liveSession = this.requireRecording(sessionId);
        liveSession.mcpClaims.push(claim);
        liveSession.queue.markNodes(claim.targets);
        this.appendEvent(liveSession, {
            signal: 'recorder.mcpToolInvoked',
            origin: 'mcp_tool',
            targets: claim.targets,
            correlationId: claim.correlationId,
            toolName: claim.toolName
        });
    }
    // -------------------------------------------------------------------------
    // snapshot
    // -------------------------------------------------------------------------
    /**
     * Take an intermediate snapshot. Waits for the dirty queue to settle, then reads either
     * the dirty entities (when the provider supports scoping) or the whole scene.
     */
    async snapshot(sessionId, options = {}) {
        const liveSession = this.requireRecording(sessionId);
        await this.waitForSettle(liveSession);
        const drained = liveSession.queue.drain();
        const targets = [...drained.nodes, ...drained.columns];
        let raw = targets.length > 0 && liveSession.provider.captureEntities
            ? await liveSession.provider.captureEntities(this.providerContext(liveSession), targets)
            : undefined;
        const captureMode = raw ? 'dirty_incremental' : 'full';
        if (!raw) {
            if (targets.length === 0 && !options.force) {
                // Nothing was reported dirty; a full re-read would be pure cost.
                const state = this.readBeforeState(liveSession);
                return {
                    stateHash: state.deterministicHash,
                    captureMode: 'full',
                    dirtyNodes: [],
                    dirtyColumns: [],
                    file: liveSession.store.artifactPath(SESSION_ARTIFACTS.sceneBefore)
                };
            }
            raw = await liveSession.provider.captureFull(this.providerContext(liveSession));
        }
        const state = normalizeSceneState(raw, {
            sessionId,
            sceneId: liveSession.session.sceneId,
            scenePath: liveSession.scenePath,
            harmonyVersion: liveSession.session.harmonyVersion,
            platform: liveSession.session.platform,
            source: liveSession.provider.source,
            captureMode,
            config: liveSession.config,
            notCaptured: NOT_CAPTURED_V1
        });
        const snapshotDir = path.join(liveSession.store.sessionDir, 'snapshots');
        if (!fs.existsSync(snapshotDir))
            fs.mkdirSync(snapshotDir, { recursive: true });
        const file = path.join(snapshotDir, `snapshot-${String(liveSession.sequence).padStart(6, '0')}.json`);
        fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8');
        liveSession.session.counters.snapshots += 1;
        this.appendEvent(liveSession, {
            signal: 'recorder.snapshotTaken',
            origin: 'recorder_internal',
            targets,
            note: `stateHash=${state.deterministicHash} mode=${captureMode}`
        });
        liveSession.store.writeJson(SESSION_ARTIFACTS.session, liveSession.session);
        return {
            stateHash: state.deterministicHash,
            captureMode,
            dirtyNodes: drained.nodes,
            dirtyColumns: drained.columns,
            file
        };
    }
    // -------------------------------------------------------------------------
    // status
    // -------------------------------------------------------------------------
    /**
     * Report a session's true status. A session that is marked `recording` on disk but is not
     * live in this process crashed; it is reported and persisted as `interrupted`.
     */
    status(sessionId) {
        const liveSession = this.live.get(sessionId);
        const store = liveSession?.store ?? new CaptureSessionStore(this.baseConfig.artifactRoot, sessionId);
        if (!store.exists()) {
            throw new HarmonyError('CAPTURE_SESSION_NOT_FOUND', `No evidence directory for session "${sessionId}".`);
        }
        let session = liveSession?.session ?? this.readSessionFile(store);
        if (!liveSession && session.status === 'recording') {
            session = this.markInterrupted(store, session, 'session was recording when its owning process ended');
        }
        const { events, truncatedTailBytes } = store.readEvents();
        const artifactsPresent = Object.values(SESSION_ARTIFACTS).filter(name => store.has(name));
        return {
            session,
            live: Boolean(liveSession),
            pendingDirty: liveSession?.queue.size ?? 0,
            debounceRemainingMs: liveSession?.queue.remainingMs() ?? 0,
            eventCount: events.length,
            truncatedTailBytes,
            artifactsPresent
        };
    }
    listSessions() {
        return CaptureSessionStore.listSessionIds(this.baseConfig.artifactRoot).map(sessionId => {
            const info = this.status(sessionId);
            return { sessionId, status: info.session.status, startedAt: info.session.startedAt };
        });
    }
    // -------------------------------------------------------------------------
    // stop
    // -------------------------------------------------------------------------
    async stop(sessionId, options = {}) {
        const liveSession = this.requireRecording(sessionId);
        await this.waitForSettle(liveSession);
        liveSession.queue.drain();
        const beforeState = this.readBeforeState(liveSession);
        const rawAfter = await liveSession.provider.captureFull(this.providerContext(liveSession));
        const afterState = normalizeSceneState(rawAfter, {
            sessionId,
            sceneId: liveSession.session.sceneId,
            scenePath: liveSession.scenePath,
            harmonyVersion: liveSession.session.harmonyVersion,
            platform: liveSession.session.platform,
            source: liveSession.provider.source,
            captureMode: 'full',
            config: liveSession.config,
            notCaptured: NOT_CAPTURED_V1
        });
        const patch = this.diffEngine.diff(beforeState, afterState, { mcpClaims: liveSession.mcpClaims });
        const inversePatch = this.diffEngine.invert(patch);
        const completedAt = nowIso();
        const session = harmonyCaptureSessionSchema.parse({
            ...liveSession.session,
            status: 'stopped',
            completedAt,
            afterStateHash: afterState.deterministicHash,
            patchHash: patch.deterministicHash,
            requiresHumanReview: patch.requiresHumanReview,
            warnings: [...liveSession.session.warnings, ...patch.warnings]
        });
        const renderStatus = options.renderStatus ?? 'not_executed';
        const executionReport = {
            schemaVersion: HARMONY_ACTION_SCHEMA_VERSION,
            sessionId,
            generatedAt: completedAt,
            stateProvider: liveSession.provider.source,
            notifierAttached: liveSession.notifierStatus === 'attached',
            notifierStatus: liveSession.notifierStatus,
            renderStatus,
            renderBlockingReason: options.renderBlockingReason ??
                (renderStatus === 'not_executed' ? 'No render was requested or executed by the recorder.' : undefined),
            realHarmonyStatus: liveSession.provider.source === 'fixture'
                ? 'not_attempted'
                : afterState.errors.length > 0
                    ? 'blocked'
                    : 'verified_real',
            realHarmonyBlockingReason: afterState.errors[0],
            warnings: patch.warnings,
            errors: patch.errors
        };
        const artifacts = {};
        artifacts[SESSION_ARTIFACTS.sceneAfter] = liveSession.store.writeJson(SESSION_ARTIFACTS.sceneAfter, afterState);
        artifacts[SESSION_ARTIFACTS.scenePatch] = liveSession.store.writeJson(SESSION_ARTIFACTS.scenePatch, patch);
        artifacts[SESSION_ARTIFACTS.inversePatch] = liveSession.store.writeJson(SESSION_ARTIFACTS.inversePatch, inversePatch);
        artifacts[SESSION_ARTIFACTS.executionReport] = liveSession.store.writeJson(SESSION_ARTIFACTS.executionReport, executionReport);
        this.appendEvent(liveSession, { signal: 'recorder.sessionStopped', origin: 'recorder_internal', targets: [] });
        session.counters = { ...liveSession.session.counters };
        artifacts[SESSION_ARTIFACTS.session] = liveSession.store.writeJson(SESSION_ARTIFACTS.session, session);
        liveSession.store.writeHashes();
        this.live.delete(sessionId);
        logOperation('harmony.capture.stop', { sessionId, operations: patch.operations.length }, 'SUCCESS');
        const originCounts = {};
        for (const operation of patch.operations) {
            originCounts[operation.origin] = (originCounts[operation.origin] ?? 0) + 1;
        }
        return {
            session,
            patch,
            inversePatch,
            executionReport,
            summary: {
                operationCount: patch.operations.length,
                nodesChanged: patch.summary.nodesChanged,
                columnsChanged: patch.summary.columnsChanged,
                framesTouched: patch.summary.framesTouched,
                originCounts
            },
            artifacts
        };
    }
    // -------------------------------------------------------------------------
    // approval
    // -------------------------------------------------------------------------
    /**
     * Record an approval decision. The decision is a separate write-once artifact bound to the
     * patch hash; it never edits the patch, and it is refused for interrupted sessions.
     */
    decide(input) {
        const store = new CaptureSessionStore(this.baseConfig.artifactRoot, input.sessionId);
        if (!store.exists()) {
            throw new HarmonyError('CAPTURE_SESSION_NOT_FOUND', `No evidence directory for session "${input.sessionId}".`);
        }
        const current = this.status(input.sessionId).session;
        if (current.status === 'interrupted') {
            throw new HarmonyError('CAPTURE_SESSION_INTERRUPTED', `Session "${input.sessionId}" was interrupted and has no verified final state; it cannot be approved or rejected.`);
        }
        if (current.status === 'recording') {
            throw new HarmonyError('CAPTURE_SESSION_INVALID_STATE', `Session "${input.sessionId}" is still recording; stop it before deciding.`);
        }
        if (store.has(SESSION_ARTIFACTS.approval)) {
            throw new HarmonyError('CAPTURE_ARTIFACT_IMMUTABLE', `Session "${input.sessionId}" already carries a decision; approval records are immutable.`);
        }
        const patch = this.readPatch(store);
        const approval = harmonyApprovalRecordSchema.parse({
            schemaVersion: HARMONY_ACTION_SCHEMA_VERSION,
            sessionId: input.sessionId,
            decision: input.decision,
            decidedAt: nowIso(),
            reviewer: input.reviewer,
            note: input.note,
            qualityTags: input.qualityTags ?? [],
            patchHash: patch.deterministicHash
        });
        store.writeJson(SESSION_ARTIFACTS.approval, approval);
        const session = harmonyCaptureSessionSchema.parse({ ...current, status: input.decision });
        store.writeJson(SESSION_ARTIFACTS.session, session);
        store.writeHashes();
        return { approval, session };
    }
    // -------------------------------------------------------------------------
    // dataset export
    // -------------------------------------------------------------------------
    exportDatasetEntry(sessionId, options = {}) {
        const store = new CaptureSessionStore(this.baseConfig.artifactRoot, sessionId);
        if (!store.exists()) {
            throw new HarmonyError('CAPTURE_SESSION_NOT_FOUND', `No evidence directory for session "${sessionId}".`);
        }
        const session = this.status(sessionId).session;
        if (session.status !== 'approved' && session.status !== 'rejected') {
            throw new HarmonyError('CAPTURE_SESSION_INVALID_STATE', `Session "${sessionId}" has status "${session.status}"; a dataset entry requires a recorded decision.`);
        }
        if (session.status === 'rejected' && !options.includeRejected) {
            throw new HarmonyError('CAPTURE_SESSION_INVALID_STATE', `Session "${sessionId}" was rejected; pass includeRejected to export it as a negative example.`);
        }
        const instruction = store.readJson(SESSION_ARTIFACTS.instruction);
        if (!instruction) {
            throw new HarmonyError('CAPTURE_SESSION_INVALID_STATE', `Session "${sessionId}" has no instruction; a dataset entry without the human task description is not usable.`);
        }
        const beforeState = verifySceneState(store.readJson(SESSION_ARTIFACTS.sceneBefore));
        const afterState = verifySceneState(store.readJson(SESSION_ARTIFACTS.sceneAfter));
        const patch = this.readPatch(store);
        const inversePatch = harmonyScenePatchSchema.parse(store.readJson(SESSION_ARTIFACTS.inversePatch));
        const approval = harmonyApprovalRecordSchema.parse(store.readJson(SESSION_ARTIFACTS.approval));
        const executionReport = store.readJson(SESSION_ARTIFACTS.executionReport);
        if (approval.patchHash !== patch.deterministicHash) {
            throw new HarmonyError('CAPTURE_SESSION_INVALID_STATE', `Approval of session "${sessionId}" refers to a different patch than the one on disk.`, { approvalPatchHash: approval.patchHash, patchHash: patch.deterministicHash });
        }
        const originCounts = {};
        for (const operation of patch.operations) {
            originCounts[operation.origin] = (originCounts[operation.origin] ?? 0) + 1;
        }
        const interpretationLimits = [
            'Operations describe measured state changes only; they do not state the animator\'s artistic goal.',
            'Artistic intent must be read from the instruction field, never inferred from the operations.',
            `Operations with origin "harmony_manual" were reconstructed from a state diff; the exact Harmony UI command is unknown.`,
            `Operations with origin "inferred" are merged readings with confidence below 1.`,
            `Categories not captured in v1: ${patch.notCaptured.join(', ') || 'none'}.`
        ];
        if (beforeState.source === 'fixture' || afterState.source === 'fixture') {
            interpretationLimits.push('State was produced by an offline fixture provider, not by a real Harmony read.');
        }
        const base = {
            schemaVersion: HARMONY_ACTION_SCHEMA_VERSION,
            kind: 'HarmonyActionDatasetEntry',
            entryId: `entry-${sessionId}`,
            sessionId,
            sceneId: session.sceneId,
            scenePathHash: session.scenePathHash,
            harmonyVersion: session.harmonyVersion,
            platform: session.platform,
            generatedAt: nowIso(),
            instruction,
            beforeState: { file: SESSION_ARTIFACTS.sceneBefore, hash: beforeState.deterministicHash },
            afterState: { file: SESSION_ARTIFACTS.sceneAfter, hash: afterState.deterministicHash },
            operations: patch.operations,
            inverseOperations: inversePatch.operations,
            summary: patch.summary,
            approval,
            provenance: {
                source: session.source,
                captureMode: session.captureMode,
                recorderVersion: HARMONY_ACTION_RECORDER_VERSION,
                harmonyVersion: session.harmonyVersion,
                platform: session.platform,
                startedAt: session.startedAt,
                completedAt: session.completedAt ?? session.startedAt,
                originCounts
            },
            usageRestrictions: {
                containsUserSceneData: true,
                scenePathRedacted: this.baseConfig.redactScenePaths,
                redactedFields: this.baseConfig.redactScenePaths ? ['scenePath'] : [],
                license: 'proprietary-internal',
                interpretationLimits
            },
            renderStatus: executionReport?.renderStatus ?? 'not_executed',
            renderBlockingReason: executionReport?.renderBlockingReason,
            notCaptured: patch.notCaptured,
            warnings: patch.warnings,
            requiresHumanReview: patch.requiresHumanReview
        };
        const entry = { ...base, deterministicHash: canonicalHash(base) };
        const parsed = harmonyActionDatasetEntrySchema.safeParse(entry);
        if (!parsed.success) {
            throw new HarmonyError('INVALID_INPUT', `Dataset entry failed schema validation: ${parsed.error.message}`);
        }
        this.assertNoRedactedContent(parsed.data);
        store.writeJson(SESSION_ARTIFACTS.datasetEntry, parsed.data);
        store.writeHashes();
        return parsed.data;
    }
    // -------------------------------------------------------------------------
    // compare
    // -------------------------------------------------------------------------
    /** Compare two finished sessions by their patches — useful for retake / variant analysis. */
    compareSessions(sessionIdA, sessionIdB) {
        const storeA = new CaptureSessionStore(this.baseConfig.artifactRoot, sessionIdA);
        const storeB = new CaptureSessionStore(this.baseConfig.artifactRoot, sessionIdB);
        for (const [id, store] of [
            [sessionIdA, storeA],
            [sessionIdB, storeB]
        ]) {
            if (!store.exists()) {
                throw new HarmonyError('CAPTURE_SESSION_NOT_FOUND', `No evidence directory for session "${id}".`);
            }
        }
        const patchA = this.readPatch(storeA);
        const patchB = this.readPatch(storeB);
        const keyOf = (operation) => [
            operation.type,
            operation.target.nodePath ?? '',
            operation.target.columnName ?? '',
            operation.property ?? '',
            operation.frame ?? ''
        ].join('|');
        const keysA = new Set(patchA.operations.map(keyOf));
        const keysB = new Set(patchB.operations.map(keyOf));
        return {
            sameScene: patchA.scenePathHash === patchB.scenePathHash,
            identicalPatch: patchA.deterministicHash === patchB.deterministicHash,
            onlyInA: [...keysA].filter(k => !keysB.has(k)).sort(),
            onlyInB: [...keysB].filter(k => !keysA.has(k)).sort(),
            shared: [...keysA].filter(k => keysB.has(k)).sort(),
            summaryA: patchA.summary,
            summaryB: patchB.summary
        };
    }
    // -------------------------------------------------------------------------
    // internals
    // -------------------------------------------------------------------------
    providerContext(liveSession) {
        return {
            sessionId: liveSession.session.sessionId,
            sceneId: liveSession.session.sceneId,
            scenePath: liveSession.scenePath,
            harmonyVersion: liveSession.session.harmonyVersion
        };
    }
    async waitForSettle(liveSession) {
        const remaining = liveSession.queue.remainingMs();
        if (remaining > 0) {
            await new Promise(resolve => setTimeout(resolve, remaining));
        }
    }
    requireRecording(sessionId) {
        const liveSession = this.live.get(sessionId);
        if (!liveSession) {
            const store = new CaptureSessionStore(this.baseConfig.artifactRoot, sessionId);
            if (!store.exists()) {
                throw new HarmonyError('CAPTURE_SESSION_NOT_FOUND', `No capture session "${sessionId}".`);
            }
            const session = this.readSessionFile(store);
            if (session.status === 'recording') {
                this.markInterrupted(store, session, 'session was recording when its owning process ended');
                throw new HarmonyError('CAPTURE_SESSION_INTERRUPTED', `Session "${sessionId}" did not survive its owning process and is now marked interrupted.`);
            }
            throw new HarmonyError('CAPTURE_SESSION_INVALID_STATE', `Session "${sessionId}" has status "${session.status}" and is not recording.`);
        }
        return liveSession;
    }
    appendEvent(liveSession, input) {
        if (liveSession.session.counters.events >= liveSession.config.maxEvents) {
            throw new HarmonyError('CAPTURE_LIMIT_EXCEEDED', `Session "${liveSession.session.sessionId}" reached the configured event limit of ${liveSession.config.maxEvents}.`);
        }
        const event = harmonyRawEventSchema.parse({
            schemaVersion: HARMONY_ACTION_SCHEMA_VERSION,
            sessionId: liveSession.session.sessionId,
            sequence: liveSession.sequence,
            timestamp: input.timestamp ?? nowIso(),
            signal: input.signal,
            origin: input.origin,
            targets: input.targets,
            correlationId: input.correlationId,
            toolName: input.toolName,
            note: input.note
        });
        liveSession.store.appendEvent(event);
        liveSession.sequence += 1;
        liveSession.session.counters.events += 1;
        const counts = liveSession.queue.snapshotCounts();
        liveSession.session.counters.dirtyNodes = counts.dirtyNodes;
        liveSession.session.counters.dirtyColumns = counts.dirtyColumns;
        return event;
    }
    buildSession(input) {
        return harmonyCaptureSessionSchema.parse({
            schemaVersion: HARMONY_ACTION_SCHEMA_VERSION,
            kind: 'HarmonyCaptureSession',
            sessionId: input.sessionId,
            sceneId: input.sceneId,
            scenePathHash: hashScenePath(input.scenePath),
            harmonyVersion: input.harmonyVersion,
            platform: `${os.platform()}-${os.arch()}`,
            status: input.status,
            source: input.source,
            captureMode: 'full',
            startedAt: input.startedAt,
            evidenceDir: input.evidenceDir,
            beforeStateHash: input.beforeStateHash,
            ownerPid: process.pid,
            recorderVersion: HARMONY_ACTION_RECORDER_VERSION,
            counters: { events: 0, snapshots: 0, dirtyNodes: 0, dirtyColumns: 0 },
            notCaptured: NOT_CAPTURED_V1,
            warnings: input.warnings ?? [],
            errors: input.errors ?? [],
            requiresHumanReview: (input.errors ?? []).length > 0
        });
    }
    buildEnvironmentReport(sessionId, harmonyVersion, cfg) {
        return {
            schemaVersion: HARMONY_ACTION_SCHEMA_VERSION,
            sessionId,
            capturedAt: nowIso(),
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            harmonyVersion,
            harmonyInstallDetected: Boolean(harmonyConfig.harmonyInstall),
            recorderVersion: HARMONY_ACTION_RECORDER_VERSION,
            config: {
                debounceMs: cfg.debounceMs,
                maxNodes: cfg.maxNodes,
                maxColumns: cfg.maxColumns,
                maxKeyframes: cfg.maxKeyframes,
                maxEvents: cfg.maxEvents,
                redactScenePaths: cfg.redactScenePaths,
                enabledCategories: Object.entries(cfg.categories)
                    .filter(([, enabled]) => enabled)
                    .map(([name]) => name)
            }
        };
    }
    readSessionFile(store) {
        const raw = store.readJson(SESSION_ARTIFACTS.session);
        if (!raw) {
            throw new HarmonyError('CAPTURE_SESSION_INVALID_STATE', `Session "${store.sessionId}" has no session.json; its evidence directory is incomplete.`);
        }
        const parsed = harmonyCaptureSessionSchema.safeParse(raw);
        if (!parsed.success) {
            throw new HarmonyError('CAPTURE_SESSION_INVALID_STATE', `session.json of "${store.sessionId}" failed schema validation: ${parsed.error.message}`);
        }
        return parsed.data;
    }
    markInterrupted(store, session, reason) {
        const interrupted = harmonyCaptureSessionSchema.parse({
            ...session,
            status: 'interrupted',
            requiresHumanReview: true,
            warnings: [...session.warnings, `recovered as interrupted: ${reason}`]
        });
        store.writeJson(SESSION_ARTIFACTS.session, interrupted);
        return interrupted;
    }
    readBeforeState(liveSession) {
        return verifySceneState(liveSession.store.readJson(SESSION_ARTIFACTS.sceneBefore));
    }
    readPatch(store) {
        const raw = store.readJson(SESSION_ARTIFACTS.scenePatch);
        if (!raw) {
            throw new HarmonyError('CAPTURE_SESSION_INVALID_STATE', `Session "${store.sessionId}" has no scene-patch.json; stop the session first.`);
        }
        const parsed = harmonyScenePatchSchema.safeParse(raw);
        if (!parsed.success) {
            throw new HarmonyError('CAPTURE_SESSION_INVALID_STATE', `scene-patch.json of "${store.sessionId}" failed schema validation: ${parsed.error.message}`);
        }
        return parsed.data;
    }
    /** Guard against leaking an absolute scene path or a configured secret into an export. */
    assertNoRedactedContent(entry) {
        const serialized = JSON.stringify(entry);
        for (const pattern of this.baseConfig.redactPatterns) {
            if (pattern && serialized.includes(pattern)) {
                throw new HarmonyError('INVALID_INPUT', 'Dataset entry contains a configured redaction pattern and was not exported.', { pattern });
            }
        }
    }
}
let defaultRecorder;
/** Process-wide recorder used by the MCP tools. */
export function getRecorder() {
    if (!defaultRecorder)
        defaultRecorder = new HarmonyActionRecorder();
    return defaultRecorder;
}
/** Replace the process-wide recorder. Tests use this to simulate a process restart. */
export function setRecorder(recorder) {
    defaultRecorder = recorder;
}
