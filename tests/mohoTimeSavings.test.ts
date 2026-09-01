import {
  MohoTimeSavings,
  type MohoTimeSavingsReport,
  type MohoTimeSavingsShotDetail,
  type MohoTimeSavingsHonestStatus
} from '../src/services/mohoTimeSavings/index.js';
import type {
  MohoFactoryRunState,
  MohoFactoryShotResult
} from '../src/orchestrators/mohoFactory/index.js';

function makeShotResult(overrides: Partial<MohoFactoryShotResult> & { shotId: string; durationMs?: number }): MohoFactoryShotResult {
  return {
    shotId: overrides.shotId,
    status: overrides.status ?? 'completed',
    pirFingerprint: overrides.pirFingerprint ?? `pir_${overrides.shotId}`,
    planFingerprint: overrides.planFingerprint ?? `plan_${overrides.shotId}`,
    qaStatus: overrides.qaStatus ?? 'pass',
    retakeCount: overrides.retakeCount ?? 0,
    artifacts: overrides.artifacts ?? [`out/${overrides.shotId}_render`],
    durationMs: overrides.durationMs ?? 60_000
  };
}

function makeRunState(shots: MohoFactoryShotResult[]): MohoFactoryRunState {
  return {
    runId: 'moho_factory_demo',
    projectName: 'commercial-demo',
    startedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:01.000Z',
    completedAt: '2026-01-01T00:00:02.000Z',
    status: 'completed',
    currentStage: 'done',
    stages: {} as MohoFactoryRunState['stages'],
    shotResults: shots,
    totalShots: shots.length,
    completedShots: shots.filter(s => s.status === 'completed').length,
    warnings: [],
    errors: [],
    fingerprint: 'runstate_test_fingerprint'
  };
}

function findShot(report: MohoTimeSavingsReport, shotId: string): MohoTimeSavingsShotDetail {
  const shot = report.shotDetails.find(s => s.shotId === shotId);
  if (!shot) throw new Error(`shot ${shotId} missing from report`);
  return shot;
}

describe('MohoTimeSavings — single shot, default settings', () => {
  it('humanoid 1 shot, duration 60000ms → manual=240min, ai=1min, saved=239min, €139.58', () => {
    const runState = makeRunState([
      makeShotResult({ shotId: 'shot_humanoid_single', durationMs: 60_000 })
    ]);
    const report = MohoTimeSavings.generate({
      runState,
      defaultRigType: 'humanoid_2leg'
    });

    expect(report.totalShots).toBe(1);
    expect(report.hourlyRateEur).toBe(35);
    expect(report.manualCostHours).toBeCloseTo(4, 5);
    expect(report.aiCostHours).toBeCloseTo(1 / 60, 5);
    expect(report.savedHours).toBeCloseTo(4 - 1 / 60, 5);

    const shot = findShot(report, 'shot_humanoid_single');
    expect(shot.rigType).toBe('humanoid_2leg');
    expect(shot.manualMinutes).toBe(240);
    expect(shot.aiMinutes).toBeCloseTo(1, 5);
    expect(shot.savedMinutes).toBeCloseTo(239, 5);
    expect(shot.savedEuros).toBeCloseTo((239 / 60) * 35, 5);
    expect(MohoTimeSavings.formatEur(shot.savedEuros)).toBe('€139.42');
  });
});

