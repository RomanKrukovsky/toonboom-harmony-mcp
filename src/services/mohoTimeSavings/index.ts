import crypto from 'node:crypto';
import type { MohoFactoryRunState, MohoFactoryShotResult } from '../../orchestrators/mohoFactory/index.js';

export const MOHO_TIME_SAVINGS_SCHEMA_VERSION = '1.0' as const;

export type MohoRigTypeKey = 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical' | string;

export type MohoTimeSavingsHonestStatus = 'verified_real' | 'requires_real_moho' | 'mixed';

export interface MohoTimeSavingsShotDetail {
  shotId: string;
  rigType: string;
  manualMinutes: number;
  aiMinutes: number;
  savedMinutes: number;
  savedEuros: number;
  status: MohoFactoryShotResult['status'];
}

export interface MohoTimeSavingsReport {
  schemaVersion: typeof MOHO_TIME_SAVINGS_SCHEMA_VERSION;
  projectName: string;
  generatedAt: string;
  totalShots: number;
  totalDurationMs: number;
  manualCostHours: number;
  aiCostHours: number;
  savedHours: number;
  savedEuros: number;
  hourlyRateEur: number;
  shotDetails: MohoTimeSavingsShotDetail[];
  rigTypeBreakdown: Record<string, number>;
  acceptanceGatesPassed: number;
  acceptanceGatesFailed: number;
  honestStatus: MohoTimeSavingsHonestStatus;
  fingerprint: string;
}

export interface MohoTimeSavingsOptions {
  runState: MohoFactoryRunState;
  manualMinutesPerShot?: number;
  hourlyRateEur?: number;
  manualMinutesPerRigType?: Record<string, number>;
  rigTypeByShotId?: Record<string, string>;
  defaultRigType?: string;
}

const RIG_TYPE_DEFAULTS: Record<string, number> = {
  humanoid_2leg: 240,
  quadruped: 300,
  creature: 360,
  mechanical: 320
};

const FINGERPRINT_EPOCH_ISO = new Date(0).toISOString();

function canonicalize(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        sorted[k] = (v as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return v;
  });
}

export class MohoTimeSavings {
  static generate(opts: MohoTimeSavingsOptions): MohoTimeSavingsReport {
    const manualMinutesPerShot = opts.manualMinutesPerShot ?? 240;
    const hourlyRateEur = opts.hourlyRateEur ?? 35;
    const manualMinutesPerRigType = opts.manualMinutesPerRigType ?? {};
    const rigTypeByShotId = opts.rigTypeByShotId ?? {};
    const defaultRigType = opts.defaultRigType ?? 'humanoid_2leg';
    const runState = opts.runState;

    const shotDetails: MohoTimeSavingsShotDetail[] = [];
    const rigTypeBreakdown: Record<string, number> = {};
    let totalDurationMs = 0;
    let manualCostMinutes = 0;
    let aiCostMinutes = 0;
    let acceptanceGatesPassed = 0;
    let acceptanceGatesFailed = 0;
    let requiresApprovalSeen = false;

    for (const shotResult of runState.shotResults) {
      const rigType = rigTypeByShotId[shotResult.shotId] ?? defaultRigType;
      const manualMinutes = MohoTimeSavings.lookupManualMinutes(
        rigType,
        manualMinutesPerShot,
        manualMinutesPerRigType
      );
      const aiMinutes = shotResult.durationMs / 60_000;
      const savedMinutes = manualMinutes - aiMinutes;
      const savedEuros = (savedMinutes / 60) * hourlyRateEur;

      shotDetails.push({
        shotId: shotResult.shotId,
        rigType,
        manualMinutes,
        aiMinutes,
        savedMinutes,
        savedEuros,
        status: shotResult.status
      });

      totalDurationMs += shotResult.durationMs;
      manualCostMinutes += manualMinutes;
      aiCostMinutes += aiMinutes;
      rigTypeBreakdown[rigType] = (rigTypeBreakdown[rigType] ?? 0) + 1;

      if (shotResult.status === 'completed') {
        acceptanceGatesPassed += 1;
      } else {
        acceptanceGatesFailed += 1;
        if (shotResult.status === 'requires_approval') {
          requiresApprovalSeen = true;
        }
      }
    }

    const manualCostHours = manualCostMinutes / 60;
    const aiCostHours = aiCostMinutes / 60;
    const savedHours = manualCostHours - aiCostHours;
    const savedEuros = (savedHours) * hourlyRateEur;

    const honestStatus: MohoTimeSavingsHonestStatus = requiresApprovalSeen
      ? 'requires_real_moho'
      : 'verified_real';

    const fingerprint = MohoTimeSavings.computeFingerprint({
      runState,
      manualMinutesPerShot,
      hourlyRateEur,
      manualMinutesPerRigType,
      rigTypeByShotId,
      defaultRigType,
      shotDetails,
      rigTypeBreakdown,
      acceptanceGatesPassed,
      acceptanceGatesFailed,
      honestStatus
    });

    return {
      schemaVersion: MOHO_TIME_SAVINGS_SCHEMA_VERSION,
      projectName: runState.projectName,
      generatedAt: FINGERPRINT_EPOCH_ISO,
      totalShots: runState.shotResults.length,
      totalDurationMs,
      manualCostHours,
      aiCostHours,
      savedHours,
      savedEuros,
      hourlyRateEur,
      shotDetails,
      rigTypeBreakdown,
      acceptanceGatesPassed,
      acceptanceGatesFailed,
      honestStatus,
      fingerprint
    };
  }

