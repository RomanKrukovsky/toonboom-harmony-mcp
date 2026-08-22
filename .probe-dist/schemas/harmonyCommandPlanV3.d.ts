import { z } from 'zod';
export declare const HARMONY_COMMAND_PLAN_V3_SCHEMA_VERSION = "3.0";
export declare const WHITELIST_OPERATIONS: readonly ["create_group", "create_drawing_element", "create_drawing", "write_path", "create_palette", "add_palette_swatch", "create_peg", "attach_drawing_to_peg", "set_pivot", "set_transform_keyframe", "set_transform_interpolation", "create_deformer", "configure_deformer", "set_deformer_key", "set_exposure", "set_substitution", "create_camera", "set_camera_key", "create_composite", "connect_nodes", "set_node_attribute", "lock_element", "save_version", "render_preview"];
export declare const commandOperationSchema: z.ZodObject<{
    operation: z.ZodEnum<["create_group", "create_drawing_element", "create_drawing", "write_path", "create_palette", "add_palette_swatch", "create_peg", "attach_drawing_to_peg", "set_pivot", "set_transform_keyframe", "set_transform_interpolation", "create_deformer", "configure_deformer", "set_deformer_key", "set_exposure", "set_substitution", "create_camera", "set_camera_key", "create_composite", "connect_nodes", "set_node_attribute", "lock_element", "save_version", "render_preview"]>;
    target: z.ZodOptional<z.ZodString>;
    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
    order: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
    rollbackStrategy: z.ZodDefault<z.ZodEnum<["none", "delete_created", "restore_snapshot"]>>;
}, "strict", z.ZodTypeAny, {
    order: number;
    parameters: Record<string, any>;
    operation: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "connect_nodes" | "create_peg" | "attach_drawing_to_peg" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "create_group" | "set_pivot" | "create_deformer" | "configure_deformer" | "set_deformer_key" | "set_substitution" | "create_camera" | "set_camera_key" | "create_composite" | "set_node_attribute" | "lock_element" | "save_version";
    rollbackStrategy: "none" | "delete_created" | "restore_snapshot";
    description?: string | undefined;
    target?: string | undefined;
}, {
    order: number;
    parameters: Record<string, any>;
    operation: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "connect_nodes" | "create_peg" | "attach_drawing_to_peg" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "create_group" | "set_pivot" | "create_deformer" | "configure_deformer" | "set_deformer_key" | "set_substitution" | "create_camera" | "set_camera_key" | "create_composite" | "set_node_attribute" | "lock_element" | "save_version";
    description?: string | undefined;
    target?: string | undefined;
    rollbackStrategy?: "none" | "delete_created" | "restore_snapshot" | undefined;
}>;
export declare const commandPlanV3Schema: z.ZodObject<{
    schemaVersion: z.ZodDefault<z.ZodLiteral<"3.0">>;
    planId: z.ZodString;
    manifestId: z.ZodString;
    createdAt: z.ZodString;
    operations: z.ZodArray<z.ZodObject<{
        operation: z.ZodEnum<["create_group", "create_drawing_element", "create_drawing", "write_path", "create_palette", "add_palette_swatch", "create_peg", "attach_drawing_to_peg", "set_pivot", "set_transform_keyframe", "set_transform_interpolation", "create_deformer", "configure_deformer", "set_deformer_key", "set_exposure", "set_substitution", "create_camera", "set_camera_key", "create_composite", "connect_nodes", "set_node_attribute", "lock_element", "save_version", "render_preview"]>;
        target: z.ZodOptional<z.ZodString>;
        parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
        order: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
        rollbackStrategy: z.ZodDefault<z.ZodEnum<["none", "delete_created", "restore_snapshot"]>>;
    }, "strict", z.ZodTypeAny, {
        order: number;
        parameters: Record<string, any>;
        operation: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "connect_nodes" | "create_peg" | "attach_drawing_to_peg" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "create_group" | "set_pivot" | "create_deformer" | "configure_deformer" | "set_deformer_key" | "set_substitution" | "create_camera" | "set_camera_key" | "create_composite" | "set_node_attribute" | "lock_element" | "save_version";
        rollbackStrategy: "none" | "delete_created" | "restore_snapshot";
        description?: string | undefined;
        target?: string | undefined;
    }, {
        order: number;
        parameters: Record<string, any>;
        operation: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "connect_nodes" | "create_peg" | "attach_drawing_to_peg" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "create_group" | "set_pivot" | "create_deformer" | "configure_deformer" | "set_deformer_key" | "set_substitution" | "create_camera" | "set_camera_key" | "create_composite" | "set_node_attribute" | "lock_element" | "save_version";
        description?: string | undefined;
        target?: string | undefined;
        rollbackStrategy?: "none" | "delete_created" | "restore_snapshot" | undefined;
    }>, "many">;
    totalOperations: z.ZodNumber;
    estimatedExecutionTimeMs: z.ZodOptional<z.ZodNumber>;
    requiresHarmony: z.ZodDefault<z.ZodBoolean>;
    whitelistOnly: z.ZodDefault<z.ZodLiteral<true>>;
    provenance: z.ZodObject<{
        compiler: z.ZodString;
        version: z.ZodString;
        manifestSchemaVersion: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        version: string;
        compiler: string;
        manifestSchemaVersion: string;
    }, {
        version: string;
        compiler: string;
        manifestSchemaVersion: string;
    }>;
    rollbackPlan: z.ZodObject<{
        supported: z.ZodBoolean;
        strategy: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        supported: boolean;
        strategy?: string | undefined;
    }, {
        supported: boolean;
        strategy?: string | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        version: string;
        compiler: string;
        manifestSchemaVersion: string;
    };
    schemaVersion: "3.0";
    manifestId: string;
    createdAt: string;
    planId: string;
    operations: {
        order: number;
        parameters: Record<string, any>;
        operation: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "connect_nodes" | "create_peg" | "attach_drawing_to_peg" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "create_group" | "set_pivot" | "create_deformer" | "configure_deformer" | "set_deformer_key" | "set_substitution" | "create_camera" | "set_camera_key" | "create_composite" | "set_node_attribute" | "lock_element" | "save_version";
        rollbackStrategy: "none" | "delete_created" | "restore_snapshot";
        description?: string | undefined;
        target?: string | undefined;
    }[];
    totalOperations: number;
    requiresHarmony: boolean;
    whitelistOnly: true;
    rollbackPlan: {
        supported: boolean;
        strategy?: string | undefined;
    };
    estimatedExecutionTimeMs?: number | undefined;
}, {
    provenance: {
        version: string;
        compiler: string;
        manifestSchemaVersion: string;
    };
    manifestId: string;
    createdAt: string;
    planId: string;
    operations: {
        order: number;
        parameters: Record<string, any>;
        operation: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "connect_nodes" | "create_peg" | "attach_drawing_to_peg" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "create_group" | "set_pivot" | "create_deformer" | "configure_deformer" | "set_deformer_key" | "set_substitution" | "create_camera" | "set_camera_key" | "create_composite" | "set_node_attribute" | "lock_element" | "save_version";
        description?: string | undefined;
        target?: string | undefined;
        rollbackStrategy?: "none" | "delete_created" | "restore_snapshot" | undefined;
    }[];
    totalOperations: number;
    rollbackPlan: {
        supported: boolean;
        strategy?: string | undefined;
    };
    schemaVersion?: "3.0" | undefined;
    estimatedExecutionTimeMs?: number | undefined;
    requiresHarmony?: boolean | undefined;
    whitelistOnly?: true | undefined;
}>;
export type CommandPlanV3 = z.infer<typeof commandPlanV3Schema>;
export type CommandOperation = z.infer<typeof commandOperationSchema>;