describe('MohoTimeSavings — multiple shots', () => {
  it('sums three humanoid shots correctly', () => {
    const runState = makeRunState([
      makeShotResult({ shotId: 'shot_a', durationMs: 60_000 }),
      makeShotResult({ shotId: 'shot_b', durationMs: 60_000 }),
      makeShotResult({ shotId: 'shot_c', durationMs: 60_000 })
    ]);
    const report = MohoTimeSavings.generate({
      runState,
      defaultRigType: 'humanoid_2leg'
    });

    expect(report.totalShots).toBe(3);
    expect(report.manualCostHours).toBeCloseTo((240 * 3) / 60, 5);
    expect(report.aiCostHours).toBeCloseTo(3 / 60, 5);
    expect(report.savedHours).toBeCloseTo((240 * 3 - 3) / 60, 5);

    const totalSavedEuros = report.shotDetails.reduce((acc, s) => acc + s.savedEuros, 0);
    expect(totalSavedEuros).toBeCloseTo(report.savedEuros, 5);

    for (const id of ['shot_a', 'shot_b', 'shot_c']) {
      const shot = findShot(report, id);
      expect(shot.manualMinutes).toBe(240);
      expect(shot.aiMinutes).toBeCloseTo(1, 5);
    }

    expect(report.acceptanceGatesPassed).toBe(3);
    expect(report.acceptanceGatesFailed).toBe(0);
  });
});

describe('MohoTimeSavings — mixed rig types', () => {
  it('humanoid(240) + quad(300) + creature(360) + mechanical(320)', () => {
    const runState = makeRunState([
      makeShotResult({ shotId: 'shot_h', durationMs: 60_000 }),
      makeShotResult({ shotId: 'shot_q', durationMs: 60_000 }),
      makeShotResult({ shotId: 'shot_c', durationMs: 60_000 }),
      makeShotResult({ shotId: 'shot_m', durationMs: 60_000 })
    ]);
    const report = MohoTimeSavings.generate({
      runState,
      rigTypeByShotId: {
        shot_h: 'humanoid_2leg',
        shot_q: 'quadruped',
        shot_c: 'creature',
        shot_m: 'mechanical'
      }
    });

    expect(findShot(report, 'shot_h').manualMinutes).toBe(240);
    expect(findShot(report, 'shot_q').manualMinutes).toBe(300);
    expect(findShot(report, 'shot_c').manualMinutes).toBe(360);
    expect(findShot(report, 'shot_m').manualMinutes).toBe(320);

    expect(report.rigTypeBreakdown).toEqual({
      humanoid_2leg: 1,
      quadruped: 1,
      creature: 1,
      mechanical: 1
    });

    const totalManualMin = 240 + 300 + 360 + 320;
    expect(report.manualCostHours).toBeCloseTo(totalManualMin / 60, 5);
    expect(report.aiCostHours).toBeCloseTo(4 / 60, 5);
  });
});

describe('MohoTimeSavings — honest status', () => {
  it('any shot status=requires_approval → honestStatus=requires_real_moho', () => {
    const runState = makeRunState([
      makeShotResult({ shotId: 'shot_done', durationMs: 60_000, status: 'completed' }),
      makeShotResult({ shotId: 'shot_needs_approval', durationMs: 90_000, status: 'requires_approval' })
    ]);
    const report = MohoTimeSavings.generate({ runState });
    expect(report.honestStatus).toBe<MohoTimeSavingsHonestStatus>('requires_real_moho');
    expect(report.acceptanceGatesPassed).toBe(1);
    expect(report.acceptanceGatesFailed).toBe(1);
  });

  it('all shots completed → honestStatus=verified_real', () => {
    const runState = makeRunState([
      makeShotResult({ shotId: 'shot_1', durationMs: 60_000, status: 'completed' }),
      makeShotResult({ shotId: 'shot_2', durationMs: 120_000, status: 'completed' })
    ]);
    const report = MohoTimeSavings.generate({ runState });
    expect(report.honestStatus).toBe<MohoTimeSavingsHonestStatus>('verified_real');
    expect(report.acceptanceGatesPassed).toBe(2);
    expect(report.acceptanceGatesFailed).toBe(0);
  });
});

