/**
 * Harmony Action Dataset — versioned schemas for Harmony Action Recorder v1.
 *
 * These types describe a single recorded animator work session in Toon Boom Harmony as
 * structured scene deltas, NOT as screen video. One recorded session yields a training
 * example of the shape:
 *
 *   user instruction -> scene state before -> observed events -> scene state after
 *   -> normalized semantic operations -> approval decision
 *
 * Design rules enforced here:
 *  - Everything that can be hashed is hashed over a canonical, order-independent form.
 *  - Nothing claims artistic intent. Intent comes only from the human instruction.
 *  - Manual (diff-derived) operations are never labelled as exact MCP tool actions.
 */
import { z } from 'zod';
import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
export const HARMONY_ACTION_SCHEMA_VERSION = '1.0.0';
export const HARMONY_ACTION_RECORDER_VERSION = 'harmony-action-recorder/1.0.0';
// ---------------------------------------------------------------------------
// Shared vocabulary
// ---------------------------------------------------------------------------
/**
 * Where a piece of information physically came from.
 * `fixture` is offline test data and must never be presented as a real Harmony read.
 */
export const captureSourceSchema = z.enum([
    'harmony_qtscript_notifier',
    'harmony_python_bridge',
    'mcp_tool',
    'fixture'
]);
export const captureModeSchema = z.enum(['full', 'partial', 'dirty_incremental']);
/**
 * How confidently an operation's provenance is known.
 *  - mcp_tool:       executed through this server; parameters are known exactly.
 *  - harmony_manual: performed by a human in Harmony; reconstructed from state diff.
 *  - inferred:       merged/heuristic reading of several low-level changes.
 */
