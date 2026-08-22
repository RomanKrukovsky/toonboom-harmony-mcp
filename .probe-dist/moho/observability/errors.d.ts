export declare const ErrorCode: {
    readonly VALIDATION_ERROR: "validation_error";
    readonly PERMISSION_DENIED: "permission_denied";
    readonly UNSUPPORTED_CAPABILITY: "unsupported_capability";
    readonly MOHO_NOT_RUNNING: "moho_not_running";
    readonly PLUGIN_NOT_LOADED: "plugin_not_loaded";
    readonly NO_ACTIVE_DOCUMENT: "no_active_document";
    readonly ENTITY_NOT_FOUND: "entity_not_found";
    readonly STALE_EXECUTION_PLAN: "stale_execution_plan";
    readonly CONFIRMATION_REQUIRED: "confirmation_required";
    readonly IPC_TIMEOUT: "ipc_timeout";
    readonly IPC_PROTOCOL_ERROR: "ipc_protocol_error";
    readonly MOHO_API_ERROR: "moho_api_error";
    readonly OPERATION_PARTIALLY_COMPLETED: "operation_partially_completed";
    readonly ROLLBACK_FAILED: "rollback_failed";
    readonly BACKUP_FAILED: "backup_failed";
    readonly RENDER_FAILED: "render_failed";
    readonly UI_AUTOMATION_DISABLED: "ui_automation_disabled";
    readonly PATH_NOT_ALLOWED: "path_not_allowed";
    readonly QUEUE_OVERFLOW: "queue_overflow";
    readonly VERSION_INCOMPATIBLE: "version_incompatible";
    readonly INTERNAL_ERROR: "internal_error";
    readonly REQUEST_CANCELLED: "request_cancelled";
    readonly DUPLICATE_REQUEST: "duplicate_request";
};
export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
export interface MohoErrorPayload {
    code: ErrorCodeValue;
    message: string;
    correlationId: string;
    retryable: boolean;
    recoverySuggestion: string;
    details?: Record<string, unknown>;
    retryAfterMs?: number;
}
interface ErrorCategoryMeta {
    httpLike: number;
    retryable: boolean;
    recoverySuggestion: string;
    category: "input" | "permission" | "environment" | "state" | "safety" | "ipc" | "moho" | "system";
}
export declare const ErrorRegistry: Readonly<Record<ErrorCodeValue, ErrorCategoryMeta>>;
export declare class MohoBridgeError extends Error {
    readonly payload: MohoErrorPayload;
    constructor(payload: MohoErrorPayload);
    toJSON(): MohoErrorPayload;
}
export declare function buildError(code: ErrorCodeValue, message: string, options?: {
    correlationId?: string;
    details?: Record<string, unknown>;
    retryAfterMs?: number;
    overrideRetryable?: boolean;
    overrideRecovery?: string;
}): MohoBridgeError;
/**
 * Correlation id: timestamp prefix (sortable, useful when grepping logs) plus a
 * CSPRNG suffix. `Math.random()` was previously used; it is seeded per process and
 * can repeat across bridges started in the same millisecond, which makes two
 * different requests indistinguishable in a merged log.
 */
export declare function generateCorrelationId(): string;
export declare function isRetryableMohoError(err: unknown): boolean;
/** HTTP-like status for a code, for callers that map errors onto transports. */
export declare function httpLikeStatus(code: ErrorCodeValue): number;
export {};