  static formatEur(value: number): string {
    const safe = Number.isFinite(value) ? value : 0;
    const fixed = Math.abs(safe).toFixed(2);
    const [intPart, fracPart] = fixed.split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const sign = safe < 0 ? '-' : '';
    return `${sign}€${grouped}.${fracPart}`;
  }

  static formatHours(minutes: number): string {
    const safe = Number.isFinite(minutes) ? minutes : 0;
    const hours = safe / 60;
    const rounded = Math.round(hours * 10) / 10;
    return `${rounded.toFixed(1)}h`;
  }

  static defaultManualMinutes(rigType: string): number {
    return RIG_TYPE_DEFAULTS[rigType] ?? 240;
  }

  private static lookupManualMinutes(
    rigType: string,
    fallback: number,
    perRigType: Record<string, number>
  ): number {
    if (Object.prototype.hasOwnProperty.call(perRigType, rigType)) {
      return perRigType[rigType];
    }
    if (Object.prototype.hasOwnProperty.call(RIG_TYPE_DEFAULTS, rigType)) {
      return RIG_TYPE_DEFAULTS[rigType];
    }
    return fallback;
  }

  static formatForSales(report: MohoTimeSavingsReport): string {
    const lines: string[] = [];
    lines.push('📊 Moho AI Factory — Time Savings Report');
    lines.push('');
    lines.push(`Project: ${report.projectName}`);
    lines.push(`Shots processed: ${report.acceptanceGatesPassed}/${report.totalShots} (${report.honestStatus})`);
    lines.push(`Manual time: ${MohoTimeSavings.formatHours(report.manualCostHours * 60)}`);
    lines.push(`AI time: ${MohoTimeSavings.formatHours(report.aiCostHours * 60)}`);
    lines.push(`Saved: ${MohoTimeSavings.formatHours(report.savedHours * 60)} (${MohoTimeSavings.formatEur(report.savedEuros)} at €${report.hourlyRateEur}/h)`);
    lines.push('');
    lines.push('Breakdown:');
    for (const [rigType, count] of Object.entries(report.rigTypeBreakdown)) {
      lines.push(`  - ${rigType}: ${count} shot${count === 1 ? '' : 's'}`);
    }
    return lines.join('\n');
  }

  private static computeFingerprint(payload: Record<string, unknown>): string {
    return crypto.createHash('sha256').update(canonicalize(payload)).digest('hex');
  }
}

export default MohoTimeSavings;