/**
 * MohoMCP error taxonomy.
 *
 * Every error returned by the bridge is one of the codes below. The shape is
 * intentionally machine-readable first: a stable `code`, a human message, a
 * correlation id, a retryable flag, a recovery suggestion, and `details` that
 * never contain secrets, prompt content, project files, or unredacted paths.
 *
 * That last guarantee is enforced, not merely documented: `buildError` pushes
 * both `message` and `details` through `redaction.ts`. Error payloads travel to
 * the MCP client and into log files, so they are a real exfiltration path — a
 * caller that does `details: { err }` on a filesystem error would otherwise leak
 * absolute home paths, and `details: { config }` would leak API keys.
 */
import { randomUUID } from "node:crypto";
import { redactObject, redactString } from "./redaction.js";
export const ErrorCode = {
    VALIDATION_ERROR: "validation_error",
    PERMISSION_DENIED: "permission_denied",
    UNSUPPORTED_CAPABILITY: "unsupported_capability",
    MOHO_NOT_RUNNING: "moho_not_running",
    PLUGIN_NOT_LOADED: "plugin_not_loaded",
    NO_ACTIVE_DOCUMENT: "no_active_document",
    ENTITY_NOT_FOUND: "entity_not_found",
    STALE_EXECUTION_PLAN: "stale_execution_plan",
    CONFIRMATION_REQUIRED: "confirmation_required",
    IPC_TIMEOUT: "ipc_timeout",
    IPC_PROTOCOL_ERROR: "ipc_protocol_error",
    MOHO_API_ERROR: "moho_api_error",
    OPERATION_PARTIALLY_COMPLETED: "operation_partially_completed",
    ROLLBACK_FAILED: "rollback_failed",
    BACKUP_FAILED: "backup_failed",
    RENDER_FAILED: "render_failed",
    UI_AUTOMATION_DISABLED: "ui_automation_disabled",
    PATH_NOT_ALLOWED: "path_not_allowed",
    QUEUE_OVERFLOW: "queue_overflow",
    VERSION_INCOMPATIBLE: "version_incompatible",
    INTERNAL_ERROR: "internal_error",
    REQUEST_CANCELLED: "request_cancelled",
    DUPLICATE_REQUEST: "duplicate_request",
};
const REGISTRY = {
    [ErrorCode.VALIDATION_ERROR]: {
        httpLike: 400,
        retryable: false,
        recoverySuggestion: "Inspect `details` for the failing field and retry with corrected input.",
        category: "input",
    },
    [ErrorCode.PERMISSION_DENIED]: {
        httpLike: 403,
        retryable: false,
        recoverySuggestion: "Set the appropriate environment flag (e.g. MOHO_MCP_ENABLE_SCREENSHOTS) or grant the required permission in MohoMCP configuration.",
        category: "permission",
    },
    [ErrorCode.UNSUPPORTED_CAPABILITY]: {
        httpLike: 409,
        retryable: false,
        recoverySuggestion: "Verify Moho version on moho://upstream/version. Lua API may differ between versions.",
        category: "environment",
    },
    [ErrorCode.MOHO_NOT_RUNNING]: {
        httpLike: 503,
        retryable: true,
        recoverySuggestion: "Launch Moho Pro 14 with the MohoMCP plugin installed and retry.",
        category: "environment",
    },
    [ErrorCode.PLUGIN_NOT_LOADED]: {
        httpLike: 503,
        retryable: true,
        recoverySuggestion: "Open Moho's Scripts menu and activate the MohoMCP Server tool.",
        category: "environment",
    },
    [ErrorCode.NO_ACTIVE_DOCUMENT]: {
        httpLike: 409,
        retryable: true,
        recoverySuggestion: "Open a Moho document and retry.",
        category: "state",
    },
    [ErrorCode.ENTITY_NOT_FOUND]: {
        httpLike: 404,
        retryable: false,
        recoverySuggestion: "Re-query layer/bone ids (mcp tool returns are authoritative; never cache identifiers across operations).",
        category: "state",
    },
    [ErrorCode.STALE_EXECUTION_PLAN]: {
        httpLike: 409,
        retryable: false,
        recoverySuggestion: "Generate a fresh execution plan preview and re-confirm.",
        category: "safety",
    },
    [ErrorCode.CONFIRMATION_REQUIRED]: {
        httpLike: 409,
        retryable: false,
        recoverySuggestion: "Obtain a preview hash from the safety engine and pass it back as `previewHash`.",
        category: "safety",
    },
    [ErrorCode.IPC_TIMEOUT]: {
        httpLike: 504,
        retryable: true,
        recoverySuggestion: "Verify IPC directory exists, `health.json` is fresh, and Moho is in foreground. Retry with backoff.",
        category: "ipc",
    },
    [ErrorCode.IPC_PROTOCOL_ERROR]: {
        httpLike: 502,
        retryable: false,
        recoverySuggestion: "Bridge and plugin protocol versions disagree. Reinstall matching versions.",
        category: "ipc",
    },
    [ErrorCode.MOHO_API_ERROR]: {
        httpLike: 500,
        retryable: true,
        recoverySuggestion: "Inspect `details.method`/`params` echo. Recover by re-reading state; do not retry silently.",
        category: "moho",
    },
    [ErrorCode.OPERATION_PARTIALLY_COMPLETED]: {
        httpLike: 500,
        retryable: false,
        recoverySuggestion: "Inspect `details.completed` and rollback remaining partial state manually.",
        category: "moho",
    },
    [ErrorCode.ROLLBACK_FAILED]: {
        httpLike: 500,
        retryable: false,
        recoverySuggestion: "Restore from pre-operation backup and reload the document.",
        category: "moho",
    },
    [ErrorCode.BACKUP_FAILED]: {
        httpLike: 500,
        retryable: false,
        recoverySuggestion: "Refuses destructive operations until a backup succeeds. Verify disk space and write permissions.",
        category: "system",
    },
    [ErrorCode.RENDER_FAILED]: {
        httpLike: 500,
        retryable: true,
        recoverySuggestion: "Verify render dimensions, available disk space, and Moho render settings. Retry with smaller dimensions.",
        category: "moho",
    },
    [ErrorCode.UI_AUTOMATION_DISABLED]: {
        httpLike: 403,
        retryable: false,
        recoverySuggestion: "MOHO_MCP_ENABLE_UI_AUTOMATION is off by default. Enable explicitly after reviewing UI automation risks.",
        category: "permission",
    },
    [ErrorCode.PATH_NOT_ALLOWED]: {
        httpLike: 403,
        retryable: false,
        recoverySuggestion: "Stay inside the configured allowed directories (mcp resource: moho://configuration).",
        category: "permission",
    },
    [ErrorCode.QUEUE_OVERFLOW]: {
        httpLike: 503,
        retryable: true,
        recoverySuggestion: "Reduce concurrent requests or batch operations. Retry after exponential backoff.",
        category: "system",
    },
    [ErrorCode.VERSION_INCOMPATIBLE]: {
        httpLike: 505,
        retryable: false,
        recoverySuggestion: "Bridge and plugin versions disagree. Update to matching versions.",
        category: "system",
    },
    [ErrorCode.INTERNAL_ERROR]: {
        httpLike: 500,
        retryable: true,
        recoverySuggestion: "Capture diagnostics bundle and report the correlationId.",
        category: "system",
    },
    [ErrorCode.REQUEST_CANCELLED]: {
        httpLike: 499,
        retryable: false,
        recoverySuggestion: "The caller cancelled this request; do not retry the same call without re-issuing it.",
        category: "system",
    },
    [ErrorCode.DUPLICATE_REQUEST]: {
        httpLike: 409,
        retryable: false,
        recoverySuggestion: "An identical idempotency key was already processed. Do not retry with the same key.",
        category: "system",
    },
};
export const ErrorRegistry = Object.freeze(REGISTRY);
export class MohoBridgeError extends Error {
    payload;
    constructor(payload) {
        super(payload.message);
        this.name = "MohoBridgeError";
        this.payload = payload;
        // Without this, `instanceof MohoBridgeError` fails when the class is
        // down-levelled to ES5 by a consumer's build, which would silently turn
        // `isRetryableMohoError` into a constant false and disable all retries.
        Object.setPrototypeOf(this, MohoBridgeError.prototype);
    }
    toJSON() {
        return this.payload;
    }
}
export function buildError(code, message, options = {}) {
    // An unknown code almost always arrives while handling another failure. Throwing
    // here would replace the real error with a meta-error and lose the original
    // context, so degrade to INTERNAL_ERROR and keep the caller's message instead.
    const known = Object.prototype.hasOwnProperty.call(REGISTRY, code);
    const effectiveCode = known ? code : ErrorCode.INTERNAL_ERROR;
    const reg = REGISTRY[effectiveCode];
    const safeMessage = redactString(typeof message === "string" ? message : String(message));
    const baseDetails = options.details ? redactObject(options.details) : undefined;
    const details = known
        ? baseDetails
        : { ...(baseDetails ?? {}), unknownErrorCode: redactString(String(code)) };
    // A negative or non-finite retryAfterMs would make a client's backoff maths
    // produce an immediate hot-retry loop.
    const retryAfterMs = typeof options.retryAfterMs === "number" &&
        Number.isFinite(options.retryAfterMs) &&
        options.retryAfterMs >= 0
        ? Math.floor(options.retryAfterMs)
        : undefined;
    return new MohoBridgeError({
        code: effectiveCode,
        message: safeMessage,
        correlationId: options.correlationId ?? generateCorrelationId(),
        retryable: options.overrideRetryable ?? reg.retryable,
        retryAfterMs,
        recoverySuggestion: options.overrideRecovery ?? reg.recoverySuggestion,
        details,
    });
}
/**
 * Correlation id: timestamp prefix (sortable, useful when grepping logs) plus a
 * CSPRNG suffix. `Math.random()` was previously used; it is seeded per process and
 * can repeat across bridges started in the same millisecond, which makes two
 * different requests indistinguishable in a merged log.
 */
export function generateCorrelationId() {
    return `${Date.now().toString(36)}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
export function isRetryableMohoError(err) {
    if (err instanceof MohoBridgeError)
        return err.payload.retryable;
    return false;
}
/** HTTP-like status for a code, for callers that map errors onto transports. */
export function httpLikeStatus(code) {
    return REGISTRY[code]?.httpLike ?? REGISTRY[ErrorCode.INTERNAL_ERROR].httpLike;
}
