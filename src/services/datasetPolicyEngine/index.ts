import { MlError } from '../../errors/mlErrorRegistry.js';
import { DataRegistry, datasetCommercialTrainingSchema, type DatasetEntry, type DatasetCommercialTraining } from '../dataRegistry/index.js';

/**
 * DatasetPolicyEngine.
 *
 * Mirrors `LicensePolicyEngine` for external datasets rather than models. The same three
 * gates exist (before_download, before_training, before_evaluation), and the same rules:
 *
 *   - The GitHub licence is *not* the dataset licence.
 *   - NC, research-only and unknown statuses block commercial training.
 *   - Missing consent for biometric data is an immediate refusal.
 *   - Datasets are routed to one of `quarantine`, `first_party`, `research`, `commercial`,
 *     `evaluation` storage classes; `NC` always lands in `research` and may never end up in
 *     `commercial` or `evaluation`.
 */

export type DatasetGate = 'before_download' | 'before_training' | 'before_evaluation';
export type DatasetUse = 'commercial_training' | 'fine_tuning' | 'evaluation_only' | 'retrieval_only';

export interface DatasetPolicyConfig {
  commercialBuild: boolean;
  studioRegion: string | null;
  allowResearchDatasets: boolean;
}

export function readDatasetPolicyConfig(env: NodeJS.ProcessEnv = process.env): DatasetPolicyConfig {
  return {
    commercialBuild: env.COMMERCIAL_BUILD !== 'false',
    studioRegion: env.STUDIO_REGION && env.STUDIO_REGION.trim() ? env.STUDIO_REGION.trim().toUpperCase() : null,
    allowResearchDatasets: env.ALLOW_RESEARCH_DATASETS === 'true'
  };
}

export interface DatasetDecision {
  decisionId: string;
  datasetId: string;
  gate: DatasetGate;
  use: DatasetUse;
  allowed: boolean;
  status: DatasetEntry['license']['status'];
  commercialTraining: DatasetCommercialTraining;
  reasonCodes: string[];
  humanReason: string;
  requiredStorageClass: DatasetEntry['defaultStorageClass'];
  commercialBuild: boolean;
  studioRegion: string | null;
  biometricReviewRequired: boolean;
  decidedAt: string;
}

const NEVER_COMMERCIAL: readonly DatasetEntry['license']['status'][] = ['preview_only', 'research_only', 'legal_review_required', 'blocked', 'unknown'];

export class DatasetPolicyEngine {
  constructor(
    private readonly registry: DataRegistry = new DataRegistry(),
    private readonly config: DatasetPolicyConfig = readDatasetPolicyConfig()
  ) {}

  getConfig(): DatasetPolicyConfig {
    return this.config;
  }

  evaluate(datasetId: string, gate: DatasetGate, use: DatasetUse): DatasetDecision {
    const entry = this.registry.require(datasetId);
    const reasonCodes: string[] = [];
    const humanReasons: string[] = [];

    const commercialContext = this.config.commercialBuild && (use === 'commercial_training' || gate === 'before_evaluation' && use === 'fine_tuning');

    if (entry.license.status === 'blocked') {
      reasonCodes.push('DATASET_STATUS_BLOCKED');
      humanReasons.push('the registry marks this dataset as blocked');
    }
    if (entry.license.status === 'unknown') {
      reasonCodes.push('DATASET_STATUS_UNKNOWN');
      humanReasons.push('dataset licence is unknown; unknown is refused');
    }
    if (entry.license.status === 'research_only' && !this.config.allowResearchDatasets) {
      reasonCodes.push('DATASET_RESEARCH_ONLY');
      humanReasons.push('dataset is research-only and ALLOW_RESEARCH_DATASETS is not set');
    }
    if (commercialContext && NEVER_COMMERCIAL.includes(entry.license.status)) {
      reasonCodes.push('COMMERCIAL_BUILD_REQUIRES_CLEARED_DATASET_LICENSE');
      humanReasons.push(`COMMERCIAL_BUILD=true and dataset status is ${entry.license.status}`);
    }
    if (commercialContext && entry.license.commercialTraining === 'forbidden') {
      reasonCodes.push('DATASET_COMMERCIAL_USE_FORBIDDEN');
      humanReasons.push('dataset forbids commercial training');
    }
    if (commercialContext && entry.license.commercialTraining === 'unknown') {
      reasonCodes.push('DATASET_COMMERCIAL_USE_UNKNOWN');
      humanReasons.push('dataset commercial training status is unknown');
    }
    if (commercialContext && entry.license.consentRequired && entry.license.biometricData !== 'none' && entry.license.biometricData !== 'low') {
      reasonCodes.push('DATASET_BIOMETRIC_CONSENT_MISSING');
      humanReasons.push('dataset contains biometric data and requires recorded consent');
    }
    if (entry.license.territorialRestrictions.length > 0) {
      if (this.config.studioRegion === null) {
        reasonCodes.push('STUDIO_REGION_UNDECLARED');
        humanReasons.push('dataset is territorially restricted and STUDIO_REGION is not declared');
      } else if (!entry.license.territorialRestrictions.map(t => t.toUpperCase()).includes(this.config.studioRegion)) {
        reasonCodes.push('TERRITORY_NOT_PERMITTED');
        humanReasons.push(`STUDIO_REGION=${this.config.studioRegion} is not among the permitted territories`);
      }
    }

    const allowed = reasonCodes.length === 0;
    return {
      decisionId: `ds_${crypto.randomUUID()}`,
      datasetId,
      gate,
      use,
      allowed,
      status: entry.license.status,
      commercialTraining: entry.license.commercialTraining,
      reasonCodes: allowed ? [] : reasonCodes,
      humanReason: allowed ? 'all dataset gates satisfied' : humanReasons.join('; '),
      requiredStorageClass: entry.defaultStorageClass,
      commercialBuild: this.config.commercialBuild,
      studioRegion: this.config.studioRegion,
      biometricReviewRequired: entry.license.biometricData !== 'none' && entry.license.consentRequired,
      decidedAt: new Date().toISOString()
    };
  }

  requireAllowed(datasetId: string, gate: DatasetGate, use: DatasetUse): DatasetDecision {
    const decision = this.evaluate(datasetId, gate, use);
    if (!decision.allowed) {
      throw new MlError('DATASET_LICENSE_UNKNOWN', `${datasetId} refused at ${gate} for ${use}: ${decision.humanReason}`, {
        detail: { reasonCodes: decision.reasonCodes, decisionId: decision.decisionId, status: decision.status }
      });
    }
    return decision;
  }
}
