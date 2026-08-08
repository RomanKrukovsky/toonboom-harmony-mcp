/**
 * MohoMCP Safety Engine.
 *
 * Centralized enforcement of:
 *  - method allow-list (whitelist of Moho-scripting methods safe to invoke)
 *  - destructive-operation previewHash confirmation, bound to the exact
 *    parameters previewed, with a TTL from `config.moho.previewTtlMs` (60s)
 *  - filesystem path sandbox (no writes outside approved directories)
 *  - batch operation validation (size limit, per-op allow-list, no destructive
 *    or nested operations inside a batch)
 *
 * This is the single source of truth for what the bridge will dispatch. Any
 * tool handler that wishes to call Moho MUST route through `validate*`
 * helpers in this module before sending the request.
 *
 * Scope limits, stated plainly:
 *  - There is NO rollback here. Once the Lua plugin applies a change inside
 *    Moho it is committed; `recordTransaction` is an audit trail only.
 *  - All state (plans, audit entries, idempotency keys) is in-memory and
 *    per-process. It does not survive a restart and is not shared between
 *    bridge instances.
 *
 * This lives alongside the Harmony safety mechanism in `src/security.ts`
 * (`HarmonyError`, `enforceDestructiveSafety`). The two are deliberately kept
 * separate per the integration contract and must not be merged: Harmony gates
 * on a confirmation phrase, Moho gates on a previewHash bound to a plan.
 */
import path from "node:path";
import crypto from "node:crypto";
import { config } from "../config.js";

/**
 * Every Lua method the bridge is allowed to invoke — the single source of truth
 * for the allow-list. The `AllowedMethod` type and the runtime `Set` are both
 * derived from this array so the two can never drift apart.
 *
 * A method must appear here to be dispatched at all, including when it is
 * nested inside `batch.execute`. Adding an entry here widens the attack
 * surface; it must be matched by a real handler in the Moho Lua plugin.
 */
const ALLOWED_METHOD_LIST = [
  "document.getInfo",
  "document.getLayers",
  "document.setFrame",
  "document.screenshot",
  "document.createLayer",
  "document.save",
  "document.close",
  "document.open",
  "document.render",
  "document.diagnose",
  "layer.getProperties",
  "layer.getChildren",
  "layer.getBones",
  "layer.setTransform",
  "layer.setVisibility",
  "layer.setOpacity",
  "layer.setName",
  "layer.selectLayer",
  "layer.reorder",
  "layer.setBlendMode",
  "layer.setMask",
  "layer.createGroup",
  "layer.createSwitch",
  "layer.delete",
  "bone.getProperties",
  "bone.setTransform",
  "bone.selectBone",
  "bone.createBone",
  "bone.deleteBone",
  "bone.setConstraints",
  "bone.setTarget",
  "bone.setParent",
  "animation.getKeyframes",
  "animation.getFrameState",
  "animation.setKeyframe",
  "animation.setMultiKeyframe",
  "animation.deleteKeyframe",
  "animation.setInterpolation",
  "animation.getPointAnim",
  "mesh.getPoints",
  "mesh.getShapes",
  "mesh.createPoint",
  "mesh.createBezier",
  "mesh.weld",
  "mesh.setFill",
  "mesh.setStroke",
  "mesh.setGradient",
  "mesh.setCurvature",
  "batch.execute",
  "workflow.duplicateLayerTree",
  "workflow.createSmartBone",
  "workflow.applyLipSync",
  "workflow.batchRender",
  "workflow.projectDiagnostics",
  "workflow.createCharacterRig",
] as const;

/** All methods the bridge is allowed to invoke. Derived from ALLOWED_METHOD_LIST. */
export type AllowedMethod = (typeof ALLOWED_METHOD_LIST)[number];

const ALLOWED_METHODS: ReadonlySet<string> = new Set<string>(ALLOWED_METHOD_LIST);

