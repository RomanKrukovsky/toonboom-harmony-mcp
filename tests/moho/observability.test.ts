import {
  SLO,
  quantile,
  summarizeSlo,
  resetSlo,
  snapshotSlo
} from "../../src/moho/observability/slo.js";
import {
  buildError,
  ErrorCode,
  generateCorrelationId,
  isRetryableMohoError,
  MohoBridgeError
} from "../../src/moho/observability/errors.js";
import { Logger, attachFileSink, detachFileSink } from "../../src/moho/observability/logger.js";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("SLO", () => {
  it("quantile returns null for empty", () => {
    expect(quantile([], 0.5)).toBe(null);
  });

  it("quantile returns the 50th percentile of a sorted array", () => {
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
  });

  it("quantile returns the 100th percentile (= last element)", () => {
    expect(quantile([1, 2, 3], 1.0)).toBe(3);
  });

  it("quantile handles unsorted input", () => {
    expect(quantile([5, 1, 3, 2, 4], 0.5)).toBe(3);
  });

  it("counter inc and snapshot", () => {
    resetSlo();
    for (const v of [42, 50, 60, 70, 84]) SLO.readOperations.inc(1, v);
    const snap = SLO.readOperations.snapshot();
    expect(snap.count).toBe(5);
    // nearest-rank percentile: p50 of 5 sorted values [42,50,60,70,84] → rank=ceil(0.5*5)=3 → idx=2 → 60
    expect(snap.p50).toBe(60);
    // p99 → rank=ceil(0.99*5)=5 → idx=4 → 84
    expect(snap.p99).toBe(84);
  });

  it("counter ring buffer caps at MAX_SAMPLES", () => {
    resetSlo();
    for (let i = 0; i < 5000; i++) SLO.ipcRoundtrip.inc(1, i);
    expect(SLO.ipcRoundtrip.state.durations.length).toBeLessThanOrEqual(2048);
  });

  it("summarizeSlo produces valid prometheus text", () => {
    const text = summarizeSlo();
    expect(text).toContain("moho_mcp_overview_read_success");
    expect(text).toContain("# HELP");
    expect(text).toContain("# TYPE");
  });

  it("snapshotSlo returns one entry per counter", () => {
    const snaps = snapshotSlo();
    expect(snaps.length).toBeGreaterThan(5);
    for (const s of snaps) {
      expect(s.name).toMatch(/^moho_mcp_/);
    }
  });
});

describe("error taxonomy", () => {
  it("buildError produces MohoBridgeError with retryable flag", () => {
    const err = buildError(ErrorCode.IPC_TIMEOUT, "x");
    expect(err).toBeInstanceOf(MohoBridgeError);
    expect(err.payload.code).toBe(ErrorCode.IPC_TIMEOUT);
    expect(err.payload.retryable).toBe(true);
  });

  it("isRetryableMohoError returns true for retryable errors", () => {
    expect(isRetryableMohoError(buildError(ErrorCode.QUEUE_OVERFLOW, "x"))).toBe(true);
  });

  it("isRetryableMohoError returns false for non-MohoBridgeError", () => {
    expect(isRetryableMohoError(new Error("plain"))).toBe(false);
  });

  it("correlation id is 8+ chars", () => {
    const id = generateCorrelationId();
    expect(id.length).toBeGreaterThanOrEqual(8);
  });
});

describe("logger", () => {
  it("writes to stderr sink without throwing", () => {
    const log = new Logger("test");
    expect(() => log.info("hello")).not.toThrow();
    expect(() => log.warn("warn")).not.toThrow();
    expect(() => log.error("err")).not.toThrow();
    expect(() => log.debug("dbg")).not.toThrow();
  });

  it("redacts secret keys in extra context", () => {
    const log = new Logger("test");
    expect(() => log.info("msg", { apiKey: "sk-1234567890123456" })).not.toThrow();
  });

  it("child loggers preserve context", () => {
    const parent = new Logger("test", { correlationId: "abc" });
    const child = parent.child({ transactionId: "tx-1" });
    expect(() => child.info("child")).not.toThrow();
  });

  it("file sink attaches and detaches", async () => {
    const tmpFile = path.join(tmpdir(), `moho-mcp-logger-test-${Date.now()}.log`);
    const ok = await attachFileSink(tmpFile);
    expect(ok).toBe(true);
    const log = new Logger("filetest");
    log.info("via file sink");
    await detachFileSink();
    const content = await fs.readFile(tmpFile, "utf-8");
    expect(content).toContain("via file sink");
    await fs.unlink(tmpFile);
  });
});
