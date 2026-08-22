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
export declare const HARMONY_ACTION_SCHEMA_VERSION: "1.0.0";
export declare const HARMONY_ACTION_RECORDER_VERSION: "harmony-action-recorder/1.0.0";
/**
 * Where a piece of information physically came from.
 * `fixture` is offline test data and must never be presented as a real Harmony read.
 */
export declare const captureSourceSchema: z.ZodEnum<["harmony_qtscript_notifier", "harmony_python_bridge", "mcp_tool", "fixture"]>;
export type CaptureSource = z.infer<typeof captureSourceSchema>;
export declare const captureModeSchema: z.ZodEnum<["full", "partial", "dirty_incremental"]>;
export type CaptureMode = z.infer<typeof captureModeSchema>;
/**
 * How confidently an operation's provenance is known.
 *  - mcp_tool:       executed through this server; parameters are known exactly.
 *  - harmony_manual: performed by a human in Harmony; reconstructed from state diff.
 *  - inferred:       merged/heuristic reading of several low-level changes.
 */
export declare const operationOriginSchema: z.ZodEnum<["mcp_tool", "harmony_manual", "inferred"]>;
export type OperationOrigin = z.infer<typeof operationOriginSchema>;
export declare const sessionStatusSchema: z.ZodEnum<["recording", "stopped", "interrupted", "approved", "rejected"]>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
/** Categories the v1 capture contract knowingly does not read. */
export declare const notCapturedV1Schema: z.ZodEnum<["palettes", "deformer_chains", "master_controllers", "drawing_strokes", "art_layers", "sound_columns", "node_view_groups"]>;
export type NotCapturedV1 = z.infer<typeof notCapturedV1Schema>;
export declare const sceneNodeSchema: z.ZodObject<{
    path: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    parentPath: z.ZodString;
    positionX: z.ZodNumber;
    positionY: z.ZodNumber;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    path: string;
    type: string;
    name: string;
    positionX: number;
    positionY: number;
    parentPath: string;
    enabled: boolean;
}, {
    path: string;
    type: string;
    name: string;
    positionX: number;
    positionY: number;
    parentPath: string;
    enabled?: boolean | undefined;
}>;
export type SceneNode = z.infer<typeof sceneNodeSchema>;
export declare const sceneConnectionSchema: z.ZodObject<{
    fromNode: z.ZodString;
    fromPort: z.ZodNumber;
    toNode: z.ZodString;
    toPort: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    fromPort: number;
    toPort: number;
    fromNode: string;
    toNode: string;
}, {
    fromPort: number;
    toPort: number;
    fromNode: string;
    toNode: string;
}>;
export type SceneConnection = z.infer<typeof sceneConnectionSchema>;
/** A static (non-animated) attribute value on a node. */
export declare const sceneNodeAttributeSchema: z.ZodObject<{
    nodePath: z.ZodString;
    attribute: z.ZodString;
    value: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean]>;
    animated: z.ZodDefault<z.ZodBoolean>;
    columnName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: string | number | boolean;
    nodePath: string;
    animated: boolean;
    attribute: string;
    columnName?: string | undefined;
}, {
    value: string | number | boolean;
    nodePath: string;
    attribute: string;
    animated?: boolean | undefined;
    columnName?: string | undefined;
}>;
export type SceneNodeAttribute = z.infer<typeof sceneNodeAttributeSchema>;
export declare const sceneColumnSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodString;
    linkedNodePath: z.ZodOptional<z.ZodString>;
    linkedAttribute: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    name: string;
    linkedNodePath?: string | undefined;
    linkedAttribute?: string | undefined;
}, {
    type: string;
    name: string;
    linkedNodePath?: string | undefined;
    linkedAttribute?: string | undefined;
}>;
export type SceneColumn = z.infer<typeof sceneColumnSchema>;
export declare const sceneKeyframeSchema: z.ZodObject<{
    columnName: z.ZodString;
    frame: z.ZodNumber;
    value: z.ZodNumber;
    interpolation: z.ZodDefault<z.ZodString>;
    easeIn: z.ZodOptional<z.ZodNumber>;
    easeOut: z.ZodOptional<z.ZodNumber>;
    constSeg: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    value: number;
    frame: number;
    interpolation: string;
    columnName: string;
    easeIn?: number | undefined;
    easeOut?: number | undefined;
    constSeg?: boolean | undefined;
}, {
    value: number;
    frame: number;
    columnName: string;
    interpolation?: string | undefined;
    easeIn?: number | undefined;
    easeOut?: number | undefined;
    constSeg?: boolean | undefined;
}>;
export type SceneKeyframe = z.infer<typeof sceneKeyframeSchema>;
export declare const sceneExposureSchema: z.ZodObject<{
    nodePath: z.ZodString;
    frame: z.ZodNumber;
    drawing: z.ZodString;
}, "strip", z.ZodTypeAny, {
    frame: number;
    nodePath: string;
    drawing: string;
}, {
    frame: number;
    nodePath: string;
    drawing: string;
}>;
export type SceneExposure = z.infer<typeof sceneExposureSchema>;
export declare const sceneCameraSchema: z.ZodObject<{
    nodePath: z.ZodString;
    properties: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean]>>>;
}, "strip", z.ZodTypeAny, {
    nodePath: string;
    properties: Record<string, string | number | boolean>;
}, {
    nodePath: string;
    properties?: Record<string, string | number | boolean> | undefined;
}>;
export declare const sceneSettingsSchema: z.ZodObject<{
    frameCount: z.ZodNumber;
    currentFrame: z.ZodNumber;
    frameRate: z.ZodNumber;
    resolutionX: z.ZodNumber;
    resolutionY: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    frameCount: number;
    frameRate: number;
    currentFrame: number;
    resolutionX: number;
    resolutionY: number;
}, {
    frameCount: number;
    frameRate: number;
    currentFrame: number;
    resolutionX: number;
    resolutionY: number;
}>;
export declare const harmonySceneStateSchema: z.ZodObject<{
    kind: z.ZodLiteral<"HarmonySceneState">;
    capturedAt: z.ZodString;
    source: z.ZodEnum<["harmony_qtscript_notifier", "harmony_python_bridge", "mcp_tool", "fixture"]>;
    captureMode: z.ZodEnum<["full", "partial", "dirty_incremental"]>;
    nodes: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        name: z.ZodString;
        type: z.ZodString;
        parentPath: z.ZodString;
        positionX: z.ZodNumber;
        positionY: z.ZodNumber;
        enabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        type: string;
        name: string;
        positionX: number;
        positionY: number;
        parentPath: string;
        enabled: boolean;
    }, {
        path: string;
        type: string;
        name: string;
        positionX: number;
        positionY: number;
        parentPath: string;
        enabled?: boolean | undefined;
    }>, "many">;
    connections: z.ZodArray<z.ZodObject<{
        fromNode: z.ZodString;
        fromPort: z.ZodNumber;
        toNode: z.ZodString;
        toPort: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        fromPort: number;
        toPort: number;
        fromNode: string;
        toNode: string;
    }, {
        fromPort: number;
        toPort: number;
        fromNode: string;
        toNode: string;
    }>, "many">;
    nodeAttributes: z.ZodArray<z.ZodObject<{
        nodePath: z.ZodString;
        attribute: z.ZodString;
        value: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean]>;
        animated: z.ZodDefault<z.ZodBoolean>;
        columnName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string | number | boolean;
        nodePath: string;
        animated: boolean;
        attribute: string;
        columnName?: string | undefined;
    }, {
        value: string | number | boolean;
        nodePath: string;
        attribute: string;
        animated?: boolean | undefined;
        columnName?: string | undefined;
    }>, "many">;
    columns: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        linkedNodePath: z.ZodOptional<z.ZodString>;
        linkedAttribute: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        name: string;
        linkedNodePath?: string | undefined;
        linkedAttribute?: string | undefined;
    }, {
        type: string;
        name: string;
        linkedNodePath?: string | undefined;
        linkedAttribute?: string | undefined;
    }>, "many">;
    keyframes: z.ZodArray<z.ZodObject<{
        columnName: z.ZodString;
        frame: z.ZodNumber;
        value: z.ZodNumber;
        interpolation: z.ZodDefault<z.ZodString>;
        easeIn: z.ZodOptional<z.ZodNumber>;
        easeOut: z.ZodOptional<z.ZodNumber>;
        constSeg: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        frame: number;
        interpolation: string;
        columnName: string;
        easeIn?: number | undefined;
        easeOut?: number | undefined;
        constSeg?: boolean | undefined;
    }, {
        value: number;
        frame: number;
        columnName: string;
        interpolation?: string | undefined;
        easeIn?: number | undefined;
        easeOut?: number | undefined;
        constSeg?: boolean | undefined;
    }>, "many">;
    exposures: z.ZodArray<z.ZodObject<{
        nodePath: z.ZodString;
        frame: z.ZodNumber;
        drawing: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        nodePath: string;
        drawing: string;
    }, {
        frame: number;
        nodePath: string;
        drawing: string;
    }>, "many">;
    camera: z.ZodOptional<z.ZodObject<{
        nodePath: z.ZodString;
        properties: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean]>>>;
    }, "strip", z.ZodTypeAny, {
        nodePath: string;
        properties: Record<string, string | number | boolean>;
    }, {
        nodePath: string;
        properties?: Record<string, string | number | boolean> | undefined;
    }>>;
    sceneSettings: z.ZodObject<{
        frameCount: z.ZodNumber;
        currentFrame: z.ZodNumber;
        frameRate: z.ZodNumber;
        resolutionX: z.ZodNumber;
        resolutionY: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        frameCount: number;
        frameRate: number;
        currentFrame: number;
        resolutionX: number;
        resolutionY: number;
    }, {
        frameCount: number;
        frameRate: number;
        currentFrame: number;
        resolutionX: number;
        resolutionY: number;
    }>;
    notCaptured: z.ZodDefault<z.ZodArray<z.ZodEnum<["palettes", "deformer_chains", "master_controllers", "drawing_strokes", "art_layers", "sound_columns", "node_view_groups"]>, "many">>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    errors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    requiresHumanReview: z.ZodDefault<z.ZodBoolean>;
    deterministicHash: z.ZodString;
    schemaVersion: z.ZodLiteral<"1.0.0">;
    sessionId: z.ZodString;
    sceneId: z.ZodString;
    scenePathHash: z.ZodString;
    harmonyVersion: z.ZodString;
    platform: z.ZodString;
}, "strip", z.ZodTypeAny, {
    source: "harmony_qtscript_notifier" | "harmony_python_bridge" | "mcp_tool" | "fixture";
    keyframes: {
        value: number;
        frame: number;
        interpolation: string;
        columnName: string;
        easeIn?: number | undefined;
        easeOut?: number | undefined;
        constSeg?: boolean | undefined;
    }[];
    schemaVersion: "1.0.0";
    exposures: {
        frame: number;
        nodePath: string;
        drawing: string;
    }[];
    nodes: {
        path: string;
        type: string;
        name: string;
        positionX: number;
        positionY: number;
        parentPath: string;
        enabled: boolean;
    }[];
    connections: {
        fromPort: number;
        toPort: number;
        fromNode: string;
        toNode: string;
    }[];
    warnings: string[];
    harmonyVersion: string;
    requiresHumanReview: boolean;
    deterministicHash: string;
    errors: string[];
    columns: {
        type: string;
        name: string;
        linkedNodePath?: string | undefined;
        linkedAttribute?: string | undefined;
    }[];
    sceneId: string;
    kind: "HarmonySceneState";
    capturedAt: string;
    captureMode: "full" | "partial" | "dirty_incremental";
    nodeAttributes: {
        value: string | number | boolean;
        nodePath: string;
        animated: boolean;
        attribute: string;
        columnName?: string | undefined;
    }[];
    sceneSettings: {
        frameCount: number;
        frameRate: number;
        currentFrame: number;
        resolutionX: number;
        resolutionY: number;
    };
    notCaptured: ("palettes" | "deformer_chains" | "master_controllers" | "drawing_strokes" | "art_layers" | "sound_columns" | "node_view_groups")[];
    sessionId: string;
    scenePathHash: string;
    platform: string;
    camera?: {
        nodePath: string;
        properties: Record<string, string | number | boolean>;
    } | undefined;
}, {
    source: "harmony_qtscript_notifier" | "harmony_python_bridge" | "mcp_tool" | "fixture";
    keyframes: {
        value: number;
        frame: number;
        columnName: string;
        interpolation?: string | undefined;
        easeIn?: number | undefined;
        easeOut?: number | undefined;
        constSeg?: boolean | undefined;
    }[];
    schemaVersion: "1.0.0";
    exposures: {
        frame: number;
        nodePath: string;
        drawing: string;
    }[];
    nodes: {
        path: string;
        type: string;
        name: string;
        positionX: number;
        positionY: number;
        parentPath: string;
        enabled?: boolean | undefined;
    }[];
    connections: {
        fromPort: number;
        toPort: number;
        fromNode: string;
        toNode: string;
    }[];
    harmonyVersion: string;
    deterministicHash: string;
    columns: {
        type: string;
        name: string;
        linkedNodePath?: string | undefined;
        linkedAttribute?: string | undefined;
    }[];
    sceneId: string;
    kind: "HarmonySceneState";
    capturedAt: string;
    captureMode: "full" | "partial" | "dirty_incremental";
    nodeAttributes: {
        value: string | number | boolean;
        nodePath: string;
        attribute: string;
        animated?: boolean | undefined;
        columnName?: string | undefined;
    }[];
    sceneSettings: {
        frameCount: number;
        frameRate: number;
        currentFrame: number;
        resolutionX: number;
        resolutionY: number;
    };
    sessionId: string;
    scenePathHash: string;
    platform: string;
    warnings?: string[] | undefined;
    requiresHumanReview?: boolean | undefined;
    errors?: string[] | undefined;
    camera?: {
        nodePath: string;
        properties?: Record<string, string | number | boolean> | undefined;
    } | undefined;
    notCaptured?: ("palettes" | "deformer_chains" | "master_controllers" | "drawing_strokes" | "art_layers" | "sound_columns" | "node_view_groups")[] | undefined;
}>;
export type HarmonySceneState = z.infer<typeof harmonySceneStateSchema>;
/**
 * Signal names mirror the SceneChangeNotifier class of the Harmony 25 Scripting Interface
 * (verified against the reference bundled with the local Harmony installation), plus
 * recorder-internal bookkeeping signals.
 */