/**
 * Methods that can destroy work a human cannot get back, and therefore require
 * a previewHash confirmation bound to the exact parameters being executed.
 *
 * Rationale per entry:
 *  - animation.deleteKeyframe — removes authored animation data.
 *  - layer.delete            — removes a layer and everything nested under it.
 *  - bone.deleteBone         — removes a bone and orphans its bindings.
 *  - mesh.weld               — merges two points; the original topology is lost.
 *  - document.save           — overwrites a file on disk in place.
 *  - document.close          — discards unsaved changes in the open document.
 *  - document.open           — loads another document over the current one,
 *                              discarding unsaved changes just like close.
 *  - workflow.batchRender    — writes many output files, overwriting existing ones.
 *
 * Deliberately NOT listed:
 *  - animation.setKeyframe / setMultiKeyframe / setInterpolation: overwriting a
 *    key value is ordinary authoring, and gating every keyframe write behind a
 *    plan would make the animation tools unusable.
 *  - layer.reorder / setMask / setVisibility and the mesh style setters: these
 *    change presentation and are reversible by setting the value back.
 *  - document.render: it can overwrite files, but the `document_render` tool
 *    accepts no previewHash, so listing it here would make every render fail at
 *    runtime. Its output path is sandboxed instead. See the report note for the
 *    tools.ts owner.
 */
const DESTRUCTIVE_METHODS: ReadonlySet<string> = new Set<string>([
  "animation.deleteKeyframe",
  "layer.delete",
  "bone.deleteBone",
  "mesh.weld",
  "document.close",
  "document.save",
  "document.open",
  "workflow.batchRender",
]);

/**
 * Parameter keys that carry a filesystem destination. Any of these appearing in
 * a batched operation is resolved against the sandbox roots before dispatch.
 */
const PATH_PARAM_KEYS = ["outputPath", "path"] as const;

/**
 * Serialize a value to a stable string so two structurally equal parameter
 * objects hash identically regardless of key insertion order. Used to bind a
 * previewHash to the exact operation it was generated for.
 */
function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? String(value);
}

/** All interpolation modes the bridge supports on the wire. */
export const INTERPOLATION_MODES = [
  "linear",
  "smooth",
  "ease_in",
  "ease_out",
  "step",
  "bezier",
  "noisy",
  "cycle",
] as const;
export type InterpolationMode = (typeof INTERPOLATION_MODES)[number];

/** Supported layer types for createLayer / createGroup / createSwitch. */
export const LAYER_TYPES = [
  "vector",
  "bone",
  "group",
  "image",
  "audio",
  "switch",
  "particle",
  "note",
  "patch",
] as const;
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

export class MohoSecurityError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "MohoSecurityError";
    this.code = code;
  }
}

export class MohoValidationError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "MohoValidationError";
    this.code = code;
  }
}

export class MohoSafetyEngine {
  private readonly activePlans = new Map<string, ExecutionPlan>();
  private readonly transactions = new Map<string, TransactionRecord>();
  private readonly executedKeys = new Set<string>();
  private readonly maxExecutedKeys = 4096;

  /** Throw if method is not in the allow-list. */
  public validateMethodWhitelist(method: string): void {
    if (typeof method !== "string" || !ALLOWED_METHODS.has(method)) {
      throw new MohoSecurityError(
        `Method '${method}' is not in the allowed Moho safety whitelist. Arbitrary code execution is prohibited.`,
        "method_not_whitelisted",
      );
    }
  }

  /** Returns true iff the method is in the allow-list (non-throwing). */
  public isMethodAllowed(method: string): boolean {
    return typeof method === "string" && ALLOWED_METHODS.has(method);
  }

  /** True iff method is destructive and needs a preview hash. */
  public isDestructive(method: string): boolean {
    return DESTRUCTIVE_METHODS.has(method);
  }

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
  public createExecutionPlan(
    correlationId: string,
    projectRevision: string,
    steps: Array<{ method: string; params: Record<string, unknown>; description: string }>,
  ): ExecutionPlan {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new MohoValidationError(
        "An execution plan must contain at least one step.",
        "plan_empty",
      );
    }

    const planSteps: PlanStep[] = steps.map((s, idx) => {
      this.validateMethodWhitelist(s.method);
      const params = s.params ?? {};
      const isDestructive = this.isDestructive(s.method) || Boolean(params.confirmRequired);
      return {
        stepNumber: idx + 1,
        method: s.method,
        params,
        description: s.description,
        isDestructive,
      };
    });

    const requiresConfirmation = planSteps.some((st) => st.isDestructive);
    const planId = `plan_${crypto.randomBytes(6).toString("hex")}`;
    const expiresAt = Date.now() + config.moho.previewTtlMs;

    const hashPayload = canonicalize({
      planId,
      correlationId,
      projectRevision,
      steps: planSteps,
      expiresAt,
    });
    const previewHash = crypto.createHash("sha256").update(hashPayload).digest("hex").substring(0, 32);

    const plan: ExecutionPlan = {
      planId,
      correlationId,
      projectRevision,
      previewHash,
      expiresAt,
      steps: planSteps,
      requiresConfirmation,
      summary: `Planned ${planSteps.length} operations. ${
        requiresConfirmation ? "Requires explicit confirmation via previewHash." : "Safe to auto-execute."
      }`,
    };