export const operationOriginSchema = z.enum(['mcp_tool', 'harmony_manual', 'inferred']);
export const sessionStatusSchema = z.enum([
    'recording',
    'stopped',
    'interrupted',
    'approved',
    'rejected'
]);
/** Categories the v1 capture contract knowingly does not read. */
export const notCapturedV1Schema = z.enum([
    'palettes',
    'deformer_chains',
    'master_controllers',
    'drawing_strokes',
    'art_layers',
    'sound_columns',
    'node_view_groups'
]);
const provenanceFields = {
    schemaVersion: z.literal(HARMONY_ACTION_SCHEMA_VERSION),
    sessionId: z.string().min(1),
    sceneId: z.string().min(1),
    scenePathHash: z.string().min(1).describe('SHA-256 of the canonical scene path; the raw path is never embedded.'),
    harmonyVersion: z.string().min(1),
    platform: z.string().min(1)
};
// ---------------------------------------------------------------------------
// HarmonySceneState — normalized scene snapshot
// ---------------------------------------------------------------------------
export const sceneNodeSchema = z.object({
    path: z.string().min(1).describe('Full node path, e.g. Top/RIG/Arm_R-P.'),
    name: z.string().min(1),
    type: z.string().min(1).describe('Harmony node type, e.g. PEG, READ, CAMERA, COMPOSITE.'),
    parentPath: z.string().describe('Parent group path; empty string for the root group.'),
    positionX: z.number().describe('Node View x coordinate.'),
    positionY: z.number().describe('Node View y coordinate.'),
    enabled: z.boolean().default(true)
});
export const sceneConnectionSchema = z.object({
    fromNode: z.string().min(1),
    fromPort: z.number().int().nonnegative(),
    toNode: z.string().min(1),
    toPort: z.number().int().nonnegative()
});
/** A static (non-animated) attribute value on a node. */
export const sceneNodeAttributeSchema = z.object({
    nodePath: z.string().min(1),
    attribute: z.string().min(1).describe('Harmony attribute keyword, e.g. OFFSET.X, ROTATION.ANGLEZ.'),
    value: z.union([z.number(), z.string(), z.boolean()]),
    animated: z.boolean().default(false).describe('True when the attribute is driven by a column.'),
    columnName: z.string().optional()
});
export const sceneColumnSchema = z.object({
    name: z.string().min(1),
    type: z.string().min(1).describe('Harmony column type, e.g. BEZIER, VELOBEZIER, DRAWING.'),
    linkedNodePath: z.string().optional(),
    linkedAttribute: z.string().optional()
});
export const sceneKeyframeSchema = z.object({
    columnName: z.string().min(1),
    frame: z.number().int().positive(),
    value: z.number(),
    interpolation: z.string().default('BEZIER').describe('Segment interpolation as reported by Harmony.'),
    easeIn: z.number().optional(),
    easeOut: z.number().optional(),
    constSeg: z.boolean().optional()
});
export const sceneExposureSchema = z.object({
    nodePath: z.string().min(1),
    frame: z.number().int().positive(),
    drawing: z.string().describe('Exposed drawing substitution name; empty string means no exposure.')
});
export const sceneCameraSchema = z.object({
    nodePath: z.string().min(1),
    properties: z.record(z.union([z.number(), z.string(), z.boolean()])).default({})
});
export const sceneSettingsSchema = z.object({
    frameCount: z.number().int().positive(),
    currentFrame: z.number().int().positive(),
    frameRate: z.number().positive(),
    resolutionX: z.number().int().positive(),
    resolutionY: z.number().int().positive()
});
export const harmonySceneStateSchema = z.object({
    ...provenanceFields,
    kind: z.literal('HarmonySceneState'),
    capturedAt: z.string().datetime(),
    source: captureSourceSchema,
    captureMode: captureModeSchema,
    nodes: z.array(sceneNodeSchema),
    connections: z.array(sceneConnectionSchema),
    nodeAttributes: z.array(sceneNodeAttributeSchema),
    columns: z.array(sceneColumnSchema),
    keyframes: z.array(sceneKeyframeSchema),
    exposures: z.array(sceneExposureSchema),
    camera: sceneCameraSchema.optional(),
    sceneSettings: sceneSettingsSchema,
    notCaptured: z.array(notCapturedV1Schema).default([]),
    warnings: z.array(z.string()).default([]),
    errors: z.array(z.string()).default([]),
    requiresHumanReview: z.boolean().default(false),
    deterministicHash: z.string().min(1)
});
// ---------------------------------------------------------------------------
// HarmonyRawEvent — append-only observation log
// ---------------------------------------------------------------------------
/**
 * Signal names mirror the SceneChangeNotifier class of the Harmony 25 Scripting Interface
 * (verified against the reference bundled with the local Harmony installation), plus
 * recorder-internal bookkeeping signals.
 */
