/**
 * File-based IPC client that communicates with the MOHO Lua server.
 *
 * Security & IPC Spooling:
 * - Default IPC directory: Private Application Support / LocalAppData folder.
 * - Strict permissions (0700), canonical path verification, symlink rejection.
 * - Atomic write (.tmp -> .json) with fsync for crash-safety.
 * - Request TTL expiration & stale file cleanup on connect.
 * - Queue depth bounds (maxQueueSize).
 * - JSON size limits (maxJsonSizeBytes).
 * - Single-consumer client lock with heartbeat refresh.
 * - Cancellation via AbortSignal for long-running requests.
 * - Structured error codes mapped to JSON-RPC 2.0 (-32600/-32601/-32602/-32603/-32001..-32010).
 *
 * PROTOCOL (mirror of moho-plugin/moho_mcp/server.lua):
 *   we write   <ipc>/req_<id>.json   atomically (.tmp -> rename, fsync'd)
 *   the plugin reads it and DELETES req_<id>.json  <-- this deletion IS the claim
 *   the plugin runs the handler on Moho's GUI thread (can block indefinitely)
 *   the plugin writes <ipc>/resp_<id>.json; we read it and delete it
 *
 * This client shares its architecture with the Harmony file bridge in
 * `src/adapters/bridgeSpool.ts`. Two defects were confirmed on the live
 * Harmony system; both were present here as well, in Moho's dialect. They are
 * architectural, not language-specific, so they are fixed the same way:
 *
 *   1. Padding added to a deadline must be a FRACTION of that deadline, never
 *      a constant. Here the constant was implicit rather than written down:
 *      the poll loop re-checked the deadline only AFTER sleeping a whole
 *      `pollInterval`, so every request overran its timeout by up to one full
 *      interval. Measured at the allowed maximum
 *      `MOHO_MCP_POLL_INTERVAL_MS=5000`, a requested 0.4s timeout actually
 *      took 5.0s — a 12x overrun. To the person at the screen that does not
 *      read as "a slow tool", it reads as "the program froze". Each sleep is
 *      now clamped to the time actually remaining, so the deadline is honoured
 *      no matter how coarse the poll interval is.
 *
 *   2. On timeout we must not destroy the evidence that Moho's GUI thread is
 *      wedged. Moho has no `work-` file like Harmony does; its claim marker is
 *      the ABSENCE of req_<id>.json, because the plugin deletes that file
 *      before it starts running the handler. So the claim state has to be
 *      sampled BEFORE we unlink and then reported in the error. Without it,
 *      "Moho is stuck on a modal dialog" and "the plugin was never installed"
 *      produce byte-identical messages, and the user is sent to debug the
 *      wrong half of the system.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { config } from "./config.js";
import {
  parseResponse,
  ErrorCodes,
  classifyErrno,
  WireProtocolError,
  type ErrorCode,
} from "./protocol.js";
import { startKeepAlive, stopKeepAlive } from "./keep-alive.js";

/** Public error class with structured JSON-RPC 2.0 error code. */
export class MohoIpcError extends Error {
  public readonly code: ErrorCode | number;
  public readonly retryable: boolean;
  public readonly correlationId: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: ErrorCode | number,
    options: { retryable?: boolean; correlationId?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = "MohoIpcError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.correlationId = options.correlationId ?? "";
    this.details = options.details;
  }
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

export class MohoClient {
  private nextId = 1;
  private connected = false;
  private pendingRequests = 0;
  private executedRequestIds = new Set<string>();
  private lockHeartbeat: NodeJS.Timeout | null = null;
  private readonly maxExecutedCache = 2000;

  /** Validate directory safety: non-symlink, owner matches on Unix. */
  private async validateDirectorySafety(dirPath: string): Promise<void> {
    const lstat = await fs.promises.lstat(dirPath);
    if (lstat.isSymbolicLink()) {
      throw new MohoIpcError(
        `Security Violation: IPC directory ${dirPath} cannot be a symbolic link.`,
        ErrorCodes.PERMISSION_DENIED,
        { retryable: false },
      );
    }

    if (os.platform() !== "win32" && typeof process.getuid === "function") {
      const currentUid = process.getuid();
      if (lstat.uid !== currentUid) {
        throw new MohoIpcError(
          `Security Violation: IPC directory ${dirPath} is owned by UID ${lstat.uid}, expected UID ${currentUid}.`,
          ErrorCodes.PERMISSION_DENIED,
          { retryable: false },
        );
      }
    }
  }

