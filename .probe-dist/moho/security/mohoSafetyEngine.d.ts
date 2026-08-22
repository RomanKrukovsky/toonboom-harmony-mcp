/**
 * Every Lua method the bridge is allowed to invoke — the single source of truth
 * for the allow-list. The `AllowedMethod` type and the runtime `Set` are both
 * derived from this array so the two can never drift apart.
 *
 * A method must appear here to be dispatched at all, including when it is
 * nested inside `batch.execute`. Adding an entry here widens the attack
 * surface; it must be matched by a real handler in the Moho Lua plugin.
 */
declare const ALLOWED_METHOD_LIST: readonly ["document.getInfo", "document.getLayers", "document.setFrame", "document.screenshot", "document.createLayer", "document.save", "document.close", "document.open", "document.render", "document.diagnose", "layer.getProperties", "layer.getChildren", "layer.getBones", "layer.setTransform", "layer.setVisibility", "layer.setOpacity", "layer.setName", "layer.selectLayer", "layer.reorder", "layer.setBlendMode", "layer.setMask", "layer.createGroup", "layer.createSwitch", "layer.delete", "bone.getProperties", "bone.setTransform", "bone.selectBone", "bone.createBone", "bone.deleteBone", "bone.setConstraints", "bone.setTarget", "bone.setParent", "animation.getKeyframes", "animation.getFrameState", "animation.setKeyframe", "animation.setMultiKeyframe", "animation.deleteKeyframe", "animation.setInterpolation", "animation.getPointAnim", "mesh.getPoints", "mesh.getShapes", "mesh.createPoint", "mesh.createBezier", "mesh.weld", "mesh.setFill", "mesh.setStroke", "mesh.setGradient", "mesh.setCurvature", "batch.execute", "workflow.duplicateLayerTree", "workflow.createSmartBone", "workflow.applyLipSync", "workflow.batchRender", "workflow.projectDiagnostics", "workflow.createCharacterRig"];
/** All methods the bridge is allowed to invoke. Derived from ALLOWED_METHOD_LIST. */
export type AllowedMethod = (typeof ALLOWED_METHOD_LIST)[number];
/** All interpolation modes the bridge supports on the wire. */
export declare const INTERPOLATION_MODES: readonly ["linear", "smooth", "ease_in", "ease_out", "step", "bezier", "noisy", "cycle"];
export type InterpolationMode = (typeof INTERPOLATION_MODES)[number];
/** Supported layer types for createLayer / createGroup / createSwitch. */
export declare const LAYER_TYPES: readonly ["vector", "bone", "group", "image", "audio", "switch", "particle", "note", "patch"];
export type LayerType = (typeof LAYER_TYPES)[number];
export interface PlanStep {
    stepNumber: number;
    method: string;
    params: Record<string, unknown>;
    description: string;
    isDestructive: boolean;
}
export interface ExecutionPlan {
    planId: string;
    correlationId: string;
    projectRevision: string;
    previewHash: string;
    expiresAt: number;
    steps: PlanStep[];
    requiresConfirmation: boolean;
    summary: string;
}
/**
 * An audit-trail entry for one dispatched operation.
 *
 * This is an APPEND-ONLY AUDIT LOG, NOT a transaction with rollback. Nothing in
 * this engine can undo a Moho operation: once the Lua plugin has run
 * `animation.deleteKeyframe` or `document.save`, the change is committed inside
 * Moho and only the user's own undo stack can reverse it. `status` therefore
 * records what the bridge observed, and `FAILED` means the call reported an
 * error — it does NOT mean the document was restored to its previous state.
 */
