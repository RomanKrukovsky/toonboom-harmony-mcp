import crypto from 'crypto';
import { MlError } from '../../errors/mlErrorRegistry.js';
import { getModelCatalog, type CatalogEntry, type LicenseStatus, type ModelCatalog } from '../modelCatalog/index.js';

/**
 * LicensePolicyEngine.
 *
 * Three gates, deliberately separate, because passing one says nothing about the others:
 *   1. `before_download`  — may these bytes be fetched at all?
 *   2. `before_inference` — may this model be run for this purpose?
 *   3. `before_packaging` — may this output leave the building in a commercial deliverable?
 *
 * Design rules that are not negotiable by configuration:
 *   - A permissive licence on GitHub CODE is not a licence for the WEIGHTS, and neither is a
 *     licence for the TRAINING DATA. Three fields, three decisions.
 *   - Permission to run inference is not permission to fine-tune, to redistribute derived
 *     weights, or to use the training corpus.
 *   - `COMMERCIAL_BUILD` defaults to **true**. Unknown, NC, research-only, review-pending and
 *     territorially incompatible all *block*. A warning is not a control.
 *   - Absence of `STUDIO_REGION` is not consent. A model with territorial restrictions and no
 *     declared region is blocked, not allowed.
 */

export type LicenseGate = 'before_download' | 'before_inference' | 'before_packaging';

export type LicenseUse =
  | 'inference'
  | 'fine_tuning'
  | 'derivative_weight_distribution'
  | 'training_data_use'
  | 'commercial_delivery'
  | 'preview_only_delivery';

export interface LicensePolicyConfig {
  /** Defaults to true unless COMMERCIAL_BUILD is explicitly "false". */
  commercialBuild: boolean;
  /** ISO-3166 alpha-2, or null when the studio has not declared one. Null is not permissive. */
  studioRegion: string | null;
  /** Allows an operator to run research-only models in an explicitly non-commercial context. */
  allowResearchModels: boolean;
  /**
   * Narrow, auditable escape hatch: permits *running* a model whose licence review is still
   * pending, so its technical behaviour can be evaluated. It requires COMMERCIAL_BUILD=false,
   * it never applies at the packaging gate, and every decision it relaxes records the
   * `LICENSE_REVIEW_PENDING_OVERRIDDEN` reason code so the evidence stays honest.
   */
  allowLegalReviewPending: boolean;
}

export function readLicensePolicyConfig(env: NodeJS.ProcessEnv = process.env): LicensePolicyConfig {
  const commercialBuild = env.COMMERCIAL_BUILD !== 'false';
  return {
    commercialBuild,
    studioRegion: env.STUDIO_REGION && env.STUDIO_REGION.trim() ? env.STUDIO_REGION.trim().toUpperCase() : null,
    allowResearchModels: env.ALLOW_RESEARCH_MODELS === 'true',
    // The override is only readable at all when the build is explicitly non-commercial.
    allowLegalReviewPending: !commercialBuild && env.ALLOW_LEGAL_REVIEW_PENDING === 'true'
  };
}

export interface LicenseDecision {
  decisionId: string;
  modelId: string;
  modelRevision: string;
  gate: LicenseGate;
  use: LicenseUse;
  allowed: boolean;
  status: LicenseStatus;
  /** Machine-readable reasons. Empty when allowed with no caveats. */
  reasonCodes: string[];
  humanReason: string;
  attributionRequired: string | null;
  consentRequired: boolean;
  commercialBuild: boolean;
  studioRegion: string | null;
  /** Digest of the licence record the decision was made against, for evidence. */
  licenseRecordSha256: string;
  decidedAt: string;
}

const NEVER_COMMERCIAL: readonly LicenseStatus[] = ['preview_only', 'research_only', 'legal_review_required', 'blocked', 'unknown'];

export class LicensePolicyEngine {
  constructor(
    private readonly catalog: ModelCatalog = getModelCatalog(),
    private readonly config: LicensePolicyConfig = readLicensePolicyConfig()
  ) {}

