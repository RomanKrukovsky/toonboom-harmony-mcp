/**
 * Lightweight in-process SLO counters.
 *
 * NOT a substitute for proper metrics infra. Single-bridge counters only;
 * counters are reset on process restart. Use `summarize()` to render a
 * Prometheus-style text exposition when diagnostic bundles are requested.
 *
 * Uses a bounded circular buffer for percentile calculation, so a long-running
 * process does not grow unbounded memory.
 *
 * Correctness rules (a lying metric is worse than a missing one):
 * - `inc()` rejects non-finite and negative increments. A single `inc(NaN)` would
 *   otherwise pin the count at NaN forever and emit an unparseable Prometheus line.
 * - Durations are stored only when finite and non-negative. A negative duration
 *   (clock adjustment, or `start`/`end` swapped at the call site) is counted as an
 *   event but excluded from percentiles and tallied in `rejectedSamples`, so the
 *   discrepancy is visible rather than silently averaged in.
 * - Counts are clamped at Number.MAX_SAFE_INTEGER: beyond it `+= 1` stops making
 *   progress, so a saturating counter with an explicit flag beats a frozen one.
 * - Node runs this on one thread and no method awaits, so each `inc()` is atomic
 *   with respect to other `inc()` calls; concurrent callers cannot interleave and
 *   lose an update. Cross-process aggregation is out of scope by design.
 */
interface CounterState {
    count: number;
    durations: number[];
    lastErrorAt?: number;
    /** Increments/samples refused as invalid. Non-zero means a caller is buggy. */
    rejectedSamples: number;
    /** True once `count` hit MAX_SAFE_INTEGER and stopped advancing. */
    saturated: boolean;
    /** Total accepted duration samples, including ones evicted from the window. */
    observedSamples: number;
}
export interface CounterSnapshot {
    name: string;
    help: string;
    count: number;
    p50: number | null;
    p95: number | null;
    p99: number | null;
    lastErrorAt: number | null;
    sampleCount: number;
    observedSamples: number;
    rejectedSamples: number;
    saturated: boolean;
}
declare class Counter {
    readonly name: string;
    readonly help: string;
    state: CounterState;
    /**
     * Circular buffer. The previous implementation used `shift()` on a full array,
     * which is O(n) per call — at 2048 samples that is real work on a hot IPC path.
     * Writing at a rotating index is O(1).
     */
    private writeIndex;
    constructor(name: string, help: string);
    inc(by?: number, durationMs?: number): void;
    private recordDuration;
    recordError(): void;
    reset(): void;
    snapshot(): CounterSnapshot;
}
/** Compute the q-quantile of an array (0 ≤ q ≤ 1). Returns null for empty. */
export declare function quantile(values: number[], q: number): number | null;
export declare const SLO: {
    readonly readOperations: Counter;
    readonly readErrors: Counter;
    readonly writeOperations: Counter;
    readonly writeErrors: Counter;
    readonly ipcTimeouts: Counter;
    readonly ipcRoundtrip: Counter;
    readonly batchDuration: Counter;
    readonly renderDuration: Counter;
    readonly backupDuration: Counter;
    readonly undoCount: Counter;
    readonly undoErrors: Counter;
    readonly destructiveConfirmations: Counter;
};
export declare function summarizeSlo(): string;
export declare function snapshotSlo(): CounterSnapshot[];
export declare function resetSlo(): void;
export {};
