export type RecoveryStrategy = 'retry' | 'hotkey_reset' | 'api_fallback' | 'human_confirm' | 'auto_bailout';
export interface RecoveryResult {
    recovered: boolean;
    strategyUsed: RecoveryStrategy;
    message: string;
}
export declare class RecoveryAdapter {
    static attemptRecovery(stepId: string, strategy: RecoveryStrategy, errorMsg: string, params?: any): Promise<RecoveryResult>;
}
