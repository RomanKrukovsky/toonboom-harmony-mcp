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
export const QA_REPORT_SCHEMA_VERSION = '1.0';
export const qaSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const qaFindingSchema = z.object({
    findingId: z.string().min(1),
    check: z.string().min(1).describe('Name of the QA check, e.g. "lipsync_drift", "silhouette_quality".'),
    severity: qaSeveritySchema,
    measured: z.number().describe('Measured value for the check.'),
    threshold: z.number().describe('Threshold the check is compared against.'),
    message: z.string().min(1),
    autoFixable: z.boolean().default(false)
}).strict();
export const qaReportSchema = z.object({
    schemaVersion: z.literal(QA_REPORT_SCHEMA_VERSION),
    shotId: z.string().min(1),
    performanceId: z.string().min(1),
    overallStatus: z.enum(['approved', 'needs_retake', 'blocked']),
    findings: z.array(qaFindingSchema).default([]),
    requiresHumanApproval: z.boolean().default(false),
    humanApprovalReasons: z.array(z.string()).default([]),
    checkedAt: z.string().datetime()
}).strict();
