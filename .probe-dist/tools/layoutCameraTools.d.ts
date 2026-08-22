import { z } from 'zod';
export declare const layoutCameraTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    resolution: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>>;
    cameraZ: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    characterCount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    resolution: {
        width: number;
        height: number;
    };
    sceneId: string;
    cameraZ: number;
    characterCount: number;
}, {
    sceneId: string;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    cameraZ?: number | undefined;
    characterCount?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    characters: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        position: z.ZodDefault<z.ZodOptional<z.ZodEnum<["left", "center_left", "center", "center_right", "right"]>>>;
        depth: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        position: "center" | "left" | "right" | "center_left" | "center_right";
        depth: number;
    }, {
        name: string;
        position?: "center" | "left" | "right" | "center_left" | "center_right" | undefined;
        depth?: number | undefined;
    }>, "many">;
    resolution: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>>;
    cameraZ: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    resolution: {
        width: number;
        height: number;
    };
    characters: {
        name: string;
        position: "center" | "left" | "right" | "center_left" | "center_right";
        depth: number;
    }[];
    sceneId: string;
    cameraZ: number;
}, {
    characters: {
        name: string;
        position?: "center" | "left" | "right" | "center_left" | "center_right" | undefined;
        depth?: number | undefined;
    }[];
    sceneId: string;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    cameraZ?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    cameraZ: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    panDistance: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    sceneId: string;
    cameraZ: number;
    panDistance: number;
}, {
    sceneId: string;
    cameraZ?: number | undefined;
    panDistance?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    shotId: z.ZodString;
    shotSize: z.ZodDefault<z.ZodOptional<z.ZodEnum<["extreme_close_up", "close_up", "medium_close_up", "medium_shot", "medium_full_shot", "full_shot", "long_shot", "extreme_long_shot"]>>>;
    movement: z.ZodDefault<z.ZodOptional<z.ZodEnum<["static", "push_in", "pull_out", "pan_left", "pan_right", "tilt_up", "tilt_down"]>>>;
    durationFrames: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    easing: z.ZodDefault<z.ZodOptional<z.ZodEnum<["linear", "ease_in_out"]>>>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    shotId: string;
    durationFrames: number;
    easing: "linear" | "ease_in_out";
    movement: "static" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "push_in" | "pull_out";
    shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
}, {
    shotId: string;
    fps?: number | undefined;
    durationFrames?: number | undefined;
    easing?: "linear" | "ease_in_out" | undefined;
    movement?: "static" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "push_in" | "pull_out" | undefined;
    shotSize?: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot" | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    keyframes: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        frame: number;
        z: number;
    }, {
        x: number;
        y: number;
        frame: number;
        z: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    keyframes: {
        x: number;
        y: number;
        frame: number;
        z: number;
    }[];
    sceneId: string;
}, {
    keyframes: {
        x: number;
        y: number;
        frame: number;
        z: number;
    }[];
    sceneId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    nodePath: z.ZodString;
    startZ: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    endZ: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    durationFrames: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    easing: z.ZodDefault<z.ZodOptional<z.ZodEnum<["linear", "ease_in_out"]>>>;
}, "strip", z.ZodTypeAny, {
    nodePath: string;
    durationFrames: number;
    easing: "linear" | "ease_in_out";
    startZ: number;
    endZ: number;
}, {
    nodePath: string;
    durationFrames?: number | undefined;
    easing?: "linear" | "ease_in_out" | undefined;
    startZ?: number | undefined;
    endZ?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    nodePath: z.ZodString;
    startX: z.ZodNumber;
    endX: z.ZodNumber;
    startY: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    endY: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    durationFrames: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    easing: z.ZodDefault<z.ZodOptional<z.ZodEnum<["linear", "ease_in_out"]>>>;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    nodePath: string;
    durationFrames: number;
    easing: "linear" | "ease_in_out";
    startX: number;
    endX: number;
    startY: number;
    endY: number;
}, {
    nodePath: string;
    startX: number;
    endX: number;
    fps?: number | undefined;
    durationFrames?: number | undefined;
    easing?: "linear" | "ease_in_out" | undefined;
    startY?: number | undefined;
    endY?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    shotId: z.ZodString;
    resolution: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>>;
    shotSize: z.ZodDefault<z.ZodOptional<z.ZodEnum<["extreme_close_up", "close_up", "medium_close_up", "medium_shot", "medium_full_shot", "full_shot", "long_shot", "extreme_long_shot"]>>>;
    subjects: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
        facing: z.ZodDefault<z.ZodOptional<z.ZodEnum<["left", "right", "front"]>>>;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        name: string;
        width: number;
        height: number;
        facing: "front" | "left" | "right";
    }, {
        x: number;
        y: number;
        name: string;
        width: number;
        height: number;
        facing?: "front" | "left" | "right" | undefined;
    }>, "many">>>;
}, "strip", z.ZodTypeAny, {
    resolution: {
        width: number;
        height: number;
    };
    shotId: string;
    shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
    subjects: {
        x: number;
        y: number;
        name: string;
        width: number;
        height: number;
        facing: "front" | "left" | "right";
    }[];
}, {
    shotId: string;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    shotSize?: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot" | undefined;
    subjects?: {
        x: number;
        y: number;
        name: string;
        width: number;
        height: number;
        facing?: "front" | "left" | "right" | undefined;
    }[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    locationId: z.ZodString;
    prompt: z.ZodString;
    outputPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    locationId: string;
    outputPath?: string | undefined;
}, {
    prompt: string;
    locationId: string;
    outputPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    filePath: z.ZodString;
    locationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    locationId?: string | undefined;
}, {
    filePath: string;
    locationId?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    locationId: z.ZodString;
    sourcePaths: z.ZodArray<z.ZodString, "many">;
    libraryDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    locationId: string;
    sourcePaths: string[];
    libraryDir?: string | undefined;
}, {
    locationId: string;
    sourcePaths: string[];
    libraryDir?: string | undefined;
}>>)[];
