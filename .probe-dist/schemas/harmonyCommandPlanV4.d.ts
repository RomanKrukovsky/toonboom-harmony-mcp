import { z } from 'zod';
export declare const HARMONY_COMMAND_PLAN_V4 = "4.0";
export declare const phase2CommandTypeSchema: z.ZodEnum<["snapshot_project", "create_palette", "add_palette_swatch", "create_drawing_element", "create_drawing", "write_path", "set_exposure", "create_node", "connect_nodes", "create_peg", "attach_drawing_to_peg", "set_peg_pivot", "set_transform_keyframe", "set_transform_interpolation", "save_project", "close_project", "reopen_project", "inspect_native_entities", "render_preview", "compare_render", "rollback_snapshot", "verify_rollback"]>;
export declare const phase2CommandSchema: z.ZodObject<{
    commandId: z.ZodString;
    type: z.ZodEnum<["snapshot_project", "create_palette", "add_palette_swatch", "create_drawing_element", "create_drawing", "write_path", "set_exposure", "create_node", "connect_nodes", "create_peg", "attach_drawing_to_peg", "set_peg_pivot", "set_transform_keyframe", "set_transform_interpolation", "save_project", "close_project", "reopen_project", "inspect_native_entities", "render_preview", "compare_render", "rollback_snapshot", "verify_rollback"]>;
    params: z.ZodRecord<z.ZodString, z.ZodAny>;
    preconditions: z.ZodArray<z.ZodString, "many">;
    destructiveLevel: z.ZodEnum<["none", "reversible", "destructive"]>;
    idempotencyKey: z.ZodString;
    rollback: z.ZodObject<{
        strategy: z.ZodEnum<["none", "delete_created", "restore_snapshot", "reopen_snapshot"]>;
        snapshotRequired: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
        snapshotRequired: boolean;
    }, {
        strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
        snapshotRequired: boolean;
    }>;
    expectedArtifact: z.ZodObject<{
        kind: z.ZodString;
        path: z.ZodNullable<z.ZodString>;
        nonempty: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        path: string | null;
        kind: string;
        nonempty: boolean;
    }, {
        path: string | null;
        kind: string;
        nonempty: boolean;
    }>;
    verification: z.ZodObject<{
        method: z.ZodString;
        required: z.ZodBoolean;
        acceptance: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        method: string;
        required: boolean;
        acceptance: string[];
    }, {
        method: string;
        required: boolean;
        acceptance: string[];
    }>;
}, "strict", z.ZodTypeAny, {
    params: Record<string, any>;
    type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
    verification: {
        method: string;
        required: boolean;
        acceptance: string[];
    };
    commandId: string;
    preconditions: string[];
    destructiveLevel: "none" | "reversible" | "destructive";
    idempotencyKey: string;
    rollback: {
        strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
        snapshotRequired: boolean;
    };
    expectedArtifact: {
        path: string | null;
        kind: string;
        nonempty: boolean;
    };
}, {
    params: Record<string, any>;
    type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
    verification: {
        method: string;
        required: boolean;
        acceptance: string[];
    };
    commandId: string;
    preconditions: string[];
    destructiveLevel: "none" | "reversible" | "destructive";
    idempotencyKey: string;
    rollback: {
        strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
        snapshotRequired: boolean;
    };
    expectedArtifact: {
        path: string | null;
        kind: string;
        nonempty: boolean;
    };
}>;
export declare const harmonyCommandPlanV4Schema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"4.0">;
    planId: z.ZodString;
    manifestId: z.ZodString;
    createdAt: z.ZodString;
    status: z.ZodLiteral<"implemented_unverified">;
    requiresRealHarmony: z.ZodLiteral<true>;
    sourceManifestSha256: z.ZodString;
    commands: z.ZodArray<z.ZodObject<{
        commandId: z.ZodString;
        type: z.ZodEnum<["snapshot_project", "create_palette", "add_palette_swatch", "create_drawing_element", "create_drawing", "write_path", "set_exposure", "create_node", "connect_nodes", "create_peg", "attach_drawing_to_peg", "set_peg_pivot", "set_transform_keyframe", "set_transform_interpolation", "save_project", "close_project", "reopen_project", "inspect_native_entities", "render_preview", "compare_render", "rollback_snapshot", "verify_rollback"]>;
        params: z.ZodRecord<z.ZodString, z.ZodAny>;
        preconditions: z.ZodArray<z.ZodString, "many">;
        destructiveLevel: z.ZodEnum<["none", "reversible", "destructive"]>;
        idempotencyKey: z.ZodString;
        rollback: z.ZodObject<{
            strategy: z.ZodEnum<["none", "delete_created", "restore_snapshot", "reopen_snapshot"]>;
            snapshotRequired: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
            snapshotRequired: boolean;
        }, {
            strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
            snapshotRequired: boolean;
        }>;
        expectedArtifact: z.ZodObject<{
            kind: z.ZodString;
            path: z.ZodNullable<z.ZodString>;
            nonempty: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            path: string | null;
            kind: string;
            nonempty: boolean;
        }, {
            path: string | null;
            kind: string;
            nonempty: boolean;
        }>;
        verification: z.ZodObject<{
            method: z.ZodString;
            required: z.ZodBoolean;
            acceptance: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            method: string;
            required: boolean;
            acceptance: string[];
        }, {
            method: string;
            required: boolean;
            acceptance: string[];
        }>;
    }, "strict", z.ZodTypeAny, {
        params: Record<string, any>;
        type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
        verification: {
            method: string;
            required: boolean;
            acceptance: string[];
        };
        commandId: string;
        preconditions: string[];
        destructiveLevel: "none" | "reversible" | "destructive";
        idempotencyKey: string;
        rollback: {
            strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
            snapshotRequired: boolean;
        };
        expectedArtifact: {
            path: string | null;
            kind: string;
            nonempty: boolean;
        };
    }, {
        params: Record<string, any>;
        type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
        verification: {
            method: string;
            required: boolean;
            acceptance: string[];
        };
        commandId: string;
        preconditions: string[];
        destructiveLevel: "none" | "reversible" | "destructive";
        idempotencyKey: string;
        rollback: {
            strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
            snapshotRequired: boolean;
        };
        expectedArtifact: {
            path: string | null;
            kind: string;
            nonempty: boolean;
        };
    }>, "many">;
    acceptanceGates: z.ZodArray<z.ZodString, "many">;
    provenance: z.ZodObject<{
        compiler: z.ZodLiteral<"HarmonyCommandPlanV4Compiler v1">;
        source: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        source: string;
        compiler: "HarmonyCommandPlanV4Compiler v1";
    }, {
        source: string;
        compiler: "HarmonyCommandPlanV4Compiler v1";
    }>;
}, "strict", z.ZodTypeAny, {
    status: "implemented_unverified";
    provenance: {
        source: string;
        compiler: "HarmonyCommandPlanV4Compiler v1";
    };
    schemaVersion: "4.0";
    manifestId: string;
    createdAt: string;
    planId: string;
    commands: {
        params: Record<string, any>;
        type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
        verification: {
            method: string;
            required: boolean;
            acceptance: string[];
        };
        commandId: string;
        preconditions: string[];
        destructiveLevel: "none" | "reversible" | "destructive";
        idempotencyKey: string;
        rollback: {
            strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
            snapshotRequired: boolean;
        };
        expectedArtifact: {
            path: string | null;
            kind: string;
            nonempty: boolean;
        };
    }[];
    requiresRealHarmony: true;
    sourceManifestSha256: string;
    acceptanceGates: string[];
}, {
    status: "implemented_unverified";
    provenance: {
        source: string;
        compiler: "HarmonyCommandPlanV4Compiler v1";
    };
    schemaVersion: "4.0";
    manifestId: string;
    createdAt: string;
    planId: string;
    commands: {
        params: Record<string, any>;
        type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
        verification: {
            method: string;
            required: boolean;
            acceptance: string[];
        };
        commandId: string;
        preconditions: string[];
        destructiveLevel: "none" | "reversible" | "destructive";
        idempotencyKey: string;
        rollback: {
            strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
            snapshotRequired: boolean;
        };
        expectedArtifact: {
            path: string | null;
            kind: string;
            nonempty: boolean;
        };
    }[];
    requiresRealHarmony: true;
    sourceManifestSha256: string;
    acceptanceGates: string[];
}>;
export type HarmonyCommandPlanV4 = z.infer<typeof harmonyCommandPlanV4Schema>;
