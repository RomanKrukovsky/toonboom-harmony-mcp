import { z } from 'zod';
export declare const point2DConstraintSchema: z.ZodObject<{
    x: z.ZodDefault<z.ZodNumber>;
    y: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
}, {
    x?: number | undefined;
    y?: number | undefined;
}>;
export declare const backdropGroupSchema: z.ZodEnum<["head", "torso", "arms", "legs", "master", "accessories"]>;
export declare const partRigSpecSchema: z.ZodObject<{
    partId: z.ZodString;
    drawingNodeName: z.ZodString;
    pegNodeName: z.ZodString;
    parentPartId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    semanticGroup: z.ZodString;
    artLayer: z.ZodDefault<z.ZodEnum<["underlay", "line", "color", "overlay"]>>;
    pivot: z.ZodDefault<z.ZodObject<{
        x: z.ZodDefault<z.ZodNumber>;
        y: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x?: number | undefined;
        y?: number | undefined;
    }>>;
    zOffset: z.ZodDefault<z.ZodNumber>;
    separatePosition: z.ZodDefault<z.ZodBoolean>;
    lockDrawingMode: z.ZodDefault<z.ZodBoolean>;
    hasDeformer: z.ZodDefault<z.ZodBoolean>;
    isKinematicAccessory: z.ZodDefault<z.ZodBoolean>;
    backdropGroup: z.ZodDefault<z.ZodEnum<["head", "torso", "arms", "legs", "master", "accessories"]>>;
}, "strip", z.ZodTypeAny, {
    pivot: {
        x: number;
        y: number;
    };
    separatePosition: boolean;
    lockDrawingMode: boolean;
    artLayer: "underlay" | "line" | "color" | "overlay";
    semanticGroup: string;
    partId: string;
    drawingNodeName: string;
    pegNodeName: string;
    parentPartId: string | null;
    zOffset: number;
    hasDeformer: boolean;
    isKinematicAccessory: boolean;
    backdropGroup: "torso" | "head" | "arms" | "legs" | "master" | "accessories";
}, {
    semanticGroup: string;
    partId: string;
    drawingNodeName: string;
    pegNodeName: string;
    pivot?: {
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    separatePosition?: boolean | undefined;
    lockDrawingMode?: boolean | undefined;
    artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
    parentPartId?: string | null | undefined;
    zOffset?: number | undefined;
    hasDeformer?: boolean | undefined;
    isKinematicAccessory?: boolean | undefined;
    backdropGroup?: "torso" | "head" | "arms" | "legs" | "master" | "accessories" | undefined;
}>;
export type PartRigSpec = z.infer<typeof partRigSpecSchema>;
export declare const autoPatchJointSpecSchema: z.ZodObject<{
    jointId: z.ZodString;
    jointName: z.ZodString;
    partA: z.ZodString;
    partB: z.ZodString;
    patchRadius: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    jointId: string;
    jointName: string;
    partA: string;
    partB: string;
    patchRadius: number;
}, {
    jointId: string;
    jointName: string;
    partA: string;
    partB: string;
    patchRadius?: number | undefined;
}>;
export type AutoPatchJointSpec = z.infer<typeof autoPatchJointSpecSchema>;
export declare const kinematicAccessorySpecSchema: z.ZodObject<{
    accessoryId: z.ZodString;
    parentPart: z.ZodString;
    accessoryPart: z.ZodString;
}, "strip", z.ZodTypeAny, {
    accessoryId: string;
    parentPart: string;
    accessoryPart: string;
}, {
    accessoryId: string;
    parentPart: string;
    accessoryPart: string;
}>;
export type KinematicAccessorySpec = z.infer<typeof kinematicAccessorySpecSchema>;
export declare const backdropSpecSchema: z.ZodObject<{
    title: z.ZodString;
    color: z.ZodEnum<["green", "blue", "yellow", "purple", "red", "gray"]>;
    nodes: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    nodes: string[];
    color: "green" | "blue" | "yellow" | "purple" | "red" | "gray";
    title: string;
}, {
    nodes: string[];
    color: "green" | "blue" | "yellow" | "purple" | "red" | "gray";
    title: string;
}>;
export type BackdropSpec = z.infer<typeof backdropSpecSchema>;
export declare const characterRigAssemblyPlanSchema: z.ZodObject<{
    planId: z.ZodString;
    characterName: z.ZodString;
    masterPegName: z.ZodDefault<z.ZodString>;
    parts: z.ZodArray<z.ZodObject<{
        partId: z.ZodString;
        drawingNodeName: z.ZodString;
        pegNodeName: z.ZodString;
        parentPartId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        semanticGroup: z.ZodString;
        artLayer: z.ZodDefault<z.ZodEnum<["underlay", "line", "color", "overlay"]>>;
        pivot: z.ZodDefault<z.ZodObject<{
            x: z.ZodDefault<z.ZodNumber>;
            y: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x?: number | undefined;
            y?: number | undefined;
        }>>;
        zOffset: z.ZodDefault<z.ZodNumber>;
        separatePosition: z.ZodDefault<z.ZodBoolean>;
        lockDrawingMode: z.ZodDefault<z.ZodBoolean>;
        hasDeformer: z.ZodDefault<z.ZodBoolean>;
        isKinematicAccessory: z.ZodDefault<z.ZodBoolean>;
        backdropGroup: z.ZodDefault<z.ZodEnum<["head", "torso", "arms", "legs", "master", "accessories"]>>;
    }, "strip", z.ZodTypeAny, {
        pivot: {
            x: number;
            y: number;
        };
        separatePosition: boolean;
        lockDrawingMode: boolean;
        artLayer: "underlay" | "line" | "color" | "overlay";
        semanticGroup: string;
        partId: string;
        drawingNodeName: string;
        pegNodeName: string;
        parentPartId: string | null;
        zOffset: number;
        hasDeformer: boolean;
        isKinematicAccessory: boolean;
        backdropGroup: "torso" | "head" | "arms" | "legs" | "master" | "accessories";
    }, {
        semanticGroup: string;
        partId: string;
        drawingNodeName: string;
        pegNodeName: string;
        pivot?: {
            x?: number | undefined;
            y?: number | undefined;
        } | undefined;
        separatePosition?: boolean | undefined;
        lockDrawingMode?: boolean | undefined;
        artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
        parentPartId?: string | null | undefined;
        zOffset?: number | undefined;
        hasDeformer?: boolean | undefined;
        isKinematicAccessory?: boolean | undefined;
        backdropGroup?: "torso" | "head" | "arms" | "legs" | "master" | "accessories" | undefined;
    }>, "many">;
    autoPatchJoints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        jointId: z.ZodString;
        jointName: z.ZodString;
        partA: z.ZodString;
        partB: z.ZodString;
        patchRadius: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        jointId: string;
        jointName: string;
        partA: string;
        partB: string;
        patchRadius: number;
    }, {
        jointId: string;
        jointName: string;
        partA: string;
        partB: string;
        patchRadius?: number | undefined;
    }>, "many">>;
    kinematicAccessories: z.ZodDefault<z.ZodArray<z.ZodObject<{
        accessoryId: z.ZodString;
        parentPart: z.ZodString;
        accessoryPart: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        accessoryId: string;
        parentPart: string;
        accessoryPart: string;
    }, {
        accessoryId: string;
        parentPart: string;
        accessoryPart: string;
    }>, "many">>;
    backdrops: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        color: z.ZodEnum<["green", "blue", "yellow", "purple", "red", "gray"]>;
        nodes: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        nodes: string[];
        color: "green" | "blue" | "yellow" | "purple" | "red" | "gray";
        title: string;
    }, {
        nodes: string[];
        color: "green" | "blue" | "yellow" | "purple" | "red" | "gray";
        title: string;
    }>, "many">>;
    planHash: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    planId: string;
    characterName: string;
    masterPegName: string;
    parts: {
        pivot: {
            x: number;
            y: number;
        };
        separatePosition: boolean;
        lockDrawingMode: boolean;
        artLayer: "underlay" | "line" | "color" | "overlay";
        semanticGroup: string;
        partId: string;
        drawingNodeName: string;
        pegNodeName: string;
        parentPartId: string | null;
        zOffset: number;
        hasDeformer: boolean;
        isKinematicAccessory: boolean;
        backdropGroup: "torso" | "head" | "arms" | "legs" | "master" | "accessories";
    }[];
    autoPatchJoints: {
        jointId: string;
        jointName: string;
        partA: string;
        partB: string;
        patchRadius: number;
    }[];
    kinematicAccessories: {
        accessoryId: string;
        parentPart: string;
        accessoryPart: string;
    }[];
    backdrops: {
        nodes: string[];
        color: "green" | "blue" | "yellow" | "purple" | "red" | "gray";
        title: string;
    }[];
    createdAt?: string | undefined;
    planHash?: string | undefined;
}, {
    planId: string;
    characterName: string;
    parts: {
        semanticGroup: string;
        partId: string;
        drawingNodeName: string;
        pegNodeName: string;
        pivot?: {
            x?: number | undefined;
            y?: number | undefined;
        } | undefined;
        separatePosition?: boolean | undefined;
        lockDrawingMode?: boolean | undefined;
        artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
        parentPartId?: string | null | undefined;
        zOffset?: number | undefined;
        hasDeformer?: boolean | undefined;
        isKinematicAccessory?: boolean | undefined;
        backdropGroup?: "torso" | "head" | "arms" | "legs" | "master" | "accessories" | undefined;
    }[];
    createdAt?: string | undefined;
    masterPegName?: string | undefined;
    autoPatchJoints?: {
        jointId: string;
        jointName: string;
        partA: string;
        partB: string;
        patchRadius?: number | undefined;
    }[] | undefined;
    kinematicAccessories?: {
        accessoryId: string;
        parentPart: string;
        accessoryPart: string;
    }[] | undefined;
    backdrops?: {
        nodes: string[];
        color: "green" | "blue" | "yellow" | "purple" | "red" | "gray";
        title: string;
    }[] | undefined;
    planHash?: string | undefined;
}>;
export type CharacterRigAssemblyPlan = z.infer<typeof characterRigAssemblyPlanSchema>;
export declare function computeRigPlanHash(plan: Omit<CharacterRigAssemblyPlan, 'planHash'>): string;
