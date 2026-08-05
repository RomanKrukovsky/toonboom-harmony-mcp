/**
 * Centralised, stable error codes for the ML platform and the Harmony command layer.
 *
 * Rules enforced by this module:
 *  - Every failure that leaves an ML or Harmony boundary carries one of these codes.
 *  - A code is stable API. Renaming one is a breaking change; add a new code instead.
 *  - `retryable` is a *property of the code*, not a per-call decision. Schema, licence and
 *    untrusted-input failures are never retryable no matter how the caller feels about it.
 *  - No `catch (e) { return success }`. `toMlError` preserves the cause.
 */

export const ML_ERROR_CODES = [
  'ML_PROVIDER_NOT_FOUND',
  'ML_PROVIDER_ALREADY_REGISTERED',
  'ML_PROVIDER_CONFLICT',
  'ML_MODEL_NOT_INSTALLED',
  'ML_MODEL_REVISION_MISMATCH',
  'ML_WEIGHTS_HASH_MISMATCH',
  'ML_WEIGHTS_HASH_UNVERIFIED',
  'ML_LICENSE_BLOCKED',
  'ML_LICENSE_UNKNOWN',
  'ML_CONSENT_MISSING',
  'ML_UNSUPPORTED_HARDWARE',
  'ML_INSUFFICIENT_MEMORY',
  'ML_INPUT_SCHEMA_INVALID',
  'ML_OUTPUT_SCHEMA_INVALID',
  'ML_TIMEOUT',
  'ML_CANCELLED',
  'ML_OOM',
  'ML_WORKER_CRASHED',
  'ML_TRANSPORT_FAILED',
  'ML_ARTIFACT_HASH_MISMATCH',
  'ML_ARTIFACT_NOT_FOUND',
  'ML_ARTIFACT_PATH_REJECTED',
  'ML_PROMPT_INJECTION_DETECTED',
  'ML_JOB_NOT_FOUND',
  'ML_JOB_NOT_RETRYABLE',
  'ML_RUNTIME_UNAVAILABLE',
  'ML_CATALOG_INVALID',
  'HARMONY_PLAN_INVALID',
  'HARMONY_EXECUTION_NOT_AVAILABLE',
  'HARMONY_POSTCONDITION_FAILED',
  'DATASET_LICENSE_UNKNOWN',
  'DATASET_NOT_REGISTERED',

  // --- Harmony contract simulator -------------------------------------------------------
  // The simulator executes a supported subset of HarmonyCommandPlanV5 against a canonical
  // in-memory scene. It never talks to Harmony, so none of these codes may ever be raised in
  // a context that claims real Harmony execution.
  'SIMULATOR_COMMAND_NOT_SUPPORTED',
  'SIMULATOR_PRECONDITION_FAILED',
  'SIMULATOR_POSTCONDITION_FAILED',
  'SIMULATOR_NODE_NOT_FOUND',
  'SIMULATOR_NODE_ALREADY_EXISTS',
  'SIMULATOR_CONTROLLER_NOT_FOUND',
  'SIMULATOR_CHANNEL_NOT_SUPPORTED',
  'SIMULATOR_COLUMN_NOT_FOUND',
  'SIMULATOR_COLUMN_ALREADY_EXISTS',
  'SIMULATOR_PALETTE_NOT_FOUND',
  'SIMULATOR_DRAWING_NOT_FOUND',
  'SIMULATOR_CONNECTION_INVALID',
  'SIMULATOR_CYCLE_DETECTED',
  'SIMULATOR_LIMIT_VIOLATED',
  'SIMULATOR_FRAME_OUT_OF_RANGE',
  'SIMULATOR_NON_FINITE_VALUE',
  'SIMULATOR_PLAN_REJECTED',
  'SIMULATOR_DUPLICATE_COMMAND_ID',
  'SIMULATOR_CANCELLED',
  'SIMULATOR_TIMEOUT',
  'SIMULATOR_BUDGET_EXCEEDED',
  'SIMULATOR_STATE_INVALID',
  'SIMULATOR_ROLLBACK_FAILED',
  'SIMULATOR_ILLEGAL_EXECUTION_CLAIM',

  'RIG_MANIFEST_INVALID',
  'RIG_INCOMPATIBLE',
  'RIG_CONTROLLER_CYCLE',
  'RIG_DUPLICATE_ALIAS',
  'RIG_MIRROR_CONFLICT',

  'SNAPSHOT_NOT_FOUND',
  'SNAPSHOT_CORRUPT',
  'SNAPSHOT_CHECKSUM_MISMATCH',
  'SNAPSHOT_SCHEMA_UNSUPPORTED',
  'SNAPSHOT_WRITE_FAILED',
  'SNAPSHOT_PATH_REJECTED',

  'READBACK_MISMATCH',
  'QA_STRUCTURAL_VIOLATION'
] as const;

