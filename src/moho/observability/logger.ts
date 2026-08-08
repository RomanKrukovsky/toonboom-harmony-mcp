/**
 * Structured JSON logger for MohoMCP bridge.
 *
 * - Stdio purity: goes to stderr (or file). NEVER writes to stdout — stdout
 *   is reserved for MCP JSON-RPC framing. A single stray byte on stdout
 *   corrupts the protocol stream and the client drops the connection.
 * - One JSON object per line. Predetermined schema. No dynamic keys.
 * - Correlation ID is propagated through every entry in a request's lifetime.
 * - Sensitive content is redacted through `redaction.ts`.
 * - File sink is opened via `node:fs`, never `require`.
 *
 * Invariants that must not be broken:
 * - `sinks` contains stderr only. `process.stdout` must never be added, and
 *   `attachFileSink` refuses any path that resolves to the same file/device as
 *   stdout (e.g. `/dev/stdout`, or a shell redirect of stdout to a log file).
 * - `emit()` never throws. A logging call must not be able to break the caller,
 *   so serialization failures degrade to a minimal fallback line.
 */
import { promises as fs, openSync, closeSync, writeSync, fstatSync, type Stats } from "node:fs";
import path from "node:path";

import { redactObject, redactString } from "./redaction.js";
import { config } from "../config.js";

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

const BRIDGE_VERSION = config.server.version;

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** Minimum level to emit. Defaults to "debug" so existing behaviour is unchanged. */
function resolveMinLevel(): LogLevel {
  const raw = process.env.MOHO_MCP_LOG_LEVEL?.trim().toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return "debug";
}

let minLevel: LogLevel = resolveMinLevel();

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

export function getLogLevel(): LogLevel {
  return minLevel;
}

/**
 * Stream sinks. stderr only, by construction — never push `process.stdout` here.
 * Typed as the minimal writable surface we use so tests can substitute a stub.
 */
interface LineSink {
  write(chunk: string): unknown;
}

const sinks: LineSink[] = [process.stderr];

let fileSinkFd: number | null = null;
let fileSinkPath: string | null = null;
/** Serializes attach/detach so concurrent calls cannot leak a descriptor. */
let sinkMutex: Promise<unknown> = Promise.resolve();

/** Paths that are stdout (or an alias of it) under any supported platform. */
const STDOUT_ALIASES = new Set([
  "/dev/stdout",
  "/dev/fd/1",
  "/proc/self/fd/1",
  "/dev/console",
  "conout$",
  "\\\\.\\conout$",
]);

function nowIso(): string {
  return new Date().toISOString();
}

/** Last-resort diagnostic that bypasses the sink list. stderr only, never throws. */
function emitInternalDiagnostic(message: string): void {
  try {
    process.stderr.write(
      JSON.stringify({
        ts: nowIso(),
        level: "error",
        component: "logger",
        message: redactString(message),
        bridgeVersion: BRIDGE_VERSION,
      }) + "\n",
    );
  } catch {
    /* stderr itself is gone; nothing left to do */
  }
}

function buildLine(fields: LogFields): string {
  return JSON.stringify({
    ts: fields.ts,
    level: fields.level,
    component: fields.component,
    message: redactString(fields.message),
    correlationId: fields.correlationId,
    transactionId: fields.transactionId,
    durationMs: fields.durationMs,
    queueDepth: fields.queueDepth,
    mohoPid: fields.mohoPid,
    platform: fields.platform,
    pluginVersion: fields.pluginVersion,
    protocolVersion: fields.protocolVersion,
    bridgeVersion: fields.bridgeVersion,
    extra: fields.extra ? redactObject(fields.extra) : undefined,
  });
}

/**
 * Serialize a line, degrading gracefully. `redactObject` already neutralises
 * BigInt and cycles, but a hostile getter or exotic `toJSON` can still throw —
 * and a throw here would propagate into the caller's business logic.
 */
function buildLineSafe(fields: LogFields): string {
  try {
    return buildLine(fields);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    try {
      return JSON.stringify({
        ts: fields.ts,
        level: fields.level,
        component: fields.component,
        message: redactString(fields.message),
        correlationId: fields.correlationId,
        bridgeVersion: BRIDGE_VERSION,
        extra: { serializationError: redactString(reason) },
      });
    } catch {
      return `{"ts":"${fields.ts}","level":"error","component":"logger","message":"log serialization failed"}`;
    }
  }
}

/** writeSync may perform a short write on pipes; loop until the buffer is drained. */
function writeAllSync(fd: number, text: string): void {
  const buf = Buffer.from(text, "utf8");
  let offset = 0;
  while (offset < buf.length) {
    const written = writeSync(fd, buf, offset, buf.length - offset);
    if (written <= 0) break; // cannot make progress; drop the remainder
    offset += written;
  }
}

function emit(fields: LogFields): void {
  if (LEVEL_ORDER[fields.level] < LEVEL_ORDER[minLevel]) return;
  let line: string;
  try {
    line = buildLineSafe(fields) + "\n";
  } catch {
    return; // nothing sensible left to write
  }
  for (const s of sinks) {
    try {
      s.write(line);
    } catch {
      /* never let a sink failure crash the bridge (EPIPE on a closed stderr) */
    }
  }
  if (fileSinkFd !== null) {
    try {
      writeAllSync(fileSinkFd, line);
    } catch {
      /* file sink may have been closed or the disk is full; drop the entry */
    }
  }
}

