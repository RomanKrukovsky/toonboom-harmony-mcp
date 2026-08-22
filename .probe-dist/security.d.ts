export type HarmonyErrorCode = 'HARMONY_NOT_INSTALLED' | 'HARMONY_VERSION_UNKNOWN' | 'CONTROL_CENTER_NOT_FOUND' | 'CONTROL_CENTER_UNREACHABLE' | 'CONTROL_CENTER_AUTH_FAILED' | 'SCRIPT_TIMEOUT' | 'SCRIPT_FAILED' | 'PYTHON_API_UNAVAILABLE' | 'PYTHON_BRIDGE_FAILED' | 'UNSUPPORTED_BY_VERSION' | 'DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION' | 'PATH_NOT_ALLOWED' | 'PATH_TRAVERSAL_BLOCKED' | 'RAW_QTSCRIPT_DISABLED' | 'INVALID_HARMONY_OBJECT' | 'SCENE_LOCKED' | 'SCENE_NOT_FOUND' | 'JOB_NOT_FOUND' | 'ENVIRONMENT_NOT_FOUND' | 'RENDER_FAILED' | 'VECTORIZE_FAILED' | 'RECONSTRUCTION_CORE_UNAVAILABLE' | 'RECONSTRUCTION_FAILED' | 'INVALID_RECONSTRUCTION_MANIFEST' | 'HARMONY_SCENE_VERIFICATION_FAILED' | 'WEBCC_UNAVAILABLE' | 'HELPER_UNAVAILABLE' | 'CAPABILITY_NOT_DETECTED' | 'INVALID_INPUT' | 'HARMONY_EXECUTION_FAILED' | 'CAPTURE_SESSION_NOT_FOUND' | 'CAPTURE_SESSION_INVALID_STATE' | 'CAPTURE_SESSION_INTERRUPTED' | 'CAPTURE_ARTIFACT_IMMUTABLE' | 'CAPTURE_LIMIT_EXCEEDED' | 'CAPTURE_STATE_PROVIDER_UNAVAILABLE' | 'CAPTURE_SCENE_ROOT_NOT_ALLOWED';
/**
 * Unified result verification status for all tools.
 * Use this instead of generic success/error to be honest about what was actually executed.
 */
export type ResultStatus = 'verified_real' | 'implemented_unverified' | 'mock_only' | 'not_implemented' | 'requires_real_harmony' | 'failed';
export interface ResultWithStatus<T = any> {
    verification: ResultStatus;
    data?: T;
    message?: string;
    note?: string;
    implemented?: 'full' | 'partial' | 'stub';
    artifactCreated?: boolean;
}
export declare function createResult<T>(verification: ResultStatus, data?: T, message?: string, options?: {
    note?: string;
    implemented?: 'full' | 'partial' | 'stub';
    artifactCreated?: boolean;
}): ResultWithStatus<T>;
export declare class HarmonyError extends Error {
    code: HarmonyErrorCode;
    details?: any;
    constructor(code: HarmonyErrorCode, message: string, details?: any);
    toJSON(): {
        error: boolean;
        code: HarmonyErrorCode;
        message: string;
        details: any;
    };
}
export declare function logOperation(operation: string, params: any, status: 'SUCCESS' | 'ERROR' | 'DRY_RUN', error?: any): void;
export declare function verifyPathAccess(filePath: string): string;
export interface ConfirmationParams {
    confirm?: boolean;
    confirmationText?: string;
}
export declare function enforceDestructiveSafety(operationName: string, confirmation?: ConfirmationParams): void;
export interface DryRunResult {
    dryRun: true;
    message: string;
    params: any;
}
export declare function executeWithDryRun<T>(operationName: string, params: any, dryRun: true, executeFn: () => T | Promise<T>, dryRunFn?: undefined): DryRunResult;
export declare function executeWithDryRun<T>(operationName: string, params: any, dryRun: false, executeFn: () => T | Promise<T>, dryRunFn?: () => T | Promise<T>): Promise<T> | T;
export declare function executeWithDryRun<T>(operationName: string, params: any, dryRun: boolean | undefined, executeFn: () => T | Promise<T>, dryRunFn?: () => T | Promise<T>): Promise<T> | T | DryRunResult;
export declare function limitOutput(output: string): string;
export type VerificationStatus = 'verified_real' | 'implemented_unverified' | 'mock_only' | 'not_implemented' | 'requires_real_harmony' | 'failed';
export interface VerifiedResult<T = any> {
    verification: VerificationStatus;
    data?: T;
    message?: string;
    note?: string;
    executed?: boolean;
    artifactCreated?: boolean;
}
export declare function createVerifiedResult<T>(verification: VerificationStatus, data?: T, options?: {
    message?: string;
    note?: string;
    executed?: boolean;
    artifactCreated?: boolean;
}): VerifiedResult<T>;
