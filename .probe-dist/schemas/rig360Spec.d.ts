import { z } from 'zod';
/**
 * rig360Spec.ts — the production spec for a Harmony 360° turn rig.
 *
 * The Rig360 Synthesizer produces this spec plus a placeholder rig
 * template structure. Real rig assembly requires drawn layered assets
 * — the spec + placeholder is the honest fallback (ACTOR §7).
 */
export declare const deformerPlanSchema: z.ZodObject<{
    targetLayer: z.ZodString;
    deformerType: z.ZodEnum<["curve", "envelope", "perspective", "quadric"]>;
    axis: z.ZodDefault<z.ZodEnum<["x", "y", "z", "free"]>>;
    range: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    targetLayer: string;
    deformerType: "curve" | "envelope" | "perspective" | "quadric";
    axis: "x" | "y" | "z" | "free";
    range?: number[] | undefined;
}, {
    targetLayer: string;
    deformerType: "curve" | "envelope" | "perspective" | "quadric";
    axis?: "x" | "y" | "z" | "free" | undefined;
    range?: number[] | undefined;
}>;
export declare const masterControllerPlanSchema: z.ZodObject<{
    name: z.ZodString;
    controls: z.ZodArray<z.ZodObject<{
        node: z.ZodString;
        attributeName: z.ZodString;
        min: z.ZodOptional<z.ZodNumber>;
        max: z.ZodOptional<z.ZodNumber>;
        defaultValue: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        attributeName: string;
        node: string;
        min?: number | undefined;
        max?: number | undefined;
        defaultValue?: number | undefined;
    }, {
        attributeName: string;
        node: string;
        min?: number | undefined;
        max?: number | undefined;
        defaultValue?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    controls: {
        attributeName: string;
        node: string;
        min?: number | undefined;
        max?: number | undefined;
        defaultValue?: number | undefined;
    }[];
}, {
    name: string;
    controls: {
        attributeName: string;
        node: string;
        min?: number | undefined;
        max?: number | undefined;
        defaultValue?: number | undefined;
    }[];
}>;
export declare const faceControlPlanSchema: z.ZodObject<{
    groupName: z.ZodEnum<["mouth", "eyes", "brows", "head", "expressions"]>;
    controllers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        controls: z.ZodArray<z.ZodObject<{
            node: z.ZodString;
            attributeName: z.ZodString;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            defaultValue: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            attributeName: string;
            node: string;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: number | undefined;
        }, {
            attributeName: string;
            node: string;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        controls: {
            attributeName: string;
            node: string;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: number | undefined;
        }[];
    }, {
        name: string;
        controls: {
            attributeName: string;
            node: string;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: number | undefined;
        }[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    groupName: "eyes" | "brows" | "mouth" | "head" | "expressions";
    controllers: {
        name: string;
        controls: {
            attributeName: string;
            node: string;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: number | undefined;
        }[];
    }[];
}, {
    groupName: "eyes" | "brows" | "mouth" | "head" | "expressions";
    controllers: {
        name: string;
        controls: {
            attributeName: string;
            node: string;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: number | undefined;
        }[];
    }[];
}>;
export declare const bodyTurnPlanSchema: z.ZodObject<{
    axis: z.ZodEnum<["x", "y"]>;
    keyFrames: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        angle: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        angle: number;
        description?: string | undefined;
    }, {
        frame: number;
        angle: number;
        description?: string | undefined;
    }>, "many">;
    interpolation: z.ZodDefault<z.ZodEnum<["linear", "bezier", "step"]>>;
}, "strip", z.ZodTypeAny, {
    interpolation: "linear" | "bezier" | "step";
    axis: "x" | "y";
    keyFrames: {
        frame: number;
        angle: number;
        description?: string | undefined;
    }[];
}, {
    axis: "x" | "y";
    keyFrames: {
        frame: number;
        angle: number;
        description?: string | undefined;
    }[];
    interpolation?: "linear" | "bezier" | "step" | undefined;
}>;
export declare const rig360SpecSchema: z.ZodObject<{
    characterName: z.ZodString;
    requiredAssets: z.ZodDefault<z.ZodArray<z.ZodObject<{
        view: z.ZodString;
        layer: z.ZodString;
        status: z.ZodEnum<["missing", "placeholder", "provided", "generated"]>;
    }, "strip", z.ZodTypeAny, {
        status: "placeholder" | "generated" | "missing" | "provided";
        view: string;
        layer: string;
    }, {
        status: "placeholder" | "generated" | "missing" | "provided";
        view: string;
        layer: string;
    }>, "many">>;
    masterControllers: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        controls: z.ZodArray<z.ZodObject<{
            node: z.ZodString;
            attributeName: z.ZodString;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            defaultValue: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            attributeName: string;
            node: string;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: number | undefined;
        }, {
            attributeName: string;
            node: string;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        controls: {
            attributeName: string;
            node: string;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: number | undefined;
        }[];
    }, {
        name: string;
        controls: {
            attributeName: string;
            node: string;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: number | undefined;
        }[];
    }>, "many">>;
    deformers: z.ZodDefault<z.ZodArray<z.ZodObject<{
        targetLayer: z.ZodString;
        deformerType: z.ZodEnum<["curve", "envelope", "perspective", "quadric"]>;
        axis: z.ZodDefault<z.ZodEnum<["x", "y", "z", "free"]>>;
        range: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        targetLayer: string;
        deformerType: "curve" | "envelope" | "perspective" | "quadric";
        axis: "x" | "y" | "z" | "free";
        range?: number[] | undefined;
    }, {
        targetLayer: string;
        deformerType: "curve" | "envelope" | "perspective" | "quadric";
        axis?: "x" | "y" | "z" | "free" | undefined;
        range?: number[] | undefined;
    }>, "many">>;
    faceControls: z.ZodDefault<z.ZodArray<z.ZodObject<{
        groupName: z.ZodEnum<["mouth", "eyes", "brows", "head", "expressions"]>;
        controllers: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            controls: z.ZodArray<z.ZodObject<{
                node: z.ZodString;
                attributeName: z.ZodString;
                min: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
                defaultValue: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                attributeName: string;
                node: string;
                min?: number | undefined;
                max?: number | undefined;
                defaultValue?: number | undefined;
            }, {
                attributeName: string;
                node: string;
                min?: number | undefined;
                max?: number | undefined;
                defaultValue?: number | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            name: string;
            controls: {
                attributeName: string;
                node: string;
                min?: number | undefined;
                max?: number | undefined;
                defaultValue?: number | undefined;
            }[];
        }, {
            name: string;
            controls: {
                attributeName: string;
                node: string;
                min?: number | undefined;
                max?: number | undefined;
                defaultValue?: number | undefined;
            }[];
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        groupName: "eyes" | "brows" | "mouth" | "head" | "expressions";
        controllers: {
            name: string;
            controls: {
                attributeName: string;
                node: string;
                min?: number | undefined;
                max?: number | undefined;
                defaultValue?: number | undefined;
            }[];
        }[];
    }, {
        groupName: "eyes" | "brows" | "mouth" | "head" | "expressions";
        controllers: {
            name: string;
            controls: {
                attributeName: string;
                node: string;
                min?: number | undefined;
                max?: number | undefined;
                defaultValue?: number | undefined;
            }[];
        }[];
    }>, "many">>;
    bodyTurn: z.ZodDefault<z.ZodArray<z.ZodObject<{
        axis: z.ZodEnum<["x", "y"]>;
        keyFrames: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            angle: z.ZodNumber;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            frame: number;
            angle: number;
            description?: string | undefined;
        }, {
            frame: number;
            angle: number;
            description?: string | undefined;
        }>, "many">;
        interpolation: z.ZodDefault<z.ZodEnum<["linear", "bezier", "step"]>>;
    }, "strip", z.ZodTypeAny, {
        interpolation: "linear" | "bezier" | "step";
        axis: "x" | "y";
        keyFrames: {
            frame: number;
            angle: number;
            description?: string | undefined;
        }[];
    }, {
        axis: "x" | "y";
        keyFrames: {
            frame: number;
            angle: number;
            description?: string | undefined;
        }[];
        interpolation?: "linear" | "bezier" | "step" | undefined;
    }>, "many">>;
    placeholderRigCreated: z.ZodDefault<z.ZodBoolean>;
    realRigCreated: z.ZodDefault<z.ZodBoolean>;
    /** Human-readable groups, e.g. "front mouth chart". For reports. */
    missingAssets: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /**
     * Machine-readable `view_layer` keys for the same gaps, e.g. "front_skull".
     *
     * `buildFromAssets()` looks assetPaths up by this key, but only the humanised
     * list used to be returned — so a caller could not actually satisfy the list it
     * was given and realRigCreated stayed false forever.
     */
    missingAssetKeys: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    providedAssets: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    nextBestAction: z.ZodOptional<z.ZodString>;
    origin: z.ZodDefault<z.ZodEnum<["generated", "assembled", "simulated", "planned", "placeholder", "requires_human", "requires_external_model", "requires_real_harmony"]>>;
}, "strip", z.ZodTypeAny, {
    origin: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model";
    characterName: string;
    deformers: {
        targetLayer: string;
        deformerType: "curve" | "envelope" | "perspective" | "quadric";
        axis: "x" | "y" | "z" | "free";
        range?: number[] | undefined;
    }[];
    masterControllers: {
        name: string;
        controls: {
            attributeName: string;
            node: string;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: number | undefined;
        }[];
    }[];
    missingAssets: string[];
    requiredAssets: {
        status: "placeholder" | "generated" | "missing" | "provided";
        view: string;
        layer: string;
    }[];
    faceControls: {
        groupName: "eyes" | "brows" | "mouth" | "head" | "expressions";
        controllers: {
            name: string;
            controls: {
                attributeName: string;
                node: string;
                min?: number | undefined;
                max?: number | undefined;
                defaultValue?: number | undefined;
            }[];
        }[];
    }[];
    bodyTurn: {
        interpolation: "linear" | "bezier" | "step";
        axis: "x" | "y";
        keyFrames: {
            frame: number;
            angle: number;
            description?: string | undefined;
        }[];
    }[];
    placeholderRigCreated: boolean;
    realRigCreated: boolean;
    missingAssetKeys: string[];
    providedAssets: string[];
    nextBestAction?: string | undefined;
}, {
    characterName: string;
    origin?: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model" | undefined;
    deformers?: {
        targetLayer: string;
        deformerType: "curve" | "envelope" | "perspective" | "quadric";
        axis?: "x" | "y" | "z" | "free" | undefined;
        range?: number[] | undefined;
    }[] | undefined;
    masterControllers?: {
        name: string;
        controls: {
            attributeName: string;
            node: string;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: number | undefined;
        }[];
    }[] | undefined;
    missingAssets?: string[] | undefined;
    requiredAssets?: {
        status: "placeholder" | "generated" | "missing" | "provided";
        view: string;
        layer: string;
    }[] | undefined;
    faceControls?: {
        groupName: "eyes" | "brows" | "mouth" | "head" | "expressions";
        controllers: {
            name: string;
            controls: {
                attributeName: string;
                node: string;
                min?: number | undefined;
                max?: number | undefined;
                defaultValue?: number | undefined;
            }[];
        }[];
    }[] | undefined;
    bodyTurn?: {
        axis: "x" | "y";
        keyFrames: {
            frame: number;
            angle: number;
            description?: string | undefined;
        }[];
        interpolation?: "linear" | "bezier" | "step" | undefined;
    }[] | undefined;
    placeholderRigCreated?: boolean | undefined;
    realRigCreated?: boolean | undefined;
    missingAssetKeys?: string[] | undefined;
    providedAssets?: string[] | undefined;
    nextBestAction?: string | undefined;
}>;
export type Rig360Spec = z.infer<typeof rig360SpecSchema>;
export type DeformerPlan = z.infer<typeof deformerPlanSchema>;
export type MasterControllerPlan = z.infer<typeof masterControllerPlanSchema>;
export type FaceControlPlan = z.infer<typeof faceControlPlanSchema>;
export type BodyTurnPlan = z.infer<typeof bodyTurnPlanSchema>;
