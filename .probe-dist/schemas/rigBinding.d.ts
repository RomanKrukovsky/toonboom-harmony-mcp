import { z } from 'zod';
export declare const rigBindingEntrySchema: z.ZodObject<{
    template_slot: z.ZodString;
    pir_landmark: z.ZodOptional<z.ZodString>;
    derived_from: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    confidence: z.ZodNumber;
    resolution: z.ZodEnum<["DIRECT", "DERIVED_MIDPOINT", "FALLBACK", "MANUAL"]>;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    resolution: "DIRECT" | "DERIVED_MIDPOINT" | "FALLBACK" | "MANUAL";
    template_slot: string;
    pir_landmark?: string | undefined;
    derived_from?: string[] | undefined;
}, {
    confidence: number;
    resolution: "DIRECT" | "DERIVED_MIDPOINT" | "FALLBACK" | "MANUAL";
    template_slot: string;
    pir_landmark?: string | undefined;
    derived_from?: string[] | undefined;
}>;
export declare const rigBindingPlanV1Schema: z.ZodObject<{
    schema: z.ZodLiteral<"toon-boom-mcp/rig-binding-plan-v1">;
    character_id: z.ZodString;
    template: z.ZodObject<{
        template_id: z.ZodString;
        version: z.ZodString;
        content_hash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version: string;
        template_id: string;
        content_hash: string;
    }, {
        version: string;
        template_id: string;
        content_hash: string;
    }>;
    source: z.ZodObject<{
        pir_id: z.ZodString;
        pir_hash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        pir_id: string;
        pir_hash: string;
    }, {
        pir_id: string;
        pir_hash: string;
    }>;
    bindings: z.ZodArray<z.ZodObject<{
        template_slot: z.ZodString;
        pir_landmark: z.ZodOptional<z.ZodString>;
        derived_from: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        confidence: z.ZodNumber;
        resolution: z.ZodEnum<["DIRECT", "DERIVED_MIDPOINT", "FALLBACK", "MANUAL"]>;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        resolution: "DIRECT" | "DERIVED_MIDPOINT" | "FALLBACK" | "MANUAL";
        template_slot: string;
        pir_landmark?: string | undefined;
        derived_from?: string[] | undefined;
    }, {
        confidence: number;
        resolution: "DIRECT" | "DERIVED_MIDPOINT" | "FALLBACK" | "MANUAL";
        template_slot: string;
        pir_landmark?: string | undefined;
        derived_from?: string[] | undefined;
    }>, "many">;
    unresolved: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    source: {
        pir_id: string;
        pir_hash: string;
    };
    warnings: string[];
    template: {
        version: string;
        template_id: string;
        content_hash: string;
    };
    schema: "toon-boom-mcp/rig-binding-plan-v1";
    bindings: {
        confidence: number;
        resolution: "DIRECT" | "DERIVED_MIDPOINT" | "FALLBACK" | "MANUAL";
        template_slot: string;
        pir_landmark?: string | undefined;
        derived_from?: string[] | undefined;
    }[];
    character_id: string;
    unresolved: string[];
}, {
    source: {
        pir_id: string;
        pir_hash: string;
    };
    template: {
        version: string;
        template_id: string;
        content_hash: string;
    };
    schema: "toon-boom-mcp/rig-binding-plan-v1";
    bindings: {
        confidence: number;
        resolution: "DIRECT" | "DERIVED_MIDPOINT" | "FALLBACK" | "MANUAL";
        template_slot: string;
        pir_landmark?: string | undefined;
        derived_from?: string[] | undefined;
    }[];
    character_id: string;
    warnings?: string[] | undefined;
    unresolved?: string[] | undefined;
}>;
export type RigBindingPlanV1 = z.infer<typeof rigBindingPlanV1Schema>;
export type RigBindingEntry = z.infer<typeof rigBindingEntrySchema>;
