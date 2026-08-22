/**
 * JSON-RPC 2.0 types and helpers for communication with the MOHO Lua server.
 * Messages are framed as newline-delimited JSON files on disk.
 *
 * The wire protocol version lives in `protocol-version.ts`. Every request and
 * response must include `protocolVersion` (string semver) so that mismatched
 * bridge/plugin versions refuse to negotiate rather than silently mis-parse.
 */
export interface JsonRpcRequest {
    jsonrpc: "2.0";
    /** Wire-protocol version (semver string), e.g. "1.1.0". */
    protocolVersion: string;
    /** Per-call sequence number, scoped to the bridge process. */
    id: number;
    method: string;
    params?: Record<string, unknown>;
    /** ISO timestamp at request creation (informational only — TTL uses file mtime). */
    timestamp: number;
    /** Optional correlation id propagated into structured logs. Always present for new clients. */
    correlationId?: string;
    /** Idempotency key — clients can replay safely. */
    idempotencyKey?: string;
}
export interface JsonRpcError {
    code: number;
    message: string;
    data?: unknown;
}
export interface JsonRpcResponse {
    jsonrpc: "2.0";
    protocolVersion: string;
    id: number | null;
    result?: unknown;
    error?: JsonRpcError;
    correlationId?: string;
}
/**
 * Wire-protocol error codes.
 *
 * Standard JSON-RPC 2.0 range (-32700..-32000) plus application-specific
 * extension range (-32001..-32099).
 */
export declare const ErrorCodes: {
    readonly PARSE_ERROR: -32700;
    readonly INVALID_REQUEST: -32600;
    readonly METHOD_NOT_FOUND: -32601;
    readonly INVALID_PARAMS: -32602;
    readonly INTERNAL_ERROR: -32603;
    readonly NO_DOCUMENT: -32001;
    readonly LAYER_NOT_FOUND: -32002;
    readonly BONE_NOT_FOUND: -32003;
    readonly INVALID_FRAME: -32004;
    readonly VERSION_INCOMPATIBLE: -32005;
    readonly PROTOCOL_MISMATCH: -32006;
    readonly TOO_LARGE: -32007;
    readonly DUPLICATE_REQUEST: -32008;
    readonly RATE_LIMITED: -32009;
    readonly MOHO_ERROR: -32010;
    readonly QUEUE_OVERFLOW: -32011;
    readonly RESOURCE_LOCKED: -32012;
    readonly PAYLOAD_TOO_LARGE: -32013;
    readonly REQUEST_CANCELLED: -32014;
    readonly MOHO_NOT_RUNNING: -32015;
    readonly PROTOCOL_VERSION_MISSING: -32016;
    readonly PERMISSION_DENIED: -32017;
    readonly IPC_TIMEOUT: -32018;
    readonly INTERNAL: -32019;
    readonly UNKNOWN: -32099;
};
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
export declare function createRequest(id: number, method: string, params: Record<string, unknown>, options?: {
    protocolVersion: string;
    correlationId?: string;
    idempotencyKey?: string;
}): string;
export declare class WireProtocolError extends Error {
    readonly code: ErrorCode | number;
    readonly details?: unknown;
    constructor(message: string, code: ErrorCode | number, details?: unknown);
}
/** Classify an errno code into a MohoIpcError sub-type. */
export declare function classifyErrno(code: string | undefined): ErrorCode;
export declare function parseResponse(data: string): JsonRpcResponse;
