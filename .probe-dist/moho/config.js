/**
 * Moho host configuration.
 *
 * SCOPE. This file configures the Moho host only. It is not the configuration
 * of the server as a whole: `src/config.ts` holds the Harmony host
 * configuration and is an independent module. Neither imports the other, and
 * their environment namespaces do not overlap (`MOHO_*` here, `HARMONY_*`
 * there), so both can coexist in one process without interfering.
 *
 * WHEN THIS LOADS. Per the universal-MCP contract the active host is fixed once
 * at startup via `ANIM_HOST`, and exactly one tool set is served. Under
 * `ANIM_HOST=harmony` nothing should reach this module, so the values below
 * must never be treated as process-wide defaults.
 *
 * IMPORT SAFETY (invariant — do not break). Loading this module must stay free
 * of observable side effects: it only reads `process.env` and computes path
 * strings. It creates no directories, opens no files, and starts no timers.
 * Directory creation is deferred to `ensureIpcDir()`, which callers invoke
 * explicitly. Keep it that way — a side effect here would fire even on
 * Harmony-only runs that merely reach this file transitively.
 *
 * Environment variables are read exactly once at module load. Unparseable or
 * out-of-range numeric values fall back to their default rather than throwing,
 * so one bad variable degrades a single setting instead of taking the server
 * down. Downstream code consumes a frozen object.
 *
 * DOTENV. `.env` is loaded by `src/config.ts` via dotenv, not here. Every
 * `MOHO_*` variable is therefore expected from the real process environment
 * (the `env` block of the MCP client config); a `MOHO_*` entry placed in `.env`
 * would only take effect if the Harmony config happened to load first, so it
 * should not be relied on.
 */
import os from "node:os";
import path from "node:path";
import { CURRENT as PROTOCOL_VERSION, MIN_SUPPORTED, MAX_SUPPORTED } from "./protocol-version.js";
/** Read an env var, trimming and returning undefined for empty values. */
function readEnv(name) {
    const raw = process.env[name];
    if (raw === undefined || raw === null)
        return undefined;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? undefined : trimmed;
}
/** Read an env var as a non-negative integer, with a default fallback. */
function readInt(name, fallback, min, max) {
    const raw = readEnv(name);
    if (raw === undefined)
        return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max)
        return fallback;
    return parsed;
}
/** Read a boolean env var. Accepted truthy: "1", "true", "yes", "on" (case-insensitive). */
function readBool(name, fallback) {
    const raw = readEnv(name);
    if (raw === undefined)
        return fallback;
    const lower = raw.toLowerCase();
    if (lower === "1" || lower === "true" || lower === "yes" || lower === "on")
        return true;
    if (lower === "0" || lower === "false" || lower === "no" || lower === "off")
        return false;
    return fallback;
}
/**
 * Resolve the IPC directory. Primary is the user-private OS path.
 *
 * TWO NAMES, DELIBERATE ORDER. `MOHO_IPC_DIR` is checked first and
 * `MOHO_MCP_IPC_DIR` second. Both are honoured because both are in live use:
 * the bridge tests drive `MOHO_IPC_DIR`, while `MOHO_MCP_IPC_DIR` is what the
 * installed Claude client config actually sets (currently `/tmp/moho-mcp`), so
 * dropping either name would break a real caller.
 *
 * The order MUST match `getIpcDir()` in `moho-plugin/moho_mcp/server.lua`,
 * which resolves the same pair in the same sequence. If the two sides disagree
 * when both variables are set, they pick different directories and the plugin
 * silently stops answering — requests are written where nobody reads them.
 * Change one side only if you change the other in the same commit.
 *
 * Note that `/tmp/moho-mcp` is world-traversable and is the path
 * `MohoClient.detectLegacyTempDir()` flags as a legacy location; the private
 * per-user default returned below is preferred when no override is set.
 */
function resolveIpcDir() {
    const override = readEnv("MOHO_IPC_DIR") ?? readEnv("MOHO_MCP_IPC_DIR");
    if (override)
        return override;
    const platform = os.platform();
    if (platform === "darwin") {
        return path.join(os.homedir(), "Library", "Application Support", "MohoMCP", "ipc");
    }
    if (platform === "win32") {
        const localAppData = readEnv("LOCALAPPDATA") ?? path.join(os.homedir(), "AppData", "Local");
        return path.join(localAppData, "MohoMCP", "ipc");
    }
    return path.join(os.homedir(), ".moho_mcp", "ipc");
}
/**
 * Validate the negotiated protocol versions are well-formed.
 *
 * This is the one place in the module that can throw, and it runs at import
 * time (see the call below). That is intentional: the operands are the
 * compile-time constants from `protocol-version.js`, never user input, so a
 * failure means the bridge itself was built with a malformed version and must
 * fail loudly rather than negotiate garbage with the plugin. It cannot be
 * tripped by a misconfigured environment.
 */