export type MlErrorCode = (typeof ML_ERROR_CODES)[number];

export interface MlErrorDefinition {
  readonly code: MlErrorCode;
  /** Whether a retry with identical inputs could plausibly succeed. */
  readonly retryable: boolean;
  /** Retry is only ever attempted for these classes; see MlOrchestrator.retryJob. */
  readonly retryClass: 'none' | 'transport' | 'memory' | 'worker';
  readonly httpStatusHint: number;
  readonly summary: string;
}

const DEFINITIONS: Record<MlErrorCode, MlErrorDefinition> = {
  ML_PROVIDER_NOT_FOUND: { code: 'ML_PROVIDER_NOT_FOUND', retryable: false, retryClass: 'none', httpStatusHint: 404, summary: 'No provider is registered under the requested id.' },
  ML_PROVIDER_ALREADY_REGISTERED: { code: 'ML_PROVIDER_ALREADY_REGISTERED', retryable: false, retryClass: 'none', httpStatusHint: 409, summary: 'A provider with this id is already registered.' },
  ML_PROVIDER_CONFLICT: { code: 'ML_PROVIDER_CONFLICT', retryable: false, retryClass: 'none', httpStatusHint: 409, summary: 'Two registered providers declare incompatible metadata for the same model.' },
  ML_MODEL_NOT_INSTALLED: { code: 'ML_MODEL_NOT_INSTALLED', retryable: false, retryClass: 'none', httpStatusHint: 412, summary: 'Model weights are not present in the local model cache.' },
  ML_MODEL_REVISION_MISMATCH: { code: 'ML_MODEL_REVISION_MISMATCH', retryable: false, retryClass: 'none', httpStatusHint: 412, summary: 'Installed revision differs from the revision the catalog pins.' },
  ML_WEIGHTS_HASH_MISMATCH: { code: 'ML_WEIGHTS_HASH_MISMATCH', retryable: false, retryClass: 'none', httpStatusHint: 412, summary: 'Weights file digest does not match the trusted manifest entry.' },
  ML_WEIGHTS_HASH_UNVERIFIED: { code: 'ML_WEIGHTS_HASH_UNVERIFIED', retryable: false, retryClass: 'none', httpStatusHint: 412, summary: 'No trusted digest exists for these weights; the file stays quarantined.' },
  ML_LICENSE_BLOCKED: { code: 'ML_LICENSE_BLOCKED', retryable: false, retryClass: 'none', httpStatusHint: 403, summary: 'Licence policy forbids this use of the model or dataset.' },
  ML_LICENSE_UNKNOWN: { code: 'ML_LICENSE_UNKNOWN', retryable: false, retryClass: 'none', httpStatusHint: 403, summary: 'Licence status is unknown; unknown blocks in commercial mode.' },
  ML_CONSENT_MISSING: { code: 'ML_CONSENT_MISSING', retryable: false, retryClass: 'none', httpStatusHint: 403, summary: 'Operation needs a consent artifact that was not supplied or is revoked.' },
  ML_UNSUPPORTED_HARDWARE: { code: 'ML_UNSUPPORTED_HARDWARE', retryable: false, retryClass: 'none', httpStatusHint: 412, summary: 'No device on this host satisfies the provider hardware requirements.' },
  ML_INSUFFICIENT_MEMORY: { code: 'ML_INSUFFICIENT_MEMORY', retryable: false, retryClass: 'none', httpStatusHint: 412, summary: 'Estimated memory need exceeds what the probe reports as available.' },
  ML_INPUT_SCHEMA_INVALID: { code: 'ML_INPUT_SCHEMA_INVALID', retryable: false, retryClass: 'none', httpStatusHint: 400, summary: 'Request failed its versioned input contract.' },
  ML_OUTPUT_SCHEMA_INVALID: { code: 'ML_OUTPUT_SCHEMA_INVALID', retryable: false, retryClass: 'none', httpStatusHint: 502, summary: 'Model output failed its versioned output contract.' },
  ML_TIMEOUT: { code: 'ML_TIMEOUT', retryable: false, retryClass: 'none', httpStatusHint: 504, summary: 'Job exceeded its timeout budget.' },
  ML_CANCELLED: { code: 'ML_CANCELLED', retryable: false, retryClass: 'none', httpStatusHint: 499, summary: 'Job was cancelled by the caller.' },
  ML_OOM: { code: 'ML_OOM', retryable: true, retryClass: 'memory', httpStatusHint: 503, summary: 'Worker ran out of memory; retry only after unloading other models.' },
  ML_WORKER_CRASHED: { code: 'ML_WORKER_CRASHED', retryable: true, retryClass: 'worker', httpStatusHint: 503, summary: 'Isolated worker died; the job may be re-submitted.' },
  ML_TRANSPORT_FAILED: { code: 'ML_TRANSPORT_FAILED', retryable: true, retryClass: 'transport', httpStatusHint: 503, summary: 'Idempotent transport failure talking to the runtime.' },
  ML_ARTIFACT_HASH_MISMATCH: { code: 'ML_ARTIFACT_HASH_MISMATCH', retryable: false, retryClass: 'none', httpStatusHint: 502, summary: 'Artifact digest does not match the manifest entry.' },
  ML_ARTIFACT_NOT_FOUND: { code: 'ML_ARTIFACT_NOT_FOUND', retryable: false, retryClass: 'none', httpStatusHint: 404, summary: 'Referenced artifact is absent from the artifact store.' },
  ML_ARTIFACT_PATH_REJECTED: { code: 'ML_ARTIFACT_PATH_REJECTED', retryable: false, retryClass: 'none', httpStatusHint: 403, summary: 'Path escapes the allowed roots, or traverses a symlink out of them.' },
  ML_PROMPT_INJECTION_DETECTED: { code: 'ML_PROMPT_INJECTION_DETECTED', retryable: false, retryClass: 'none', httpStatusHint: 422, summary: 'Untrusted model or media content tried to issue instructions.' },
  ML_JOB_NOT_FOUND: { code: 'ML_JOB_NOT_FOUND', retryable: false, retryClass: 'none', httpStatusHint: 404, summary: 'No job with this id exists in the job store.' },
  ML_JOB_NOT_RETRYABLE: { code: 'ML_JOB_NOT_RETRYABLE', retryable: false, retryClass: 'none', httpStatusHint: 409, summary: 'Job failed for a reason that a retry cannot change.' },
  ML_RUNTIME_UNAVAILABLE: { code: 'ML_RUNTIME_UNAVAILABLE', retryable: true, retryClass: 'transport', httpStatusHint: 503, summary: 'Python ML runtime is not reachable.' },
  ML_CATALOG_INVALID: { code: 'ML_CATALOG_INVALID', retryable: false, retryClass: 'none', httpStatusHint: 500, summary: 'Model catalog failed validation.' },
  HARMONY_PLAN_INVALID: { code: 'HARMONY_PLAN_INVALID', retryable: false, retryClass: 'none', httpStatusHint: 400, summary: 'Harmony command plan failed its schema or invariant checks.' },
  HARMONY_EXECUTION_NOT_AVAILABLE: { code: 'HARMONY_EXECUTION_NOT_AVAILABLE', retryable: false, retryClass: 'none', httpStatusHint: 412, summary: 'No licensed Harmony is reachable; the plan stays unexecuted.' },
  HARMONY_POSTCONDITION_FAILED: { code: 'HARMONY_POSTCONDITION_FAILED', retryable: false, retryClass: 'none', httpStatusHint: 500, summary: 'Command ran but its declared postcondition did not hold afterwards.' },
  DATASET_LICENSE_UNKNOWN: { code: 'DATASET_LICENSE_UNKNOWN', retryable: false, retryClass: 'none', httpStatusHint: 403, summary: 'Dataset licence is unknown; it cannot enter a commercial pipeline.' },
  DATASET_NOT_REGISTERED: { code: 'DATASET_NOT_REGISTERED', retryable: false, retryClass: 'none', httpStatusHint: 404, summary: 'Dataset is not present in the DataRegistry.' },

  SIMULATOR_COMMAND_NOT_SUPPORTED: { code: 'SIMULATOR_COMMAND_NOT_SUPPORTED', retryable: false, retryClass: 'none', httpStatusHint: 501, summary: 'The simulator has no handler for this command type; it is reported, never silently skipped.' },
  SIMULATOR_PRECONDITION_FAILED: { code: 'SIMULATOR_PRECONDITION_FAILED', retryable: false, retryClass: 'none', httpStatusHint: 412, summary: 'A declared precondition did not hold against the current scene state.' },
  SIMULATOR_POSTCONDITION_FAILED: { code: 'SIMULATOR_POSTCONDITION_FAILED', retryable: false, retryClass: 'none', httpStatusHint: 500, summary: 'A command applied but its declared postcondition did not hold afterwards.' },
  SIMULATOR_NODE_NOT_FOUND: { code: 'SIMULATOR_NODE_NOT_FOUND', retryable: false, retryClass: 'none', httpStatusHint: 404, summary: 'The referenced node path does not exist in the scene.' },
  SIMULATOR_NODE_ALREADY_EXISTS: { code: 'SIMULATOR_NODE_ALREADY_EXISTS', retryable: false, retryClass: 'none', httpStatusHint: 409, summary: 'A node already occupies that path.' },
  SIMULATOR_CONTROLLER_NOT_FOUND: { code: 'SIMULATOR_CONTROLLER_NOT_FOUND', retryable: false, retryClass: 'none', httpStatusHint: 404, summary: 'The rig manifest declares no controller with that id or alias.' },
  SIMULATOR_CHANNEL_NOT_SUPPORTED: { code: 'SIMULATOR_CHANNEL_NOT_SUPPORTED', retryable: false, retryClass: 'none', httpStatusHint: 412, summary: 'The controller does not accept that channel.' },
  SIMULATOR_COLUMN_NOT_FOUND: { code: 'SIMULATOR_COLUMN_NOT_FOUND', retryable: false, retryClass: 'none', httpStatusHint: 404, summary: 'No column with that name exists.' },
  SIMULATOR_COLUMN_ALREADY_EXISTS: { code: 'SIMULATOR_COLUMN_ALREADY_EXISTS', retryable: false, retryClass: 'none', httpStatusHint: 409, summary: 'A column with that name already exists.' },
  SIMULATOR_PALETTE_NOT_FOUND: { code: 'SIMULATOR_PALETTE_NOT_FOUND', retryable: false, retryClass: 'none', httpStatusHint: 404, summary: 'No palette with that name exists in the scene.' },
  SIMULATOR_DRAWING_NOT_FOUND: { code: 'SIMULATOR_DRAWING_NOT_FOUND', retryable: false, retryClass: 'none', httpStatusHint: 404, summary: 'The drawing or substitution name is not declared on the element.' },
  SIMULATOR_CONNECTION_INVALID: { code: 'SIMULATOR_CONNECTION_INVALID', retryable: false, retryClass: 'none', httpStatusHint: 409, summary: 'The connection is malformed, duplicated, or targets an occupied port.' },
  SIMULATOR_CYCLE_DETECTED: { code: 'SIMULATOR_CYCLE_DETECTED', retryable: false, retryClass: 'none', httpStatusHint: 409, summary: 'The operation would introduce a cycle in the node graph or peg hierarchy.' },
  SIMULATOR_LIMIT_VIOLATED: { code: 'SIMULATOR_LIMIT_VIOLATED', retryable: false, retryClass: 'none', httpStatusHint: 422, summary: 'A value exceeds the controller limits declared by the rig manifest.' },
  SIMULATOR_FRAME_OUT_OF_RANGE: { code: 'SIMULATOR_FRAME_OUT_OF_RANGE', retryable: false, retryClass: 'none', httpStatusHint: 422, summary: 'A frame lies outside the scene frame range, or is frame 0 on a 1-based timeline.' },
  SIMULATOR_NON_FINITE_VALUE: { code: 'SIMULATOR_NON_FINITE_VALUE', retryable: false, retryClass: 'none', httpStatusHint: 422, summary: 'NaN or Infinity reached a scene value.' },
  SIMULATOR_PLAN_REJECTED: { code: 'SIMULATOR_PLAN_REJECTED', retryable: false, retryClass: 'none', httpStatusHint: 400, summary: 'The plan failed validation before any command ran.' },
  SIMULATOR_DUPLICATE_COMMAND_ID: { code: 'SIMULATOR_DUPLICATE_COMMAND_ID', retryable: false, retryClass: 'none', httpStatusHint: 400, summary: 'Two commands in the plan share a commandId.' },
  SIMULATOR_CANCELLED: { code: 'SIMULATOR_CANCELLED', retryable: false, retryClass: 'none', httpStatusHint: 499, summary: 'Execution was cancelled; an atomic plan rolled back entirely.' },
  SIMULATOR_TIMEOUT: { code: 'SIMULATOR_TIMEOUT', retryable: false, retryClass: 'none', httpStatusHint: 504, summary: 'Execution exceeded its wall-clock budget.' },
  SIMULATOR_BUDGET_EXCEEDED: { code: 'SIMULATOR_BUDGET_EXCEEDED', retryable: false, retryClass: 'none', httpStatusHint: 413, summary: 'The plan exceeds the bounded execution limits (command or node count).' },
  SIMULATOR_STATE_INVALID: { code: 'SIMULATOR_STATE_INVALID', retryable: false, retryClass: 'none', httpStatusHint: 500, summary: 'The resulting scene state failed its own schema.' },
  SIMULATOR_ROLLBACK_FAILED: { code: 'SIMULATOR_ROLLBACK_FAILED', retryable: false, retryClass: 'none', httpStatusHint: 500, summary: 'Rollback did not restore the recorded before-hash.' },
  SIMULATOR_ILLEGAL_EXECUTION_CLAIM: { code: 'SIMULATOR_ILLEGAL_EXECUTION_CLAIM', retryable: false, retryClass: 'none', httpStatusHint: 400, summary: 'Something tried to mark simulated output as real Harmony execution.' },

  RIG_MANIFEST_INVALID: { code: 'RIG_MANIFEST_INVALID', retryable: false, retryClass: 'none', httpStatusHint: 400, summary: 'The rig manifest failed its schema or its structural invariants.' },
  RIG_INCOMPATIBLE: { code: 'RIG_INCOMPATIBLE', retryable: false, retryClass: 'none', httpStatusHint: 412, summary: 'The rig cannot satisfy the command plan; execution is refused.' },
  RIG_CONTROLLER_CYCLE: { code: 'RIG_CONTROLLER_CYCLE', retryable: false, retryClass: 'none', httpStatusHint: 400, summary: 'The controller parent hierarchy contains a cycle.' },
  RIG_DUPLICATE_ALIAS: { code: 'RIG_DUPLICATE_ALIAS', retryable: false, retryClass: 'none', httpStatusHint: 400, summary: 'Two controllers claim the same alias.' },
  RIG_MIRROR_CONFLICT: { code: 'RIG_MIRROR_CONFLICT', retryable: false, retryClass: 'none', httpStatusHint: 400, summary: 'Mirror pairing is not symmetric.' },

  SNAPSHOT_NOT_FOUND: { code: 'SNAPSHOT_NOT_FOUND', retryable: false, retryClass: 'none', httpStatusHint: 404, summary: 'No snapshot exists for that scene and revision.' },
  SNAPSHOT_CORRUPT: { code: 'SNAPSHOT_CORRUPT', retryable: false, retryClass: 'none', httpStatusHint: 422, summary: 'The snapshot file is unreadable or fails its schema.' },
  SNAPSHOT_CHECKSUM_MISMATCH: { code: 'SNAPSHOT_CHECKSUM_MISMATCH', retryable: false, retryClass: 'none', httpStatusHint: 422, summary: 'The stored checksum does not match the stored payload.' },
  SNAPSHOT_SCHEMA_UNSUPPORTED: { code: 'SNAPSHOT_SCHEMA_UNSUPPORTED', retryable: false, retryClass: 'none', httpStatusHint: 422, summary: 'The snapshot schema version has no migration path to the current one.' },
  SNAPSHOT_WRITE_FAILED: { code: 'SNAPSHOT_WRITE_FAILED', retryable: true, retryClass: 'transport', httpStatusHint: 500, summary: 'The atomic write could not complete.' },
  SNAPSHOT_PATH_REJECTED: { code: 'SNAPSHOT_PATH_REJECTED', retryable: false, retryClass: 'none', httpStatusHint: 403, summary: 'The snapshot path escapes the allowed store root.' },

  READBACK_MISMATCH: { code: 'READBACK_MISMATCH', retryable: false, retryClass: 'none', httpStatusHint: 500, summary: 'What was read back does not match what the plan should have produced.' },
  QA_STRUCTURAL_VIOLATION: { code: 'QA_STRUCTURAL_VIOLATION', retryable: false, retryClass: 'none', httpStatusHint: 422, summary: 'Structural offline QA found a blocking defect in the scene.' }
};

