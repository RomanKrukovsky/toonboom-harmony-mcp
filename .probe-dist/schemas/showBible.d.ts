import { z } from 'zod';
/**
 * showBible.ts — machine-readable production standard for ONE frozen show.
 *
 * This is the contract that locks the "factory of one series" described in
 * ROADMAP. The LLM is allowed to make directorial decisions ONLY within the
 * constraints declared here. Everything outside this bible is a QA rejection.
 *
 * The ShowBible is a FAMILY of six JSON documents:
 *   show_bible.json       — top-level lock (fps, resolution, style, lighting)
 *   character_bible.json  — per-character turnaround + controller map
 *   camera_rules.json     — allowed shot sizes, moves, framing
 *   motion_grammar.json   — allowed gestures, emotions, pose library refs
 *   palette_manifest.json — locked palette colours with stable IDs
 *   qa_thresholds.json    — numeric gates for QA Retake Engine
 *
 * Each document carries its own schemaVersion so they can evolve independently.
 * Provenance is mandatory: every ShowBible must declare its human approver.
 */
export declare const SHOW_BIBLE_SCHEMA_VERSION = "1.0";
export declare const paletteColourSchema: z.ZodObject<{
    colourId: z.ZodString;
    name: z.ZodString;
    rgba: z.ZodString;
    usage: z.ZodString;
    locked: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    name: string;
    rgba: string;
    locked: boolean;
    colourId: string;
    usage: string;
}, {
    name: string;
    rgba: string;
    colourId: string;
    usage: string;
    locked?: boolean | undefined;
}>;
export declare const paletteManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    paletteId: z.ZodString;
    name: z.ZodString;
    colours: z.ZodArray<z.ZodObject<{
        colourId: z.ZodString;
        name: z.ZodString;
        rgba: z.ZodString;
        usage: z.ZodString;
        locked: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        rgba: string;
        locked: boolean;
        colourId: string;
        usage: string;
    }, {
        name: string;
        rgba: string;
        colourId: string;
        usage: string;
        locked?: boolean | undefined;
    }>, "many">;
    provenance: z.ZodObject<{
        approver: z.ZodString;
        approvedAt: z.ZodString;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        approver: string;
        approvedAt: string;
        notes?: string | undefined;
    }, {
        approver: string;
        approvedAt: string;
        notes?: string | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    name: string;
    provenance: {
        approver: string;
        approvedAt: string;
        notes?: string | undefined;
    };
    schemaVersion: "1.0";
    paletteId: string;
    colours: {
        name: string;
        rgba: string;
        locked: boolean;
        colourId: string;
        usage: string;
    }[];
}, {
    name: string;
    provenance: {
        approver: string;
        approvedAt: string;
        notes?: string | undefined;
    };
    schemaVersion: "1.0";
    paletteId: string;
    colours: {
        name: string;
        rgba: string;
        colourId: string;
        usage: string;
        locked?: boolean | undefined;
    }[];
}>;
export type PaletteManifest = z.infer<typeof paletteManifestSchema>;
export type PaletteColour = z.infer<typeof paletteColourSchema>;
export declare const controllerBindingSchema: z.ZodObject<{
    controllerId: z.ZodString;
    nodePath: z.ZodString;
    purpose: z.ZodString;
    range: z.ZodOptional<z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
        units: z.ZodEnum<["degrees", "normalized", "frames", "pixels"]>;
    }, "strip", z.ZodTypeAny, {
        min: number;
        max: number;
        units: "frames" | "normalized" | "degrees" | "pixels";
    }, {
        min: number;
        max: number;
        units: "frames" | "normalized" | "degrees" | "pixels";
    }>>;
    libraryRef: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    nodePath: string;
    controllerId: string;
    purpose: string;
    range?: {
        min: number;
        max: number;
        units: "frames" | "normalized" | "degrees" | "pixels";
    } | undefined;
    libraryRef?: string | undefined;
}, {
    nodePath: string;
    controllerId: string;
    purpose: string;
    range?: {
        min: number;
        max: number;
        units: "frames" | "normalized" | "degrees" | "pixels";
    } | undefined;
    libraryRef?: string | undefined;
}>;
export declare const mouthShapeSchema: z.ZodObject<{
    shapeId: z.ZodEnum<["A", "B", "C", "D", "E", "F", "G", "X"]>;
    drawingName: z.ZodString;
    phonemes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    drawingName: string;
    phonemes: string[];
    shapeId: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
}, {
    drawingName: string;
    shapeId: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
    phonemes?: string[] | undefined;
}>;
export declare const expressionSchema: z.ZodObject<{
    expressionId: z.ZodString;
    drawingName: z.ZodOptional<z.ZodString>;
    controllerOverrides: z.ZodDefault<z.ZodArray<z.ZodObject<{
        controllerId: z.ZodString;
        value: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: number;
        controllerId: string;
    }, {
        value: number;
        controllerId: string;
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    expressionId: string;
    controllerOverrides: {
        value: number;
        controllerId: string;
    }[];
    drawingName?: string | undefined;
}, {
    expressionId: string;
    drawingName?: string | undefined;
    controllerOverrides?: {
        value: number;
        controllerId: string;
    }[] | undefined;
}>;
export declare const gestureLibraryEntrySchema: z.ZodObject<{
    gestureId: z.ZodString;
    durationFrames: z.ZodNumber;
    controllerTrackRef: z.ZodString;
}, "strict", z.ZodTypeAny, {
    durationFrames: number;
    gestureId: string;
    controllerTrackRef: string;
}, {
    durationFrames: number;
    gestureId: string;
    controllerTrackRef: string;
}>;
export declare const characterBibleSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    characterId: z.ZodString;
    name: z.ZodString;
    role: z.ZodEnum<["protagonist", "antagonist", "supporting", "background"]>;
    rigPath: z.ZodString;
    templatePath: z.ZodString;
    turnaroundViews: z.ZodArray<z.ZodEnum<["front", "front_3q_left", "side_left", "back_3q_left", "back", "back_3q_right", "side_right", "front_3q_right"]>, "many">;
    proportions: z.ZodOptional<z.ZodObject<{
        headHeightRatio: z.ZodOptional<z.ZodNumber>;
        armSpanRatio: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        headHeightRatio?: number | undefined;
        armSpanRatio?: number | undefined;
    }, {
        headHeightRatio?: number | undefined;
        armSpanRatio?: number | undefined;
    }>>;
    lineRules: z.ZodOptional<z.ZodObject<{
        lineThicknessPt: z.ZodNumber;
        lineColourId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        lineThicknessPt: number;
        lineColourId: string;
    }, {
        lineThicknessPt: number;
        lineColourId: string;
    }>>;
    controllers: z.ZodArray<z.ZodObject<{
        controllerId: z.ZodString;
        nodePath: z.ZodString;
        purpose: z.ZodString;
        range: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
            units: z.ZodEnum<["degrees", "normalized", "frames", "pixels"]>;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
            units: "frames" | "normalized" | "degrees" | "pixels";
        }, {
            min: number;
            max: number;
            units: "frames" | "normalized" | "degrees" | "pixels";
        }>>;
        libraryRef: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        nodePath: string;
        controllerId: string;
        purpose: string;
        range?: {
            min: number;
            max: number;
            units: "frames" | "normalized" | "degrees" | "pixels";
        } | undefined;
        libraryRef?: string | undefined;
    }, {
        nodePath: string;
        controllerId: string;
        purpose: string;
        range?: {
            min: number;
            max: number;
            units: "frames" | "normalized" | "degrees" | "pixels";
        } | undefined;
        libraryRef?: string | undefined;
    }>, "many">;
    mouthShapes: z.ZodDefault<z.ZodArray<z.ZodObject<{
        shapeId: z.ZodEnum<["A", "B", "C", "D", "E", "F", "G", "X"]>;
        drawingName: z.ZodString;
        phonemes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strict", z.ZodTypeAny, {
        drawingName: string;
        phonemes: string[];
        shapeId: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
    }, {
        drawingName: string;
        shapeId: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
        phonemes?: string[] | undefined;
    }>, "many">>;
    expressions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        expressionId: z.ZodString;
        drawingName: z.ZodOptional<z.ZodString>;
        controllerOverrides: z.ZodDefault<z.ZodArray<z.ZodObject<{
            controllerId: z.ZodString;
            value: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            value: number;
            controllerId: string;
        }, {
            value: number;
            controllerId: string;
        }>, "many">>;
    }, "strict", z.ZodTypeAny, {
        expressionId: string;
        controllerOverrides: {
            value: number;
            controllerId: string;
        }[];
        drawingName?: string | undefined;
    }, {
        expressionId: string;
        drawingName?: string | undefined;
        controllerOverrides?: {
            value: number;
            controllerId: string;
        }[] | undefined;
    }>, "many">>;
    gestureLibrary: z.ZodDefault<z.ZodArray<z.ZodObject<{
        gestureId: z.ZodString;
        durationFrames: z.ZodNumber;
        controllerTrackRef: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        durationFrames: number;
        gestureId: string;
        controllerTrackRef: string;
    }, {
        durationFrames: number;
        gestureId: string;
        controllerTrackRef: string;
    }>, "many">>;
    paletteRef: z.ZodString;
    provenance: z.ZodObject<{
        approver: z.ZodString;
        approvedAt: z.ZodString;
        rigAuthor: z.ZodString;
        licensePath: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        approver: string;
        approvedAt: string;
        rigAuthor: string;
        licensePath: string;
    }, {
        approver: string;
        approvedAt: string;
        rigAuthor: string;
        licensePath: string;
    }>;
}, "strict", z.ZodTypeAny, {
    name: string;
    provenance: {
        approver: string;
        approvedAt: string;
        rigAuthor: string;
        licensePath: string;
    };
    schemaVersion: "1.0";
    role: "background" | "protagonist" | "antagonist" | "supporting";
    templatePath: string;
    characterId: string;
    rigPath: string;
    expressions: {
        expressionId: string;
        controllerOverrides: {
            value: number;
            controllerId: string;
        }[];
        drawingName?: string | undefined;
    }[];
    controllers: {
        nodePath: string;
        controllerId: string;
        purpose: string;
        range?: {
            min: number;
            max: number;
            units: "frames" | "normalized" | "degrees" | "pixels";
        } | undefined;
        libraryRef?: string | undefined;
    }[];
    gestureLibrary: {
        durationFrames: number;
        gestureId: string;
        controllerTrackRef: string;
    }[];
    turnaroundViews: ("front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right")[];
    mouthShapes: {
        drawingName: string;
        phonemes: string[];
        shapeId: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
    }[];
    paletteRef: string;
    proportions?: {
        headHeightRatio?: number | undefined;
        armSpanRatio?: number | undefined;
    } | undefined;
    lineRules?: {
        lineThicknessPt: number;
        lineColourId: string;
    } | undefined;
}, {
    name: string;
    provenance: {
        approver: string;
        approvedAt: string;
        rigAuthor: string;
        licensePath: string;
    };
    schemaVersion: "1.0";
    role: "background" | "protagonist" | "antagonist" | "supporting";
    templatePath: string;
    characterId: string;
    rigPath: string;
    controllers: {
        nodePath: string;
        controllerId: string;
        purpose: string;
        range?: {
            min: number;
            max: number;
            units: "frames" | "normalized" | "degrees" | "pixels";
        } | undefined;
        libraryRef?: string | undefined;
    }[];
    turnaroundViews: ("front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right")[];
    paletteRef: string;
    expressions?: {
        expressionId: string;
        drawingName?: string | undefined;
        controllerOverrides?: {
            value: number;
            controllerId: string;
        }[] | undefined;
    }[] | undefined;
    gestureLibrary?: {
        durationFrames: number;
        gestureId: string;
        controllerTrackRef: string;
    }[] | undefined;
    proportions?: {
        headHeightRatio?: number | undefined;
        armSpanRatio?: number | undefined;
    } | undefined;
    lineRules?: {
        lineThicknessPt: number;
        lineColourId: string;
    } | undefined;
    mouthShapes?: {
        drawingName: string;
        shapeId: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
        phonemes?: string[] | undefined;
    }[] | undefined;
}>;
export type CharacterBible = z.infer<typeof characterBibleSchema>;
export type ControllerBinding = z.infer<typeof controllerBindingSchema>;
export declare const cameraRulesSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    allowedShotSizes: z.ZodArray<z.ZodEnum<["extreme_close_up", "close_up", "medium_close_up", "medium_shot", "medium_full_shot", "full_shot", "long_shot", "extreme_long_shot"]>, "many">;
    allowedCameraMoves: z.ZodArray<z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "zoom_in", "zoom_out", "arc_left", "arc_right", "crane_up", "crane_down"]>, "many">;
    defaultShotSize: z.ZodEnum<["extreme_close_up", "close_up", "medium_close_up", "medium_shot", "medium_full_shot", "full_shot", "long_shot", "extreme_long_shot"]>;
    safeMargins: z.ZodObject<{
        top: z.ZodNumber;
        bottom: z.ZodNumber;
        left: z.ZodNumber;
        right: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        left: number;
        right: number;
        top: number;
        bottom: number;
    }, {
        left: number;
        right: number;
        top: number;
        bottom: number;
    }>;
    forbiddenMoves: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    provenance: z.ZodObject<{
        approver: z.ZodString;
        approvedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        approver: string;
        approvedAt: string;
    }, {
        approver: string;
        approvedAt: string;
    }>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        approver: string;
        approvedAt: string;
    };
    schemaVersion: "1.0";
    safeMargins: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
    allowedShotSizes: ("close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot")[];
    allowedCameraMoves: ("static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down")[];
    defaultShotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
    forbiddenMoves: string[];
}, {
    provenance: {
        approver: string;
        approvedAt: string;
    };
    schemaVersion: "1.0";
    safeMargins: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
    allowedShotSizes: ("close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot")[];
    allowedCameraMoves: ("static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down")[];
    defaultShotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
    forbiddenMoves?: string[] | undefined;
}>;
export type CameraRules = z.infer<typeof cameraRulesSchema>;
export declare const motionGrammarRuleSchema: z.ZodObject<{
    ruleId: z.ZodString;
    description: z.ZodString;
    allowedGestures: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    forbiddenGestures: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    allowedEmotions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    poseLibraryRefs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    timing: z.ZodDefault<z.ZodObject<{
        minHoldFrames: z.ZodDefault<z.ZodNumber>;
        maxHoldFrames: z.ZodDefault<z.ZodNumber>;
        anticipationFrames: z.ZodDefault<z.ZodNumber>;
        followThroughFrames: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        minHoldFrames: number;
        maxHoldFrames: number;
        anticipationFrames: number;
        followThroughFrames: number;
    }, {
        minHoldFrames?: number | undefined;
        maxHoldFrames?: number | undefined;
        anticipationFrames?: number | undefined;
        followThroughFrames?: number | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    description: string;
    timing: {
        minHoldFrames: number;
        maxHoldFrames: number;
        anticipationFrames: number;
        followThroughFrames: number;
    };
    ruleId: string;
    allowedGestures: string[];
    forbiddenGestures: string[];
    allowedEmotions: string[];
    poseLibraryRefs: string[];
}, {
    description: string;
    ruleId: string;
    timing?: {
        minHoldFrames?: number | undefined;
        maxHoldFrames?: number | undefined;
        anticipationFrames?: number | undefined;
        followThroughFrames?: number | undefined;
    } | undefined;
    allowedGestures?: string[] | undefined;
    forbiddenGestures?: string[] | undefined;
    allowedEmotions?: string[] | undefined;
    poseLibraryRefs?: string[] | undefined;
}>;
export declare const motionGrammarSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    grammarId: z.ZodString;
    rules: z.ZodArray<z.ZodObject<{
        ruleId: z.ZodString;
        description: z.ZodString;
        allowedGestures: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        forbiddenGestures: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        allowedEmotions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        poseLibraryRefs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        timing: z.ZodDefault<z.ZodObject<{
            minHoldFrames: z.ZodDefault<z.ZodNumber>;
            maxHoldFrames: z.ZodDefault<z.ZodNumber>;
            anticipationFrames: z.ZodDefault<z.ZodNumber>;
            followThroughFrames: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            minHoldFrames: number;
            maxHoldFrames: number;
            anticipationFrames: number;
            followThroughFrames: number;
        }, {
            minHoldFrames?: number | undefined;
            maxHoldFrames?: number | undefined;
            anticipationFrames?: number | undefined;
            followThroughFrames?: number | undefined;
        }>>;
    }, "strict", z.ZodTypeAny, {
        description: string;
        timing: {
            minHoldFrames: number;
            maxHoldFrames: number;
            anticipationFrames: number;
            followThroughFrames: number;
        };
        ruleId: string;
        allowedGestures: string[];
        forbiddenGestures: string[];
        allowedEmotions: string[];
        poseLibraryRefs: string[];
    }, {
        description: string;
        ruleId: string;
        timing?: {
            minHoldFrames?: number | undefined;
            maxHoldFrames?: number | undefined;
            anticipationFrames?: number | undefined;
            followThroughFrames?: number | undefined;
        } | undefined;
        allowedGestures?: string[] | undefined;
        forbiddenGestures?: string[] | undefined;
        allowedEmotions?: string[] | undefined;
        poseLibraryRefs?: string[] | undefined;
    }>, "many">;
    defaultTiming: z.ZodDefault<z.ZodObject<{
        fps: z.ZodDefault<z.ZodNumber>;
        minBeatFrames: z.ZodDefault<z.ZodNumber>;
        maxBeatFrames: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        fps: number;
        minBeatFrames: number;
        maxBeatFrames: number;
    }, {
        fps?: number | undefined;
        minBeatFrames?: number | undefined;
        maxBeatFrames?: number | undefined;
    }>>;
    provenance: z.ZodObject<{
        approver: z.ZodString;
        approvedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        approver: string;
        approvedAt: string;
    }, {
        approver: string;
        approvedAt: string;
    }>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        approver: string;
        approvedAt: string;
    };
    schemaVersion: "1.0";
    rules: {
        description: string;
        timing: {
            minHoldFrames: number;
            maxHoldFrames: number;
            anticipationFrames: number;
            followThroughFrames: number;
        };
        ruleId: string;
        allowedGestures: string[];
        forbiddenGestures: string[];
        allowedEmotions: string[];
        poseLibraryRefs: string[];
    }[];
    grammarId: string;
    defaultTiming: {
        fps: number;
        minBeatFrames: number;
        maxBeatFrames: number;
    };
}, {
    provenance: {
        approver: string;
        approvedAt: string;
    };
    schemaVersion: "1.0";
    rules: {
        description: string;
        ruleId: string;
        timing?: {
            minHoldFrames?: number | undefined;
            maxHoldFrames?: number | undefined;
            anticipationFrames?: number | undefined;
            followThroughFrames?: number | undefined;
        } | undefined;
        allowedGestures?: string[] | undefined;
        forbiddenGestures?: string[] | undefined;
        allowedEmotions?: string[] | undefined;
        poseLibraryRefs?: string[] | undefined;
    }[];
    grammarId: string;
    defaultTiming?: {
        fps?: number | undefined;
        minBeatFrames?: number | undefined;
        maxBeatFrames?: number | undefined;
    } | undefined;
}>;
export type MotionGrammar = z.infer<typeof motionGrammarSchema>;
export declare const qaThresholdsSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    thresholdsId: z.ZodString;
    silhouetteQualityMin: z.ZodDefault<z.ZodNumber>;
    lipsyncDriftMaxMs: z.ZodDefault<z.ZodNumber>;
    continuityMaxDeltaFrames: z.ZodDefault<z.ZodNumber>;
    lineThicknessTolerancePt: z.ZodDefault<z.ZodNumber>;
    paletteDeltaMax: z.ZodDefault<z.ZodNumber>;
    poseLibraryMatchMin: z.ZodDefault<z.ZodNumber>;
    autoFixableSeverityMax: z.ZodDefault<z.ZodEnum<["low", "medium"]>>;
    requireHumanApprovalFor: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    provenance: z.ZodObject<{
        approver: z.ZodString;
        approvedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        approver: string;
        approvedAt: string;
    }, {
        approver: string;
        approvedAt: string;
    }>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        approver: string;
        approvedAt: string;
    };
    schemaVersion: "1.0";
    thresholdsId: string;
    silhouetteQualityMin: number;
    lipsyncDriftMaxMs: number;
    continuityMaxDeltaFrames: number;
    lineThicknessTolerancePt: number;
    paletteDeltaMax: number;
    poseLibraryMatchMin: number;
    autoFixableSeverityMax: "low" | "medium";
    requireHumanApprovalFor: string[];
}, {
    provenance: {
        approver: string;
        approvedAt: string;
    };
    schemaVersion: "1.0";
    thresholdsId: string;
    silhouetteQualityMin?: number | undefined;
    lipsyncDriftMaxMs?: number | undefined;
    continuityMaxDeltaFrames?: number | undefined;
    lineThicknessTolerancePt?: number | undefined;
    paletteDeltaMax?: number | undefined;
    poseLibraryMatchMin?: number | undefined;
    autoFixableSeverityMax?: "low" | "medium" | undefined;
    requireHumanApprovalFor?: string[] | undefined;
}>;
export type QaThresholds = z.infer<typeof qaThresholdsSchema>;
export declare const showBibleSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    showId: z.ZodString;
    title: z.ZodString;
    logLine: z.ZodString;
    fps: z.ZodDefault<z.ZodNumber>;
    resolution: z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>;
    visualStyle: z.ZodString;
    lineRules: z.ZodObject<{
        defaultThicknessPt: z.ZodNumber;
        lineColourId: z.ZodString;
        fillColourId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        lineColourId: string;
        defaultThicknessPt: number;
        fillColourId: string;
    }, {
        lineColourId: string;
        defaultThicknessPt: number;
        fillColourId: string;
    }>;
    lighting: z.ZodObject<{
        type: z.ZodString;
        shadowColourId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        shadowColourId: string;
    }, {
        type: string;
        shadowColourId: string;
    }>;
    allowedDeformations: z.ZodArray<z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector"]>, "many">;
    characterBibles: z.ZodArray<z.ZodObject<{
        characterId: z.ZodString;
        ref: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        characterId: string;
        ref: string;
    }, {
        characterId: string;
        ref: string;
    }>, "many">;
    paletteManifestRef: z.ZodString;
    cameraRulesRef: z.ZodString;
    motionGrammarRef: z.ZodString;
    qaThresholdsRef: z.ZodString;
    forbiddenSources: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    provenance: z.ZodObject<{
        approver: z.ZodString;
        approvedAt: z.ZodString;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        approver: string;
        approvedAt: string;
        notes?: string | undefined;
    }, {
        approver: string;
        approvedAt: string;
        notes?: string | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        approver: string;
        approvedAt: string;
        notes?: string | undefined;
    };
    schemaVersion: "1.0";
    fps: number;
    title: string;
    resolution: {
        width: number;
        height: number;
    };
    logLine: string;
    visualStyle: string;
    lighting: {
        type: string;
        shadowColourId: string;
    };
    lineRules: {
        lineColourId: string;
        defaultThicknessPt: number;
        fillColourId: string;
    };
    showId: string;
    allowedDeformations: ("frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution")[];
    characterBibles: {
        characterId: string;
        ref: string;
    }[];
    paletteManifestRef: string;
    cameraRulesRef: string;
    motionGrammarRef: string;
    qaThresholdsRef: string;
    forbiddenSources: string[];
}, {
    provenance: {
        approver: string;
        approvedAt: string;
        notes?: string | undefined;
    };
    schemaVersion: "1.0";
    title: string;
    resolution: {
        width: number;
        height: number;
    };
    logLine: string;
    visualStyle: string;
    lighting: {
        type: string;
        shadowColourId: string;
    };
    lineRules: {
        lineColourId: string;
        defaultThicknessPt: number;
        fillColourId: string;
    };
    showId: string;
    allowedDeformations: ("frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution")[];
    characterBibles: {
        characterId: string;
        ref: string;
    }[];
    paletteManifestRef: string;
    cameraRulesRef: string;
    motionGrammarRef: string;
    qaThresholdsRef: string;
    fps?: number | undefined;
    forbiddenSources?: string[] | undefined;
}>;
export type ShowBible = z.infer<typeof showBibleSchema>;
export declare function assertShowBibleVersion(doc: unknown): {
    major: number;
    minor: number;
};