function validateProtocolVersions() {
    // Accept "1.0.0", "1.0", "1.0.x", "1.0.0-rc.1", etc. — any 2 or 3 numeric segments
    // optionally followed by .x or pre-release suffix. We only require the major.minor.
    const semver = /^\d+\.\d+(\.\d+)?([-.+].*)?$/;
    if (!semver.test(PROTOCOL_VERSION) || !semver.test(MIN_SUPPORTED) || !semver.test(MAX_SUPPORTED)) {
        throw new Error(`Invalid protocol version configuration: current=${PROTOCOL_VERSION}, min=${MIN_SUPPORTED}, max=${MAX_SUPPORTED}`);
    }
    return { current: PROTOCOL_VERSION, min: MIN_SUPPORTED, max: MAX_SUPPORTED };
}
// Runs at import. Throws only on a malformed build constant, never on bad env
// input — so importing this module under any environment is safe.
const protocols = validateProtocolVersions();
/** Bridge runtime configuration. Frozen so downstream code can rely on immutability. */
export const config = Object.freeze({
    moho: Object.freeze({
        ipcDir: resolveIpcDir(),
        pollInterval: readInt("MOHO_MCP_POLL_INTERVAL_MS", 100, 10, 5000),
        requestTimeout: readInt("MOHO_MCP_REQUEST_TIMEOUT_MS", 10_000, 1000, 300_000),
        renderTimeout: readInt("MOHO_MCP_RENDER_TIMEOUT_MS", 30_000, 1000, 600_000),
        batchTimeoutPerOp: readInt("MOHO_MCP_BATCH_TIMEOUT_PER_OP_MS", 500, 50, 60_000),
        maxBatchSize: readInt("MOHO_MCP_MAX_BATCH_SIZE", 50, 1, 500),
        maxQueueSize: readInt("MOHO_MCP_MAX_QUEUE_SIZE", 50, 1, 1000),
        maxJsonSizeBytes: readInt("MOHO_MCP_MAX_JSON_SIZE_BYTES", 10 * 1024 * 1024, 1024, 64 * 1024 * 1024),
        requestTtlMs: readInt("MOHO_MCP_REQUEST_TTL_MS", 30_000, 1000, 600_000),
        previewTtlMs: readInt("MOHO_MCP_PREVIEW_TTL_MS", 60_000, 1000, 600_000),
        clientLockTtlMs: readInt("MOHO_MCP_CLIENT_LOCK_TTL_MS", 5_000, 1000, 60_000),
        enableLegacyAliases: readBool("MOHO_MCP_ENABLE_LEGACY_ALIASES", false),
        enableScreenshots: readBool("MOHO_MCP_ENABLE_SCREENSHOTS", false),
        enableUiAutomation: readBool("MOHO_MCP_ENABLE_UI_AUTOMATION", false),
        logFile: readEnv("MOHO_MCP_LOG_FILE") ?? "",
    }),
    server: Object.freeze({
        // Identifies the Moho host inside the shared server; it is not the MCP
        // server name advertised to the client (`src/index.ts` owns that).
        name: "moho-mcp",
        // Bridge version reported in handshakes and logs. Inherited from the
        // standalone moho-mcp-server repo, so it is deliberately independent of
        // this project's package.json version and does not track it.
        version: readEnv("MOHO_MCP_VERSION") ?? "0.2.0",
        protocolVersion: protocols.current,
        minProtocolVersion: protocols.min,
        maxProtocolVersion: protocols.max,
    }),
    security: Object.freeze({
        allowedDirectories: (() => {
            const raw = readEnv("MOHO_MCP_ALLOWED_DIRS");
            return raw ? raw.split(path.delimiter).filter(Boolean) : [];
        })(),
        noOutboundTraffic: readBool("MOHO_MCP_NO_OUTBOUND_TRAFFIC", true),
        auditLogPath: readEnv("MOHO_MCP_AUDIT_LOG") ?? path.join(os.homedir(), ".moho_mcp", "audit.log"),
    }),
    uiAutomation: Object.freeze({
        enabled: readBool("MOHO_MCP_ENABLE_UI_AUTOMATION", false),
        rateLimitPerSec: readInt("MOHO_MCP_UI_AUTOMATION_RATE_PER_SEC", 10, 1, 60),
        emergencyStopKey: "Ctrl+Alt+Shift+X",
        enforceForeground: true,
        boundedByMohoWindow: true,
        auditLog: readEnv("MOHO_MCP_UI_AUDIT_LOG") ?? "",
    }),
});
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
export async function ensureIpcDir() {
    await (await import("node:fs/promises")).mkdir(config.moho.ipcDir, {
        recursive: true,
        mode: 0o700,
    });
    return config.moho.ipcDir;
}