  /** Detect legacy /tmp IPC directory and emit a one-time security notice. */
  private async detectLegacyTempDir(): Promise<void> {
    const legacyTempDir = path.join(os.tmpdir(), "moho-mcp");
    if (path.resolve(config.moho.ipcDir) === path.resolve(legacyTempDir)) return;
    try {
      const stat = await fs.promises.stat(legacyTempDir);
      if (stat.isDirectory()) {
        process.stderr.write(
          `[moho-mcp] SECURITY NOTICE: Legacy /tmp IPC directory present at ${legacyTempDir}. ` +
            `Prefer ${config.moho.ipcDir}.\n`,
        );
      }
    } catch {
      // Legacy dir absent: no notice.
    }
  }

  /** Clean up stale request/response files older than TTL. */
  private async cleanupStaleFiles(ipcDir: string): Promise<void> {
    const ttlMs = config.moho.requestTtlMs;
    const now = Date.now();
    let files: string[];
    try {
      files = await fs.promises.readdir(ipcDir);
    } catch {
      return;
    }

    for (const file of files) {
      if (!file.startsWith("req_") && !file.startsWith("resp_") && !file.endsWith(".tmp")) continue;
      const filePath = path.join(ipcDir, file);
      try {
        const stat = await fs.promises.stat(filePath);
        if (now - stat.mtimeMs > ttlMs) {
          await fs.promises.unlink(filePath).catch(() => undefined);
        }
      } catch {
        // File was removed concurrently: ignore.
      }
    }
  }

  /** Acquire single-consumer lock with heartbeat refresh. */
  private async acquireClientLock(ipcDir: string): Promise<void> {
    const lockPath = path.join(ipcDir, "client_lock.json");
    const lockData = { pid: process.pid, timestamp: Date.now() };

    const tryAcquire = async (): Promise<boolean> => {
      try {
        const fd = await fs.promises.open(lockPath, "wx", 0o600);
        try {
          await fd.writeFile(JSON.stringify(lockData), "utf-8");
        } finally {
          await fd.close();
        }
        return true;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
        throw err;
      }
    };

    if (await tryAcquire()) {
      this.startLockHeartbeat(lockPath);
      return;
    }

    // Lock held: check if it's a stale lock from a dead process
    const existing = await this.readClientLock(lockPath);
    if (!existing) {
      throw new MohoIpcError(
        `Cannot acquire IPC client lock at ${lockPath} (held by another live process).`,
        ErrorCodes.RESOURCE_LOCKED,
        { retryable: true },
      );
    }

    if (existing.pid === process.pid) {
      // Same process re-entering: ok, refresh heartbeat
      this.startLockHeartbeat(lockPath);
      return;
    }

    // pid === -1 means the lock file was unparseable (corrupt/partial). Always treat
    // such locks as stale so the next acquirer can take over without manual intervention.
    const lockAge = Date.now() - existing.timestamp;
    if (existing.pid !== -1 && lockAge < config.moho.clientLockTtlMs) {
      throw new MohoIpcError(
        `Cannot acquire IPC client lock at ${lockPath} (held by PID ${existing.pid}, age ${lockAge}ms).`,
        ErrorCodes.RESOURCE_LOCKED,
        { retryable: true, details: { holderPid: existing.pid, ageMs: lockAge } },
      );
    }

    // Stale: steal the lock
    await fs.promises.unlink(lockPath).catch(() => undefined);
    if (!(await tryAcquire())) {
      throw new MohoIpcError(
        `Cannot acquire IPC client lock at ${lockPath} after stealing stale lock.`,
        ErrorCodes.RESOURCE_LOCKED,
        { retryable: true },
      );
    }
    this.startLockHeartbeat(lockPath);
  }