export const rawEventSignalSchema = z.enum([
    'sceneChanged',
    'networkChanged',
    'nodeChanged',
    'nodeMetadataChanged',
    'columnValuesChanged',
    'currentFrameChanged',
    'selectionChanged',
    'controlChanged',
    'deformerReset',
    'deformerResetCurrentFrame',
    'sceneMarkersChanged',
    'recorder.sessionStarted',
    'recorder.instructionRecorded',
    'recorder.snapshotTaken',
    'recorder.sessionStopped',
    'recorder.mcpToolInvoked'
]);
export const harmonyRawEventSchema = z.object({
    schemaVersion: z.literal(HARMONY_ACTION_SCHEMA_VERSION),
    sessionId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    timestamp: z.string().datetime(),
    signal: rawEventSignalSchema,
    origin: z.enum(['harmony_notifier', 'mcp_tool', 'recorder_internal']),
    /** Node paths or column names the signal reported as possibly affected. */
    targets: z.array(z.string()).default([]),
    /** Correlation id linking an MCP tool call to the operations it produced. */
    correlationId: z.string().optional(),
    toolName: z.string().optional(),
    note: z.string().optional()
});
// ---------------------------------------------------------------------------
// HarmonySemanticOperation — atomic meaningful change
// ---------------------------------------------------------------------------
export const semanticOperationTypeSchema = z.enum([
    'add_node',
    'remove_node',
    'connect_nodes',
    'disconnect_nodes',
    'change_node_attribute',
    'add_keyframe',
    'remove_keyframe',
    'move_keyframe',
    'change_keyframe_value',
    'change_curve_segment',
    'change_peg_transform',
    'set_drawing_substitution',
    'shift_exposure',
    'change_camera_property',
    'unknown_structural_change'
]);
export const operationTargetSchema = z.object({
    kind: z.enum(['node', 'connection', 'column', 'scene']),
    nodePath: z.string().optional(),
    columnName: z.string().optional(),
    connection: sceneConnectionSchema.optional()
});
const jsonValue = z.union([z.number(), z.string(), z.boolean(), z.null(), z.record(z.any()), z.array(z.any())]);
export const harmonySemanticOperationSchema = z.object({
    opId: z.string().min(1).describe('Deterministic id derived from the operation content.'),
    type: semanticOperationTypeSchema,
    origin: operationOriginSchema,
    target: operationTargetSchema,
    property: z.string().optional().describe('Attribute or property name when applicable.'),
    frame: z.number().int().positive().optional(),
    frameRange: z.tuple([z.number().int().positive(), z.number().int().positive()]).optional(),
    before: jsonValue.optional(),
    after: jsonValue.optional(),
    /** 1.0 only for operations whose parameters are known exactly (mcp_tool or literal state delta). */
    confidence: z.number().min(0).max(1),
    /**
     * Where the claim comes from. `state:<path>` for normalized state fields,
     * `event:<sequence>` for spool entries, `tool:<correlationId>` for MCP calls.
     */
    evidenceRefs: z.array(z.string()).default([]),
    reversible: z.boolean(),
    note: z.string().optional()
});
// ---------------------------------------------------------------------------
// HarmonyScenePatch
// ---------------------------------------------------------------------------
export const scenePatchSummarySchema = z.object({
    nodesChanged: z.array(z.string()),
    columnsChanged: z.array(z.string()),
    framesTouched: z.array(z.number().int()),
    operationCounts: z.record(z.number().int().nonnegative())
});
export const harmonyScenePatchSchema = z.object({
    ...provenanceFields,
    kind: z.literal('HarmonyScenePatch'),
    generatedAt: z.string().datetime(),
    beforeStateHash: z.string().min(1),
    afterStateHash: z.string().min(1),
    operations: z.array(harmonySemanticOperationSchema),
    summary: scenePatchSummarySchema,
    /** True when every operation is individually reversible. */
    fullyReversible: z.boolean(),
    notCaptured: z.array(notCapturedV1Schema).default([]),
    warnings: z.array(z.string()).default([]),
    errors: z.array(z.string()).default([]),
    requiresHumanReview: z.boolean(),
    deterministicHash: z.string().min(1)
});
// ---------------------------------------------------------------------------
// HarmonyInstruction
// ---------------------------------------------------------------------------
export const harmonyInstructionSchema = z.object({
    schemaVersion: z.literal(HARMONY_ACTION_SCHEMA_VERSION),
    sessionId: z.string().min(1),
    recordedAt: z.string().datetime(),
    /** The human task description. This is the ONLY source of artistic intent. */
    text: z.string().min(1).max(4000),
    language: z.string().default('und'),
    author: z.string().optional(),
    tags: z.array(z.string()).default([]),
    /** Optional pointer to an external demo recording. v1 does not ingest media. */
    externalDemoRef: z.string().optional(),
    /** Optional pointer to an external transcript. v1 does not run speech recognition. */
    transcriptRef: z.string().optional()
});
// ---------------------------------------------------------------------------
// HarmonyCaptureSession
// ---------------------------------------------------------------------------
export const captureCountersSchema = z.object({
    events: z.number().int().nonnegative(),
    snapshots: z.number().int().nonnegative(),
    dirtyNodes: z.number().int().nonnegative(),
    dirtyColumns: z.number().int().nonnegative()
});
export const harmonyCaptureSessionSchema = z.object({
    ...provenanceFields,
    kind: z.literal('HarmonyCaptureSession'),
    status: sessionStatusSchema,
    source: captureSourceSchema,
    captureMode: captureModeSchema,
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
    evidenceDir: z.string().min(1),
    beforeStateHash: z.string().optional(),
    afterStateHash: z.string().optional(),
    patchHash: z.string().optional(),
    /** Process id that owns the live session; used to detect crashed sessions honestly. */
    ownerPid: z.number().int().positive(),
    recorderVersion: z.literal(HARMONY_ACTION_RECORDER_VERSION),
    counters: captureCountersSchema,
    notCaptured: z.array(notCapturedV1Schema).default([]),
    warnings: z.array(z.string()).default([]),
    errors: z.array(z.string()).default([]),
    requiresHumanReview: z.boolean().default(false)
});
// ---------------------------------------------------------------------------
// HarmonyApprovalRecord
// ---------------------------------------------------------------------------
export const harmonyApprovalRecordSchema = z.object({
    schemaVersion: z.literal(HARMONY_ACTION_SCHEMA_VERSION),
    sessionId: z.string().min(1),
    decision: z.enum(['approved', 'rejected']),
    decidedAt: z.string().datetime(),
    reviewer: z.string().optional(),
    note: z.string().max(4000).optional(),
    qualityTags: z.array(z.string()).default([]),
    /** Binds the decision to the exact patch it was made about. */
    patchHash: z.string().min(1)
});
// ---------------------------------------------------------------------------
// Execution / environment reports
// ---------------------------------------------------------------------------
export const renderStatusSchema = z.enum(['not_executed', 'blocked', 'executed']);
export const harmonyExecutionReportSchema = z.object({
    schemaVersion: z.literal(HARMONY_ACTION_SCHEMA_VERSION),
    sessionId: z.string().min(1),
    generatedAt: z.string().datetime(),
    stateProvider: captureSourceSchema,
    notifierAttached: z.boolean(),
    notifierStatus: z.enum(['attached', 'not_attached', 'blocked', 'unknown']),
    renderStatus: renderStatusSchema,
    renderBlockingReason: z.string().optional(),
    realHarmonyStatus: z.enum(['not_attempted', 'blocked', 'verified_real']),
    realHarmonyBlockingReason: z.string().optional(),
    warnings: z.array(z.string()).default([]),
    errors: z.array(z.string()).default([])
});
export const harmonyEnvironmentReportSchema = z.object({
    schemaVersion: z.literal(HARMONY_ACTION_SCHEMA_VERSION),
    sessionId: z.string().min(1),
    capturedAt: z.string().datetime(),
    platform: z.string(),
    arch: z.string(),
    nodeVersion: z.string(),
    harmonyVersion: z.string(),
    harmonyInstallDetected: z.boolean(),
    recorderVersion: z.literal(HARMONY_ACTION_RECORDER_VERSION),
    config: z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
});
// ---------------------------------------------------------------------------
// HarmonyActionDatasetEntry
// ---------------------------------------------------------------------------
export const stateRefSchema = z.object({
    file: z.string().min(1).describe('Path relative to the session evidence directory.'),
    hash: z.string().min(1)
});
export const harmonyActionDatasetEntrySchema = z.object({
    ...provenanceFields,
    kind: z.literal('HarmonyActionDatasetEntry'),
    entryId: z.string().min(1),
    generatedAt: z.string().datetime(),
    instruction: harmonyInstructionSchema,
    beforeState: stateRefSchema,
    afterState: stateRefSchema,
    operations: z.array(harmonySemanticOperationSchema),
    inverseOperations: z.array(harmonySemanticOperationSchema),
    summary: scenePatchSummarySchema,
    approval: harmonyApprovalRecordSchema,
    provenance: z.object({
        source: captureSourceSchema,
        captureMode: captureModeSchema,
        recorderVersion: z.literal(HARMONY_ACTION_RECORDER_VERSION),
        harmonyVersion: z.string(),
        platform: z.string(),
        startedAt: z.string().datetime(),
        completedAt: z.string().datetime(),
        /** How many operations came from each origin. Consumers must not treat manual as exact. */
        originCounts: z.record(z.number().int().nonnegative())
    }),
    usageRestrictions: z.object({
        containsUserSceneData: z.boolean(),
        scenePathRedacted: z.boolean(),
        redactedFields: z.array(z.string()).default([]),
        license: z.string().default('proprietary-internal'),
        /** Free-form note on what a consumer may NOT conclude from this entry. */
        interpretationLimits: z.array(z.string()).default([])
    }),
    renderStatus: renderStatusSchema,
    renderBlockingReason: z.string().optional(),
    notCaptured: z.array(notCapturedV1Schema).default([]),
    warnings: z.array(z.string()).default([]),
    requiresHumanReview: z.boolean(),
    deterministicHash: z.string().min(1)
});
// ---------------------------------------------------------------------------
// Canonical ordering + deterministic hashing
// ---------------------------------------------------------------------------
/**
 * Stable multi-key comparator producing a total order from the given key extractors.
 * Used so that two traversals of the same scene in different API orders hash identically.
 */