export interface LogContext {
  correlationId?: string;
  transactionId?: string;
  pluginVersion?: string;
  protocolVersion?: string;
  mohoPid?: string;
}

export class Logger {
  constructor(public readonly component: string, private readonly ctx: LogContext = {}) {}

  public child(extra: LogContext): Logger {
    return new Logger(this.component, { ...this.ctx, ...extra });
  }

  public setCorrelationId(correlationId: string): Logger {
    return new Logger(this.component, { ...this.ctx, correlationId });
  }

  public bind(correlationId: string): Logger {
    return new Logger(this.component, { ...this.ctx, correlationId });
  }

  public debug(msg: string, extra?: Record<string, unknown>): void {
    emit({ ts: nowIso(), level: "debug", component: this.component, message: msg, ...this.ctx, extra });
  }

  public info(msg: string, extra?: Record<string, unknown>): void {
    emit({ ts: nowIso(), level: "info", component: this.component, message: msg, ...this.ctx, extra });
  }

  public warn(msg: string, extra?: Record<string, unknown>): void {
    emit({ ts: nowIso(), level: "warn", component: this.component, message: msg, ...this.ctx, extra });
  }

  public error(msg: string, extra?: Record<string, unknown>): void {
    emit({ ts: nowIso(), level: "error", component: this.component, message: msg, ...this.ctx, extra });
  }
}

/** True when `filePath` is a textual alias of stdout. */
function isStdoutAliasPath(filePath: string): boolean {
  const normalized = filePath.trim().replace(/\\/g, "/").toLowerCase();
  if (STDOUT_ALIASES.has(normalized)) return true;
  if (STDOUT_ALIASES.has(normalized.replace(/\//g, "\\"))) return true;
  return false;
}

/**
 * True when `fd` refers to the same file or device as stdout. Catches
 * `node server.js > run.log` followed by `MOHO_MCP_LOG_FILE=run.log`, which the
 * path check alone cannot see.
 */
function pointsAtStdout(fd: number): boolean {
  let ours: Stats;
  let out: Stats;
  try {
    ours = fstatSync(fd);
    out = fstatSync(1);
  } catch {
    return false; // cannot compare (stdout closed); path check already ran
  }
  if (ours.dev === 0 && ours.ino === 0) return false; // unidentifiable; avoid false positive
  return ours.dev === out.dev && ours.ino === out.ino;
}

/**
 * Attach a file sink. Idempotent: re-attaching closes the previous file.
 *
 * Returns false on failure — and always explains why on stderr, so an operator
 * never believes logs are being persisted when they are not. Refuses any target
 * that is stdout, because that would corrupt the MCP JSON-RPC stream.
 */
export async function attachFileSink(filePath: string): Promise<boolean> {
  const run = sinkMutex.then(async (): Promise<boolean> => {
    await detachFileSinkUnlocked();

    if (typeof filePath !== "string" || filePath.trim().length === 0) {
      emitInternalDiagnostic("attachFileSink refused: empty log file path");
      return false;
    }
    const resolved = path.resolve(filePath);
    if (isStdoutAliasPath(filePath) || isStdoutAliasPath(resolved)) {
      emitInternalDiagnostic(
        `attachFileSink refused: ${filePath} resolves to stdout, which is reserved for the MCP protocol stream. Logs stay on stderr.`,
      );
      return false;
    }

    let fd: number | null = null;
    try {
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      // 0o600: log lines may embed operational detail; keep them owner-only.
      fd = openSync(resolved, "a", 0o600);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      emitInternalDiagnostic(`attachFileSink failed for ${resolved}: ${reason}. Logs stay on stderr only.`);
      if (fd !== null) {
        try {
          closeSync(fd);
        } catch {
          /* ignore */
        }
      }
      fileSinkFd = null;
      fileSinkPath = null;
      return false;
    }

    if (pointsAtStdout(fd)) {
      try {
        closeSync(fd);
      } catch {
        /* ignore */
      }
      emitInternalDiagnostic(
        `attachFileSink refused: ${resolved} is the same file as stdout, which is reserved for the MCP protocol stream. Logs stay on stderr.`,
      );
      fileSinkFd = null;
      fileSinkPath = null;
      return false;
    }

    fileSinkFd = fd;
    fileSinkPath = resolved;
    return true;
  });

  // Keep the chain alive even if this attach rejected, so later calls still run.
  sinkMutex = run.catch(() => undefined);
  return run;
}

function detachFileSinkUnlocked(): void {
  if (fileSinkFd !== null) {
    try {
      closeSync(fileSinkFd);
    } catch {
      /* ignore */
    }
    fileSinkFd = null;
    fileSinkPath = null;
  }
}

export async function detachFileSink(): Promise<void> {
  const run = sinkMutex.then(() => detachFileSinkUnlocked());
  sinkMutex = run.catch(() => undefined);
  return run;
}

/** Absolute path of the active file sink, or null when logging to stderr only. */
export function getFileSinkPath(): string | null {
  return fileSinkPath;
}

export const VERSION = BRIDGE_VERSION;