    this.activePlans.set(previewHash, plan);
    this.evictExpiredPlans();
    return plan;
  }

  /** Returns the cached plan for a preview hash, or null if missing/expired. */
  public getPlan(previewHash: string): ExecutionPlan | null {
    const plan = this.activePlans.get(previewHash);
    if (!plan) return null;
    if (Date.now() > plan.expiresAt) {
      this.activePlans.delete(previewHash);
      return null;
    }
    return plan;
  }

  /**
   * Validate a previewHash for a destructive operation.
   *
   * The hash must resolve to a live (non-expired) plan containing a step for this
   * method whose approved parameters do not conflict with the ones being
   * executed. Matching on the method name alone would be worthless: a plan for
   * "delete keyframe 10" would then confirm "delete keyframe 999". See the
   * parameter-binding block below for the exact guarantee and its one limit.
   */
  public validatePreviewConfirmation(
    method: string,
    params: Record<string, unknown>,
    previewHash?: string,
  ): void {
    if (!this.isDestructive(method)) return;

    if (!previewHash) {
      throw new MohoValidationError(
        `Destructive operation '${method}' requires a valid 'previewHash' generated from a prior plan preview. Passing 'confirm: true' alone is prohibited.`,
        "preview_hash_required",
      );
    }

    const cachedPlan = this.getPlan(previewHash);
    if (!cachedPlan) {
      throw new MohoValidationError(
        `Invalid, unknown, or expired previewHash '${previewHash}'. Generate a fresh execution plan preview first.`,
        "preview_hash_invalid",
      );
    }

    const methodSteps = cachedPlan.steps.filter((s) => s.method === method);
    if (methodSteps.length === 0) {
      throw new MohoValidationError(
        `previewHash '${previewHash}' was not generated for method '${method}'.`,
        "preview_hash_method_mismatch",
      );
    }

    // Bind the confirmation to the parameters that were actually previewed.
    //
    // Guarantee: NO supplied parameter may differ from the approved plan. Every
    // key the caller sends must be present in an approved step for this method
    // and carry an identical value (compared via `canonicalize`, so key order is
    // irrelevant). This is what defeats hash substitution: a hash approved for
    // `{frame: 10}` cannot be used to execute `{frame: 999}`, and a hash
    // approved for one output path cannot redirect the write to another.
    //
    // Limit, stated honestly: a caller that OMITS a key is not rejected, because
    // it has not contradicted anything that was approved. Omission is not a
    // useful escalation here — the Lua plugin rejects destructive calls that are
    // missing their required parameters, so an emptied payload fails downstream
    // rather than destroying a different target. Callers should still forward the
    // exact params they intend to execute, which `safeSend` in tools.ts does.
    const conflicts: string[] = [];
    const matched = methodSteps.some((step) => {
      const approved = step.params ?? {};
      const supplied = params ?? {};
      for (const [key, value] of Object.entries(supplied)) {
        if (value === undefined) continue;
        if (!(key in approved)) {
          conflicts.push(`'${key}' was not part of the approved operation`);
          return false;
        }
        if (canonicalize(approved[key]) !== canonicalize(value)) {
          conflicts.push(
            `'${key}' approved as ${canonicalize(approved[key])} but requested as ${canonicalize(value)}`,
          );
          return false;
        }
      }
      return true;
    });

    if (!matched) {
      throw new MohoValidationError(
        `previewHash '${previewHash}' does not authorize this exact '${method}' call: ` +
          `${conflicts.join("; ")}. Generate a fresh plan for the operation you intend to run.`,
        "preview_hash_params_mismatch",
      );
    }
  }

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
  public validateBatchSafety(
    operations: Array<{ method: string; params: Record<string, unknown> }>,
    allowedDirs: string[],
  ): void {
    if (!Array.isArray(operations) || operations.length === 0) {
      throw new MohoValidationError(
        "Batch must be a non-empty array of operations.",
        "batch_empty",
      );
    }
    if (operations.length > config.moho.maxBatchSize) {
      throw new MohoValidationError(
        `Batch operation limit exceeded: ${operations.length} ops requested (max allowed: ${config.moho.maxBatchSize}).`,
        "batch_too_large",
      );
    }

    for (const op of operations) {
      if (typeof op !== "object" || op === null) {
        throw new MohoValidationError(
          "Each batch operation must be a table { method, params }.",
          "batch_op_malformed",
        );
      }
      this.validateMethodWhitelist(op.method);

      if (this.isDestructive(op.method)) {
        throw new MohoValidationError(
          `Destructive operation '${op.method}' cannot run inside a batch. A batch cannot carry ` +
            `per-operation previewHash confirmation, so this would bypass the confirmation gate. ` +
            `Run it through its dedicated tool with its own previewHash.`,
          "batch_destructive_forbidden",
        );
      }

      // Nested batches would recurse past these checks with a fresh op list.
      if (op.method === "batch.execute") {
        throw new MohoValidationError(
          "Nested 'batch.execute' is not allowed; flatten the operations into a single batch.",
          "batch_nested_forbidden",
        );
      }

      for (const key of PATH_PARAM_KEYS) {
        const candidate = op.params?.[key];
        if (typeof candidate === "string" && candidate.length > 0) {
          this.validatePathSandbox(candidate, allowedDirs);
        }
      }
    }
  }

  /** Validate that `targetPath` resolves under one of the allowed roots. */
  public validatePathSandbox(targetPath: string, allowedDirs: string[]): string {
    if (!Array.isArray(allowedDirs) || allowedDirs.length === 0) {
      throw new MohoSecurityError(
        `No allowed directories configured; cannot resolve '${targetPath}'.`,
        "sandbox_unconfigured",
      );
    }

    const resolved = path.resolve(targetPath);
    const allowed = allowedDirs.some((dir) => {
      const resolvedDir = path.resolve(dir);
      return resolved === resolvedDir || resolved.startsWith(resolvedDir + path.sep);
    });
    if (!allowed) {
      throw new MohoSecurityError(
        `Access denied: Path '${targetPath}' is outside authorized sandbox directories (${allowedDirs.join(", ")}).`,
        "sandbox_violation",
      );
    }
    return resolved;
  }

  /** Check an interpolation mode against the supported set. */
  public validateInterpolationMode(mode: unknown): asserts mode is InterpolationMode {
    if (typeof mode !== "string" || !(INTERPOLATION_MODES as readonly string[]).includes(mode)) {
      throw new MohoValidationError(
        `Unsupported interpolation mode: ${String(mode)}. Valid: ${INTERPOLATION_MODES.join(", ")}.`,
        "invalid_interp_mode",
      );
    }
  }

  /**
   * Track an executed request for idempotency. Returns true the first time a key
   * is seen and false on every repeat, so callers can drop duplicate dispatches.
   *
   * The store is bounded at `maxExecutedKeys`; once full, the oldest key is
   * dropped in insertion order. A replay older than that window will therefore
   * be treated as new, so this guards against retry storms, not against an
   * attacker replaying an arbitrarily old key.
   */
  public markExecuted(idempotencyKey: string): boolean {
    if (this.executedKeys.has(idempotencyKey)) return false;
    this.executedKeys.add(idempotencyKey);
    while (this.executedKeys.size > this.maxExecutedKeys) {
      const oldest = this.executedKeys.values().next().value;
      if (oldest === undefined) break;
      this.executedKeys.delete(oldest);
    }
    return true;
  }

  /** Drop all expired plans. Called by createExecutionPlan and on demand. */
  public evictExpiredPlans(): void {
    const now = Date.now();
    for (const [hash, plan] of this.activePlans) {
      if (now > plan.expiresAt) this.activePlans.delete(hash);
    }
  }

  /**
   * Invalidate a plan once its destructive work has been dispatched, so a single
   * confirmation cannot be replayed for the remainder of its TTL. Returns true
   * if a plan was present and removed.
   */
  public consumePlan(previewHash: string): boolean {
    return this.activePlans.delete(previewHash);
  }

  /** Active plan count — for diagnostics. */
  public get activePlanCount(): number {
    return this.activePlans.size;
  }

  /**
   * Append an entry to the in-memory audit trail.
   *
   * AUDIT ONLY — recording an entry does not make the operation reversible. See
   * the `TransactionRecord` docs: this engine has no rollback and no
   * compensating actions. Entries live in this process only and are lost on
   * restart; they are not the durable audit log at `config.security.auditLogPath`.
   */
  public recordTransaction(tx: TransactionRecord): void {
    this.transactions.set(tx.transactionId, tx);
  }

  /** Read back a recorded audit entry, or null when unknown. */
  public getTransaction(transactionId: string): TransactionRecord | null {
    return this.transactions.get(transactionId) ?? null;
  }
}

export const safetyEngine = new MohoSafetyEngine();
