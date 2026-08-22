export type LogLevel = "debug" | "info" | "warn" | "error";
export interface LogFields {
    ts: string;
    level: LogLevel;
    component: string;
    message: string;
    correlationId?: string;
    transactionId?: string;
    durationMs?: number;
    queueDepth?: number;
    mohoPid?: string;
    platform?: NodeJS.Platform;
    pluginVersion?: string;
    protocolVersion?: string;
    bridgeVersion?: string;
    extra?: Record<string, unknown>;
}
export declare function setLogLevel(level: LogLevel): void;
export declare function getLogLevel(): LogLevel;
export interface LogContext {
    correlationId?: string;
    transactionId?: string;
    pluginVersion?: string;
    protocolVersion?: string;
    mohoPid?: string;
}
export declare class Logger {
    readonly component: string;
    private readonly ctx;
    constructor(component: string, ctx?: LogContext);
    child(extra: LogContext): Logger;
    setCorrelationId(correlationId: string): Logger;
    bind(correlationId: string): Logger;
    debug(msg: string, extra?: Record<string, unknown>): void;
    info(msg: string, extra?: Record<string, unknown>): void;
    warn(msg: string, extra?: Record<string, unknown>): void;
    error(msg: string, extra?: Record<string, unknown>): void;
}
/**
 * Attach a file sink. Idempotent: re-attaching closes the previous file.
 *
 * Returns false on failure — and always explains why on stderr, so an operator
 * never believes logs are being persisted when they are not. Refuses any target
 * that is stdout, because that would corrupt the MCP JSON-RPC stream.
 */
export declare function attachFileSink(filePath: string): Promise<boolean>;
export declare function detachFileSink(): Promise<void>;
/** Absolute path of the active file sink, or null when logging to stderr only. */
export declare function getFileSinkPath(): string | null;
export declare const VERSION: string;