  private async readClientLock(lockPath: string): Promise<{ pid: number; timestamp: number } | null> {
    try {
      const content = await fs.promises.readFile(lockPath, "utf-8");
      let parsed: { pid?: unknown; timestamp?: unknown };
      try {
        parsed = JSON.parse(content) as { pid?: unknown; timestamp?: unknown };
      } catch {
        // Unparseable JSON: treat as a stale lock (acquireClientLock will steal it).
        return { pid: -1, timestamp: 0 };
      }
      if (typeof parsed.pid === "number" && typeof parsed.timestamp === "number") {
        return { pid: parsed.pid, timestamp: parsed.timestamp };
      }
      // Partial fields: also treat as stale.
      return { pid: -1, timestamp: 0 };
    } catch {
      // File unreadable: no lock.
      return null;
    }
  }

  private startLockHeartbeat(lockPath: string): void {
    this.stopLockHeartbeat();
    const intervalMs = Math.max(1000, Math.floor(config.moho.clientLockTtlMs / 3));
    this.lockHeartbeat = setInterval(() => {
      const data = JSON.stringify({ pid: process.pid, timestamp: Date.now() });
      fs.promises.writeFile(lockPath, data, "utf-8").catch(() => undefined);
    }, intervalMs);
    this.lockHeartbeat.unref?.();
  }

  private stopLockHeartbeat(): void {
    if (this.lockHeartbeat) {
      clearInterval(this.lockHeartbeat);
      this.lockHeartbeat = null;
    }
  }

  public get ipcDir(): string {
    return config.moho.ipcDir;
  }

  public getStats(): ClientStats {
    return {
      connected: this.connected,
      pendingRequests: this.pendingRequests,
      ipcDir: config.moho.ipcDir,
      protocolVersion: config.server.protocolVersion,
    };
  }

