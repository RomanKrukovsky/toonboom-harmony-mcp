import { z } from 'zod';
export declare const retargetingPlanSchema: z.ZodObject<{
    schema: z.ZodLiteral<"toon-boom-mcp/retargeting-plan-v1">;
    characterId: z.ZodString;
    performanceId: z.ZodString;
    bindingHash: z.ZodString;
    tracks: z.ZodArray<z.ZodObject<{
        nodeId: z.ZodString;
        keys: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            rotation: z.ZodOptional<z.ZodNumber>;
            x: z.ZodOptional<z.ZodNumber>;
            y: z.ZodOptional<z.ZodNumber>;
            scaleX: z.ZodOptional<z.ZodNumber>;
            scaleY: z.ZodOptional<z.ZodNumber>;
            interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
        }, "strip", z.ZodTypeAny, {
            frame: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            x?: number | undefined;
            y?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
        }, {
            frame: number;
            x?: number | undefined;
            y?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        keys: {
            frame: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            x?: number | undefined;
            y?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
        }[];
        nodeId: string;
    }, {
        keys: {
            frame: number;
            x?: number | undefined;
            y?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }[];
        nodeId: string;
    }>, "many">;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    warnings: string[];
    characterId: string;
    tracks: {
        keys: {
            frame: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            x?: number | undefined;
            y?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
        }[];
        nodeId: string;
    }[];
    schema: "toon-boom-mcp/retargeting-plan-v1";
    performanceId: string;
    bindingHash: string;
}, {
    characterId: string;
    tracks: {
        keys: {
            frame: number;
            x?: number | undefined;
            y?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }[];
        nodeId: string;
    }[];
    schema: "toon-boom-mcp/retargeting-plan-v1";
    performanceId: string;
    bindingHash: string;
    warnings?: string[] | undefined;
}>;
export type RetargetingPlan = z.infer<typeof retargetingPlanSchema>;
