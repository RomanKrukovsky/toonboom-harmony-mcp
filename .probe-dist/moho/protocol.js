/**
 * JSON-RPC 2.0 types and helpers for communication with the MOHO Lua server.
 * Messages are framed as newline-delimited JSON files on disk.
 *
 * The wire protocol version lives in `protocol-version.ts`. Every request and
 * response must include `protocolVersion` (string semver) so that mismatched
 * bridge/plugin versions refuse to negotiate rather than silently mis-parse.
 */
/**
 * Wire-protocol error codes.
 *
 * Standard JSON-RPC 2.0 range (-32700..-32000) plus application-specific
 * extension range (-32001..-32099).
 */
export const ErrorCodes = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    // Application-specific
    NO_DOCUMENT: -32001,
    LAYER_NOT_FOUND: -32002,
    BONE_NOT_FOUND: -32003,
    INVALID_FRAME: -32004,
    VERSION_INCOMPATIBLE: -32005,
    PROTOCOL_MISMATCH: -32006,
    TOO_LARGE: -32007,
    DUPLICATE_REQUEST: -32008,
    RATE_LIMITED: -32009,
    MOHO_ERROR: -32010,
    QUEUE_OVERFLOW: -32011,
    RESOURCE_LOCKED: -32012,
    PAYLOAD_TOO_LARGE: -32013,
    REQUEST_CANCELLED: -32014,
    MOHO_NOT_RUNNING: -32015,
    PROTOCOL_VERSION_MISSING: -32016,
    PERMISSION_DENIED: -32017,
    IPC_TIMEOUT: -32018,
    INTERNAL: -32019,
    UNKNOWN: -32099,
};
export function createRequest(id, method, params, options = {
    protocolVersion: "1.1.0",
}) {
    const request = {
        jsonrpc: "2.0",
        protocolVersion: options.protocolVersion,
        id,
        method,
        params,
        timestamp: Date.now(),
        correlationId: options.correlationId,
        idempotencyKey: options.idempotencyKey,
    };
    return JSON.stringify(request) + "\n";
}
export class WireProtocolError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = "WireProtocolError";
        this.code = code;
        this.details = details;
    }
}
/** Classify an errno code into a MohoIpcError sub-type. */
export function classifyErrno(code) {
    switch (code) {
        case "ENOENT":
            return ErrorCodes.PARSE_ERROR;
        case "EACCES":
        case "EPERM":
            return ErrorCodes.RESOURCE_LOCKED;
        case "ENOSPC":
        case "EDQUOT":
            return ErrorCodes.PAYLOAD_TOO_LARGE;
        case "EBUSY":
            return ErrorCodes.RATE_LIMITED;
        case "EAGAIN":
            return ErrorCodes.RATE_LIMITED;
        case "ETIMEDOUT":
            return ErrorCodes.IPC_TIMEOUT;
        default:
            return ErrorCodes.INTERNAL_ERROR;
    }
}
export function parseResponse(data) {
    const trimmed = data.trim();
    if (trimmed.length === 0) {
        throw new WireProtocolError("Empty response from MOHO server", ErrorCodes.PARSE_ERROR);
    }
    let parsed;
    try {
        parsed = JSON.parse(trimmed);
    }
    catch {
        throw new WireProtocolError(`Invalid JSON from MOHO server: ${trimmed.slice(0, 200)}`, ErrorCodes.PARSE_ERROR);
    }
    if (typeof parsed !== "object" || parsed === null) {
        throw new WireProtocolError("MOHO server response is not a JSON object", ErrorCodes.INVALID_REQUEST);
    }
    const obj = parsed;
    if (obj.jsonrpc !== "2.0") {
        throw new WireProtocolError(`Unexpected jsonrpc version: ${String(obj.jsonrpc ?? "missing")}`, ErrorCodes.INVALID_REQUEST);
    }
    if (typeof obj.protocolVersion !== "string") {
        throw new WireProtocolError("MOHO response missing protocolVersion", ErrorCodes.PROTOCOL_VERSION_MISSING);
    }
    return obj;
}
