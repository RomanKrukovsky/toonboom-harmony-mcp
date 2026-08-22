import { z } from 'zod';
export declare const CAMERA_LAYOUT_SCHEMA_VERSION = "1.0";
export declare const shotSizeSchema: z.ZodEnum<["extreme_close_up", "close_up", "medium_close_up", "medium_shot", "medium_full_shot", "full_shot", "long_shot", "extreme_long_shot"]>;
export declare const cameraMovementSchema: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "zoom_in", "zoom_out", "arc_left", "arc_right", "crane_up", "crane_down"]>;
export declare const framingRuleSchema: z.ZodEnum<["rule_of_thirds", "center_framing", "leading_space", "headroom", "look_room", "short_space", "long_space"]>;
export declare const shotPlanSchema: z.ZodObject<{
    shotId: z.ZodString;
    sceneId: z.ZodString;
    beatIds: z.ZodArray<z.ZodString, "many">;
    characterIds: z.ZodArray<z.ZodString, "many">;
    startTime: z.ZodNumber;
    endTime: z.ZodNumber;
    duration: z.ZodNumber;
    shotSize: z.ZodEnum<["extreme_close_up", "close_up", "medium_close_up", "medium_shot", "medium_full_shot", "full_shot", "long_shot", "extreme_long_shot"]>;
    cameraPosition: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
    }, {
        x: number;
        y: number;
        z: number;
    }>;
    cameraScale: z.ZodNumber;
    cameraMovement: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "zoom_in", "zoom_out", "arc_left", "arc_right", "crane_up", "crane_down"]>;
    framingRules: z.ZodArray<z.ZodEnum<["rule_of_thirds", "center_framing", "leading_space", "headroom", "look_room", "short_space", "long_space"]>, "many">;
    focusOfAttention: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>;
    safeMargins: z.ZodObject<{
        top: z.ZodNumber;
        bottom: z.ZodNumber;
        left: z.ZodNumber;
        right: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
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
    eyelines: z.ZodArray<z.ZodObject<{
        fromCharacterId: z.ZodString;
        toCharacterId: z.ZodNullable<z.ZodString>;
        direction: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        direction: number;
        fromCharacterId: string;
        toCharacterId: string | null;
    }, {
        direction: number;
        fromCharacterId: string;
        toCharacterId: string | null;
    }>, "many">;
    continuityNotes: z.ZodArray<z.ZodString, "many">;
    transitionIn: z.ZodDefault<z.ZodEnum<["cut", "dissolve", "fade_in", "wipe"]>>;
    transitionOut: z.ZodDefault<z.ZodEnum<["cut", "dissolve", "fade_out", "wipe"]>>;
    confidence: z.ZodNumber;
    explanation: z.ZodString;
}, "strict", z.ZodTypeAny, {
    confidence: number;
    duration: number;
    explanation: string;
    shotId: string;
    sceneId: string;
    startTime: number;
    endTime: number;
    beatIds: string[];
    characterIds: string[];
    shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
    cameraPosition: {
        x: number;
        y: number;
        z: number;
    };
    cameraScale: number;
    cameraMovement: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
    framingRules: ("rule_of_thirds" | "center_framing" | "leading_space" | "headroom" | "look_room" | "short_space" | "long_space")[];
    focusOfAttention: {
        x: number;
        y: number;
    };
    safeMargins: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
    eyelines: {
        direction: number;
        fromCharacterId: string;
        toCharacterId: string | null;
    }[];
    continuityNotes: string[];
    transitionIn: "cut" | "dissolve" | "fade_in" | "wipe";
    transitionOut: "cut" | "dissolve" | "wipe" | "fade_out";
}, {
    confidence: number;
    duration: number;
    explanation: string;
    shotId: string;
    sceneId: string;
    startTime: number;
    endTime: number;
    beatIds: string[];
    characterIds: string[];
    shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
    cameraPosition: {
        x: number;
        y: number;
        z: number;
    };
    cameraScale: number;
    cameraMovement: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
    framingRules: ("rule_of_thirds" | "center_framing" | "leading_space" | "headroom" | "look_room" | "short_space" | "long_space")[];
    focusOfAttention: {
        x: number;
        y: number;
    };
    safeMargins: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
    eyelines: {
        direction: number;
        fromCharacterId: string;
        toCharacterId: string | null;
    }[];
    continuityNotes: string[];
    transitionIn?: "cut" | "dissolve" | "fade_in" | "wipe" | undefined;
    transitionOut?: "cut" | "dissolve" | "wipe" | "fade_out" | undefined;
}>;
export declare const cameraKeyframeSchema: z.ZodObject<{
    frame: z.ZodNumber;
    position: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
    }, {
        x: number;
        y: number;
        z: number;
    }>;
    scale: z.ZodNumber;
    rotation: z.ZodOptional<z.ZodNumber>;
    interpolation: z.ZodDefault<z.ZodEnum<["linear", "ease_in", "ease_out", "ease_in_out", "hold"]>>;
}, "strict", z.ZodTypeAny, {
    frame: number;
    interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
    position: {
        x: number;
        y: number;
        z: number;
    };
    scale: number;
    rotation?: number | undefined;
}, {
    frame: number;
    position: {
        x: number;
        y: number;
        z: number;
    };
    scale: number;
    rotation?: number | undefined;
    interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
}>;
export declare const cameraTrackSchema: z.ZodObject<{
    trackId: z.ZodString;
    sceneId: z.ZodString;
    keyframes: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            x: number;
            y: number;
            z: number;
        }, {
            x: number;
            y: number;
            z: number;
        }>;
        scale: z.ZodNumber;
        rotation: z.ZodOptional<z.ZodNumber>;
        interpolation: z.ZodDefault<z.ZodEnum<["linear", "ease_in", "ease_out", "ease_in_out", "hold"]>>;
    }, "strict", z.ZodTypeAny, {
        frame: number;
        interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
        position: {
            x: number;
            y: number;
            z: number;
        };
        scale: number;
        rotation?: number | undefined;
    }, {
        frame: number;
        position: {
            x: number;
            y: number;
            z: number;
        };
        scale: number;
        rotation?: number | undefined;
        interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
    }>, "many">;
    totalDuration: z.ZodNumber;
    movementType: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "zoom_in", "zoom_out", "arc_left", "arc_right", "crane_up", "crane_down"]>;
}, "strict", z.ZodTypeAny, {
    keyframes: {
        frame: number;
        interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
        position: {
            x: number;
            y: number;
            z: number;
        };
        scale: number;
        rotation?: number | undefined;
    }[];
    trackId: string;
    sceneId: string;
    totalDuration: number;
    movementType: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
}, {
    keyframes: {
        frame: number;
        position: {
            x: number;
            y: number;
            z: number;
        };
        scale: number;
        rotation?: number | undefined;
        interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
    }[];
    trackId: string;
    sceneId: string;
    totalDuration: number;
    movementType: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
}>;
export declare const blockingPositionSchema: z.ZodObject<{
    characterId: z.ZodString;
    position: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>;
    scale: z.ZodDefault<z.ZodNumber>;
    facing: z.ZodDefault<z.ZodNumber>;
    preset: z.ZodOptional<z.ZodEnum<["left", "center", "right", "close_up", "background"]>>;
}, "strict", z.ZodTypeAny, {
    position: {
        x: number;
        y: number;
    };
    scale: number;
    characterId: string;
    facing: number;
    preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
}, {
    position: {
        x: number;
        y: number;
    };
    characterId: string;
    preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
    scale?: number | undefined;
    facing?: number | undefined;
}>;
export declare const blockingPlanSchema: z.ZodObject<{
    planId: z.ZodString;
    sceneId: z.ZodString;
    shotId: z.ZodString;
    positions: z.ZodArray<z.ZodObject<{
        characterId: z.ZodString;
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>;
        scale: z.ZodDefault<z.ZodNumber>;
        facing: z.ZodDefault<z.ZodNumber>;
        preset: z.ZodOptional<z.ZodEnum<["left", "center", "right", "close_up", "background"]>>;
    }, "strict", z.ZodTypeAny, {
        position: {
            x: number;
            y: number;
        };
        scale: number;
        characterId: string;
        facing: number;
        preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
    }, {
        position: {
            x: number;
            y: number;
        };
        characterId: string;
        preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
        scale?: number | undefined;
        facing?: number | undefined;
    }>, "many">;
    continuityConstraints: z.ZodArray<z.ZodString, "many">;
}, "strict", z.ZodTypeAny, {
    planId: string;
    shotId: string;
    sceneId: string;
    positions: {
        position: {
            x: number;
            y: number;
        };
        scale: number;
        characterId: string;
        facing: number;
        preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
    }[];
    continuityConstraints: string[];
}, {
    planId: string;
    shotId: string;
    sceneId: string;
    positions: {
        position: {
            x: number;
            y: number;
        };
        characterId: string;
        preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
        scale?: number | undefined;
        facing?: number | undefined;
    }[];
    continuityConstraints: string[];
}>;
export declare const cameraLayoutPlanSchema: z.ZodObject<{
    schemaVersion: z.ZodDefault<z.ZodString>;
    sceneId: z.ZodString;
    shots: z.ZodArray<z.ZodObject<{
        shotId: z.ZodString;
        sceneId: z.ZodString;
        beatIds: z.ZodArray<z.ZodString, "many">;
        characterIds: z.ZodArray<z.ZodString, "many">;
        startTime: z.ZodNumber;
        endTime: z.ZodNumber;
        duration: z.ZodNumber;
        shotSize: z.ZodEnum<["extreme_close_up", "close_up", "medium_close_up", "medium_shot", "medium_full_shot", "full_shot", "long_shot", "extreme_long_shot"]>;
        cameraPosition: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            x: number;
            y: number;
            z: number;
        }, {
            x: number;
            y: number;
            z: number;
        }>;
        cameraScale: z.ZodNumber;
        cameraMovement: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "zoom_in", "zoom_out", "arc_left", "arc_right", "crane_up", "crane_down"]>;
        framingRules: z.ZodArray<z.ZodEnum<["rule_of_thirds", "center_framing", "leading_space", "headroom", "look_room", "short_space", "long_space"]>, "many">;
        focusOfAttention: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>;
        safeMargins: z.ZodObject<{
            top: z.ZodNumber;
            bottom: z.ZodNumber;
            left: z.ZodNumber;
            right: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
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
        eyelines: z.ZodArray<z.ZodObject<{
            fromCharacterId: z.ZodString;
            toCharacterId: z.ZodNullable<z.ZodString>;
            direction: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            direction: number;
            fromCharacterId: string;
            toCharacterId: string | null;
        }, {
            direction: number;
            fromCharacterId: string;
            toCharacterId: string | null;
        }>, "many">;
        continuityNotes: z.ZodArray<z.ZodString, "many">;
        transitionIn: z.ZodDefault<z.ZodEnum<["cut", "dissolve", "fade_in", "wipe"]>>;
        transitionOut: z.ZodDefault<z.ZodEnum<["cut", "dissolve", "fade_out", "wipe"]>>;
        confidence: z.ZodNumber;
        explanation: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        confidence: number;
        duration: number;
        explanation: string;
        shotId: string;
        sceneId: string;
        startTime: number;
        endTime: number;
        beatIds: string[];
        characterIds: string[];
        shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
        cameraPosition: {
            x: number;
            y: number;
            z: number;
        };
        cameraScale: number;
        cameraMovement: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        framingRules: ("rule_of_thirds" | "center_framing" | "leading_space" | "headroom" | "look_room" | "short_space" | "long_space")[];
        focusOfAttention: {
            x: number;
            y: number;
        };
        safeMargins: {
            left: number;
            right: number;
            top: number;
            bottom: number;
        };
        eyelines: {
            direction: number;
            fromCharacterId: string;
            toCharacterId: string | null;
        }[];
        continuityNotes: string[];
        transitionIn: "cut" | "dissolve" | "fade_in" | "wipe";
        transitionOut: "cut" | "dissolve" | "wipe" | "fade_out";
    }, {
        confidence: number;
        duration: number;
        explanation: string;
        shotId: string;
        sceneId: string;
        startTime: number;
        endTime: number;
        beatIds: string[];
        characterIds: string[];
        shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
        cameraPosition: {
            x: number;
            y: number;
            z: number;
        };
        cameraScale: number;
        cameraMovement: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        framingRules: ("rule_of_thirds" | "center_framing" | "leading_space" | "headroom" | "look_room" | "short_space" | "long_space")[];
        focusOfAttention: {
            x: number;
            y: number;
        };
        safeMargins: {
            left: number;
            right: number;
            top: number;
            bottom: number;
        };
        eyelines: {
            direction: number;
            fromCharacterId: string;
            toCharacterId: string | null;
        }[];
        continuityNotes: string[];
        transitionIn?: "cut" | "dissolve" | "fade_in" | "wipe" | undefined;
        transitionOut?: "cut" | "dissolve" | "wipe" | "fade_out" | undefined;
    }>, "many">;
    cameraTrack: z.ZodObject<{
        trackId: z.ZodString;
        sceneId: z.ZodString;
        keyframes: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            position: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
                z: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                x: number;
                y: number;
                z: number;
            }, {
                x: number;
                y: number;
                z: number;
            }>;
            scale: z.ZodNumber;
            rotation: z.ZodOptional<z.ZodNumber>;
            interpolation: z.ZodDefault<z.ZodEnum<["linear", "ease_in", "ease_out", "ease_in_out", "hold"]>>;
        }, "strict", z.ZodTypeAny, {
            frame: number;
            interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
            position: {
                x: number;
                y: number;
                z: number;
            };
            scale: number;
            rotation?: number | undefined;
        }, {
            frame: number;
            position: {
                x: number;
                y: number;
                z: number;
            };
            scale: number;
            rotation?: number | undefined;
            interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
        }>, "many">;
        totalDuration: z.ZodNumber;
        movementType: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "zoom_in", "zoom_out", "arc_left", "arc_right", "crane_up", "crane_down"]>;
    }, "strict", z.ZodTypeAny, {
        keyframes: {
            frame: number;
            interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
            position: {
                x: number;
                y: number;
                z: number;
            };
            scale: number;
            rotation?: number | undefined;
        }[];
        trackId: string;
        sceneId: string;
        totalDuration: number;
        movementType: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
    }, {
        keyframes: {
            frame: number;
            position: {
                x: number;
                y: number;
                z: number;
            };
            scale: number;
            rotation?: number | undefined;
            interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
        }[];
        trackId: string;
        sceneId: string;
        totalDuration: number;
        movementType: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
    }>;
    blockingPlans: z.ZodArray<z.ZodObject<{
        planId: z.ZodString;
        sceneId: z.ZodString;
        shotId: z.ZodString;
        positions: z.ZodArray<z.ZodObject<{
            characterId: z.ZodString;
            position: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                x: number;
                y: number;
            }, {
                x: number;
                y: number;
            }>;
            scale: z.ZodDefault<z.ZodNumber>;
            facing: z.ZodDefault<z.ZodNumber>;
            preset: z.ZodOptional<z.ZodEnum<["left", "center", "right", "close_up", "background"]>>;
        }, "strict", z.ZodTypeAny, {
            position: {
                x: number;
                y: number;
            };
            scale: number;
            characterId: string;
            facing: number;
            preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
        }, {
            position: {
                x: number;
                y: number;
            };
            characterId: string;
            preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
            scale?: number | undefined;
            facing?: number | undefined;
        }>, "many">;
        continuityConstraints: z.ZodArray<z.ZodString, "many">;
    }, "strict", z.ZodTypeAny, {
        planId: string;
        shotId: string;
        sceneId: string;
        positions: {
            position: {
                x: number;
                y: number;
            };
            scale: number;
            characterId: string;
            facing: number;
            preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
        }[];
        continuityConstraints: string[];
    }, {
        planId: string;
        shotId: string;
        sceneId: string;
        positions: {
            position: {
                x: number;
                y: number;
            };
            characterId: string;
            preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
            scale?: number | undefined;
            facing?: number | undefined;
        }[];
        continuityConstraints: string[];
    }>, "many">;
    summary: z.ZodObject<{
        totalShots: z.ZodNumber;
        averageShotDuration: z.ZodNumber;
        cameraMovements: z.ZodRecord<z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "zoom_in", "zoom_out", "arc_left", "arc_right", "crane_up", "crane_down"]>, z.ZodNumber>;
        shotSizes: z.ZodRecord<z.ZodEnum<["extreme_close_up", "close_up", "medium_close_up", "medium_shot", "medium_full_shot", "full_shot", "long_shot", "extreme_long_shot"]>, z.ZodNumber>;
        totalKeyframes: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        totalShots: number;
        averageShotDuration: number;
        cameraMovements: Partial<Record<"static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down", number>>;
        shotSizes: Partial<Record<"close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot", number>>;
        totalKeyframes: number;
    }, {
        totalShots: number;
        averageShotDuration: number;
        cameraMovements: Partial<Record<"static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down", number>>;
        shotSizes: Partial<Record<"close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot", number>>;
        totalKeyframes: number;
    }>;
    provenance: z.ZodObject<{
        engine: z.ZodString;
        createdAt: z.ZodString;
        method: z.ZodEnum<["rule_based", "ml_director", "hybrid"]>;
    }, "strict", z.ZodTypeAny, {
        method: "hybrid" | "rule_based" | "ml_director";
        createdAt: string;
        engine: string;
    }, {
        method: "hybrid" | "rule_based" | "ml_director";
        createdAt: string;
        engine: string;
    }>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        method: "hybrid" | "rule_based" | "ml_director";
        createdAt: string;
        engine: string;
    };
    schemaVersion: string;
    summary: {
        totalShots: number;
        averageShotDuration: number;
        cameraMovements: Partial<Record<"static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down", number>>;
        shotSizes: Partial<Record<"close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot", number>>;
        totalKeyframes: number;
    };
    shots: {
        confidence: number;
        duration: number;
        explanation: string;
        shotId: string;
        sceneId: string;
        startTime: number;
        endTime: number;
        beatIds: string[];
        characterIds: string[];
        shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
        cameraPosition: {
            x: number;
            y: number;
            z: number;
        };
        cameraScale: number;
        cameraMovement: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        framingRules: ("rule_of_thirds" | "center_framing" | "leading_space" | "headroom" | "look_room" | "short_space" | "long_space")[];
        focusOfAttention: {
            x: number;
            y: number;
        };
        safeMargins: {
            left: number;
            right: number;
            top: number;
            bottom: number;
        };
        eyelines: {
            direction: number;
            fromCharacterId: string;
            toCharacterId: string | null;
        }[];
        continuityNotes: string[];
        transitionIn: "cut" | "dissolve" | "fade_in" | "wipe";
        transitionOut: "cut" | "dissolve" | "wipe" | "fade_out";
    }[];
    sceneId: string;
    cameraTrack: {
        keyframes: {
            frame: number;
            interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
            position: {
                x: number;
                y: number;
                z: number;
            };
            scale: number;
            rotation?: number | undefined;
        }[];
        trackId: string;
        sceneId: string;
        totalDuration: number;
        movementType: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
    };
    blockingPlans: {
        planId: string;
        shotId: string;
        sceneId: string;
        positions: {
            position: {
                x: number;
                y: number;
            };
            scale: number;
            characterId: string;
            facing: number;
            preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
        }[];
        continuityConstraints: string[];
    }[];
}, {
    provenance: {
        method: "hybrid" | "rule_based" | "ml_director";
        createdAt: string;
        engine: string;
    };
    summary: {
        totalShots: number;
        averageShotDuration: number;
        cameraMovements: Partial<Record<"static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down", number>>;
        shotSizes: Partial<Record<"close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot", number>>;
        totalKeyframes: number;
    };
    shots: {
        confidence: number;
        duration: number;
        explanation: string;
        shotId: string;
        sceneId: string;
        startTime: number;
        endTime: number;
        beatIds: string[];
        characterIds: string[];
        shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
        cameraPosition: {
            x: number;
            y: number;
            z: number;
        };
        cameraScale: number;
        cameraMovement: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        framingRules: ("rule_of_thirds" | "center_framing" | "leading_space" | "headroom" | "look_room" | "short_space" | "long_space")[];
        focusOfAttention: {
            x: number;
            y: number;
        };
        safeMargins: {
            left: number;
            right: number;
            top: number;
            bottom: number;
        };
        eyelines: {
            direction: number;
            fromCharacterId: string;
            toCharacterId: string | null;
        }[];
        continuityNotes: string[];
        transitionIn?: "cut" | "dissolve" | "fade_in" | "wipe" | undefined;
        transitionOut?: "cut" | "dissolve" | "wipe" | "fade_out" | undefined;
    }[];
    sceneId: string;
    cameraTrack: {
        keyframes: {
            frame: number;
            position: {
                x: number;
                y: number;
                z: number;
            };
            scale: number;
            rotation?: number | undefined;
            interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
        }[];
        trackId: string;
        sceneId: string;
        totalDuration: number;
        movementType: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
    };
    blockingPlans: {
        planId: string;
        shotId: string;
        sceneId: string;
        positions: {
            position: {
                x: number;
                y: number;
            };
            characterId: string;
            preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
            scale?: number | undefined;
            facing?: number | undefined;
        }[];
        continuityConstraints: string[];
    }[];
    schemaVersion?: string | undefined;
}>;
export type CameraLayoutPlan = z.infer<typeof cameraLayoutPlanSchema>;
export type ShotPlan = z.infer<typeof shotPlanSchema>;
export type CameraKeyframe = z.infer<typeof cameraKeyframeSchema>;
export type CameraTrack = z.infer<typeof cameraTrackSchema>;
export type BlockingPlan = z.infer<typeof blockingPlanSchema>;
export type BlockingPosition = z.infer<typeof blockingPositionSchema>;