export function getMlErrorDefinition(code: MlErrorCode): MlErrorDefinition {
  return DEFINITIONS[code];
}

export function listMlErrorDefinitions(): readonly MlErrorDefinition[] {
  return ML_ERROR_CODES.map(code => DEFINITIONS[code]);
}

export function isRetryableMlErrorCode(code: MlErrorCode): boolean {
  return DEFINITIONS[code].retryable;
}

export interface MlErrorContext {
  jobId?: string;
  correlationId?: string;
  providerId?: string;
  modelId?: string;
  stage?: string;
  /** Free-form, but must never contain secrets, script text or biometric payloads. */
  detail?: Record<string, unknown>;
}

export class MlError extends Error {
  readonly code: MlErrorCode;
  readonly retryable: boolean;
  readonly retryClass: MlErrorDefinition['retryClass'];
  readonly context: MlErrorContext;

  constructor(code: MlErrorCode, message: string, context: MlErrorContext = {}, options?: { cause?: unknown }) {
    super(message, options as ErrorOptions);
    this.name = 'MlError';
    this.code = code;
    const def = DEFINITIONS[code];
    this.retryable = def.retryable;
    this.retryClass = def.retryClass;
    this.context = context;
  }

  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      retryClass: this.retryClass,
      ...this.context
    };
  }
}

/**
 * Narrows an unknown thrown value into an MlError without swallowing it. Anything that is not
 * already an MlError becomes `fallback` with the original attached as `cause` — the reason is
 * preserved rather than flattened into a generic failure.
 */
export function toMlError(error: unknown, fallback: MlErrorCode, context: MlErrorContext = {}): MlError {
  if (error instanceof MlError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new MlError(fallback, message, context, { cause: error });
}