  getConfig(): LicensePolicyConfig {
    return this.config;
  }

  /**
   * Evaluates one gate for one use. Never throws for a policy answer — a refusal is data, and
   * the caller records it as evidence. It throws only when the model is not in the catalog,
   * which is a programming error rather than a policy outcome.
   */
  evaluate(modelId: string, gate: LicenseGate, use: LicenseUse): LicenseDecision {
    const entry = this.catalog.require(modelId);
    const license = entry.license;
    const reasonCodes: string[] = [];
    const humanReasons: string[] = [];
    /** Recorded on an allowed decision so an override is never invisible in the evidence. */
    const overrideCodes: string[] = [];

    const commercialContext = this.config.commercialBuild && (use === 'commercial_delivery' || gate === 'before_packaging' || use === 'inference');

    // -- status gate -----------------------------------------------------------------
    if (license.status === 'blocked') {
      reasonCodes.push('LICENSE_STATUS_BLOCKED');
      humanReasons.push('the catalog marks this model as blocked');
    }
    if (license.status === 'unknown') {
      reasonCodes.push('LICENSE_STATUS_UNKNOWN');
      humanReasons.push('licence status is unknown; unknown is refused, not assumed permissive');
    }
    // Review-pending blocks everything by default. The override below is deliberately narrow:
    // it only ever applies to running a model for evaluation, never to shipping its output.
    const evaluationGate = gate === 'before_download' || gate === 'before_inference';
    const evaluationUse = use === 'inference' || use === 'preview_only_delivery';
    const reviewOverridden = this.config.allowLegalReviewPending && evaluationGate && evaluationUse;
    if (license.status === 'legal_review_required') {
      if (reviewOverridden) {
        overrideCodes.push('LICENSE_REVIEW_PENDING_OVERRIDDEN');
      } else {
        reasonCodes.push('LICENSE_REVIEW_PENDING');
        humanReasons.push('the licence has not been read and signed off; verifiedBy is null');
      }
    }
    if (license.status === 'research_only' && !this.config.allowResearchModels) {
      reasonCodes.push('LICENSE_RESEARCH_ONLY');
      humanReasons.push('model is research-only and ALLOW_RESEARCH_MODELS is not set');
    }
    if (license.status === 'preview_only' && (use === 'commercial_delivery' || gate === 'before_packaging')) {
      reasonCodes.push('LICENSE_PREVIEW_ONLY');
      humanReasons.push('preview-only output cannot enter a deliverable');
    }

    // -- commercial gate -------------------------------------------------------------
    // Unconditional. The review override above cannot reach this branch, because it requires
    // commercialBuild to be false in the first place.
    if (this.config.commercialBuild && NEVER_COMMERCIAL.includes(license.status)) {
      if (!(license.status === 'preview_only' && use === 'preview_only_delivery')) {
        reasonCodes.push('COMMERCIAL_BUILD_REQUIRES_CLEARED_LICENSE');
        humanReasons.push(`COMMERCIAL_BUILD=true and licence status is ${license.status}`);
      }
    }
    if (commercialContext && license.commercialUse === 'forbidden') {
      reasonCodes.push('COMMERCIAL_USE_FORBIDDEN');
      humanReasons.push('the licence forbids commercial use');
    }
    if (commercialContext && license.commercialUse === 'unknown') {
      reasonCodes.push('COMMERCIAL_USE_UNKNOWN');
      humanReasons.push('commercial permission is unknown');
    }

    // -- use-specific gates ----------------------------------------------------------
    // Inference permission is NOT fine-tuning permission and NOT redistribution permission.
    if (use === 'fine_tuning' && license.derivativeWeights !== 'allowed') {
      reasonCodes.push('DERIVATIVE_WEIGHTS_NOT_PERMITTED');
      humanReasons.push(`derivative weights are ${license.derivativeWeights}; permission to run inference does not extend to training`);
    }
    if (use === 'derivative_weight_distribution' && license.redistribution !== 'allowed') {
      reasonCodes.push('REDISTRIBUTION_NOT_PERMITTED');
      humanReasons.push(`redistribution is ${license.redistribution}`);
    }
    if (use === 'training_data_use' && !/^(allowed|permitted)/i.test(license.datasetLicense)) {
      reasonCodes.push('TRAINING_DATA_NOT_CLEARED');
      humanReasons.push('the training corpus licence is not cleared for reuse');
    }

    // -- territory gate --------------------------------------------------------------
    if (license.territorialRestrictions.length > 0) {
      if (this.config.studioRegion === null) {
        reasonCodes.push('STUDIO_REGION_UNDECLARED');
        humanReasons.push('the licence is territorially restricted and STUDIO_REGION is not declared; absence of a region is not permission');
      } else if (!license.territorialRestrictions.map(t => t.toUpperCase()).includes(this.config.studioRegion)) {
        reasonCodes.push('TERRITORY_NOT_PERMITTED');
        humanReasons.push(`STUDIO_REGION=${this.config.studioRegion} is not among the permitted territories`);
      }
    }

    // -- attribution -----------------------------------------------------------------
    const attributionRequired = license.status === 'production_allowed_with_attribution' ? license.attribution : null;
    if (attributionRequired !== null && attributionRequired.length === 0) {
      reasonCodes.push('ATTRIBUTION_TEXT_MISSING');
      humanReasons.push('attribution is required but no attribution text is recorded');
    }

    const allowed = reasonCodes.length === 0;
    return {
      decisionId: `lic_${crypto.randomUUID()}`,
      modelId,
      modelRevision: entry.revision,
      gate,
      use,
      allowed,
      status: license.status,
      reasonCodes: allowed ? overrideCodes : reasonCodes,
      humanReason: allowed
        ? (overrideCodes.length
            ? 'allowed for technical evaluation only: licence review is still pending and ALLOW_LEGAL_REVIEW_PENDING was set in a non-commercial build'
            : 'all licence gates satisfied')
        : humanReasons.join('; '),
      attributionRequired,
      consentRequired: license.consentRequired,
      commercialBuild: this.config.commercialBuild,
      studioRegion: this.config.studioRegion,
      licenseRecordSha256: hashLicenseRecord(entry),
      decidedAt: new Date().toISOString()
    };
  }