function byKeys(...keys) {
    return (a, b) => {
        for (const key of keys) {
            const ka = key(a);
            const kb = key(b);
            if (ka < kb)
                return -1;
            if (ka > kb)
                return 1;
        }
        return 0;
    };
}
export const canonicalSort = {
    nodes: (items) => [...items].sort(byKeys(n => n.path)),
    connections: (items) => [...items].sort(byKeys(c => c.toNode, c => c.toPort, c => c.fromNode, c => c.fromPort)),
    nodeAttributes: (items) => [...items].sort(byKeys(a => a.nodePath, a => a.attribute)),
    columns: (items) => [...items].sort(byKeys(c => c.name)),
    keyframes: (items) => [...items].sort(byKeys(k => k.columnName, k => k.frame)),
    exposures: (items) => [...items].sort(byKeys(e => e.nodePath, e => e.frame)),
    operations: (items) => [...items].sort(byKeys(o => o.type, o => o.target.nodePath ?? '', o => o.target.columnName ?? '', o => (o.target.connection ? `${o.target.connection.toNode}:${o.target.connection.toPort}` : ''), o => o.property ?? '', o => o.frame ?? -1, o => o.opId))
};
/** SHA-256 over a key-sorted JSON serialization. */
export function canonicalHash(value) {
    return crypto.createHash('sha256').update(stringify(value)).digest('hex');
}
/** SHA-256 of a canonicalized filesystem path; the raw path never enters an artifact. */
export function hashScenePath(scenePath) {
    return crypto.createHash('sha256').update(scenePath).digest('hex');
}
/**
 * Structural fingerprint of a scene state.
 *
 * Deliberately excludes capture metadata (timestamps, source, captureMode, warnings), so
 * the same scene read twice — or read by two different providers — yields the same hash.
 */
