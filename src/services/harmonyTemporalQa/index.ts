import { evaluateMohoTemporalQa } from '../mohoTemporalQa/index.js';
import type { MohoTemporalQaInput, MohoTemporalQaReport } from '../../schemas/mohoTemporalQa.js';

export type HarmonyTemporalQaInput = MohoTemporalQaInput;
export type HarmonyTemporalQaReport = MohoTemporalQaReport;

export async function evaluateHarmonyTemporalQa(input: HarmonyTemporalQaInput): Promise<HarmonyTemporalQaReport> {
  return evaluateMohoTemporalQa(input);
}