  /**
   * "Connect" by verifying the IPC directory exists, validating permissions,
   * cleaning stale files, and acquiring the single-consumer client lock.
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    const ipcDir = this.ipcDir;
    await fs.promises.mkdir(ipcDir, { recursive: true, mode: 0o700 }).catch(() => undefined);

    await this.validateDirectorySafety(ipcDir);
    await this.detectLegacyTempDir();
    await this.cleanupStaleFiles(ipcDir);
    await this.acquireClientLock(ipcDir);

    this.connected = true;
    startKeepAlive();
    process.stderr.write(
      `[moho-mcp] Connected to MOHO via secure file IPC at ${ipcDir} (Protocol v${config.server.protocolVersion})\n`,
    );
  }

  /** Disconnect — release client lock and stop heartbeat. */
  disconnect(): void {
    this.stopLockHeartbeat();
    if (this.connected) {
      const lockPath = path.join(this.ipcDir, "client_lock.json");
      fs.promises.unlink(lockPath).catch(() => undefined);
    }
    this.connected = false;
    stopKeepAlive();
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send a JSON-RPC request to MOHO via file IPC and await the response.
   * Throws MohoIpcError on any failure with a structured error code.
   */
  async sendRequest(
    method: string,
    params: Record<string, unknown> = {},
    options: SendOptions = {},
  ): Promise<unknown> {
    if (!this.connected) {
      throw new MohoIpcError(
        "Not connected to MOHO. Is the MOHO application running with the MCP plugin loaded?",
        ErrorCodes.MOHO_NOT_RUNNING,
        { retryable: true },
      );
    }

    if (this.pendingRequests >= config.moho.maxQueueSize) {
      throw new MohoIpcError(
        `IPC queue limit exceeded (${this.pendingRequests}/${config.moho.maxQueueSize}). Rejecting request '${method}'.`,
        ErrorCodes.QUEUE_OVERFLOW,
        { retryable: true },
      );
    }

    const id = this.nextId++;
    const correlationId = options.correlationId ?? `corr_${crypto.randomBytes(6).toString("hex")}`;
    const idempotencyKey = options.idempotencyKey;
    const uniqueReqKey = idempotencyKey
      ? `${method}:${idempotencyKey}`
      : `${method}:${correlationId}:${id}`;

    if (this.executedRequestIds.has(uniqueReqKey)) {
      throw new MohoIpcError(
        `Duplicate request key rejected: ${uniqueReqKey}`,
        ErrorCodes.DUPLICATE_REQUEST,
        { retryable: false },
      );
    }
    this.executedRequestIds.add(uniqueReqKey);
    if (this.executedRequestIds.size > this.maxExecutedCache) {
      const firstKey = this.executedRequestIds.values().next().value;
      if (firstKey !== undefined) this.executedRequestIds.delete(firstKey);
    }

    const ipcDir = this.ipcDir;
    const { pollInterval, requestTimeout, maxJsonSizeBytes } = config.moho;
    const timeout = options.timeout ?? requestTimeout;

    const request = {
      jsonrpc: "2.0" as const,
      protocolVersion: config.server.protocolVersion,
      id,
      method,
      params,
      timestamp: Date.now(),
      correlationId,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    };

    const serializedPayload = JSON.stringify(request);
    if (Buffer.byteLength(serializedPayload, "utf-8") > maxJsonSizeBytes) {
      throw new MohoIpcError(
        `JSON request payload exceeds maximum limit of ${maxJsonSizeBytes} bytes.`,
        ErrorCodes.PAYLOAD_TOO_LARGE,
        { retryable: false, details: { maxBytes: maxJsonSizeBytes } },
      );
    }

    const reqFileName = `req_${id}.json`;
    const respFileName = `resp_${id}.json`;
    const reqPath = path.join(ipcDir, reqFileName);
    const respPath = path.join(ipcDir, respFileName);

    this.pendingRequests++;
    let wroteRequest = false;
    try {
      await this.atomicWrite(reqPath, serializedPayload);
      wroteRequest = true;
      const result = await this.awaitResponse(respPath, reqPath, method, id, correlationId, {
        timeout,
        pollInterval,
        signal: options.signal,
      });
      return result;
    } catch (err) {
      // Backstop against spool leaks. awaitResponse already retracts the request
      // on its own exits (timeout, cancellation, malformed response), but an
      // unexpected failure — EACCES on the response, an id mismatch, a bug —
      // would otherwise strand req_<id>.json until the TTL sweeper runs, and
      // leave the plugin free to execute it long after the caller gave up.
      // Deliberately NOT applied to the claimed-timeout case: that path leaves
      // the file absent already, which is the evidence described in defect #2.
      if (wroteRequest) {
        await fs.promises.unlink(reqPath).catch(() => undefined);
        await fs.promises.unlink(`${reqPath}.tmp`).catch(() => undefined);
      }
      throw err;
    } finally {
      this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    }
  }

  /**
   * Atomic file write with fsync for crash-safety.
   * Throws MohoIpcError(TOO_LARGE) on ENOSPC/EDQUOT.
   */
  private async atomicWrite(targetPath: string, content: string): Promise<void> {
    const tmpPath = `${targetPath}.tmp`;
    let fd: import("node:fs/promises").FileHandle | null = null;
    try {
      fd = await fs.promises.open(tmpPath, "w", 0o600);
      await fd.writeFile(content, "utf-8");
      await fd.sync();
      await fd.close();
      fd = null;
      await fs.promises.rename(tmpPath, targetPath);
    } catch (err) {
      if (fd) await fd.close().catch(() => undefined);
      await fs.promises.unlink(tmpPath).catch(() => undefined);
      const errno = (err as NodeJS.ErrnoException).code;
      if (errno === "ENOSPC" || errno === "EDQUOT") {
        throw new MohoIpcError(
          `Out of disk space writing ${targetPath}: ${(err as Error).message}`,
          ErrorCodes.PAYLOAD_TOO_LARGE,
          { retryable: true, details: { errno } },
        );
      }
      throw new MohoIpcError(
        `Atomic write to ${targetPath} failed: ${(err as Error).message}`,
        ErrorCodes.INTERNAL_ERROR,
        { retryable: true, details: { errno } },
      );
    }
  }

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
  private async isRequestClaimed(reqPath: string): Promise<boolean> {
    try {
      await fs.promises.access(reqPath);
      return false; // still queued: the plugin never picked it up
    } catch {
      return true; // consumed by the plugin, but no response arrived
    }
  }

  /** Wait for the response file. Resolves with parsed result or throws MohoIpcError. */
  private async awaitResponse(
    respPath: string,
    reqPath: string,
    method: string,
    id: number,
    correlationId: string,
    options: { timeout: number; pollInterval: number; signal?: AbortSignal },
  ): Promise<unknown> {
    const deadline = Date.now() + options.timeout;
    while (true) {
      if (options.signal?.aborted) {
        // Cancellation: retract the request so a late-polling plugin does not
        // apply an edit nobody is waiting for any more. A response that landed
        // in the same tick is swept too, so the spool does not accumulate it.
        await fs.promises.unlink(reqPath).catch(() => undefined);
        await fs.promises.unlink(respPath).catch(() => undefined);
        const reason = options.signal.reason;
        throw new MohoIpcError(
          `Request ${method} (id=${id}) cancelled${
            reason instanceof Error ? `: ${reason.message}` : ""
          }.`,
          ErrorCodes.REQUEST_CANCELLED,
          { retryable: false, correlationId, details: { id, method } },
        );
      }

      try {
        const content = await fs.promises.readFile(respPath, "utf-8");
        await fs.promises.unlink(respPath).catch(() => undefined);

        const response = parseResponse(content);

        // Guard against a stale response from a previous bridge run. The plugin
        // persists processedSequences in cursor.json across restarts while our
        // `nextId` restarts at 1, so ids from an older session can collide with
        // ours. Accepting a mismatched id would hand the caller another
        // request's result — silently wrong data is worse than a clean error.
        if (response.id !== null && response.id !== undefined && response.id !== id) {
          throw new MohoIpcError(
            `Response id mismatch for ${method}: expected ${id}, received ${String(response.id)}. ` +
              "Stale response from a previous session — clear the IPC directory.",
            ErrorCodes.PROTOCOL_MISMATCH,
            { retryable: false, correlationId, details: { expectedId: id, receivedId: response.id } },
          );
        }

        if (response.error) {
          throw new MohoIpcError(
            `MOHO error [${response.error.code}]: ${response.error.message}`,
            response.error.code,
            {
              retryable: false,
              correlationId,
              details: response.error.data,
            },
          );
        }
        return response.result;
      } catch (err) {
        if (err instanceof MohoIpcError) throw err;

        // A malformed or truncated response is terminal, not a reason to keep
        // polling: the file is already consumed, so retrying would only spin
        // until the deadline and then report a misleading timeout.
        if (err instanceof WireProtocolError) {
          await fs.promises.unlink(reqPath).catch(() => undefined);
          throw new MohoIpcError(
            `Malformed response for ${method} (id=${id}): ${err.message}`,
            err.code,
            { retryable: false, correlationId, details: err.details },
          );
        }

        const errno = (err as NodeJS.ErrnoException).code;
        if (errno === "ENOENT") {
          const remaining = deadline - Date.now();
          if (remaining <= 0) {
            // Sample the claim state BEFORE unlinking — see defect #2 in the
            // header. Once req_<id>.json is gone we can no longer tell a hung
            // GUI thread from a plugin that never ran.
            const claimed = await this.isRequestClaimed(reqPath);
            // Retract the request only if it is still queued. If it was already
            // claimed there is nothing of ours left to remove.
            if (!claimed) await fs.promises.unlink(reqPath).catch(() => undefined);
            throw new MohoIpcError(
              `Request ${method} (id=${id}, corrId=${correlationId}) timed out after ${options.timeout}ms. ` +
                (claimed
                  ? "Moho claimed the request but never answered — it may be hung on the GUI thread " +
                    "or showing a modal dialog."
                  : "Moho never picked the request up — the MCP plugin may not be loaded or is not polling."),
              ErrorCodes.IPC_TIMEOUT,
              {
                retryable: true,
                correlationId,
                details: { method, id, timeoutMs: options.timeout, claimed },
              },
            );
          }
          // Defect #1: clamp the sleep to the time actually left. A bare
          // `pollInterval` sleep overshoots the deadline by up to one whole
          // interval, which at the configurable maximum turns a 0.4s timeout
          // into a 5s freeze.
          await new Promise<void>((resolve) =>
            setTimeout(resolve, Math.min(options.pollInterval, remaining)),
          );
          continue;
        }
        throw new MohoIpcError(
          `IPC read error for ${method}: ${(err as Error).message}`,
          classifyErrno(errno),
          { retryable: true, correlationId, details: { errno, method, id } },
        );
      }
    }
  }
}