export interface TransactionRecord {
    transactionId: string;
    correlationId: string;
    timestamp: number;
    method: string;
    params: Record<string, unknown>;
    /**
     * PENDING   — dispatched, outcome not yet known.
     * COMMITTED — the plugin reported success.
     * FAILED    — the plugin reported an error. Any partial effect it already
     *             applied inside Moho REMAINS APPLIED; no compensation is run.
     */
    status: "PENDING" | "COMMITTED" | "FAILED";
}
export declare class MohoSecurityError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare class MohoValidationError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare class MohoSafetyEngine {
    private readonly activePlans;
    private readonly transactions;
    private readonly executedKeys;
    private readonly maxExecutedKeys;
    /** Throw if method is not in the allow-list. */
    validateMethodWhitelist(method: string): void;
    /** Returns true iff the method is in the allow-list (non-throwing). */
    isMethodAllowed(method: string): boolean;
    /** True iff method is destructive and needs a preview hash. */
    isDestructive(method: string): boolean;
    /**
     * Generate a plan with a previewHash and a TTL of `config.moho.previewTtlMs`
     * (60s by default). Steps are validated against the allow-list and marked
     * destructive when the method requires confirmation.
     *
     * The hash is an unguessable capability token, not a checksum a caller can
     * recompute: it mixes a random planId and the expiry into the digest, so it
     * cannot be forged without having asked for a plan first. The plan itself is
     * kept in memory and is what `validatePreviewConfirmation` compares against.
     */
    createExecutionPlan(correlationId: string, projectRevision: string, steps: Array<{
        method: string;
        params: Record<string, unknown>;
        description: string;
    }>): ExecutionPlan;
    /** Returns the cached plan for a preview hash, or null if missing/expired. */
    getPlan(previewHash: string): ExecutionPlan | null;
    /**
     * Validate a previewHash for a destructive operation.
     *
     * The hash must resolve to a live (non-expired) plan containing a step for this
     * method whose approved parameters do not conflict with the ones being
     * executed. Matching on the method name alone would be worthless: a plan for
     * "delete keyframe 10" would then confirm "delete keyframe 999". See the
     * parameter-binding block below for the exact guarantee and its one limit.
     */
    validatePreviewConfirmation(method: string, params: Record<string, unknown>, previewHash?: string): void;
    /**
     * Validate a batch of operations.
     *
     * Every nested operation is checked against the allow-list and the path
     * sandbox. Destructive operations are REJECTED outright inside a batch: a
     * batch carries a single previewHash at most, so it cannot carry per-operation
     * confirmation, and allowing them here would let `batch.execute` become a
     * bypass for the entire confirmation mechanism. Destructive work must be run
     * through its own dedicated tool with its own previewHash.
     */
    validateBatchSafety(operations: Array<{
        method: string;
        params: Record<string, unknown>;
    }>, allowedDirs: string[]): void;
    /** Validate that `targetPath` resolves under one of the allowed roots. */
    validatePathSandbox(targetPath: string, allowedDirs: string[]): string;
    /** Check an interpolation mode against the supported set. */
    validateInterpolationMode(mode: unknown): asserts mode is InterpolationMode;
    /**
     * Track an executed request for idempotency. Returns true the first time a key
     * is seen and false on every repeat, so callers can drop duplicate dispatches.
     *
     * The store is bounded at `maxExecutedKeys`; once full, the oldest key is
     * dropped in insertion order. A replay older than that window will therefore
     * be treated as new, so this guards against retry storms, not against an
     * attacker replaying an arbitrarily old key.
     */
    markExecuted(idempotencyKey: string): boolean;
    /** Drop all expired plans. Called by createExecutionPlan and on demand. */
    evictExpiredPlans(): void;
    /**
     * Invalidate a plan once its destructive work has been dispatched, so a single
     * confirmation cannot be replayed for the remainder of its TTL. Returns true
     * if a plan was present and removed.
     */
    consumePlan(previewHash: string): boolean;
    /** Active plan count — for diagnostics. */
    get activePlanCount(): number;
    /**
     * Append an entry to the in-memory audit trail.
     *
     * AUDIT ONLY — recording an entry does not make the operation reversible. See
     * the `TransactionRecord` docs: this engine has no rollback and no
     * compensating actions. Entries live in this process only and are lost on
     * restart; they are not the durable audit log at `config.security.auditLogPath`.
     */
    recordTransaction(tx: TransactionRecord): void;
    /** Read back a recorded audit entry, or null when unknown. */
    getTransaction(transactionId: string): TransactionRecord | null;
}
export declare const safetyEngine: MohoSafetyEngine;
export {};
