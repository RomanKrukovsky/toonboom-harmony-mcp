import { z } from 'zod';
export declare const snapshotNodeSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    name: string;
}, {
    type: string;
    id: string;
    name: string;
}>;
export declare const snapshotConnectionSchema: z.ZodObject<{
    from_node: z.ZodString;
    from_port: z.ZodDefault<z.ZodNumber>;
    to_node: z.ZodString;
    to_port: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    from_node: string;
    from_port: number;
    to_node: string;
    to_port: number;
}, {
    from_node: string;
    to_node: string;
    from_port?: number | undefined;
    to_port?: number | undefined;
}>;
export declare const snapshotTransformKeyframeSchema: z.ZodObject<{
    frame: z.ZodNumber;
    x: z.ZodNumber;
    y: z.ZodNumber;
    rotation: z.ZodNumber;
    scaleX: z.ZodNumber;
    scaleY: z.ZodNumber;
    interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    frame: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
}, {
    x: number;
    y: number;
    frame: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
}>;
export declare const snapshotExposureSchema: z.ZodObject<{
    frame: z.ZodNumber;
    drawing: z.ZodString;
}, "strip", z.ZodTypeAny, {
    frame: number;
    drawing: string;
}, {
    frame: number;
    drawing: string;
}>;
export declare const snapshotNodeDataSchema: z.ZodObject<{
    nodeId: z.ZodString;
    transformKeys: z.ZodOptional<z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        x: z.ZodNumber;
        y: z.ZodNumber;
        rotation: z.ZodNumber;
        scaleX: z.ZodNumber;
        scaleY: z.ZodNumber;
        interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        frame: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
    }, {
        x: number;
        y: number;
        frame: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
    }>, "many">>;
    exposures: z.ZodOptional<z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        drawing: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        drawing: string;
    }, {
        frame: number;
        drawing: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    nodeId: string;
    exposures?: {
        frame: number;
        drawing: string;
    }[] | undefined;
    transformKeys?: {
        x: number;
        y: number;
        frame: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
    }[] | undefined;
}, {
    nodeId: string;
    exposures?: {
        frame: number;
        drawing: string;
    }[] | undefined;
    transformKeys?: {
        x: number;
        y: number;
        frame: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
    }[] | undefined;
}>;
export declare const sceneSnapshotPirSchema: z.ZodObject<{
    format: z.ZodLiteral<"SceneSnapshotPIR">;
    version: z.ZodLiteral<"1.0.0">;
    sceneId: z.ZodString;
    timestamp: z.ZodString;
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        id: string;
        name: string;
    }, {
        type: string;
        id: string;
        name: string;
    }>, "many">;
    connections: z.ZodArray<z.ZodObject<{
        from_node: z.ZodString;
        from_port: z.ZodDefault<z.ZodNumber>;
        to_node: z.ZodString;
        to_port: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        from_node: string;
        from_port: number;
        to_node: string;
        to_port: number;
    }, {
        from_node: string;
        to_node: string;
        from_port?: number | undefined;
        to_port?: number | undefined;
    }>, "many">;
    nodeData: z.ZodArray<z.ZodObject<{
        nodeId: z.ZodString;
        transformKeys: z.ZodOptional<z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            x: z.ZodNumber;
            y: z.ZodNumber;
            rotation: z.ZodNumber;
            scaleX: z.ZodNumber;
            scaleY: z.ZodNumber;
            interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
        }, {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }>, "many">>;
        exposures: z.ZodOptional<z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            drawing: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            frame: number;
            drawing: string;
        }, {
            frame: number;
            drawing: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        nodeId: string;
        exposures?: {
            frame: number;
            drawing: string;
        }[] | undefined;
        transformKeys?: {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
        }[] | undefined;
    }, {
        nodeId: string;
        exposures?: {
            frame: number;
            drawing: string;
        }[] | undefined;
        transformKeys?: {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    version: "1.0.0";
    timestamp: string;
    nodes: {
        type: string;
        id: string;
        name: string;
    }[];
    connections: {
        from_node: string;
        from_port: number;
        to_node: string;
        to_port: number;
    }[];
    format: "SceneSnapshotPIR";
    sceneId: string;
    nodeData: {
        nodeId: string;
        exposures?: {
            frame: number;
            drawing: string;
        }[] | undefined;
        transformKeys?: {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
        }[] | undefined;
    }[];
}, {
    version: "1.0.0";
    timestamp: string;
    nodes: {
        type: string;
        id: string;
        name: string;
    }[];
    connections: {
        from_node: string;
        to_node: string;
        from_port?: number | undefined;
        to_port?: number | undefined;
    }[];
    format: "SceneSnapshotPIR";
    sceneId: string;
    nodeData: {
        nodeId: string;
        exposures?: {
            frame: number;
            drawing: string;
        }[] | undefined;
        transformKeys?: {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }[] | undefined;
    }[];
}>;
export type SnapshotNode = z.infer<typeof snapshotNodeSchema>;
export type SnapshotTransformKeyframe = z.infer<typeof snapshotTransformKeyframeSchema>;
export type SnapshotExposure = z.infer<typeof snapshotExposureSchema>;
export type SceneSnapshotPIR = z.infer<typeof sceneSnapshotPirSchema>;
