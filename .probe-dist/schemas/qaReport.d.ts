import { z } from 'zod';
/**
 * qaReport.ts — output of the RetakeEngine.
 *
 * The engine takes a rendered shot (PerformancePIR + render metrics) and
 * checks it against the QaThresholds from the ShowBible family. Each check
 * produces a QaFinding with a severity; any finding above
 * `qaThresholds.autoFixableSeverityMax` or in
 * `qaThresholds.requireHumanApprovalFor` blocks autonomous approval.
 */
export declare const QA_REPORT_SCHEMA_VERSION = "1.0";
export declare const qaSeveritySchema: z.ZodEnum<["low", "medium", "high", "critical"]>;
export declare const qaFindingSchema: z.ZodObject<{
    findingId: z.ZodString;
    check: z.ZodString;
    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    measured: z.ZodNumber;
    threshold: z.ZodNumber;
    message: z.ZodString;
    autoFixable: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    threshold: number;
    autoFixable: boolean;
    check: string;
    findingId: string;
    measured: number;
}, {
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    threshold: number;
    check: string;
    findingId: string;
    measured: number;
    autoFixable?: boolean | undefined;
}>;
export declare const qaReportSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    shotId: z.ZodString;
    performanceId: z.ZodString;
    overallStatus: z.ZodEnum<["approved", "needs_retake", "blocked"]>;
    findings: z.ZodDefault<z.ZodArray<z.ZodObject<{
        findingId: z.ZodString;
        check: z.ZodString;
        severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
        measured: z.ZodNumber;
        threshold: z.ZodNumber;
        message: z.ZodString;
        autoFixable: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        message: string;
        severity: "low" | "medium" | "high" | "critical";
        threshold: number;
        autoFixable: boolean;
        check: string;
        findingId: string;
        measured: number;
    }, {
        message: string;
        severity: "low" | "medium" | "high" | "critical";
        threshold: number;
        check: string;
        findingId: string;
        measured: number;
        autoFixable?: boolean | undefined;
    }>, "many">>;
    requiresHumanApproval: z.ZodDefault<z.ZodBoolean>;
    humanApprovalReasons: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    checkedAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    schemaVersion: "1.0";
    shotId: string;
    performanceId: string;
    overallStatus: "blocked" | "approved" | "needs_retake";
    findings: {
        message: string;
        severity: "low" | "medium" | "high" | "critical";
        threshold: number;
        autoFixable: boolean;
        check: string;
        findingId: string;
        measured: number;
    }[];
    requiresHumanApproval: boolean;
    humanApprovalReasons: string[];
    checkedAt: string;
}, {
    schemaVersion: "1.0";
    shotId: string;
    performanceId: string;
    overallStatus: "blocked" | "approved" | "needs_retake";
    checkedAt: string;
    findings?: {
        message: string;
        severity: "low" | "medium" | "high" | "critical";
        threshold: number;
        check: string;
        findingId: string;
        measured: number;
        autoFixable?: boolean | undefined;
    }[] | undefined;
    requiresHumanApproval?: boolean | undefined;
    humanApprovalReasons?: string[] | undefined;
}>;
export type QaReport = z.infer<typeof qaReportSchema>;
export type QaFinding = z.infer<typeof qaFindingSchema>;
export type QaSeverity = z.infer<typeof qaSeveritySchema>;
