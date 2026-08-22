/**
 * Semantic Scene Diff Engine.
 *
 * Compares two *normalized* HarmonySceneState objects — never raw `.xstage` text — and
 * produces a deterministic HarmonyScenePatch made of atomic, meaningful operations.
 *
 * Honesty rules baked into this engine:
 *  - It reports what changed numerically. It never claims why, and never claims an artistic
 *    goal. Intent lives only in the human instruction.
 *  - Diff-derived operations are `harmony_manual`. They are upgraded to `mcp_tool` only when
 *    an MCP call explicitly claimed that exact target/property/frame.
 *  - Merged readings (a keyframe move, an exposure shift) are `inferred` with a confidence
 *    below 1 and always keep the underlying before/after evidence.
 *
 * This file sits beside the existing snapshot-level `SceneDiffEngine` and does not replace it.
 */
import { HarmonySceneState, HarmonyScenePatch } from '../../schemas/harmonyActionDataset.js';
/** A claim that an MCP tool made a specific, exactly-known change. */
export interface McpOperationClaim {
    correlationId: string;
    toolName: string;
    /** Node paths and/or column names the tool call touched. */
    targets: string[];
    /** Attribute/property names, when the tool knows them. */
    properties?: string[];
    /** Frames, when the tool knows them. */
    frames?: number[];
}
export interface SemanticDiffOptions {
    epsilon?: number;
    /** Merge one removed + one added keyframe with an equal value into `move_keyframe`. */
    detectKeyframeMoves?: boolean;
    /** Merge a constant-offset exposure rewrite into `shift_exposure`. */
    detectExposureShifts?: boolean;
    mcpClaims?: McpOperationClaim[];
    generatedAt?: string;
}
export declare class SemanticSceneDiffEngine {
    /**
     * Diff two scene states. Identical states yield a patch with zero operations.
     *
     * @throws when the two states describe different scenes — diffing across scenes would
     *         produce a meaningless "everything changed" patch.
     */
    diff(before: HarmonySceneState, after: HarmonySceneState, options?: SemanticDiffOptions): HarmonyScenePatch;
    /**
     * Build the inverse of a patch as data. Operations that cannot be inverted without
     * guessing are dropped and reported; the result then requires human review.
     */
    invert(patch: HarmonyScenePatch, generatedAt?: string): HarmonyScenePatch;
    private diffNodes;
    private diffConnections;
    private diffAttributes;
    private diffKeyframes;
    /**
     * A keyframe that disappears at one frame and reappears at another with the same value is
     * most plausibly a move. That reading is only applied when the value is unambiguous —
     * exactly one removed and one added keyframe share it — and it is always marked `inferred`.
     */
    private reconcileKeyframeAddRemove;
    private diffExposures;
    /**
     * Returns the constant frame offset that explains every changed frame, or undefined.
     * A single changed frame is never treated as a shift — that is just a substitution.
     */
    private detectExposureShift;
    private diffCamera;
    private diffSceneSettings;
    /**
     * Upgrade `harmony_manual` operations to `mcp_tool` only where a tool call claimed exactly
     * that target — and, when the tool stated them, that property and frame. Everything else
     * stays manual, so a reconstructed edit is never presented as an exact known command.
     */
    private applyMcpClaims;
    private invertOperation;
    private summarize;
}
