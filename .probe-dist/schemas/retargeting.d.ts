import { z } from "zod";
export declare const JointLimitSchema: z.ZodObject<{
    minAngle: z.ZodNumber;
    maxAngle: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    minAngle: number;
    maxAngle: number;
}, {
    minAngle: number;
    maxAngle: number;
}>;
export declare const RigJointSchema: z.ZodObject<{
    name: z.ZodString;
    parent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pegNodePath: z.ZodString;
    pivotX: z.ZodNumber;
    pivotY: z.ZodNumber;
    length: z.ZodDefault<z.ZodNumber>;
    limits: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        minAngle: z.ZodNumber;
        maxAngle: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        minAngle: number;
        maxAngle: number;
    }, {
        minAngle: number;
        maxAngle: number;
    }>>>;
}, "strip", z.ZodTypeAny, {
    length: number;
    name: string;
    pivotX: number;
    pivotY: number;
    pegNodePath: string;
    parent?: string | null | undefined;
    limits?: {
        minAngle: number;
        maxAngle: number;
    } | null | undefined;
}, {
    name: string;
    pivotX: number;
    pivotY: number;
    pegNodePath: string;
    length?: number | undefined;
    parent?: string | null | undefined;
    limits?: {
        minAngle: number;
        maxAngle: number;
    } | null | undefined;
}>;
export declare const RigProfileSchema: z.ZodObject<{
    name: z.ZodString;
    joints: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        parent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        pegNodePath: z.ZodString;
        pivotX: z.ZodNumber;
        pivotY: z.ZodNumber;
        length: z.ZodDefault<z.ZodNumber>;
        limits: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            minAngle: z.ZodNumber;
            maxAngle: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            minAngle: number;
            maxAngle: number;
        }, {
            minAngle: number;
            maxAngle: number;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        length: number;
        name: string;
        pivotX: number;
        pivotY: number;
        pegNodePath: string;
        parent?: string | null | undefined;
        limits?: {
            minAngle: number;
            maxAngle: number;
        } | null | undefined;
    }, {
        name: string;
        pivotX: number;
        pivotY: number;
        pegNodePath: string;
        length?: number | undefined;
        parent?: string | null | undefined;
        limits?: {
            minAngle: number;
            maxAngle: number;
        } | null | undefined;
    }>, "many">;
    restPose: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    joints: {
        length: number;
        name: string;
        pivotX: number;
        pivotY: number;
        pegNodePath: string;
        parent?: string | null | undefined;
        limits?: {
            minAngle: number;
            maxAngle: number;
        } | null | undefined;
    }[];
    restPose: Record<string, number>;
}, {
    name: string;
    joints: {
        name: string;
        pivotX: number;
        pivotY: number;
        pegNodePath: string;
        length?: number | undefined;
        parent?: string | null | undefined;
        limits?: {
            minAngle: number;
            maxAngle: number;
        } | null | undefined;
    }[];
    restPose?: Record<string, number> | undefined;
}>;
export declare const JointMappingSchema: z.ZodObject<{
    pegNodePath: z.ZodString;
    sourceJoints: z.ZodArray<z.ZodString, "many">;
    transformType: z.ZodDefault<z.ZodEnum<["rotation", "translation", "scale"]>>;
    minAngleLimit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxAngleLimit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    scaleFactor: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    pegNodePath: string;
    sourceJoints: string[];
    transformType: "rotation" | "scale" | "translation";
    minAngleLimit: number;
    maxAngleLimit: number;
    scaleFactor: number;
}, {
    pegNodePath: string;
    sourceJoints: string[];
    transformType?: "rotation" | "scale" | "translation" | undefined;
    minAngleLimit?: number | undefined;
    maxAngleLimit?: number | undefined;
    scaleFactor?: number | undefined;
}>;
export declare const TransformKeyframeSchema: z.ZodObject<{
    frame: z.ZodNumber;
    value: z.ZodNumber;
    confidence: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    value: number;
    frame: number;
    confidence: number;
}, {
    value: number;
    frame: number;
    confidence?: number | undefined;
}>;
export declare const TrackSchema: z.ZodObject<{
    pegNodePath: z.ZodString;
    transformType: z.ZodEnum<["rotation", "translation", "scale"]>;
    keyframes: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        value: z.ZodNumber;
        confidence: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        frame: number;
        confidence: number;
    }, {
        value: number;
        frame: number;
        confidence?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    keyframes: {
        value: number;
        frame: number;
        confidence: number;
    }[];
    pegNodePath: string;
    transformType: "rotation" | "scale" | "translation";
}, {
    keyframes: {
        value: number;
        frame: number;
        confidence?: number | undefined;
    }[];
    pegNodePath: string;
    transformType: "rotation" | "scale" | "translation";
}>;
export declare const RetargetingManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodDefault<z.ZodString>;
    manifestId: z.ZodString;
    createdAt: z.ZodString;
    characterName: z.ZodString;
    rigProfile: z.ZodObject<{
        name: z.ZodString;
        joints: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            parent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            pegNodePath: z.ZodString;
            pivotX: z.ZodNumber;
            pivotY: z.ZodNumber;
            length: z.ZodDefault<z.ZodNumber>;
            limits: z.ZodNullable<z.ZodOptional<z.ZodObject<{
                minAngle: z.ZodNumber;
                maxAngle: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                minAngle: number;
                maxAngle: number;
            }, {
                minAngle: number;
                maxAngle: number;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            length: number;
            name: string;
            pivotX: number;
            pivotY: number;
            pegNodePath: string;
            parent?: string | null | undefined;
            limits?: {
                minAngle: number;
                maxAngle: number;
            } | null | undefined;
        }, {
            name: string;
            pivotX: number;
            pivotY: number;
            pegNodePath: string;
            length?: number | undefined;
            parent?: string | null | undefined;
            limits?: {
                minAngle: number;
                maxAngle: number;
            } | null | undefined;
        }>, "many">;
        restPose: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        joints: {
            length: number;
            name: string;
            pivotX: number;
            pivotY: number;
            pegNodePath: string;
            parent?: string | null | undefined;
            limits?: {
                minAngle: number;
                maxAngle: number;
            } | null | undefined;
        }[];
        restPose: Record<string, number>;
    }, {
        name: string;
        joints: {
            name: string;
            pivotX: number;
            pivotY: number;
            pegNodePath: string;
            length?: number | undefined;
            parent?: string | null | undefined;
            limits?: {
                minAngle: number;
                maxAngle: number;
            } | null | undefined;
        }[];
        restPose?: Record<string, number> | undefined;
    }>;
    mappings: z.ZodArray<z.ZodObject<{
        pegNodePath: z.ZodString;
        sourceJoints: z.ZodArray<z.ZodString, "many">;
        transformType: z.ZodDefault<z.ZodEnum<["rotation", "translation", "scale"]>>;
        minAngleLimit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        maxAngleLimit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        scaleFactor: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        pegNodePath: string;
        sourceJoints: string[];
        transformType: "rotation" | "scale" | "translation";
        minAngleLimit: number;
        maxAngleLimit: number;
        scaleFactor: number;
    }, {
        pegNodePath: string;
        sourceJoints: string[];
        transformType?: "rotation" | "scale" | "translation" | undefined;
        minAngleLimit?: number | undefined;
        maxAngleLimit?: number | undefined;
        scaleFactor?: number | undefined;
    }>, "many">;
    tracks: z.ZodArray<z.ZodObject<{
        pegNodePath: z.ZodString;
        transformType: z.ZodEnum<["rotation", "translation", "scale"]>;
        keyframes: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            value: z.ZodNumber;
            confidence: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            frame: number;
            confidence: number;
        }, {
            value: number;
            frame: number;
            confidence?: number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        keyframes: {
            value: number;
            frame: number;
            confidence: number;
        }[];
        pegNodePath: string;
        transformType: "rotation" | "scale" | "translation";
    }, {
        keyframes: {
            value: number;
            frame: number;
            confidence?: number | undefined;
        }[];
        pegNodePath: string;
        transformType: "rotation" | "scale" | "translation";
    }>, "many">;
    fidelityMetrics: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    provenance: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
}, "strip", z.ZodTypeAny, {
    schemaVersion: string;
    manifestId: string;
    createdAt: string;
    characterName: string;
    tracks: {
        keyframes: {
            value: number;
            frame: number;
            confidence: number;
        }[];
        pegNodePath: string;
        transformType: "rotation" | "scale" | "translation";
    }[];
    rigProfile: {
        name: string;
        joints: {
            length: number;
            name: string;
            pivotX: number;
            pivotY: number;
            pegNodePath: string;
            parent?: string | null | undefined;
            limits?: {
                minAngle: number;
                maxAngle: number;
            } | null | undefined;
        }[];
        restPose: Record<string, number>;
    };
    mappings: {
        pegNodePath: string;
        sourceJoints: string[];
        transformType: "rotation" | "scale" | "translation";
        minAngleLimit: number;
        maxAngleLimit: number;
        scaleFactor: number;
    }[];
    fidelityMetrics: Record<string, any>;
    provenance?: Record<string, any> | null | undefined;
}, {
    manifestId: string;
    createdAt: string;
    characterName: string;
    tracks: {
        keyframes: {
            value: number;
            frame: number;
            confidence?: number | undefined;
        }[];
        pegNodePath: string;
        transformType: "rotation" | "scale" | "translation";
    }[];
    rigProfile: {
        name: string;
        joints: {
            name: string;
            pivotX: number;
            pivotY: number;
            pegNodePath: string;
            length?: number | undefined;
            parent?: string | null | undefined;
            limits?: {
                minAngle: number;
                maxAngle: number;
            } | null | undefined;
        }[];
        restPose?: Record<string, number> | undefined;
    };
    mappings: {
        pegNodePath: string;
        sourceJoints: string[];
        transformType?: "rotation" | "scale" | "translation" | undefined;
        minAngleLimit?: number | undefined;
        maxAngleLimit?: number | undefined;
        scaleFactor?: number | undefined;
    }[];
    provenance?: Record<string, any> | null | undefined;
    schemaVersion?: string | undefined;
    fidelityMetrics?: Record<string, any> | undefined;
}>;
export type JointLimit = z.infer<typeof JointLimitSchema>;
export type RigJoint = z.infer<typeof RigJointSchema>;
export type RigProfile = z.infer<typeof RigProfileSchema>;
export type JointMapping = z.infer<typeof JointMappingSchema>;
export type TransformKeyframe = z.infer<typeof TransformKeyframeSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type RetargetingManifest = z.infer<typeof RetargetingManifestSchema>;
