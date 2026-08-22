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
const MAX_SAMPLES = 2048;
const MAX_COUNT = Number.MAX_SAFE_INTEGER;
function freshState() {
    return { count: 0, durations: [], rejectedSamples: 0, saturated: false, observedSamples: 0 };
}
class Counter {
    name;
    help;
    state = freshState();
    /**
     * Circular buffer. The previous implementation used `shift()` on a full array,
     * which is O(n) per call — at 2048 samples that is real work on a hot IPC path.
     * Writing at a rotating index is O(1).
     */
    writeIndex = 0;
    constructor(name, help) {
        this.name = name;
        this.help = help;
    }
    inc(by = 1, durationMs) {
        if (typeof by !== "number" || !Number.isFinite(by) || by < 0) {
            // Refuse NaN/Infinity/negative: any of them would corrupt the counter for
            // the rest of the process lifetime.
            this.state.rejectedSamples += 1;
        }
        else if (!this.state.saturated) {
            const next = this.state.count + by;
            if (next >= MAX_COUNT || !Number.isFinite(next)) {
                this.state.count = MAX_COUNT;
                this.state.saturated = true;
            }
            else {
                this.state.count = next;
            }
        }
        if (durationMs === undefined)
            return;
        if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0) {
            // Excluded from percentiles but recorded, so a bad call site is diagnosable.
            this.state.rejectedSamples += 1;
            return;
        }
        this.recordDuration(durationMs);
    }
    recordDuration(durationMs) {
        const buf = this.state.durations;
        if (this.state.observedSamples < MAX_COUNT)
            this.state.observedSamples += 1;
        if (buf.length < MAX_SAMPLES) {
            buf.push(durationMs);
            this.writeIndex = buf.length % MAX_SAMPLES;
            return;
        }
        if (this.writeIndex >= MAX_SAMPLES)
            this.writeIndex = 0;
        buf[this.writeIndex] = durationMs;
        this.writeIndex = (this.writeIndex + 1) % MAX_SAMPLES;
    }
    recordError() {
        this.state.lastErrorAt = Date.now();
    }
    reset() {
        this.state = freshState();
        this.writeIndex = 0;
    }
    snapshot() {
        const durations = this.state.durations;
        return {
            name: this.name,
            help: this.help,
            count: this.state.count,
            p50: quantile(durations, 0.5),
            p95: quantile(durations, 0.95),
            p99: quantile(durations, 0.99),
            lastErrorAt: this.state.lastErrorAt ?? null,
            sampleCount: durations.length,
            observedSamples: this.state.observedSamples,
            rejectedSamples: this.state.rejectedSamples,
            saturated: this.state.saturated,
        };
    }
}
/** Compute the q-quantile of an array (0 ≤ q ≤ 1). Returns null for empty. */
export function quantile(values, q) {
    if (!Array.isArray(values) || values.length === 0)
        return null;
    if (typeof q !== "number" || !Number.isFinite(q) || q < 0 || q > 1)
        return null;
    // Defensive: percentiles are only meaningful over finite numbers. A NaN in the
    // input would make `sort` order-dependent and could surface NaN as a p-value.
    const clean = values.filter((v) => typeof v === "number" && Number.isFinite(v));
    if (clean.length === 0)
        return null;
    const sorted = clean.sort((a, b) => a - b);
    // Nearest-rank percentile: rank = max(1, ceil(q * N)) → 0-indexed = max(0, rank - 1).
    const rank = Math.max(1, Math.ceil(q * sorted.length));
    const idx = Math.min(sorted.length - 1, rank - 1);
    return sorted[idx];
}
export const SLO = {
    readOperations: new Counter("moho_mcp_read_operations_total", "Successful read operations"),
    readErrors: new Counter("moho_mcp_read_errors_total", "Failed read operations"),
    writeOperations: new Counter("moho_mcp_write_operations_total", "Successful write operations"),
    writeErrors: new Counter("moho_mcp_write_errors_total", "Failed write operations"),
    ipcTimeouts: new Counter("moho_mcp_ipc_timeouts_total", "IPC requests that exceeded the timeout"),
    ipcRoundtrip: new Counter("moho_mcp_ipc_roundtrip_seconds", "IPC request→response round-trip duration (ms)"),
    batchDuration: new Counter("moho_mcp_batch_duration_ms", "Batch execution duration (ms)"),
    renderDuration: new Counter("moho_mcp_render_duration_ms", "Render/screenshot duration (ms)"),
    backupDuration: new Counter("moho_mcp_backup_duration_ms", "Backup duration (ms)"),
    undoCount: new Counter("moho_mcp_undos_total", "Successful undo operations"),
    undoErrors: new Counter("moho_mcp_undos_errors_total", "Undo failures"),
    destructiveConfirmations: new Counter("moho_mcp_destructive_confirmations_total", "Destructive ops that passed preview-hash validation"),
};
/** Render a value Prometheus can parse; never emit NaN/Infinity into the exposition. */
function promNumber(value) {
    return Number.isFinite(value) ? String(value) : "0";
}
export function summarizeSlo() {
    const rejected = Object.values(SLO).reduce((sum, c) => sum + c.state.rejectedSamples, 0);
    const saturated = Object.values(SLO).some((c) => c.state.saturated);
    const lines = [
        "# HELP moho_mcp_overview Bridge counters — single process, reset on restart.",
        "# TYPE moho_mcp_overview gauge",
        `moho_mcp_overview_read_success ${promNumber(SLO.readOperations.state.count)}`,
        `moho_mcp_overview_write_success ${promNumber(SLO.writeOperations.state.count)}`,
        `moho_mcp_overview_read_errors ${promNumber(SLO.readErrors.state.count)}`,
        `moho_mcp_overview_write_errors ${promNumber(SLO.writeErrors.state.count)}`,
        `moho_mcp_overview_ipc_timeouts ${promNumber(SLO.ipcTimeouts.state.count)}`,
        "# HELP moho_mcp_overview_rejected_samples Increments refused as invalid (non-finite or negative).",
        `moho_mcp_overview_rejected_samples ${promNumber(rejected)}`,
        "# HELP moho_mcp_overview_saturated 1 when any counter reached MAX_SAFE_INTEGER and stopped advancing.",
        `moho_mcp_overview_saturated ${saturated ? 1 : 0}`,
    ];
    return lines.join("\n") + "\n";
}
export function snapshotSlo() {
    return Object.values(SLO).map((c) => c.snapshot());
}
export function resetSlo() {
    for (const c of Object.values(SLO)) {
        c.reset();
    }
}
