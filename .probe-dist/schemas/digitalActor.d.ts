import { z } from 'zod';
export declare const DIGITAL_ACTOR_SCHEMA_VERSION = "3.0";
export declare const colorSwatchSchema: z.ZodObject<{
    colorId: z.ZodString;
    name: z.ZodString;
    r: z.ZodNumber;
    g: z.ZodNumber;
    b: z.ZodNumber;
    a: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    colorId: string;
    name: string;
    r: number;
    g: number;
    b: number;
    a: number;
}, {
    colorId: string;
    name: string;
    r: number;
    g: number;
    b: number;
    a?: number | undefined;
}>;
export declare const actorPaletteSchema: z.ZodObject<{
    paletteId: z.ZodString;
    name: z.ZodString;
    colors: z.ZodArray<z.ZodObject<{
        colorId: z.ZodString;
        name: z.ZodString;
        r: z.ZodNumber;
        g: z.ZodNumber;
        b: z.ZodNumber;
        a: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        colorId: string;
        name: string;
        r: number;
        g: number;
        b: number;
        a: number;
    }, {
        colorId: string;
        name: string;
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    name: string;
    colors: {
        colorId: string;
        name: string;
        r: number;
        g: number;
        b: number;
        a: number;
    }[];
    paletteId: string;
}, {
    name: string;
    colors: {
        colorId: string;
        name: string;
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    }[];
    paletteId: string;
}>;
export declare const masterDrawingSchema: z.ZodObject<{
    drawingId: z.ZodString;
    name: z.ZodString;
    path: z.ZodString;
    inferred: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    path: string;
    name: string;
    drawingId: string;
    inferred: boolean;
}, {
    path: string;
    name: string;
    drawingId: string;
    inferred?: boolean | undefined;
}>;
export declare const actorPivotSchema: z.ZodObject<{
    partId: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    inferred: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    x: number;
    y: number;
    partId: string;
    inferred: boolean;
}, {
    x: number;
    y: number;
    partId: string;
    inferred?: boolean | undefined;
}>;
export declare const hierarchyNodeSchema: z.ZodObject<{
    partId: z.ZodString;
    parentId: z.ZodNullable<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    partId: string;
    parentId: string | null;
}, {
    partId: string;
    parentId: string | null;
}>;
export declare const deformRuleSchema: z.ZodObject<{
    ruleId: z.ZodString;
    partId: z.ZodString;
    deformerType: z.ZodEnum<["bone", "curve", "envelope", "freeform"]>;
    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strict", z.ZodTypeAny, {
    partId: string;
    deformerType: "bone" | "curve" | "envelope" | "freeform";
    ruleId: string;
    parameters: Record<string, any>;
}, {
    partId: string;
    deformerType: "bone" | "curve" | "envelope" | "freeform";
    ruleId: string;
    parameters: Record<string, any>;
}>;
export declare const substitutionSchema: z.ZodObject<{
    partId: z.ZodString;
    drawingId: z.ZodString;
    name: z.ZodString;
}, "strict", z.ZodTypeAny, {
    name: string;
    drawingId: string;
    partId: string;
}, {
    name: string;
    drawingId: string;
    partId: string;
}>;
export declare const poseFamilySchema: z.ZodObject<{
    poseId: z.ZodString;
    name: z.ZodString;
    category: z.ZodString;
    values: z.ZodRecord<z.ZodString, z.ZodObject<{
        positionX: z.ZodOptional<z.ZodNumber>;
        positionY: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
        scaleX: z.ZodOptional<z.ZodNumber>;
        scaleY: z.ZodOptional<z.ZodNumber>;
        skew: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        positionX?: number | undefined;
        positionY?: number | undefined;
        rotation?: number | undefined;
        scaleX?: number | undefined;
        scaleY?: number | undefined;
        skew?: number | undefined;
    }, {
        positionX?: number | undefined;
        positionY?: number | undefined;
        rotation?: number | undefined;
        scaleX?: number | undefined;
        scaleY?: number | undefined;
        skew?: number | undefined;
    }>>;
    inferred: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    values: Record<string, {
        positionX?: number | undefined;
        positionY?: number | undefined;
        rotation?: number | undefined;
        scaleX?: number | undefined;
        scaleY?: number | undefined;
        skew?: number | undefined;
    }>;
    name: string;
    category: string;
    inferred: boolean;
    poseId: string;
}, {
    values: Record<string, {
        positionX?: number | undefined;
        positionY?: number | undefined;
        rotation?: number | undefined;
        scaleX?: number | undefined;
        scaleY?: number | undefined;
        skew?: number | undefined;
    }>;
    name: string;
    category: string;
    poseId: string;
    inferred?: boolean | undefined;
}>;
export declare const gestureLibraryEntrySchema: z.ZodObject<{
    gestureId: z.ZodString;
    name: z.ZodString;
    partId: z.ZodString;
    frameCount: z.ZodNumber;
    keys: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        positionX: z.ZodOptional<z.ZodNumber>;
        positionY: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
        scaleX: z.ZodOptional<z.ZodNumber>;
        scaleY: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        positionX?: number | undefined;
        positionY?: number | undefined;
        rotation?: number | undefined;
        scaleX?: number | undefined;
        scaleY?: number | undefined;
    }, {
        frame: number;
        positionX?: number | undefined;
        positionY?: number | undefined;
        rotation?: number | undefined;
        scaleX?: number | undefined;
        scaleY?: number | undefined;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    keys: {
        frame: number;
        positionX?: number | undefined;
        positionY?: number | undefined;
        rotation?: number | undefined;
        scaleX?: number | undefined;
        scaleY?: number | undefined;
    }[];
    name: string;
    frameCount: number;
    partId: string;
    gestureId: string;
}, {
    keys: {
        frame: number;
        positionX?: number | undefined;
        positionY?: number | undefined;
        rotation?: number | undefined;
        scaleX?: number | undefined;
        scaleY?: number | undefined;
    }[];
    name: string;
    frameCount: number;
    partId: string;
    gestureId: string;
}>;
export declare const actingProfileSchema: z.ZodObject<{
    defaultStyle: z.ZodDefault<z.ZodString>;
    tempoBias: z.ZodDefault<z.ZodNumber>;
    gestureRate: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    defaultStyle: string;
    tempoBias: number;
    gestureRate: number;
}, {
    defaultStyle?: string | undefined;
    tempoBias?: number | undefined;
    gestureRate?: number | undefined;
}>;
export declare const digitalActorSchema: z.ZodObject<{
    schemaVersion: z.ZodDefault<z.ZodString>;
    actorId: z.ZodString;
    identity: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        description: string;
        tags: string[];
    }, {
        name: string;
        description: string;
        tags?: string[] | undefined;
    }>;
    modelSheets: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    palettes: z.ZodDefault<z.ZodArray<z.ZodObject<{
        paletteId: z.ZodString;
        name: z.ZodString;
        colors: z.ZodArray<z.ZodObject<{
            colorId: z.ZodString;
            name: z.ZodString;
            r: z.ZodNumber;
            g: z.ZodNumber;
            b: z.ZodNumber;
            a: z.ZodDefault<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            colorId: string;
            name: string;
            r: number;
            g: number;
            b: number;
            a: number;
        }, {
            colorId: string;
            name: string;
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }>, "many">;
    }, "strict", z.ZodTypeAny, {
        name: string;
        colors: {
            colorId: string;
            name: string;
            r: number;
            g: number;
            b: number;
            a: number;
        }[];
        paletteId: string;
    }, {
        name: string;
        colors: {
            colorId: string;
            name: string;
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }[];
        paletteId: string;
    }>, "many">>;
    masterDrawings: z.ZodDefault<z.ZodArray<z.ZodObject<{
        drawingId: z.ZodString;
        name: z.ZodString;
        path: z.ZodString;
        inferred: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        path: string;
        name: string;
        drawingId: string;
        inferred: boolean;
    }, {
        path: string;
        name: string;
        drawingId: string;
        inferred?: boolean | undefined;
    }>, "many">>;
    headViews: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    bodyViews: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    eyes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    brows: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    mouths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    hands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    props: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    pivots: z.ZodDefault<z.ZodArray<z.ZodObject<{
        partId: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
        inferred: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        x: number;
        y: number;
        partId: string;
        inferred: boolean;
    }, {
        x: number;
        y: number;
        partId: string;
        inferred?: boolean | undefined;
    }>, "many">>;
    hierarchy: z.ZodDefault<z.ZodArray<z.ZodObject<{
        partId: z.ZodString;
        parentId: z.ZodNullable<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        partId: string;
        parentId: string | null;
    }, {
        partId: string;
        parentId: string | null;
    }>, "many">>;
    deformRules: z.ZodDefault<z.ZodArray<z.ZodObject<{
        ruleId: z.ZodString;
        partId: z.ZodString;
        deformerType: z.ZodEnum<["bone", "curve", "envelope", "freeform"]>;
        parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strict", z.ZodTypeAny, {
        partId: string;
        deformerType: "bone" | "curve" | "envelope" | "freeform";
        ruleId: string;
        parameters: Record<string, any>;
    }, {
        partId: string;
        deformerType: "bone" | "curve" | "envelope" | "freeform";
        ruleId: string;
        parameters: Record<string, any>;
    }>, "many">>;
    substitutions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        partId: z.ZodString;
        drawingId: z.ZodString;
        name: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        name: string;
        drawingId: string;
        partId: string;
    }, {
        name: string;
        drawingId: string;
        partId: string;
    }>, "many">>;
    poseFamilies: z.ZodDefault<z.ZodArray<z.ZodObject<{
        poseId: z.ZodString;
        name: z.ZodString;
        category: z.ZodString;
        values: z.ZodRecord<z.ZodString, z.ZodObject<{
            positionX: z.ZodOptional<z.ZodNumber>;
            positionY: z.ZodOptional<z.ZodNumber>;
            rotation: z.ZodOptional<z.ZodNumber>;
            scaleX: z.ZodOptional<z.ZodNumber>;
            scaleY: z.ZodOptional<z.ZodNumber>;
            skew: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            positionX?: number | undefined;
            positionY?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
            skew?: number | undefined;
        }, {
            positionX?: number | undefined;
            positionY?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
            skew?: number | undefined;
        }>>;
        inferred: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        values: Record<string, {
            positionX?: number | undefined;
            positionY?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
            skew?: number | undefined;
        }>;
        name: string;
        category: string;
        inferred: boolean;
        poseId: string;
    }, {
        values: Record<string, {
            positionX?: number | undefined;
            positionY?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
            skew?: number | undefined;
        }>;
        name: string;
        category: string;
        poseId: string;
        inferred?: boolean | undefined;
    }>, "many">>;
    gestureLibrary: z.ZodDefault<z.ZodArray<z.ZodObject<{
        gestureId: z.ZodString;
        name: z.ZodString;
        partId: z.ZodString;
        frameCount: z.ZodNumber;
        keys: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            positionX: z.ZodOptional<z.ZodNumber>;
            positionY: z.ZodOptional<z.ZodNumber>;
            rotation: z.ZodOptional<z.ZodNumber>;
            scaleX: z.ZodOptional<z.ZodNumber>;
            scaleY: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            frame: number;
            positionX?: number | undefined;
            positionY?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
        }, {
            frame: number;
            positionX?: number | undefined;
            positionY?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
        }>, "many">;
    }, "strict", z.ZodTypeAny, {
        keys: {
            frame: number;
            positionX?: number | undefined;
            positionY?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
        }[];
        name: string;
        frameCount: number;
        partId: string;
        gestureId: string;
    }, {
        keys: {
            frame: number;
            positionX?: number | undefined;
            positionY?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
        }[];
        name: string;
        frameCount: number;
        partId: string;
        gestureId: string;
    }>, "many">>;
    actingProfile: z.ZodDefault<z.ZodObject<{
        defaultStyle: z.ZodDefault<z.ZodString>;
        tempoBias: z.ZodDefault<z.ZodNumber>;
        gestureRate: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        defaultStyle: string;
        tempoBias: number;
        gestureRate: number;
    }, {
        defaultStyle?: string | undefined;
        tempoBias?: number | undefined;
        gestureRate?: number | undefined;
    }>>;
    provenance: z.ZodObject<{
        importedFrom: z.ZodString;
        importedAt: z.ZodString;
        inferredParts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strict", z.ZodTypeAny, {
        importedFrom: string;
        importedAt: string;
        inferredParts: string[];
    }, {
        importedFrom: string;
        importedAt: string;
        inferredParts?: string[] | undefined;
    }>;
    origin: z.ZodDefault<z.ZodEnum<["generated", "assembled", "simulated", "planned", "placeholder", "requires_human", "requires_external_model", "requires_real_harmony"]>>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        importedFrom: string;
        importedAt: string;
        inferredParts: string[];
    };
    schemaVersion: string;
    palettes: {
        name: string;
        colors: {
            colorId: string;
            name: string;
            r: number;
            g: number;
            b: number;
            a: number;
        }[];
        paletteId: string;
    }[];
    origin: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model";
    eyes: string[];
    brows: string[];
    props: string[];
    substitutions: {
        name: string;
        drawingId: string;
        partId: string;
    }[];
    actorId: string;
    identity: {
        name: string;
        description: string;
        tags: string[];
    };
    modelSheets: string[];
    masterDrawings: {
        path: string;
        name: string;
        drawingId: string;
        inferred: boolean;
    }[];
    headViews: string[];
    bodyViews: string[];
    mouths: string[];
    hands: string[];
    pivots: {
        x: number;
        y: number;
        partId: string;
        inferred: boolean;
    }[];
    hierarchy: {
        partId: string;
        parentId: string | null;
    }[];
    deformRules: {
        partId: string;
        deformerType: "bone" | "curve" | "envelope" | "freeform";
        ruleId: string;
        parameters: Record<string, any>;
    }[];
    poseFamilies: {
        values: Record<string, {
            positionX?: number | undefined;
            positionY?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
            skew?: number | undefined;
        }>;
        name: string;
        category: string;
        inferred: boolean;
        poseId: string;
    }[];
    gestureLibrary: {
        keys: {
            frame: number;
            positionX?: number | undefined;
            positionY?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
        }[];
        name: string;
        frameCount: number;
        partId: string;
        gestureId: string;
    }[];
    actingProfile: {
        defaultStyle: string;
        tempoBias: number;
        gestureRate: number;
    };
}, {
    provenance: {
        importedFrom: string;
        importedAt: string;
        inferredParts?: string[] | undefined;
    };
    actorId: string;
    identity: {
        name: string;
        description: string;
        tags?: string[] | undefined;
    };
    schemaVersion?: string | undefined;
    palettes?: {
        name: string;
        colors: {
            colorId: string;
            name: string;
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }[];
        paletteId: string;
    }[] | undefined;
    origin?: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model" | undefined;
    eyes?: string[] | undefined;
    brows?: string[] | undefined;
    props?: string[] | undefined;
    substitutions?: {
        name: string;
        drawingId: string;
        partId: string;
    }[] | undefined;
    modelSheets?: string[] | undefined;
    masterDrawings?: {
        path: string;
        name: string;
        drawingId: string;
        inferred?: boolean | undefined;
    }[] | undefined;
    headViews?: string[] | undefined;
    bodyViews?: string[] | undefined;
    mouths?: string[] | undefined;
    hands?: string[] | undefined;
    pivots?: {
        x: number;
        y: number;
        partId: string;
        inferred?: boolean | undefined;
    }[] | undefined;
    hierarchy?: {
        partId: string;
        parentId: string | null;
    }[] | undefined;
    deformRules?: {
        partId: string;
        deformerType: "bone" | "curve" | "envelope" | "freeform";
        ruleId: string;
        parameters: Record<string, any>;
    }[] | undefined;
    poseFamilies?: {
        values: Record<string, {
            positionX?: number | undefined;
            positionY?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
            skew?: number | undefined;
        }>;
        name: string;
        category: string;
        poseId: string;
        inferred?: boolean | undefined;
    }[] | undefined;
    gestureLibrary?: {
        keys: {
            frame: number;
            positionX?: number | undefined;
            positionY?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
        }[];
        name: string;
        frameCount: number;
        partId: string;
        gestureId: string;
    }[] | undefined;
    actingProfile?: {
        defaultStyle?: string | undefined;
        tempoBias?: number | undefined;
        gestureRate?: number | undefined;
    } | undefined;
}>;
export type DigitalActor = z.infer<typeof digitalActorSchema>;
export declare const digitalActorValidationSchema: z.ZodObject<{
    valid: z.ZodBoolean;
    errors: z.ZodArray<z.ZodString, "many">;
    warnings: z.ZodArray<z.ZodString, "many">;
    inferredCount: z.ZodNumber;
    checks: z.ZodObject<{
        viewsCoverage: z.ZodBoolean;
        hierarchyCycleFree: z.ZodBoolean;
        pivotsCompleteness: z.ZodBoolean;
        colorConflictFree: z.ZodBoolean;
        substitutionsCompleteness: z.ZodBoolean;
    }, "strict", z.ZodTypeAny, {
        viewsCoverage: boolean;
        hierarchyCycleFree: boolean;
        pivotsCompleteness: boolean;
        colorConflictFree: boolean;
        substitutionsCompleteness: boolean;
    }, {
        viewsCoverage: boolean;
        hierarchyCycleFree: boolean;
        pivotsCompleteness: boolean;
        colorConflictFree: boolean;
        substitutionsCompleteness: boolean;
    }>;
}, "strict", z.ZodTypeAny, {
    valid: boolean;
    warnings: string[];
    errors: string[];
    inferredCount: number;
    checks: {
        viewsCoverage: boolean;
        hierarchyCycleFree: boolean;
        pivotsCompleteness: boolean;
        colorConflictFree: boolean;
        substitutionsCompleteness: boolean;
    };
}, {
    valid: boolean;
    warnings: string[];
    errors: string[];
    inferredCount: number;
    checks: {
        viewsCoverage: boolean;
        hierarchyCycleFree: boolean;
        pivotsCompleteness: boolean;
        colorConflictFree: boolean;
        substitutionsCompleteness: boolean;
    };
}>;
export type DigitalActorValidation = z.infer<typeof digitalActorValidationSchema>;