export declare const rawEventSignalSchema: z.ZodEnum<["sceneChanged", "networkChanged", "nodeChanged", "nodeMetadataChanged", "columnValuesChanged", "currentFrameChanged", "selectionChanged", "controlChanged", "deformerReset", "deformerResetCurrentFrame", "sceneMarkersChanged", "recorder.sessionStarted", "recorder.instructionRecorded", "recorder.snapshotTaken", "recorder.sessionStopped", "recorder.mcpToolInvoked"]>;
export type RawEventSignal = z.infer<typeof rawEventSignalSchema>;
export declare const harmonyRawEventSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0.0">;
    sessionId: z.ZodString;
    sequence: z.ZodNumber;
    timestamp: z.ZodString;
    signal: z.ZodEnum<["sceneChanged", "networkChanged", "nodeChanged", "nodeMetadataChanged", "columnValuesChanged", "currentFrameChanged", "selectionChanged", "controlChanged", "deformerReset", "deformerResetCurrentFrame", "sceneMarkersChanged", "recorder.sessionStarted", "recorder.instructionRecorded", "recorder.snapshotTaken", "recorder.sessionStopped", "recorder.mcpToolInvoked"]>;
    origin: z.ZodEnum<["harmony_notifier", "mcp_tool", "recorder_internal"]>;
    /** Node paths or column names the signal reported as possibly affected. */
    targets: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Correlation id linking an MCP tool call to the operations it produced. */
    correlationId: z.ZodOptional<z.ZodString>;
    toolName: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    schemaVersion: "1.0.0";
    signal: "sceneChanged" | "networkChanged" | "nodeChanged" | "nodeMetadataChanged" | "columnValuesChanged" | "currentFrameChanged" | "selectionChanged" | "controlChanged" | "deformerReset" | "deformerResetCurrentFrame" | "sceneMarkersChanged" | "recorder.sessionStarted" | "recorder.instructionRecorded" | "recorder.snapshotTaken" | "recorder.sessionStopped" | "recorder.mcpToolInvoked";
    origin: "mcp_tool" | "harmony_notifier" | "recorder_internal";
    sequence: number;
    sessionId: string;
    targets: string[];
    note?: string | undefined;
    correlationId?: string | undefined;
    toolName?: string | undefined;
}, {
    timestamp: string;
    schemaVersion: "1.0.0";
    signal: "sceneChanged" | "networkChanged" | "nodeChanged" | "nodeMetadataChanged" | "columnValuesChanged" | "currentFrameChanged" | "selectionChanged" | "controlChanged" | "deformerReset" | "deformerResetCurrentFrame" | "sceneMarkersChanged" | "recorder.sessionStarted" | "recorder.instructionRecorded" | "recorder.snapshotTaken" | "recorder.sessionStopped" | "recorder.mcpToolInvoked";
    origin: "mcp_tool" | "harmony_notifier" | "recorder_internal";
    sequence: number;
    sessionId: string;
    note?: string | undefined;
    correlationId?: string | undefined;
    targets?: string[] | undefined;
    toolName?: string | undefined;
}>;
export type HarmonyRawEvent = z.infer<typeof harmonyRawEventSchema>;
export declare const semanticOperationTypeSchema: z.ZodEnum<["add_node", "remove_node", "connect_nodes", "disconnect_nodes", "change_node_attribute", "add_keyframe", "remove_keyframe", "move_keyframe", "change_keyframe_value", "change_curve_segment", "change_peg_transform", "set_drawing_substitution", "shift_exposure", "change_camera_property", "unknown_structural_change"]>;
export type SemanticOperationType = z.infer<typeof semanticOperationTypeSchema>;
export declare const operationTargetSchema: z.ZodObject<{
    kind: z.ZodEnum<["node", "connection", "column", "scene"]>;
    nodePath: z.ZodOptional<z.ZodString>;
    columnName: z.ZodOptional<z.ZodString>;
    connection: z.ZodOptional<z.ZodObject<{
        fromNode: z.ZodString;
        fromPort: z.ZodNumber;
        toNode: z.ZodString;
        toPort: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        fromPort: number;
        toPort: number;
        fromNode: string;
        toNode: string;
    }, {
        fromPort: number;
        toPort: number;
        fromNode: string;
        toNode: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    kind: "scene" | "column" | "node" | "connection";
    nodePath?: string | undefined;
    columnName?: string | undefined;
    connection?: {
        fromPort: number;
        toPort: number;
        fromNode: string;
        toNode: string;
    } | undefined;
}, {
    kind: "scene" | "column" | "node" | "connection";
    nodePath?: string | undefined;
    columnName?: string | undefined;
    connection?: {
        fromPort: number;
        toPort: number;
        fromNode: string;
        toNode: string;
    } | undefined;
}>;
export type OperationTarget = z.infer<typeof operationTargetSchema>;
export declare const harmonySemanticOperationSchema: z.ZodObject<{
    opId: z.ZodString;
    type: z.ZodEnum<["add_node", "remove_node", "connect_nodes", "disconnect_nodes", "change_node_attribute", "add_keyframe", "remove_keyframe", "move_keyframe", "change_keyframe_value", "change_curve_segment", "change_peg_transform", "set_drawing_substitution", "shift_exposure", "change_camera_property", "unknown_structural_change"]>;
    origin: z.ZodEnum<["mcp_tool", "harmony_manual", "inferred"]>;
    target: z.ZodObject<{
        kind: z.ZodEnum<["node", "connection", "column", "scene"]>;
        nodePath: z.ZodOptional<z.ZodString>;
        columnName: z.ZodOptional<z.ZodString>;
        connection: z.ZodOptional<z.ZodObject<{
            fromNode: z.ZodString;
            fromPort: z.ZodNumber;
            toNode: z.ZodString;
            toPort: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            fromPort: number;
            toPort: number;
            fromNode: string;
            toNode: string;
        }, {
            fromPort: number;
            toPort: number;
            fromNode: string;
            toNode: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        kind: "scene" | "column" | "node" | "connection";
        nodePath?: string | undefined;
        columnName?: string | undefined;
        connection?: {
            fromPort: number;
            toPort: number;
            fromNode: string;
            toNode: string;
        } | undefined;
    }, {
        kind: "scene" | "column" | "node" | "connection";
        nodePath?: string | undefined;
        columnName?: string | undefined;
        connection?: {
            fromPort: number;
            toPort: number;
            fromNode: string;
            toNode: string;
        } | undefined;
    }>;
    property: z.ZodOptional<z.ZodString>;
    frame: z.ZodOptional<z.ZodNumber>;
    frameRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    before: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny, "many">]>>;
    after: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny, "many">]>>;
    /** 1.0 only for operations whose parameters are known exactly (mcp_tool or literal state delta). */
    confidence: z.ZodNumber;
    /**
     * Where the claim comes from. `state:<path>` for normalized state fields,
     * `event:<sequence>` for spool entries, `tool:<correlationId>` for MCP calls.
     */
    evidenceRefs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    reversible: z.ZodBoolean;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
    confidence: number;
    origin: "inferred" | "mcp_tool" | "harmony_manual";
    target: {
        kind: "scene" | "column" | "node" | "connection";
        nodePath?: string | undefined;
        columnName?: string | undefined;
        connection?: {
            fromPort: number;
            toPort: number;
            fromNode: string;
            toNode: string;
        } | undefined;
    };
    reversible: boolean;
    opId: string;
    evidenceRefs: string[];
    note?: string | undefined;
    frame?: number | undefined;
    property?: string | undefined;
    frameRange?: [number, number] | undefined;
    before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
    after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
}, {
    type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
    confidence: number;
    origin: "inferred" | "mcp_tool" | "harmony_manual";
    target: {
        kind: "scene" | "column" | "node" | "connection";
        nodePath?: string | undefined;
        columnName?: string | undefined;
        connection?: {
            fromPort: number;
            toPort: number;
            fromNode: string;
            toNode: string;
        } | undefined;
    };
    reversible: boolean;
    opId: string;
    note?: string | undefined;
    frame?: number | undefined;
    property?: string | undefined;
    frameRange?: [number, number] | undefined;
    before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
    after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
    evidenceRefs?: string[] | undefined;
}>;
export type HarmonySemanticOperation = z.infer<typeof harmonySemanticOperationSchema>;
export declare const scenePatchSummarySchema: z.ZodObject<{
    nodesChanged: z.ZodArray<z.ZodString, "many">;
    columnsChanged: z.ZodArray<z.ZodString, "many">;
    framesTouched: z.ZodArray<z.ZodNumber, "many">;
    operationCounts: z.ZodRecord<z.ZodString, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    nodesChanged: string[];
    columnsChanged: string[];
    framesTouched: number[];
    operationCounts: Record<string, number>;
}, {
    nodesChanged: string[];
    columnsChanged: string[];
    framesTouched: number[];
    operationCounts: Record<string, number>;
}>;
export declare const harmonyScenePatchSchema: z.ZodObject<{
    kind: z.ZodLiteral<"HarmonyScenePatch">;
    generatedAt: z.ZodString;
    beforeStateHash: z.ZodString;
    afterStateHash: z.ZodString;
    operations: z.ZodArray<z.ZodObject<{
        opId: z.ZodString;
        type: z.ZodEnum<["add_node", "remove_node", "connect_nodes", "disconnect_nodes", "change_node_attribute", "add_keyframe", "remove_keyframe", "move_keyframe", "change_keyframe_value", "change_curve_segment", "change_peg_transform", "set_drawing_substitution", "shift_exposure", "change_camera_property", "unknown_structural_change"]>;
        origin: z.ZodEnum<["mcp_tool", "harmony_manual", "inferred"]>;
        target: z.ZodObject<{
            kind: z.ZodEnum<["node", "connection", "column", "scene"]>;
            nodePath: z.ZodOptional<z.ZodString>;
            columnName: z.ZodOptional<z.ZodString>;
            connection: z.ZodOptional<z.ZodObject<{
                fromNode: z.ZodString;
                fromPort: z.ZodNumber;
                toNode: z.ZodString;
                toPort: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            }, {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        }, {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        }>;
        property: z.ZodOptional<z.ZodString>;
        frame: z.ZodOptional<z.ZodNumber>;
        frameRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
        before: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny, "many">]>>;
        after: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny, "many">]>>;
        /** 1.0 only for operations whose parameters are known exactly (mcp_tool or literal state delta). */
        confidence: z.ZodNumber;
        /**
         * Where the claim comes from. `state:<path>` for normalized state fields,
         * `event:<sequence>` for spool entries, `tool:<correlationId>` for MCP calls.
         */
        evidenceRefs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        reversible: z.ZodBoolean;
        note: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
        confidence: number;
        origin: "inferred" | "mcp_tool" | "harmony_manual";
        target: {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        };
        reversible: boolean;
        opId: string;
        evidenceRefs: string[];
        note?: string | undefined;
        frame?: number | undefined;
        property?: string | undefined;
        frameRange?: [number, number] | undefined;
        before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
    }, {
        type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
        confidence: number;
        origin: "inferred" | "mcp_tool" | "harmony_manual";
        target: {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        };
        reversible: boolean;
        opId: string;
        note?: string | undefined;
        frame?: number | undefined;
        property?: string | undefined;
        frameRange?: [number, number] | undefined;
        before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        evidenceRefs?: string[] | undefined;
    }>, "many">;
    summary: z.ZodObject<{
        nodesChanged: z.ZodArray<z.ZodString, "many">;
        columnsChanged: z.ZodArray<z.ZodString, "many">;
        framesTouched: z.ZodArray<z.ZodNumber, "many">;
        operationCounts: z.ZodRecord<z.ZodString, z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        nodesChanged: string[];
        columnsChanged: string[];
        framesTouched: number[];
        operationCounts: Record<string, number>;
    }, {
        nodesChanged: string[];
        columnsChanged: string[];
        framesTouched: number[];
        operationCounts: Record<string, number>;
    }>;
    /** True when every operation is individually reversible. */
    fullyReversible: z.ZodBoolean;
    notCaptured: z.ZodDefault<z.ZodArray<z.ZodEnum<["palettes", "deformer_chains", "master_controllers", "drawing_strokes", "art_layers", "sound_columns", "node_view_groups"]>, "many">>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    errors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    requiresHumanReview: z.ZodBoolean;
    deterministicHash: z.ZodString;
    schemaVersion: z.ZodLiteral<"1.0.0">;
    sessionId: z.ZodString;
    sceneId: z.ZodString;
    scenePathHash: z.ZodString;
    harmonyVersion: z.ZodString;
    platform: z.ZodString;
}, "strip", z.ZodTypeAny, {
    schemaVersion: "1.0.0";
    warnings: string[];
    harmonyVersion: string;
    requiresHumanReview: boolean;
    deterministicHash: string;
    summary: {
        nodesChanged: string[];
        columnsChanged: string[];
        framesTouched: number[];
        operationCounts: Record<string, number>;
    };
    errors: string[];
    generatedAt: string;
    sceneId: string;
    kind: "HarmonyScenePatch";
    operations: {
        type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
        confidence: number;
        origin: "inferred" | "mcp_tool" | "harmony_manual";
        target: {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        };
        reversible: boolean;
        opId: string;
        evidenceRefs: string[];
        note?: string | undefined;
        frame?: number | undefined;
        property?: string | undefined;
        frameRange?: [number, number] | undefined;
        before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
    }[];
    notCaptured: ("palettes" | "deformer_chains" | "master_controllers" | "drawing_strokes" | "art_layers" | "sound_columns" | "node_view_groups")[];
    sessionId: string;
    scenePathHash: string;
    platform: string;
    beforeStateHash: string;
    afterStateHash: string;
    fullyReversible: boolean;
}, {
    schemaVersion: "1.0.0";
    harmonyVersion: string;
    requiresHumanReview: boolean;
    deterministicHash: string;
    summary: {
        nodesChanged: string[];
        columnsChanged: string[];
        framesTouched: number[];
        operationCounts: Record<string, number>;
    };
    generatedAt: string;
    sceneId: string;
    kind: "HarmonyScenePatch";
    operations: {
        type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
        confidence: number;
        origin: "inferred" | "mcp_tool" | "harmony_manual";
        target: {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        };
        reversible: boolean;
        opId: string;
        note?: string | undefined;
        frame?: number | undefined;
        property?: string | undefined;
        frameRange?: [number, number] | undefined;
        before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        evidenceRefs?: string[] | undefined;
    }[];
    sessionId: string;
    scenePathHash: string;
    platform: string;
    beforeStateHash: string;
    afterStateHash: string;
    fullyReversible: boolean;
    warnings?: string[] | undefined;
    errors?: string[] | undefined;
    notCaptured?: ("palettes" | "deformer_chains" | "master_controllers" | "drawing_strokes" | "art_layers" | "sound_columns" | "node_view_groups")[] | undefined;
}>;
export type HarmonyScenePatch = z.infer<typeof harmonyScenePatchSchema>;
export declare const harmonyInstructionSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0.0">;
    sessionId: z.ZodString;
    recordedAt: z.ZodString;
    /** The human task description. This is the ONLY source of artistic intent. */
    text: z.ZodString;
    language: z.ZodDefault<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Optional pointer to an external demo recording. v1 does not ingest media. */
    externalDemoRef: z.ZodOptional<z.ZodString>;
    /** Optional pointer to an external transcript. v1 does not run speech recognition. */
    transcriptRef: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    schemaVersion: "1.0.0";
    text: string;
    language: string;
    tags: string[];
    sessionId: string;
    recordedAt: string;
    author?: string | undefined;
    externalDemoRef?: string | undefined;
    transcriptRef?: string | undefined;
}, {
    schemaVersion: "1.0.0";
    text: string;
    sessionId: string;
    recordedAt: string;
    language?: string | undefined;
    tags?: string[] | undefined;
    author?: string | undefined;
    externalDemoRef?: string | undefined;
    transcriptRef?: string | undefined;
}>;
export type HarmonyInstruction = z.infer<typeof harmonyInstructionSchema>;
export declare const captureCountersSchema: z.ZodObject<{
    events: z.ZodNumber;
    snapshots: z.ZodNumber;
    dirtyNodes: z.ZodNumber;
    dirtyColumns: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    events: number;
    snapshots: number;
    dirtyNodes: number;
    dirtyColumns: number;
}, {
    events: number;
    snapshots: number;
    dirtyNodes: number;
    dirtyColumns: number;
}>;
export declare const harmonyCaptureSessionSchema: z.ZodObject<{
    kind: z.ZodLiteral<"HarmonyCaptureSession">;
    status: z.ZodEnum<["recording", "stopped", "interrupted", "approved", "rejected"]>;
    source: z.ZodEnum<["harmony_qtscript_notifier", "harmony_python_bridge", "mcp_tool", "fixture"]>;
    captureMode: z.ZodEnum<["full", "partial", "dirty_incremental"]>;
    startedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    evidenceDir: z.ZodString;
    beforeStateHash: z.ZodOptional<z.ZodString>;
    afterStateHash: z.ZodOptional<z.ZodString>;
    patchHash: z.ZodOptional<z.ZodString>;
    /** Process id that owns the live session; used to detect crashed sessions honestly. */
    ownerPid: z.ZodNumber;
    recorderVersion: z.ZodLiteral<"harmony-action-recorder/1.0.0">;
    counters: z.ZodObject<{
        events: z.ZodNumber;
        snapshots: z.ZodNumber;
        dirtyNodes: z.ZodNumber;
        dirtyColumns: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        events: number;
        snapshots: number;
        dirtyNodes: number;
        dirtyColumns: number;
    }, {
        events: number;
        snapshots: number;
        dirtyNodes: number;
        dirtyColumns: number;
    }>;
    notCaptured: z.ZodDefault<z.ZodArray<z.ZodEnum<["palettes", "deformer_chains", "master_controllers", "drawing_strokes", "art_layers", "sound_columns", "node_view_groups"]>, "many">>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    errors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    requiresHumanReview: z.ZodDefault<z.ZodBoolean>;
    schemaVersion: z.ZodLiteral<"1.0.0">;
    sessionId: z.ZodString;
    sceneId: z.ZodString;
    scenePathHash: z.ZodString;
    harmonyVersion: z.ZodString;
    platform: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "stopped" | "rejected" | "approved" | "recording" | "interrupted";
    source: "harmony_qtscript_notifier" | "harmony_python_bridge" | "mcp_tool" | "fixture";
    schemaVersion: "1.0.0";
    warnings: string[];
    harmonyVersion: string;
    requiresHumanReview: boolean;
    errors: string[];
    sceneId: string;
    kind: "HarmonyCaptureSession";
    startedAt: string;
    captureMode: "full" | "partial" | "dirty_incremental";
    notCaptured: ("palettes" | "deformer_chains" | "master_controllers" | "drawing_strokes" | "art_layers" | "sound_columns" | "node_view_groups")[];
    sessionId: string;
    scenePathHash: string;
    platform: string;
    evidenceDir: string;
    ownerPid: number;
    recorderVersion: "harmony-action-recorder/1.0.0";
    counters: {
        events: number;
        snapshots: number;
        dirtyNodes: number;
        dirtyColumns: number;
    };
    completedAt?: string | undefined;
    beforeStateHash?: string | undefined;
    afterStateHash?: string | undefined;
    patchHash?: string | undefined;
}, {
    status: "stopped" | "rejected" | "approved" | "recording" | "interrupted";
    source: "harmony_qtscript_notifier" | "harmony_python_bridge" | "mcp_tool" | "fixture";
    schemaVersion: "1.0.0";
    harmonyVersion: string;
    sceneId: string;
    kind: "HarmonyCaptureSession";
    startedAt: string;
    captureMode: "full" | "partial" | "dirty_incremental";
    sessionId: string;
    scenePathHash: string;
    platform: string;
    evidenceDir: string;
    ownerPid: number;
    recorderVersion: "harmony-action-recorder/1.0.0";
    counters: {
        events: number;
        snapshots: number;
        dirtyNodes: number;
        dirtyColumns: number;
    };
    warnings?: string[] | undefined;
    requiresHumanReview?: boolean | undefined;
    errors?: string[] | undefined;
    completedAt?: string | undefined;
    notCaptured?: ("palettes" | "deformer_chains" | "master_controllers" | "drawing_strokes" | "art_layers" | "sound_columns" | "node_view_groups")[] | undefined;
    beforeStateHash?: string | undefined;
    afterStateHash?: string | undefined;
    patchHash?: string | undefined;
}>;
export type HarmonyCaptureSession = z.infer<typeof harmonyCaptureSessionSchema>;
export declare const harmonyApprovalRecordSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0.0">;
    sessionId: z.ZodString;
    decision: z.ZodEnum<["approved", "rejected"]>;
    decidedAt: z.ZodString;
    reviewer: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
    qualityTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Binds the decision to the exact patch it was made about. */
    patchHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    schemaVersion: "1.0.0";
    decision: "rejected" | "approved";
    sessionId: string;
    patchHash: string;
    decidedAt: string;
    qualityTags: string[];
    note?: string | undefined;
    reviewer?: string | undefined;
}, {
    schemaVersion: "1.0.0";
    decision: "rejected" | "approved";
    sessionId: string;
    patchHash: string;
    decidedAt: string;
    note?: string | undefined;
    reviewer?: string | undefined;
    qualityTags?: string[] | undefined;
}>;
export type HarmonyApprovalRecord = z.infer<typeof harmonyApprovalRecordSchema>;
export declare const renderStatusSchema: z.ZodEnum<["not_executed", "blocked", "executed"]>;
export type RenderStatus = z.infer<typeof renderStatusSchema>;
export declare const harmonyExecutionReportSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0.0">;
    sessionId: z.ZodString;
    generatedAt: z.ZodString;
    stateProvider: z.ZodEnum<["harmony_qtscript_notifier", "harmony_python_bridge", "mcp_tool", "fixture"]>;
    notifierAttached: z.ZodBoolean;
    notifierStatus: z.ZodEnum<["attached", "not_attached", "blocked", "unknown"]>;
    renderStatus: z.ZodEnum<["not_executed", "blocked", "executed"]>;
    renderBlockingReason: z.ZodOptional<z.ZodString>;
    realHarmonyStatus: z.ZodEnum<["not_attempted", "blocked", "verified_real"]>;
    realHarmonyBlockingReason: z.ZodOptional<z.ZodString>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    errors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    schemaVersion: "1.0.0";
    warnings: string[];
    errors: string[];
    generatedAt: string;
    sessionId: string;
    stateProvider: "harmony_qtscript_notifier" | "harmony_python_bridge" | "mcp_tool" | "fixture";
    notifierAttached: boolean;
    notifierStatus: "unknown" | "blocked" | "attached" | "not_attached";
    renderStatus: "blocked" | "executed" | "not_executed";
    realHarmonyStatus: "verified_real" | "blocked" | "not_attempted";
    renderBlockingReason?: string | undefined;
    realHarmonyBlockingReason?: string | undefined;
}, {
    schemaVersion: "1.0.0";
    generatedAt: string;
    sessionId: string;
    stateProvider: "harmony_qtscript_notifier" | "harmony_python_bridge" | "mcp_tool" | "fixture";
    notifierAttached: boolean;
    notifierStatus: "unknown" | "blocked" | "attached" | "not_attached";
    renderStatus: "blocked" | "executed" | "not_executed";
    realHarmonyStatus: "verified_real" | "blocked" | "not_attempted";
    warnings?: string[] | undefined;
    errors?: string[] | undefined;
    renderBlockingReason?: string | undefined;
    realHarmonyBlockingReason?: string | undefined;
}>;
export type HarmonyExecutionReport = z.infer<typeof harmonyExecutionReportSchema>;
export declare const harmonyEnvironmentReportSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0.0">;
    sessionId: z.ZodString;
    capturedAt: z.ZodString;
    platform: z.ZodString;
    arch: z.ZodString;
    nodeVersion: z.ZodString;
    harmonyVersion: z.ZodString;
    harmonyInstallDetected: z.ZodBoolean;
    recorderVersion: z.ZodLiteral<"harmony-action-recorder/1.0.0">;
    config: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString, "many">]>>;
}, "strip", z.ZodTypeAny, {
    schemaVersion: "1.0.0";
    harmonyVersion: string;
    capturedAt: string;
    sessionId: string;
    platform: string;
    recorderVersion: "harmony-action-recorder/1.0.0";
    arch: string;
    nodeVersion: string;
    harmonyInstallDetected: boolean;
    config: Record<string, string | number | boolean | string[]>;
}, {
    schemaVersion: "1.0.0";
    harmonyVersion: string;
    capturedAt: string;
    sessionId: string;
    platform: string;
    recorderVersion: "harmony-action-recorder/1.0.0";
    arch: string;
    nodeVersion: string;
    harmonyInstallDetected: boolean;
    config: Record<string, string | number | boolean | string[]>;
}>;
export type HarmonyEnvironmentReport = z.infer<typeof harmonyEnvironmentReportSchema>;
export declare const stateRefSchema: z.ZodObject<{
    file: z.ZodString;
    hash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    file: string;
    hash: string;
}, {
    file: string;
    hash: string;
}>;
export declare const harmonyActionDatasetEntrySchema: z.ZodObject<{
    kind: z.ZodLiteral<"HarmonyActionDatasetEntry">;
    entryId: z.ZodString;
    generatedAt: z.ZodString;
    instruction: z.ZodObject<{
        schemaVersion: z.ZodLiteral<"1.0.0">;
        sessionId: z.ZodString;
        recordedAt: z.ZodString;
        /** The human task description. This is the ONLY source of artistic intent. */
        text: z.ZodString;
        language: z.ZodDefault<z.ZodString>;
        author: z.ZodOptional<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Optional pointer to an external demo recording. v1 does not ingest media. */
        externalDemoRef: z.ZodOptional<z.ZodString>;
        /** Optional pointer to an external transcript. v1 does not run speech recognition. */
        transcriptRef: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        schemaVersion: "1.0.0";
        text: string;
        language: string;
        tags: string[];
        sessionId: string;
        recordedAt: string;
        author?: string | undefined;
        externalDemoRef?: string | undefined;
        transcriptRef?: string | undefined;
    }, {
        schemaVersion: "1.0.0";
        text: string;
        sessionId: string;
        recordedAt: string;
        language?: string | undefined;
        tags?: string[] | undefined;
        author?: string | undefined;
        externalDemoRef?: string | undefined;
        transcriptRef?: string | undefined;
    }>;
    beforeState: z.ZodObject<{
        file: z.ZodString;
        hash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        file: string;
        hash: string;
    }, {
        file: string;
        hash: string;
    }>;
    afterState: z.ZodObject<{
        file: z.ZodString;
        hash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        file: string;
        hash: string;
    }, {
        file: string;
        hash: string;
    }>;
    operations: z.ZodArray<z.ZodObject<{
        opId: z.ZodString;
        type: z.ZodEnum<["add_node", "remove_node", "connect_nodes", "disconnect_nodes", "change_node_attribute", "add_keyframe", "remove_keyframe", "move_keyframe", "change_keyframe_value", "change_curve_segment", "change_peg_transform", "set_drawing_substitution", "shift_exposure", "change_camera_property", "unknown_structural_change"]>;
        origin: z.ZodEnum<["mcp_tool", "harmony_manual", "inferred"]>;
        target: z.ZodObject<{
            kind: z.ZodEnum<["node", "connection", "column", "scene"]>;
            nodePath: z.ZodOptional<z.ZodString>;
            columnName: z.ZodOptional<z.ZodString>;
            connection: z.ZodOptional<z.ZodObject<{
                fromNode: z.ZodString;
                fromPort: z.ZodNumber;
                toNode: z.ZodString;
                toPort: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            }, {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        }, {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        }>;
        property: z.ZodOptional<z.ZodString>;
        frame: z.ZodOptional<z.ZodNumber>;
        frameRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
        before: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny, "many">]>>;
        after: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny, "many">]>>;
        /** 1.0 only for operations whose parameters are known exactly (mcp_tool or literal state delta). */
        confidence: z.ZodNumber;
        /**
         * Where the claim comes from. `state:<path>` for normalized state fields,
         * `event:<sequence>` for spool entries, `tool:<correlationId>` for MCP calls.
         */
        evidenceRefs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        reversible: z.ZodBoolean;
        note: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
        confidence: number;
        origin: "inferred" | "mcp_tool" | "harmony_manual";
        target: {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        };
        reversible: boolean;
        opId: string;
        evidenceRefs: string[];
        note?: string | undefined;
        frame?: number | undefined;
        property?: string | undefined;
        frameRange?: [number, number] | undefined;
        before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
    }, {
        type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
        confidence: number;
        origin: "inferred" | "mcp_tool" | "harmony_manual";
        target: {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        };
        reversible: boolean;
        opId: string;
        note?: string | undefined;
        frame?: number | undefined;
        property?: string | undefined;
        frameRange?: [number, number] | undefined;
        before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        evidenceRefs?: string[] | undefined;
    }>, "many">;
    inverseOperations: z.ZodArray<z.ZodObject<{
        opId: z.ZodString;
        type: z.ZodEnum<["add_node", "remove_node", "connect_nodes", "disconnect_nodes", "change_node_attribute", "add_keyframe", "remove_keyframe", "move_keyframe", "change_keyframe_value", "change_curve_segment", "change_peg_transform", "set_drawing_substitution", "shift_exposure", "change_camera_property", "unknown_structural_change"]>;
        origin: z.ZodEnum<["mcp_tool", "harmony_manual", "inferred"]>;
        target: z.ZodObject<{
            kind: z.ZodEnum<["node", "connection", "column", "scene"]>;
            nodePath: z.ZodOptional<z.ZodString>;
            columnName: z.ZodOptional<z.ZodString>;
            connection: z.ZodOptional<z.ZodObject<{
                fromNode: z.ZodString;
                fromPort: z.ZodNumber;
                toNode: z.ZodString;
                toPort: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            }, {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        }, {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        }>;
        property: z.ZodOptional<z.ZodString>;
        frame: z.ZodOptional<z.ZodNumber>;
        frameRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
        before: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny, "many">]>>;
        after: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny, "many">]>>;
        /** 1.0 only for operations whose parameters are known exactly (mcp_tool or literal state delta). */
        confidence: z.ZodNumber;
        /**
         * Where the claim comes from. `state:<path>` for normalized state fields,
         * `event:<sequence>` for spool entries, `tool:<correlationId>` for MCP calls.
         */
        evidenceRefs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        reversible: z.ZodBoolean;
        note: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
        confidence: number;
        origin: "inferred" | "mcp_tool" | "harmony_manual";
        target: {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        };
        reversible: boolean;
        opId: string;
        evidenceRefs: string[];
        note?: string | undefined;
        frame?: number | undefined;
        property?: string | undefined;
        frameRange?: [number, number] | undefined;
        before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
    }, {
        type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
        confidence: number;
        origin: "inferred" | "mcp_tool" | "harmony_manual";
        target: {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        };
        reversible: boolean;
        opId: string;
        note?: string | undefined;
        frame?: number | undefined;
        property?: string | undefined;
        frameRange?: [number, number] | undefined;
        before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        evidenceRefs?: string[] | undefined;
    }>, "many">;
    summary: z.ZodObject<{
        nodesChanged: z.ZodArray<z.ZodString, "many">;
        columnsChanged: z.ZodArray<z.ZodString, "many">;
        framesTouched: z.ZodArray<z.ZodNumber, "many">;
        operationCounts: z.ZodRecord<z.ZodString, z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        nodesChanged: string[];
        columnsChanged: string[];
        framesTouched: number[];
        operationCounts: Record<string, number>;
    }, {
        nodesChanged: string[];
        columnsChanged: string[];
        framesTouched: number[];
        operationCounts: Record<string, number>;
    }>;
    approval: z.ZodObject<{
        schemaVersion: z.ZodLiteral<"1.0.0">;
        sessionId: z.ZodString;
        decision: z.ZodEnum<["approved", "rejected"]>;
        decidedAt: z.ZodString;
        reviewer: z.ZodOptional<z.ZodString>;
        note: z.ZodOptional<z.ZodString>;
        qualityTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Binds the decision to the exact patch it was made about. */
        patchHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        schemaVersion: "1.0.0";
        decision: "rejected" | "approved";
        sessionId: string;
        patchHash: string;
        decidedAt: string;
        qualityTags: string[];
        note?: string | undefined;
        reviewer?: string | undefined;
    }, {
        schemaVersion: "1.0.0";
        decision: "rejected" | "approved";
        sessionId: string;
        patchHash: string;
        decidedAt: string;
        note?: string | undefined;
        reviewer?: string | undefined;
        qualityTags?: string[] | undefined;
    }>;
    provenance: z.ZodObject<{
        source: z.ZodEnum<["harmony_qtscript_notifier", "harmony_python_bridge", "mcp_tool", "fixture"]>;
        captureMode: z.ZodEnum<["full", "partial", "dirty_incremental"]>;
        recorderVersion: z.ZodLiteral<"harmony-action-recorder/1.0.0">;
        harmonyVersion: z.ZodString;
        platform: z.ZodString;
        startedAt: z.ZodString;
        completedAt: z.ZodString;
        /** How many operations came from each origin. Consumers must not treat manual as exact. */
        originCounts: z.ZodRecord<z.ZodString, z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        source: "harmony_qtscript_notifier" | "harmony_python_bridge" | "mcp_tool" | "fixture";
        harmonyVersion: string;
        startedAt: string;
        completedAt: string;
        captureMode: "full" | "partial" | "dirty_incremental";
        platform: string;
        recorderVersion: "harmony-action-recorder/1.0.0";
        originCounts: Record<string, number>;
    }, {
        source: "harmony_qtscript_notifier" | "harmony_python_bridge" | "mcp_tool" | "fixture";
        harmonyVersion: string;
        startedAt: string;
        completedAt: string;
        captureMode: "full" | "partial" | "dirty_incremental";
        platform: string;
        recorderVersion: "harmony-action-recorder/1.0.0";
        originCounts: Record<string, number>;
    }>;
    usageRestrictions: z.ZodObject<{
        containsUserSceneData: z.ZodBoolean;
        scenePathRedacted: z.ZodBoolean;
        redactedFields: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        license: z.ZodDefault<z.ZodString>;
        /** Free-form note on what a consumer may NOT conclude from this entry. */
        interpretationLimits: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        license: string;
        containsUserSceneData: boolean;
        scenePathRedacted: boolean;
        redactedFields: string[];
        interpretationLimits: string[];
    }, {
        containsUserSceneData: boolean;
        scenePathRedacted: boolean;
        license?: string | undefined;
        redactedFields?: string[] | undefined;
        interpretationLimits?: string[] | undefined;
    }>;
    renderStatus: z.ZodEnum<["not_executed", "blocked", "executed"]>;
    renderBlockingReason: z.ZodOptional<z.ZodString>;
    notCaptured: z.ZodDefault<z.ZodArray<z.ZodEnum<["palettes", "deformer_chains", "master_controllers", "drawing_strokes", "art_layers", "sound_columns", "node_view_groups"]>, "many">>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    requiresHumanReview: z.ZodBoolean;
    deterministicHash: z.ZodString;
    schemaVersion: z.ZodLiteral<"1.0.0">;
    sessionId: z.ZodString;
    sceneId: z.ZodString;
    scenePathHash: z.ZodString;
    harmonyVersion: z.ZodString;
    platform: z.ZodString;
}, "strip", z.ZodTypeAny, {
    provenance: {
        source: "harmony_qtscript_notifier" | "harmony_python_bridge" | "mcp_tool" | "fixture";
        harmonyVersion: string;
        startedAt: string;
        completedAt: string;
        captureMode: "full" | "partial" | "dirty_incremental";
        platform: string;
        recorderVersion: "harmony-action-recorder/1.0.0";
        originCounts: Record<string, number>;
    };
    schemaVersion: "1.0.0";
    warnings: string[];
    harmonyVersion: string;
    requiresHumanReview: boolean;
    deterministicHash: string;
    summary: {
        nodesChanged: string[];
        columnsChanged: string[];
        framesTouched: number[];
        operationCounts: Record<string, number>;
    };
    generatedAt: string;
    sceneId: string;
    kind: "HarmonyActionDatasetEntry";
    operations: {
        type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
        confidence: number;
        origin: "inferred" | "mcp_tool" | "harmony_manual";
        target: {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        };
        reversible: boolean;
        opId: string;
        evidenceRefs: string[];
        note?: string | undefined;
        frame?: number | undefined;
        property?: string | undefined;
        frameRange?: [number, number] | undefined;
        before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
    }[];
    instruction: {
        schemaVersion: "1.0.0";
        text: string;
        language: string;
        tags: string[];
        sessionId: string;
        recordedAt: string;
        author?: string | undefined;
        externalDemoRef?: string | undefined;
        transcriptRef?: string | undefined;
    };
    notCaptured: ("palettes" | "deformer_chains" | "master_controllers" | "drawing_strokes" | "art_layers" | "sound_columns" | "node_view_groups")[];
    sessionId: string;
    scenePathHash: string;
    platform: string;
    renderStatus: "blocked" | "executed" | "not_executed";
    entryId: string;
    beforeState: {
        file: string;
        hash: string;
    };
    afterState: {
        file: string;
        hash: string;
    };
    inverseOperations: {
        type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
        confidence: number;
        origin: "inferred" | "mcp_tool" | "harmony_manual";
        target: {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        };
        reversible: boolean;
        opId: string;
        evidenceRefs: string[];
        note?: string | undefined;
        frame?: number | undefined;
        property?: string | undefined;
        frameRange?: [number, number] | undefined;
        before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
    }[];
    approval: {
        schemaVersion: "1.0.0";
        decision: "rejected" | "approved";
        sessionId: string;
        patchHash: string;
        decidedAt: string;
        qualityTags: string[];
        note?: string | undefined;
        reviewer?: string | undefined;
    };
    usageRestrictions: {
        license: string;
        containsUserSceneData: boolean;
        scenePathRedacted: boolean;
        redactedFields: string[];
        interpretationLimits: string[];
    };
    renderBlockingReason?: string | undefined;
}, {
    provenance: {
        source: "harmony_qtscript_notifier" | "harmony_python_bridge" | "mcp_tool" | "fixture";
        harmonyVersion: string;
        startedAt: string;
        completedAt: string;
        captureMode: "full" | "partial" | "dirty_incremental";
        platform: string;
        recorderVersion: "harmony-action-recorder/1.0.0";
        originCounts: Record<string, number>;
    };
    schemaVersion: "1.0.0";
    harmonyVersion: string;
    requiresHumanReview: boolean;
    deterministicHash: string;
    summary: {
        nodesChanged: string[];
        columnsChanged: string[];
        framesTouched: number[];
        operationCounts: Record<string, number>;
    };
    generatedAt: string;
    sceneId: string;
    kind: "HarmonyActionDatasetEntry";
    operations: {
        type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
        confidence: number;
        origin: "inferred" | "mcp_tool" | "harmony_manual";
        target: {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        };
        reversible: boolean;
        opId: string;
        note?: string | undefined;
        frame?: number | undefined;
        property?: string | undefined;
        frameRange?: [number, number] | undefined;
        before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        evidenceRefs?: string[] | undefined;
    }[];
    instruction: {
        schemaVersion: "1.0.0";
        text: string;
        sessionId: string;
        recordedAt: string;
        language?: string | undefined;
        tags?: string[] | undefined;
        author?: string | undefined;
        externalDemoRef?: string | undefined;
        transcriptRef?: string | undefined;
    };
    sessionId: string;
    scenePathHash: string;
    platform: string;
    renderStatus: "blocked" | "executed" | "not_executed";
    entryId: string;
    beforeState: {
        file: string;
        hash: string;
    };
    afterState: {
        file: string;
        hash: string;
    };
    inverseOperations: {
        type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
        confidence: number;
        origin: "inferred" | "mcp_tool" | "harmony_manual";
        target: {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        };
        reversible: boolean;
        opId: string;
        note?: string | undefined;
        frame?: number | undefined;
        property?: string | undefined;
        frameRange?: [number, number] | undefined;
        before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        evidenceRefs?: string[] | undefined;
    }[];
    approval: {
        schemaVersion: "1.0.0";
        decision: "rejected" | "approved";
        sessionId: string;
        patchHash: string;
        decidedAt: string;
        note?: string | undefined;
        reviewer?: string | undefined;
        qualityTags?: string[] | undefined;
    };
    usageRestrictions: {
        containsUserSceneData: boolean;
        scenePathRedacted: boolean;
        license?: string | undefined;
        redactedFields?: string[] | undefined;
        interpretationLimits?: string[] | undefined;
    };
    warnings?: string[] | undefined;
    notCaptured?: ("palettes" | "deformer_chains" | "master_controllers" | "drawing_strokes" | "art_layers" | "sound_columns" | "node_view_groups")[] | undefined;
    renderBlockingReason?: string | undefined;
}>;
export type HarmonyActionDatasetEntry = z.infer<typeof harmonyActionDatasetEntrySchema>;
export declare const canonicalSort: {
    nodes: (items: SceneNode[]) => {
        path: string;
        type: string;
        name: string;
        positionX: number;
        positionY: number;
        parentPath: string;
        enabled: boolean;
    }[];
    connections: (items: SceneConnection[]) => {
        fromPort: number;
        toPort: number;
        fromNode: string;
        toNode: string;
    }[];
    nodeAttributes: (items: SceneNodeAttribute[]) => {
        value: string | number | boolean;
        nodePath: string;
        animated: boolean;
        attribute: string;
        columnName?: string | undefined;
    }[];
    columns: (items: SceneColumn[]) => {
        type: string;
        name: string;
        linkedNodePath?: string | undefined;
        linkedAttribute?: string | undefined;
    }[];
    keyframes: (items: SceneKeyframe[]) => {
        value: number;
        frame: number;
        interpolation: string;
        columnName: string;
        easeIn?: number | undefined;
        easeOut?: number | undefined;
        constSeg?: boolean | undefined;
    }[];
    exposures: (items: SceneExposure[]) => {
        frame: number;
        nodePath: string;
        drawing: string;
    }[];
    operations: (items: HarmonySemanticOperation[]) => {
        type: "connect_nodes" | "disconnect_nodes" | "move_keyframe" | "add_node" | "remove_node" | "change_node_attribute" | "add_keyframe" | "remove_keyframe" | "change_keyframe_value" | "change_curve_segment" | "change_peg_transform" | "set_drawing_substitution" | "shift_exposure" | "change_camera_property" | "unknown_structural_change";
        confidence: number;
        origin: "inferred" | "mcp_tool" | "harmony_manual";
        target: {
            kind: "scene" | "column" | "node" | "connection";
            nodePath?: string | undefined;
            columnName?: string | undefined;
            connection?: {
                fromPort: number;
                toPort: number;
                fromNode: string;
                toNode: string;
            } | undefined;
        };
        reversible: boolean;
        opId: string;
        evidenceRefs: string[];
        note?: string | undefined;
        frame?: number | undefined;
        property?: string | undefined;
        frameRange?: [number, number] | undefined;
        before?: string | number | boolean | any[] | Record<string, any> | null | undefined;
        after?: string | number | boolean | any[] | Record<string, any> | null | undefined;
    }[];
};
/** SHA-256 over a key-sorted JSON serialization. */
export declare function canonicalHash(value: unknown): string;
/** SHA-256 of a canonicalized filesystem path; the raw path never enters an artifact. */
export declare function hashScenePath(scenePath: string): string;
/**
 * Structural fingerprint of a scene state.
 *
 * Deliberately excludes capture metadata (timestamps, source, captureMode, warnings), so
 * the same scene read twice — or read by two different providers — yields the same hash.
 */
export declare function computeSceneStateHash(state: Omit<HarmonySceneState, 'deterministicHash'> | HarmonySceneState): string;
/** Structural fingerprint of a patch: the operation set, independent of emission order. */
export declare function computePatchHash(patch: Omit<HarmonyScenePatch, 'deterministicHash'> | HarmonyScenePatch): string;
/** Deterministic operation id — identical operations always get the identical id. */
export declare function computeOperationId(op: Omit<HarmonySemanticOperation, 'opId'>): string;
