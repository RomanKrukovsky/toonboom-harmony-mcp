import { z } from 'zod';
export declare const rigTemplateCoordinateSpaceSchema: z.ZodObject<{
    system: z.ZodLiteral<"NORMALIZED_CHARACTER">;
    origin: z.ZodString;
    x_axis: z.ZodString;
    y_axis: z.ZodString;
    unit: z.ZodLiteral<"CHARACTER_HEIGHT_RATIO">;
}, "strip", z.ZodTypeAny, {
    origin: string;
    system: "NORMALIZED_CHARACTER";
    x_axis: string;
    y_axis: string;
    unit: "CHARACTER_HEIGHT_RATIO";
}, {
    origin: string;
    system: "NORMALIZED_CHARACTER";
    x_axis: string;
    y_axis: string;
    unit: "CHARACTER_HEIGHT_RATIO";
}>;
export declare const rigTemplateNodeSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["READ", "PEG", "COMPOSITE", "DEFORMATION_CURVE", "DEFORMATION_BONE", "KINEMATIC_OUTPUT"]>;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "READ" | "COMPOSITE" | "PEG" | "KINEMATIC_OUTPUT" | "DEFORMATION_CURVE" | "DEFORMATION_BONE";
    id: string;
    name: string;
}, {
    type: "READ" | "COMPOSITE" | "PEG" | "KINEMATIC_OUTPUT" | "DEFORMATION_CURVE" | "DEFORMATION_BONE";
    id: string;
    name: string;
}>;
export declare const rigTemplateConnectionSchema: z.ZodObject<{
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
export declare const rigTemplateSchema: z.ZodObject<{
    schema: z.ZodLiteral<"toon-boom-mcp/rig-template-v1">;
    template_id: z.ZodString;
    version: z.ZodString;
    display_name: z.ZodString;
    pir_compatibility: z.ZodArray<z.ZodString, "many">;
    harmony_compatibility: z.ZodObject<{
        minimum_version: z.ZodString;
        maximum_tested_version: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        minimum_version: string;
        maximum_tested_version: string;
    }, {
        minimum_version: string;
        maximum_tested_version: string;
    }>;
    coordinate_space: z.ZodObject<{
        system: z.ZodLiteral<"NORMALIZED_CHARACTER">;
        origin: z.ZodString;
        x_axis: z.ZodString;
        y_axis: z.ZodString;
        unit: z.ZodLiteral<"CHARACTER_HEIGHT_RATIO">;
    }, "strip", z.ZodTypeAny, {
        origin: string;
        system: "NORMALIZED_CHARACTER";
        x_axis: string;
        y_axis: string;
        unit: "CHARACTER_HEIGHT_RATIO";
    }, {
        origin: string;
        system: "NORMALIZED_CHARACTER";
        x_axis: string;
        y_axis: string;
        unit: "CHARACTER_HEIGHT_RATIO";
    }>;
    required_landmarks: z.ZodArray<z.ZodString, "many">;
    optional_landmarks: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["READ", "PEG", "COMPOSITE", "DEFORMATION_CURVE", "DEFORMATION_BONE", "KINEMATIC_OUTPUT"]>;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "READ" | "COMPOSITE" | "PEG" | "KINEMATIC_OUTPUT" | "DEFORMATION_CURVE" | "DEFORMATION_BONE";
        id: string;
        name: string;
    }, {
        type: "READ" | "COMPOSITE" | "PEG" | "KINEMATIC_OUTPUT" | "DEFORMATION_CURVE" | "DEFORMATION_BONE";
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
    bindings: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>, "many">>>;
    constraints: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>, "many">>>;
}, "strip", z.ZodTypeAny, {
    version: string;
    nodes: {
        type: "READ" | "COMPOSITE" | "PEG" | "KINEMATIC_OUTPUT" | "DEFORMATION_CURVE" | "DEFORMATION_BONE";
        id: string;
        name: string;
    }[];
    connections: {
        from_node: string;
        from_port: number;
        to_node: string;
        to_port: number;
    }[];
    schema: "toon-boom-mcp/rig-template-v1";
    template_id: string;
    display_name: string;
    pir_compatibility: string[];
    harmony_compatibility: {
        minimum_version: string;
        maximum_tested_version: string;
    };
    coordinate_space: {
        origin: string;
        system: "NORMALIZED_CHARACTER";
        x_axis: string;
        y_axis: string;
        unit: "CHARACTER_HEIGHT_RATIO";
    };
    required_landmarks: string[];
    optional_landmarks: string[];
    bindings: Record<string, any>[];
    constraints: Record<string, any>[];
}, {
    version: string;
    nodes: {
        type: "READ" | "COMPOSITE" | "PEG" | "KINEMATIC_OUTPUT" | "DEFORMATION_CURVE" | "DEFORMATION_BONE";
        id: string;
        name: string;
    }[];
    connections: {
        from_node: string;
        to_node: string;
        from_port?: number | undefined;
        to_port?: number | undefined;
    }[];
    schema: "toon-boom-mcp/rig-template-v1";
    template_id: string;
    display_name: string;
    pir_compatibility: string[];
    harmony_compatibility: {
        minimum_version: string;
        maximum_tested_version: string;
    };
    coordinate_space: {
        origin: string;
        system: "NORMALIZED_CHARACTER";
        x_axis: string;
        y_axis: string;
        unit: "CHARACTER_HEIGHT_RATIO";
    };
    required_landmarks: string[];
    optional_landmarks?: string[] | undefined;
    bindings?: Record<string, any>[] | undefined;
    constraints?: Record<string, any>[] | undefined;
}>;
export type RigTemplate = z.infer<typeof rigTemplateSchema>;
