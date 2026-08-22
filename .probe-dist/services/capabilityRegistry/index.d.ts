export type CapabilityStatus = 'unit_verified' | 'simulation_verified' | 'adapter_contract_verified' | 'real_harmony_verified' | 'manually_verified';
export interface CapabilityInfo {
    operation: string;
    status: CapabilityStatus;
    description: string;
    backend: 'python_api' | 'qt_script' | 'control_center_cli' | 'control_center_telnet' | 'harmony_cli' | 'ui_automation' | 'simulation';
    requiresLicense: boolean;
    requiresRealHarmony: boolean;
    notes?: string;
}
export declare class CapabilityRegistry {
    private static capabilityMatrix;
    detectCapabilities(): Promise<{
        isHarmonyInstalled: boolean;
        harmonyVersion?: string;
        harmonyBin?: string;
        pythonApiAvailable: boolean;
        controlCenterCliAvailable: boolean;
        renderCliAvailable: boolean;
        webccAvailable: boolean;
        supportedOperations: string[];
        matrix: Record<string, CapabilityInfo>;
    }>;
    getOperationStatus(operation: string): CapabilityStatus;
}