export function computeSceneStateHash(state) {
    return canonicalHash({
        schemaVersion: state.schemaVersion,
        sceneId: state.sceneId,
        scenePathHash: state.scenePathHash,
        nodes: canonicalSort.nodes(state.nodes),
        connections: canonicalSort.connections(state.connections),
        nodeAttributes: canonicalSort.nodeAttributes(state.nodeAttributes),
        columns: canonicalSort.columns(state.columns),
        keyframes: canonicalSort.keyframes(state.keyframes),
        exposures: canonicalSort.exposures(state.exposures),
        camera: state.camera,
        sceneSettings: state.sceneSettings
    });
}
/** Structural fingerprint of a patch: the operation set, independent of emission order. */
export function computePatchHash(patch) {
    return canonicalHash({
        schemaVersion: patch.schemaVersion,
        sceneId: patch.sceneId,
        beforeStateHash: patch.beforeStateHash,
        afterStateHash: patch.afterStateHash,
        operations: canonicalSort.operations(patch.operations)
    });
}
/** Deterministic operation id — identical operations always get the identical id. */
export function computeOperationId(op) {
    return canonicalHash({
        type: op.type,
        target: op.target,
        property: op.property ?? null,
        frame: op.frame ?? null,
        frameRange: op.frameRange ?? null,
        before: op.before ?? null,
        after: op.after ?? null
    }).slice(0, 32);
}
