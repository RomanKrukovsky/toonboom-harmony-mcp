import { z } from 'zod';
export const rigAuditIssueTypeSchema = z.enum([
    'missing_separate_position',
    'unlocked_drawing',
    'missing_z_offset',
    'invalid_naming_convention',
    'unconnected_autopatch',
    'missing_master_peg',
    'unoptimized_deformer'
]);
export const rigAuditSeveritySchema = z.enum(['error', 'warning', 'info']);
export const rigAuditIssueSchema = z.object({
    issueId: z.string(),
    nodePath: z.string(),
    nodeType: z.string(),
    type: rigAuditIssueTypeSchema,
    severity: rigAuditSeveritySchema,
    description: z.string(),
    expectedValue: z.any().optional(),
    actualValue: z.any().optional(),
    autoFixable: z.boolean().default(true),
    autoFixAction: z.object({
        actionType: z.string(),
        attributeName: z.string().optional(),
        attributeValue: z.any().optional()
    }).optional()
});
export const rigAuditReportSchema = z.object({
    reportId: z.string(),
    targetGroup: z.string(),
    timestamp: z.string(),
    totalNodesScanned: z.number(),
    issues: z.array(rigAuditIssueSchema),
    summary: z.object({
        errors: z.number(),
        warnings: z.number(),
        infos: z.number()
    }),
    isPass: z.boolean()
});
export const rigAutoFixPlanSchema = z.object({
    planId: z.string(),
    targetGroup: z.string(),
    fixes: z.array(z.object({
        nodePath: z.string(),
        actionType: z.string(),
        attributeName: z.string().optional(),
        attributeValue: z.any().optional()
    }))
});