  /** Convenience wrapper that turns a refusal into the standard blocking error. */
  requireAllowed(modelId: string, gate: LicenseGate, use: LicenseUse): LicenseDecision {
    const decision = this.evaluate(modelId, gate, use);
    if (!decision.allowed) {
      const code = decision.reasonCodes.includes('LICENSE_STATUS_UNKNOWN') ? 'ML_LICENSE_UNKNOWN' : 'ML_LICENSE_BLOCKED';
      throw new MlError(code, `${modelId} refused at ${gate} for ${use}: ${decision.humanReason}`, {
        modelId,
        detail: { reasonCodes: decision.reasonCodes, decisionId: decision.decisionId, status: decision.status }
      });
    }
    return decision;
  }

  /**
   * Whole-package gate. A deliverable is only commercially releasable when every contributing
   * model clears `before_packaging`. One refusal blocks the package.
   */
  evaluatePackage(modelIds: string[]): { allowed: boolean; decisions: LicenseDecision[]; blockedModelIds: string[] } {
    const decisions = modelIds.map(id => this.evaluate(id, 'before_packaging', this.config.commercialBuild ? 'commercial_delivery' : 'preview_only_delivery'));
    const blockedModelIds = decisions.filter(d => !d.allowed).map(d => d.modelId);
    return { allowed: blockedModelIds.length === 0, decisions, blockedModelIds };
  }
}

export function hashLicenseRecord(entry: CatalogEntry): string {
  const canonical = JSON.stringify(entry.license, Object.keys(entry.license).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}
