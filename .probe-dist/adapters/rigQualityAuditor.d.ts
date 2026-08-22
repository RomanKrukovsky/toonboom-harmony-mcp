import { RigAuditReport, RigAutoFixPlan } from '../schemas/rigAuditPIR.js';
export declare class RigQualityAuditor {
    /**
     * Processes the raw response from Harmony Bridge and generates an auto-fix plan
     * for issues that are safely fixable.
     */
    static generateAutoFixPlan(report: RigAuditReport): RigAutoFixPlan;
    /**
     * Determines if a report is considered a passing state for production.
     */
    static isProductionReady(report: RigAuditReport): boolean;
}
