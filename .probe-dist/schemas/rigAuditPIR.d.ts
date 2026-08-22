import { z } from 'zod';
export declare const rigAuditIssueTypeSchema: z.ZodEnum<["missing_separate_position", "unlocked_drawing", "missing_z_offset", "invalid_naming_convention", "unconnected_autopatch", "missing_master_peg", "unoptimized_deformer"]>;
export declare const rigAuditSeveritySchema: z.ZodEnum<["error", "warning", "info"]>;
export declare const rigAuditIssueSchema: z.ZodObject<{
    issueId: z.ZodString;
    nodePath: z.ZodString;
    nodeType: z.ZodString;
    type: z.ZodEnum<["missing_separate_position", "unlocked_drawing", "missing_z_offset", "invalid_naming_convention", "unconnected_autopatch", "missing_master_peg", "unoptimized_deformer"]>;
    severity: z.ZodEnum<["error", "warning", "info"]>;
    description: z.ZodString;
    expectedValue: z.ZodOptional<z.ZodAny>;
    actualValue: z.ZodOptional<z.ZodAny>;
    autoFixable: z.ZodDefault<z.ZodBoolean>;
    autoFixAction: z.ZodOptional<z.ZodObject<{
        actionType: z.ZodString;
        attributeName: z.ZodOptional<z.ZodString>;
        attributeValue: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        actionType: string;
        attributeName?: string | undefined;
        attributeValue?: any;
    }, {
        actionType: string;
        attributeName?: string | undefined;
        attributeValue?: any;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "missing_separate_position" | "unlocked_drawing" | "missing_z_offset" | "invalid_naming_convention" | "unconnected_autopatch" | "missing_master_peg" | "unoptimized_deformer";
    severity: "error" | "warning" | "info";
    nodePath: string;
    nodeType: string;
    description: string;
    issueId: string;
    autoFixable: boolean;
    expectedValue?: any;
    actualValue?: any;
    autoFixAction?: {
        actionType: string;
        attributeName?: string | undefined;
        attributeValue?: any;
    } | undefined;
}, {
    type: "missing_separate_position" | "unlocked_drawing" | "missing_z_offset" | "invalid_naming_convention" | "unconnected_autopatch" | "missing_master_peg" | "unoptimized_deformer";
    severity: "error" | "warning" | "info";
    nodePath: string;
    nodeType: string;
    description: string;
    issueId: string;
    expectedValue?: any;
    actualValue?: any;
    autoFixable?: boolean | undefined;
    autoFixAction?: {
        actionType: string;
        attributeName?: string | undefined;
        attributeValue?: any;
    } | undefined;
}>;
export type RigAuditIssue = z.infer<typeof rigAuditIssueSchema>;
export declare const rigAuditReportSchema: z.ZodObject<{
    reportId: z.ZodString;
    targetGroup: z.ZodString;
    timestamp: z.ZodString;
    totalNodesScanned: z.ZodNumber;
    issues: z.ZodArray<z.ZodObject<{
        issueId: z.ZodString;
        nodePath: z.ZodString;
        nodeType: z.ZodString;
        type: z.ZodEnum<["missing_separate_position", "unlocked_drawing", "missing_z_offset", "invalid_naming_convention", "unconnected_autopatch", "missing_master_peg", "unoptimized_deformer"]>;
        severity: z.ZodEnum<["error", "warning", "info"]>;
        description: z.ZodString;
        expectedValue: z.ZodOptional<z.ZodAny>;
        actualValue: z.ZodOptional<z.ZodAny>;
        autoFixable: z.ZodDefault<z.ZodBoolean>;
        autoFixAction: z.ZodOptional<z.ZodObject<{
            actionType: z.ZodString;
            attributeName: z.ZodOptional<z.ZodString>;
            attributeValue: z.ZodOptional<z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            actionType: string;
            attributeName?: string | undefined;
            attributeValue?: any;
        }, {
            actionType: string;
            attributeName?: string | undefined;
            attributeValue?: any;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "missing_separate_position" | "unlocked_drawing" | "missing_z_offset" | "invalid_naming_convention" | "unconnected_autopatch" | "missing_master_peg" | "unoptimized_deformer";
        severity: "error" | "warning" | "info";
        nodePath: string;
        nodeType: string;
        description: string;
        issueId: string;
        autoFixable: boolean;
        expectedValue?: any;
        actualValue?: any;
        autoFixAction?: {
            actionType: string;
            attributeName?: string | undefined;
            attributeValue?: any;
        } | undefined;
    }, {
        type: "missing_separate_position" | "unlocked_drawing" | "missing_z_offset" | "invalid_naming_convention" | "unconnected_autopatch" | "missing_master_peg" | "unoptimized_deformer";
        severity: "error" | "warning" | "info";
        nodePath: string;
        nodeType: string;
        description: string;
        issueId: string;
        expectedValue?: any;
        actualValue?: any;
        autoFixable?: boolean | undefined;
        autoFixAction?: {
            actionType: string;
            attributeName?: string | undefined;
            attributeValue?: any;
        } | undefined;
    }>, "many">;
    summary: z.ZodObject<{
        errors: z.ZodNumber;
        warnings: z.ZodNumber;
        infos: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        warnings: number;
        errors: number;
        infos: number;
    }, {
        warnings: number;
        errors: number;
        infos: number;
    }>;
    isPass: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    issues: {
        type: "missing_separate_position" | "unlocked_drawing" | "missing_z_offset" | "invalid_naming_convention" | "unconnected_autopatch" | "missing_master_peg" | "unoptimized_deformer";
        severity: "error" | "warning" | "info";
        nodePath: string;
        nodeType: string;
        description: string;
        issueId: string;
        autoFixable: boolean;
        expectedValue?: any;
        actualValue?: any;
        autoFixAction?: {
            actionType: string;
            attributeName?: string | undefined;
            attributeValue?: any;
        } | undefined;
    }[];
    timestamp: string;
    reportId: string;
    targetGroup: string;
    totalNodesScanned: number;
    summary: {
        warnings: number;
        errors: number;
        infos: number;
    };
    isPass: boolean;
}, {
    issues: {
        type: "missing_separate_position" | "unlocked_drawing" | "missing_z_offset" | "invalid_naming_convention" | "unconnected_autopatch" | "missing_master_peg" | "unoptimized_deformer";
        severity: "error" | "warning" | "info";
        nodePath: string;
        nodeType: string;
        description: string;
        issueId: string;
        expectedValue?: any;
        actualValue?: any;
        autoFixable?: boolean | undefined;
        autoFixAction?: {
            actionType: string;
            attributeName?: string | undefined;
            attributeValue?: any;
        } | undefined;
    }[];
    timestamp: string;
    reportId: string;
    targetGroup: string;
    totalNodesScanned: number;
    summary: {
        warnings: number;
        errors: number;
        infos: number;
    };
    isPass: boolean;
}>;
export type RigAuditReport = z.infer<typeof rigAuditReportSchema>;
export declare const rigAutoFixPlanSchema: z.ZodObject<{
    planId: z.ZodString;
    targetGroup: z.ZodString;
    fixes: z.ZodArray<z.ZodObject<{
        nodePath: z.ZodString;
        actionType: z.ZodString;
        attributeName: z.ZodOptional<z.ZodString>;
        attributeValue: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        nodePath: string;
        actionType: string;
        attributeName?: string | undefined;
        attributeValue?: any;
    }, {
        nodePath: string;
        actionType: string;
        attributeName?: string | undefined;
        attributeValue?: any;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    planId: string;
    targetGroup: string;
    fixes: {
        nodePath: string;
        actionType: string;
        attributeName?: string | undefined;
        attributeValue?: any;
    }[];
}, {
    planId: string;
    targetGroup: string;
    fixes: {
        nodePath: string;
        actionType: string;
        attributeName?: string | undefined;
        attributeValue?: any;
    }[];
}>;
export type RigAutoFixPlan = z.infer<typeof rigAutoFixPlanSchema>;