describe('MohoTimeSavings — custom hourly rate', () => {
  it('60 EUR/h instead of 35 changes savedEuros proportionally', () => {
    const runState = makeRunState([
      makeShotResult({ shotId: 'shot_rate', durationMs: 60_000 })
    ]);
    const report35 = MohoTimeSavings.generate({ runState, hourlyRateEur: 35 });
    const report60 = MohoTimeSavings.generate({ runState, hourlyRateEur: 60 });

    expect(report35.hourlyRateEur).toBe(35);
    expect(report60.hourlyRateEur).toBe(60);

    const shot35 = findShot(report35, 'shot_rate');
    const shot60 = findShot(report60, 'shot_rate');

    expect(shot60.savedEuros).toBeCloseTo((239 / 60) * 60, 5);
    expect(shot60.savedEuros).toBeCloseTo(shot35.savedEuros * (60 / 35), 4);
    expect(MohoTimeSavings.formatEur(shot60.savedEuros)).toBe('€239.00');
  });
});

describe('MohoTimeSavings — formatters', () => {
  it('formatEur produces "€1,234.56" format', () => {
    expect(MohoTimeSavings.formatEur(1234.56)).toBe('€1,234.56');
    expect(MohoTimeSavings.formatEur(0)).toBe('€0.00');
    expect(MohoTimeSavings.formatEur(0.5)).toBe('€0.50');
    expect(MohoTimeSavings.formatEur(1_000_000)).toBe('€1,000,000.00');
    expect(MohoTimeSavings.formatEur(-139.58)).toBe('-€139.58');
    expect(MohoTimeSavings.formatEur(Number.NaN)).toBe('€0.00');
  });

  it('formatHours produces "12.5h" format', () => {
    expect(MohoTimeSavings.formatHours(750)).toBe('12.5h');
    expect(MohoTimeSavings.formatHours(0)).toBe('0.0h');
    expect(MohoTimeSavings.formatHours(60)).toBe('1.0h');
    expect(MohoTimeSavings.formatHours(45)).toBe('0.8h');
    expect(MohoTimeSavings.formatHours(Number.NaN)).toBe('0.0h');
  });
});

describe('MohoTimeSavings — defaultManualMinutes', () => {
  it('returns correct defaults per rig type', () => {
    expect(MohoTimeSavings.defaultManualMinutes('humanoid_2leg')).toBe(240);
    expect(MohoTimeSavings.defaultManualMinutes('quadruped')).toBe(300);
    expect(MohoTimeSavings.defaultManualMinutes('creature')).toBe(360);
    expect(MohoTimeSavings.defaultManualMinutes('mechanical')).toBe(320);
  });

  it('falls back to 240 for unknown rig types', () => {
    expect(MohoTimeSavings.defaultManualMinutes('unknown_rig')).toBe(240);
    expect(MohoTimeSavings.defaultManualMinutes('')).toBe(240);
  });
});

describe('MohoTimeSavings — deterministic fingerprint', () => {
  it('same runState and options produce identical report fingerprints', () => {
    const runState = makeRunState([
      makeShotResult({ shotId: 'shot_x', durationMs: 60_000 }),
      makeShotResult({ shotId: 'shot_y', durationMs: 90_000, status: 'completed' })
    ]);
    const opts = {
      runState,
      defaultRigType: 'humanoid_2leg' as const,
      hourlyRateEur: 35
    };

    const reportA = MohoTimeSavings.generate(opts);
    const reportB = MohoTimeSavings.generate(opts);

    expect(reportA.fingerprint).toBe(reportB.fingerprint);
    expect(reportA.fingerprint.length).toBe(64);
    expect(reportA.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different shot results produce different fingerprints', () => {
    const optsA = { runState: makeRunState([makeShotResult({ shotId: 'shot_1', durationMs: 60_000 })]) };
    const optsB = { runState: makeRunState([makeShotResult({ shotId: 'shot_2', durationMs: 60_000 })]) };

    const reportA = MohoTimeSavings.generate(optsA);
    const reportB = MohoTimeSavings.generate(optsB);

    expect(reportA.fingerprint).not.toBe(reportB.fingerprint);
  });
});