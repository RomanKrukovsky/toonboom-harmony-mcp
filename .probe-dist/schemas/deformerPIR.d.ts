import { z } from 'zod';
export declare const deformerTypeSchema: z.ZodEnum<["Envelope", "Curve", "Bone"]>;
export declare const deformerSpecSchema: z.ZodObject<{
    deformerId: z.ZodString;
    type: z.ZodEnum<["Envelope", "Curve", "Bone"]>;
    targetNode: z.ZodString;
    numPoints: z.ZodDefault<z.ZodNumber>;
    closed: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "Envelope" | "Curve" | "Bone";
    closed: boolean;
    deformerId: string;
    targetNode: string;
    numPoints: number;
}, {
    type: "Envelope" | "Curve" | "Bone";
    deformerId: string;
    targetNode: string;
    closed?: boolean | undefined;
    numPoints?: number | undefined;
}>;
export type DeformerSpec = z.infer<typeof deformerSpecSchema>;
export declare const mcWidgetTypeSchema: z.ZodEnum<["Grid", "Slider"]>;
export declare const masterControllerSpecSchema: z.ZodObject<{
    mcId: z.ZodString;
    name: z.ZodString;
    widgetType: z.ZodEnum<["Grid", "Slider"]>;
    controlledNodes: z.ZodArray<z.ZodString, "many">;
    gridWidth: z.ZodOptional<z.ZodNumber>;
    gridHeight: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    mcId: string;
    widgetType: "Grid" | "Slider";
    controlledNodes: string[];
    gridWidth?: number | undefined;
    gridHeight?: number | undefined;
}, {
    name: string;
    mcId: string;
    widgetType: "Grid" | "Slider";
    controlledNodes: string[];
    gridWidth?: number | undefined;
    gridHeight?: number | undefined;
}>;
export type MasterControllerSpec = z.infer<typeof masterControllerSpecSchema>;
export declare const deformerAssemblyPlanSchema: z.ZodObject<{
    planId: z.ZodString;
    characterName: z.ZodString;
    deformers: z.ZodArray<z.ZodObject<{
        deformerId: z.ZodString;
        type: z.ZodEnum<["Envelope", "Curve", "Bone"]>;
        targetNode: z.ZodString;
        numPoints: z.ZodDefault<z.ZodNumber>;
        closed: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "Envelope" | "Curve" | "Bone";
        closed: boolean;
        deformerId: string;
        targetNode: string;
        numPoints: number;
    }, {
        type: "Envelope" | "Curve" | "Bone";
        deformerId: string;
        targetNode: string;
        closed?: boolean | undefined;
        numPoints?: number | undefined;
    }>, "many">;
    masterControllers: z.ZodArray<z.ZodObject<{
        mcId: z.ZodString;
        name: z.ZodString;
        widgetType: z.ZodEnum<["Grid", "Slider"]>;
        controlledNodes: z.ZodArray<z.ZodString, "many">;
        gridWidth: z.ZodOptional<z.ZodNumber>;
        gridHeight: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        mcId: string;
        widgetType: "Grid" | "Slider";
        controlledNodes: string[];
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
    }, {
        name: string;
        mcId: string;
        widgetType: "Grid" | "Slider";
        controlledNodes: string[];
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    planId: string;
    characterName: string;
    deformers: {
        type: "Envelope" | "Curve" | "Bone";
        closed: boolean;
        deformerId: string;
        targetNode: string;
        numPoints: number;
    }[];
    masterControllers: {
        name: string;
        mcId: string;
        widgetType: "Grid" | "Slider";
        controlledNodes: string[];
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
    }[];
}, {
    planId: string;
    characterName: string;
    deformers: {
        type: "Envelope" | "Curve" | "Bone";
        deformerId: string;
        targetNode: string;
        closed?: boolean | undefined;
        numPoints?: number | undefined;
    }[];
    masterControllers: {
        name: string;
        mcId: string;
        widgetType: "Grid" | "Slider";
        controlledNodes: string[];
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
    }[];
}>;
export type DeformerAssemblyPlan = z.infer<typeof deformerAssemblyPlanSchema>;
