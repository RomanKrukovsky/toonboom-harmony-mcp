/** Bridge runtime configuration. Frozen so downstream code can rely on immutability. */
export declare const config: Readonly<{
    moho: Readonly<{
        ipcDir: string;
        pollInterval: number;
        requestTimeout: number;
        renderTimeout: number;
        batchTimeoutPerOp: number;
        maxBatchSize: number;
        maxQueueSize: number;
        maxJsonSizeBytes: number;
        requestTtlMs: number;
        previewTtlMs: number;
        clientLockTtlMs: number;
        enableLegacyAliases: boolean;
        enableScreenshots: boolean;
        enableUiAutomation: boolean;
        logFile: string;
    }>;
    server: Readonly<{
        name: "moho-mcp";
        version: string;
        protocolVersion: string;
        minProtocolVersion: string;
        maxProtocolVersion: string;
    }>;
    security: Readonly<{
        allowedDirectories: string[];
        noOutboundTraffic: boolean;
        auditLogPath: string;
    }>;
    uiAutomation: Readonly<{
        enabled: boolean;
        rateLimitPerSec: number;
        emergencyStopKey: "Ctrl+Alt+Shift+X";
        enforceForeground: true;
        boundedByMohoWindow: true;
        auditLog: string;
    }>;
}>;
/**
 * Create the IPC directory with private permissions. Idempotent.
 *
 * This is the module's only filesystem side effect and is intentionally kept
 * out of module load, so importing the config never touches disk. Callers
 * invoke it explicitly once they know Moho is the active host.
 *
 * Mode 0o700 is the security boundary: the IPC directory carries request and
 * response payloads, so it must not be group- or world-readable. Note that
 * `mkdir` does not tighten an existing directory's mode; `MohoClient.connect()`
 * separately validates ownership and permissions of a pre-existing directory.
 */
export declare function ensureIpcDir(): Promise<string>;
