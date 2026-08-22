import { type ErrorCode } from "./protocol.js";
/** Public error class with structured JSON-RPC 2.0 error code. */
export declare class MohoIpcError extends Error {
    readonly code: ErrorCode | number;
    readonly retryable: boolean;
    readonly correlationId: string;
    readonly details?: unknown;
    constructor(message: string, code: ErrorCode | number, options?: {
        retryable?: boolean;
        correlationId?: string;
        details?: unknown;
    });
}
interface SendOptions {
    timeout?: number;
    correlationId?: string;
    idempotencyKey?: string;
    signal?: AbortSignal;
}
interface ClientStats {
    connected: boolean;
    pendingRequests: number;
    ipcDir: string;
    protocolVersion: string;
}
export declare class MohoClient {
    private nextId;
    private connected;
    private pendingRequests;
    private executedRequestIds;
    private lockHeartbeat;
    private readonly maxExecutedCache;
    /** Validate directory safety: non-symlink, owner matches on Unix. */
    private validateDirectorySafety;
    /** Detect legacy /tmp IPC directory and emit a one-time security notice. */
    private detectLegacyTempDir;
    /** Clean up stale request/response files older than TTL. */
    private cleanupStaleFiles;
    /** Acquire single-consumer lock with heartbeat refresh. */
    private acquireClientLock;
    private readClientLock;
    private startLockHeartbeat;
    private stopLockHeartbeat;
    get ipcDir(): string;
    getStats(): ClientStats;
    /**
     * "Connect" by verifying the IPC directory exists, validating permissions,
     * cleaning stale files, and acquiring the single-consumer client lock.
     */
    connect(): Promise<void>;
    /** Disconnect — release client lock and stop heartbeat. */
    disconnect(): void;
    isConnected(): boolean;
    /**
     * Send a JSON-RPC request to MOHO via file IPC and await the response.
     * Throws MohoIpcError on any failure with a structured error code.
     */
    sendRequest(method: string, params?: Record<string, unknown>, options?: SendOptions): Promise<unknown>;
    /**
     * Atomic file write with fsync for crash-safety.
     * Throws MohoIpcError(TOO_LARGE) on ENOSPC/EDQUOT.
     */
    private atomicWrite;
    /**
     * Has the plugin claimed this request?
     *
     * Moho's claim marker is the ABSENCE of req_<id>.json: the plugin reads the
     * file and unlinks it before invoking the handler (see server.lua poll loop,
     * `readFile(reqPath); unlinkSafe(reqPath)`). So "req gone, resp not yet
     * written" is the Moho equivalent of Harmony's orphaned `work-` file, and it
     * is the only in-band evidence that Moho took the job and then wedged.
     *
     * This MUST be sampled before the timeout path unlinks anything, otherwise
     * the distinction is destroyed along with the file.
     */
    private isRequestClaimed;
    /** Wait for the response file. Resolves with parsed result or throws MohoIpcError. */
    private awaitResponse;
}
export {};
