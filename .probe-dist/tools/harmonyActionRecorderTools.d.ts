/**
 * MCP tools for Harmony Action Recorder v1.
 *
 * Every tool here has a real backend in `src/services/harmonyActionRecorder`. The recorder is
 * read-only with respect to scene content, so none of these tools requires destructive
 * confirmation; they create only their own evidence artifacts.
 */
import { z } from 'zod';
import { SceneStateProvider } from '../services/sceneStateCapture/index.js';
declare const providerModeSchema: z.ZodEnum<["auto", "harmony_python_bridge", "fixture"]>;
/**
 * Build the requested provider.
 * `auto` prefers the real Harmony bridge and falls back to fixtures only when the caller
 * supplied them — it never silently substitutes fake data for a real read.
 */
export declare function buildProvider(mode: z.infer<typeof providerModeSchema>, fixtureStatePaths?: string[], scenePath?: string): SceneStateProvider;
export declare const harmonyActionRecorderTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    scenePath: z.ZodString;
    sceneId: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    provider: z.ZodDefault<z.ZodEnum<["auto", "harmony_python_bridge", "fixture"]>>;
    fixtureStatePaths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    debounceMs: z.ZodOptional<z.ZodNumber>;
    captureNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    provider: "auto" | "harmony_python_bridge" | "fixture";
    scenePath: string;
    sceneId?: string | undefined;
    sessionId?: string | undefined;
    debounceMs?: number | undefined;
    fixtureStatePaths?: string[] | undefined;
    captureNotes?: string | undefined;
}, {
    scenePath: string;
    sceneId?: string | undefined;
    provider?: "auto" | "harmony_python_bridge" | "fixture" | undefined;
    sessionId?: string | undefined;
    debounceMs?: number | undefined;
    fixtureStatePaths?: string[] | undefined;
    captureNotes?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sessionId: z.ZodString;
    text: z.ZodString;
    language: z.ZodOptional<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    externalDemoRef: z.ZodOptional<z.ZodString>;
    transcriptRef: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    text: string;
    sessionId: string;
    language?: string | undefined;
    tags?: string[] | undefined;
    author?: string | undefined;
    externalDemoRef?: string | undefined;
    transcriptRef?: string | undefined;
}, {
    text: string;
    sessionId: string;
    language?: string | undefined;
    tags?: string[] | undefined;
    author?: string | undefined;
    externalDemoRef?: string | undefined;
    transcriptRef?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sessionId: z.ZodString;
    force: z.ZodDefault<z.ZodBoolean>;
    notifierEvents: z.ZodOptional<z.ZodArray<z.ZodObject<{
        signal: z.ZodEnum<["sceneChanged", "networkChanged", "nodeChanged", "nodeMetadataChanged", "columnValuesChanged", "currentFrameChanged", "selectionChanged", "controlChanged", "deformerReset", "deformerResetCurrentFrame", "sceneMarkersChanged", "recorder.sessionStarted", "recorder.instructionRecorded", "recorder.snapshotTaken", "recorder.sessionStopped", "recorder.mcpToolInvoked"]>;
        targets: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        timestamp: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        signal: "sceneChanged" | "networkChanged" | "nodeChanged" | "nodeMetadataChanged" | "columnValuesChanged" | "currentFrameChanged" | "selectionChanged" | "controlChanged" | "deformerReset" | "deformerResetCurrentFrame" | "sceneMarkersChanged" | "recorder.sessionStarted" | "recorder.instructionRecorded" | "recorder.snapshotTaken" | "recorder.sessionStopped" | "recorder.mcpToolInvoked";
        targets: string[];
        timestamp?: string | undefined;
    }, {
        signal: "sceneChanged" | "networkChanged" | "nodeChanged" | "nodeMetadataChanged" | "columnValuesChanged" | "currentFrameChanged" | "selectionChanged" | "controlChanged" | "deformerReset" | "deformerResetCurrentFrame" | "sceneMarkersChanged" | "recorder.sessionStarted" | "recorder.instructionRecorded" | "recorder.snapshotTaken" | "recorder.sessionStopped" | "recorder.mcpToolInvoked";
        timestamp?: string | undefined;
        targets?: string[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    force: boolean;
    sessionId: string;
    notifierEvents?: {
        signal: "sceneChanged" | "networkChanged" | "nodeChanged" | "nodeMetadataChanged" | "columnValuesChanged" | "currentFrameChanged" | "selectionChanged" | "controlChanged" | "deformerReset" | "deformerResetCurrentFrame" | "sceneMarkersChanged" | "recorder.sessionStarted" | "recorder.instructionRecorded" | "recorder.snapshotTaken" | "recorder.sessionStopped" | "recorder.mcpToolInvoked";
        targets: string[];
        timestamp?: string | undefined;
    }[] | undefined;
}, {
    sessionId: string;
    force?: boolean | undefined;
    notifierEvents?: {
        signal: "sceneChanged" | "networkChanged" | "nodeChanged" | "nodeMetadataChanged" | "columnValuesChanged" | "currentFrameChanged" | "selectionChanged" | "controlChanged" | "deformerReset" | "deformerResetCurrentFrame" | "sceneMarkersChanged" | "recorder.sessionStarted" | "recorder.instructionRecorded" | "recorder.snapshotTaken" | "recorder.sessionStopped" | "recorder.mcpToolInvoked";
        timestamp?: string | undefined;
        targets?: string[] | undefined;
    }[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionId?: string | undefined;
}, {
    sessionId?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sessionId: z.ZodString;
    renderStatus: z.ZodDefault<z.ZodEnum<["not_executed", "blocked"]>>;
    renderBlockingReason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    renderStatus: "blocked" | "not_executed";
    renderBlockingReason?: string | undefined;
}, {
    sessionId: string;
    renderStatus?: "blocked" | "not_executed" | undefined;
    renderBlockingReason?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sessionId: z.ZodString;
    reviewer: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
    qualityTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    note?: string | undefined;
    reviewer?: string | undefined;
    qualityTags?: string[] | undefined;
}, {
    sessionId: string;
    note?: string | undefined;
    reviewer?: string | undefined;
    qualityTags?: string[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sessionId: z.ZodString;
    includeRejected: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    includeRejected: boolean;
}, {
    sessionId: string;
    includeRejected?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sessionIdA: z.ZodString;
    sessionIdB: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionIdA: string;
    sessionIdB: string;
}, {
    sessionIdA: string;
    sessionIdB: string;
}>>)[];
/** Effective recorder configuration, exposed for diagnostics and tests. */
export declare function describeRecorderConfig(): import("../services/harmonyActionRecorder/config.js").HarmonyRecorderConfig;
export {};
