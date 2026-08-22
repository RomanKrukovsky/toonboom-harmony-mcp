/**
 * JSON-RPC 2.0 method and parameter schemas used by tools.ts.
 *
 * Centralized so adding a new tool updates exactly one place. Zod is used
 * at the boundary to reject malformed input before any IPC round-trip.
 */
import { z } from "zod";
export declare const documentGetInfo: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const documentGetLayers: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const documentSetFrame: z.ZodObject<{
    frame: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    frame: number;
}, {
    frame: number;
}>;
export declare const documentScreenshot: z.ZodObject<{
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    outputPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    width?: number | undefined;
    height?: number | undefined;
    outputPath?: string | undefined;
}, {
    width?: number | undefined;
    height?: number | undefined;
    outputPath?: string | undefined;
}>;
export declare const documentCreateLayer: z.ZodObject<{
    layerType: z.ZodEnum<["vector", "bone", "group", "image", "audio", "switch", "particle", "note", "patch"]>;
    name: z.ZodString;
    parentId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    layerType: "image" | "audio" | "note" | "bone" | "group" | "patch" | "vector" | "switch" | "particle";
    parentId?: number | undefined;
}, {
    name: string;
    layerType: "image" | "audio" | "note" | "bone" | "group" | "patch" | "vector" | "switch" | "particle";
    parentId?: number | undefined;
}>;
export declare const documentSave: z.ZodObject<{
    path: z.ZodOptional<z.ZodString>;
    format: z.ZodOptional<z.ZodEnum<["moho", "fbx", "json"]>>;
    previewHash: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path?: string | undefined;
    format?: "moho" | "json" | "fbx" | undefined;
    previewHash?: string | undefined;
}, {
    path?: string | undefined;
    format?: "moho" | "json" | "fbx" | undefined;
    previewHash?: string | undefined;
}>;
export declare const documentClose: z.ZodObject<{
    save: z.ZodOptional<z.ZodBoolean>;
    previewHash: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    save?: boolean | undefined;
    previewHash?: string | undefined;
}, {
    save?: boolean | undefined;
    previewHash?: string | undefined;
}>;
export declare const documentOpen: z.ZodObject<{
    path: z.ZodString;
}, "strip", z.ZodTypeAny, {
    path: string;
}, {
    path: string;
}>;
export declare const documentRender: z.ZodObject<{
    outputPath: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodNumber;
    startFrame: z.ZodOptional<z.ZodNumber>;
    endFrame: z.ZodOptional<z.ZodNumber>;
    format: z.ZodOptional<z.ZodEnum<["png", "jpg", "tiff", "exr"]>>;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    outputPath: string;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    format?: "png" | "tiff" | "exr" | "jpg" | undefined;
}, {
    width: number;
    height: number;
    outputPath: string;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    format?: "png" | "tiff" | "exr" | "jpg" | undefined;
}>;
export declare const documentDiagnose: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const layerGetProperties: z.ZodObject<{
    layerId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    layerId: number;
}, {
    layerId: number;
}>;
export declare const layerGetChildren: z.ZodObject<{
    layerId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    layerId: number;
}, {
    layerId: number;
}>;
export declare const layerGetBones: z.ZodObject<{
    layerId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    layerId: number;
}, {
    layerId: number;
}>;
export declare const layerSetTransform: z.ZodObject<{
    frame: z.ZodOptional<z.ZodNumber>;
    translation: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>>;
    rotation: z.ZodOptional<z.ZodNumber>;
    scale: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>>;
    layerId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    frame?: number | undefined;
    rotation?: number | undefined;
    scale?: {
        x: number;
        y: number;
    } | undefined;
    translation?: {
        x: number;
        y: number;
    } | undefined;
}, {
    layerId: number;
    frame?: number | undefined;
    rotation?: number | undefined;
    scale?: {
        x: number;
        y: number;
    } | undefined;
    translation?: {
        x: number;
        y: number;
    } | undefined;
}>;
export declare const layerSetVisibility: z.ZodObject<{
    layerId: z.ZodNumber;
    visible: z.ZodBoolean;
    frame: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    visible: boolean;
    frame?: number | undefined;
}, {
    layerId: number;
    visible: boolean;
    frame?: number | undefined;
}>;
export declare const layerSetOpacity: z.ZodObject<{
    layerId: z.ZodNumber;
    opacity: z.ZodNumber;
    frame: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    opacity: number;
    frame?: number | undefined;
}, {
    layerId: number;
    opacity: number;
    frame?: number | undefined;
}>;
export declare const layerSetName: z.ZodObject<{
    layerId: z.ZodNumber;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    layerId: number;
}, {
    name: string;
    layerId: number;
}>;
export declare const layerSelectLayer: z.ZodObject<{
    layerId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    layerId: number;
}, {
    layerId: number;
}>;
export declare const layerReorder: z.ZodObject<{
    layerId: z.ZodNumber;
    newIndex: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    newIndex: number;
    parentId?: number | undefined;
}, {
    layerId: number;
    newIndex: number;
    parentId?: number | undefined;
}>;
export declare const layerSetBlendMode: z.ZodObject<{
    layerId: z.ZodNumber;
    blendMode: z.ZodEnum<["normal", "multiply", "screen", "overlay", "darken", "lighten", "color_dodge", "color_burn", "soft_light", "hard_light", "difference", "exclusion"]>;
    frame: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    blendMode: "overlay" | "normal" | "multiply" | "screen" | "darken" | "lighten" | "color_dodge" | "color_burn" | "soft_light" | "hard_light" | "difference" | "exclusion";
    frame?: number | undefined;
}, {
    layerId: number;
    blendMode: "overlay" | "normal" | "multiply" | "screen" | "darken" | "lighten" | "color_dodge" | "color_burn" | "soft_light" | "hard_light" | "difference" | "exclusion";
    frame?: number | undefined;
}>;
export declare const layerSetMask: z.ZodObject<{
    layerId: z.ZodNumber;
    masked: z.ZodBoolean;
    maskLayerId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    masked: boolean;
    maskLayerId?: number | undefined;
}, {
    layerId: number;
    masked: boolean;
    maskLayerId?: number | undefined;
}>;
export declare const layerCreateGroup: z.ZodObject<{
    name: z.ZodString;
    childLayerIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    childLayerIds?: number[] | undefined;
}, {
    name: string;
    childLayerIds?: number[] | undefined;
}>;
export declare const layerCreateSwitch: z.ZodObject<{
    name: z.ZodString;
    optionLayerIds: z.ZodArray<z.ZodNumber, "many">;
    activeIndex: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    optionLayerIds: number[];
    activeIndex?: number | undefined;
}, {
    name: string;
    optionLayerIds: number[];
    activeIndex?: number | undefined;
}>;
export declare const layerDelete: z.ZodObject<{
    layerId: z.ZodNumber;
    previewHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    previewHash: string;
}, {
    layerId: number;
    previewHash: string;
}>;
export declare const boneGetProperties: z.ZodObject<{
    layerId: z.ZodNumber;
    boneId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    boneId: number;
}, {
    layerId: number;
    boneId: number;
}>;
export declare const boneSetTransform: z.ZodObject<{
    layerId: z.ZodNumber;
    boneId: z.ZodNumber;
    position: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>>;
    angle: z.ZodOptional<z.ZodNumber>;
    scale: z.ZodOptional<z.ZodNumber>;
    frame: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    boneId: number;
    frame?: number | undefined;
    position?: {
        x: number;
        y: number;
    } | undefined;
    scale?: number | undefined;
    angle?: number | undefined;
}, {
    layerId: number;
    boneId: number;
    frame?: number | undefined;
    position?: {
        x: number;
        y: number;
    } | undefined;
    scale?: number | undefined;
    angle?: number | undefined;
}>;
export declare const boneSelectBone: z.ZodObject<{
    layerId: z.ZodNumber;
    boneId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    boneId: number;
}, {
    layerId: number;
    boneId: number;
}>;
export declare const boneCreateBone: z.ZodObject<{
    layerId: z.ZodNumber;
    name: z.ZodString;
    position: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>>;
    angle: z.ZodOptional<z.ZodNumber>;
    parentBoneId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    layerId: number;
    position?: {
        x: number;
        y: number;
    } | undefined;
    angle?: number | undefined;
    parentBoneId?: number | undefined;
}, {
    name: string;
    layerId: number;
    position?: {
        x: number;
        y: number;
    } | undefined;
    angle?: number | undefined;
    parentBoneId?: number | undefined;
}>;
export declare const boneDeleteBone: z.ZodObject<{
    layerId: z.ZodNumber;
    boneId: z.ZodNumber;
    previewHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    previewHash: string;
    boneId: number;
}, {
    layerId: number;
    previewHash: string;
    boneId: number;
}>;
export declare const boneSetConstraints: z.ZodObject<{
    layerId: z.ZodNumber;
    boneId: z.ZodNumber;
    minAngle: z.ZodOptional<z.ZodNumber>;
    maxAngle: z.ZodOptional<z.ZodNumber>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    positionControl: z.ZodOptional<z.ZodBoolean>;
    angleControl: z.ZodOptional<z.ZodBoolean>;
    scaleControl: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    boneId: number;
    minAngle?: number | undefined;
    maxAngle?: number | undefined;
    enabled?: boolean | undefined;
    positionControl?: boolean | undefined;
    angleControl?: boolean | undefined;
    scaleControl?: boolean | undefined;
}, {
    layerId: number;
    boneId: number;
    minAngle?: number | undefined;
    maxAngle?: number | undefined;
    enabled?: boolean | undefined;
    positionControl?: boolean | undefined;
    angleControl?: boolean | undefined;
    scaleControl?: boolean | undefined;
}>;
export declare const boneSetTarget: z.ZodObject<{
    layerId: z.ZodNumber;
    boneId: z.ZodNumber;
    targetLayerId: z.ZodNumber;
    targetBoneId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    boneId: number;
    targetLayerId: number;
    targetBoneId?: number | undefined;
}, {
    layerId: number;
    boneId: number;
    targetLayerId: number;
    targetBoneId?: number | undefined;
}>;
export declare const boneSetParent: z.ZodObject<{
    layerId: z.ZodNumber;
    boneId: z.ZodNumber;
    parentBoneId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    boneId: number;
    parentBoneId: number;
}, {
    layerId: number;
    boneId: number;
    parentBoneId: number;
}>;
export declare const animationGetKeyframes: z.ZodObject<{
    layerId: z.ZodNumber;
    channel: z.ZodString;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    channel: string;
}, {
    layerId: number;
    channel: string;
}>;
export declare const animationGetFrameState: z.ZodObject<{
    layerId: z.ZodNumber;
    frame: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    frame: number;
    layerId: number;
}, {
    frame: number;
    layerId: number;
}>;
export declare const animationSetKeyframe: z.ZodObject<{
    layerId: z.ZodNumber;
    channel: z.ZodString;
    frame: z.ZodNumber;
    value: z.ZodUnion<[z.ZodNumber, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>, z.ZodBoolean]>;
}, "strip", z.ZodTypeAny, {
    value: number | boolean | {
        x: number;
        y: number;
    };
    frame: number;
    layerId: number;
    channel: string;
}, {
    value: number | boolean | {
        x: number;
        y: number;
    };
    frame: number;
    layerId: number;
    channel: string;
}>;
export declare const animationSetMultiKeyframe: z.ZodObject<{
    layerId: z.ZodNumber;
    channel: z.ZodString;
    keyframes: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        value: z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>, z.ZodBoolean]>;
    }, "strip", z.ZodTypeAny, {
        value: number | boolean | {
            x: number;
            y: number;
        };
        frame: number;
    }, {
        value: number | boolean | {
            x: number;
            y: number;
        };
        frame: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    keyframes: {
        value: number | boolean | {
            x: number;
            y: number;
        };
        frame: number;
    }[];
    layerId: number;
    channel: string;
}, {
    keyframes: {
        value: number | boolean | {
            x: number;
            y: number;
        };
        frame: number;
    }[];
    layerId: number;
    channel: string;
}>;
export declare const animationDeleteKeyframe: z.ZodObject<{
    layerId: z.ZodNumber;
    channel: z.ZodString;
    frame: z.ZodNumber;
    previewHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    frame: number;
    layerId: number;
    previewHash: string;
    channel: string;
}, {
    frame: number;
    layerId: number;
    previewHash: string;
    channel: string;
}>;
export declare const animationSetInterpolation: z.ZodObject<{
    layerId: z.ZodNumber;
    channel: z.ZodString;
    frame: z.ZodNumber;
    interpMode: z.ZodEnum<["linear", "smooth", "ease_in", "ease_out", "step", "bezier", "noisy", "cycle"]>;
}, "strip", z.ZodTypeAny, {
    frame: number;
    layerId: number;
    channel: string;
    interpMode: "linear" | "ease_in" | "ease_out" | "smooth" | "bezier" | "step" | "noisy" | "cycle";
}, {
    frame: number;
    layerId: number;
    channel: string;
    interpMode: "linear" | "ease_in" | "ease_out" | "smooth" | "bezier" | "step" | "noisy" | "cycle";
}>;
export declare const animationGetPointAnim: z.ZodObject<{
    layerId: z.ZodNumber;
    pointIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    pointIndex: number;
}, {
    layerId: number;
    pointIndex: number;
}>;
export declare const meshGetPoints: z.ZodObject<{
    layerId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    layerId: number;
}, {
    layerId: number;
}>;
export declare const meshGetShapes: z.ZodObject<{
    layerId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    layerId: number;
}, {
    layerId: number;
}>;
export declare const meshCreatePoint: z.ZodObject<{
    layerId: z.ZodNumber;
    x: z.ZodNumber;
    y: z.ZodNumber;
    bezierInX: z.ZodOptional<z.ZodNumber>;
    bezierInY: z.ZodOptional<z.ZodNumber>;
    bezierOutX: z.ZodOptional<z.ZodNumber>;
    bezierOutY: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    layerId: number;
    bezierInX?: number | undefined;
    bezierInY?: number | undefined;
    bezierOutX?: number | undefined;
    bezierOutY?: number | undefined;
}, {
    x: number;
    y: number;
    layerId: number;
    bezierInX?: number | undefined;
    bezierInY?: number | undefined;
    bezierOutX?: number | undefined;
    bezierOutY?: number | undefined;
}>;
export declare const meshCreateBezier: z.ZodObject<{
    layerId: z.ZodNumber;
    points: z.ZodArray<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        bezierInX: z.ZodOptional<z.ZodNumber>;
        bezierInY: z.ZodOptional<z.ZodNumber>;
        bezierOutX: z.ZodOptional<z.ZodNumber>;
        bezierOutY: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        bezierInX?: number | undefined;
        bezierInY?: number | undefined;
        bezierOutX?: number | undefined;
        bezierOutY?: number | undefined;
    }, {
        x: number;
        y: number;
        bezierInX?: number | undefined;
        bezierInY?: number | undefined;
        bezierOutX?: number | undefined;
        bezierOutY?: number | undefined;
    }>, "many">;
    closed: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    points: {
        x: number;
        y: number;
        bezierInX?: number | undefined;
        bezierInY?: number | undefined;
        bezierOutX?: number | undefined;
        bezierOutY?: number | undefined;
    }[];
    layerId: number;
    closed?: boolean | undefined;
}, {
    points: {
        x: number;
        y: number;
        bezierInX?: number | undefined;
        bezierInY?: number | undefined;
        bezierOutX?: number | undefined;
        bezierOutY?: number | undefined;
    }[];
    layerId: number;
    closed?: boolean | undefined;
}>;
export declare const meshWeld: z.ZodObject<{
    layerId: z.ZodNumber;
    pointIndexA: z.ZodNumber;
    pointIndexB: z.ZodNumber;
    previewHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    previewHash: string;
    pointIndexA: number;
    pointIndexB: number;
}, {
    layerId: number;
    previewHash: string;
    pointIndexA: number;
    pointIndexB: number;
}>;
export declare const meshSetFill: z.ZodObject<{
    layerId: z.ZodNumber;
    shapeIndex: z.ZodNumber;
    hasFill: z.ZodBoolean;
    color: z.ZodOptional<z.ZodObject<{
        r: z.ZodNumber;
        g: z.ZodNumber;
        b: z.ZodNumber;
        a: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    }, {
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    shapeIndex: number;
    hasFill: boolean;
    color?: {
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    } | undefined;
}, {
    layerId: number;
    shapeIndex: number;
    hasFill: boolean;
    color?: {
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    } | undefined;
}>;
export declare const meshSetStroke: z.ZodObject<{
    layerId: z.ZodNumber;
    shapeIndex: z.ZodNumber;
    hasStroke: z.ZodBoolean;
    width: z.ZodOptional<z.ZodNumber>;
    color: z.ZodOptional<z.ZodObject<{
        r: z.ZodNumber;
        g: z.ZodNumber;
        b: z.ZodNumber;
        a: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    }, {
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    shapeIndex: number;
    hasStroke: boolean;
    width?: number | undefined;
    color?: {
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    } | undefined;
}, {
    layerId: number;
    shapeIndex: number;
    hasStroke: boolean;
    width?: number | undefined;
    color?: {
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    } | undefined;
}>;
export declare const meshSetGradient: z.ZodObject<{
    layerId: z.ZodNumber;
    shapeIndex: z.ZodNumber;
    enabled: z.ZodBoolean;
    startColor: z.ZodOptional<z.ZodObject<{
        r: z.ZodNumber;
        g: z.ZodNumber;
        b: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        r: number;
        g: number;
        b: number;
    }, {
        r: number;
        g: number;
        b: number;
    }>>;
    endColor: z.ZodOptional<z.ZodObject<{
        r: z.ZodNumber;
        g: z.ZodNumber;
        b: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        r: number;
        g: number;
        b: number;
    }, {
        r: number;
        g: number;
        b: number;
    }>>;
    angle: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    enabled: boolean;
    shapeIndex: number;
    angle?: number | undefined;
    startColor?: {
        r: number;
        g: number;
        b: number;
    } | undefined;
    endColor?: {
        r: number;
        g: number;
        b: number;
    } | undefined;
}, {
    layerId: number;
    enabled: boolean;
    shapeIndex: number;
    angle?: number | undefined;
    startColor?: {
        r: number;
        g: number;
        b: number;
    } | undefined;
    endColor?: {
        r: number;
        g: number;
        b: number;
    } | undefined;
}>;
export declare const meshSetCurvature: z.ZodObject<{
    layerId: z.ZodNumber;
    pointIndex: z.ZodNumber;
    bezierInX: z.ZodNumber;
    bezierInY: z.ZodNumber;
    bezierOutX: z.ZodNumber;
    bezierOutY: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    pointIndex: number;
    bezierInX: number;
    bezierInY: number;
    bezierOutX: number;
    bezierOutY: number;
}, {
    layerId: number;
    pointIndex: number;
    bezierInX: number;
    bezierInY: number;
    bezierOutX: number;
    bezierOutY: number;
}>;
export declare const batchExecute: z.ZodObject<{
    operations: z.ZodArray<z.ZodObject<{
        method: z.ZodString;
        params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        method: string;
        params?: Record<string, unknown> | undefined;
    }, {
        method: string;
        params?: Record<string, unknown> | undefined;
    }>, "many">;
    stopOnError: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    operations: {
        method: string;
        params?: Record<string, unknown> | undefined;
    }[];
    stopOnError?: boolean | undefined;
}, {
    operations: {
        method: string;
        params?: Record<string, unknown> | undefined;
    }[];
    stopOnError?: boolean | undefined;
}>;
export declare const workflowApplyLipSync: z.ZodObject<{
    layerId: z.ZodNumber;
    phonemes: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        phoneme: z.ZodEnum<["AI", "E", "U", "O", "MBP", "FV", "L", "WQ", "etc", "rest"]>;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        phoneme: "E" | "O" | "U" | "L" | "rest" | "AI" | "MBP" | "FV" | "WQ" | "etc";
    }, {
        frame: number;
        phoneme: "E" | "O" | "U" | "L" | "rest" | "AI" | "MBP" | "FV" | "WQ" | "etc";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    layerId: number;
    phonemes: {
        frame: number;
        phoneme: "E" | "O" | "U" | "L" | "rest" | "AI" | "MBP" | "FV" | "WQ" | "etc";
    }[];
}, {
    layerId: number;
    phonemes: {
        frame: number;
        phoneme: "E" | "O" | "U" | "L" | "rest" | "AI" | "MBP" | "FV" | "WQ" | "etc";
    }[];
}>;
export declare const workflowCreateSmartBone: z.ZodObject<{
    layerId: z.ZodNumber;
    boneId: z.ZodNumber;
    actionName: z.ZodString;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    startFrame: number;
    endFrame: number;
    layerId: number;
    boneId: number;
    actionName: string;
    parameters?: Record<string, number> | undefined;
}, {
    startFrame: number;
    endFrame: number;
    layerId: number;
    boneId: number;
    actionName: string;
    parameters?: Record<string, number> | undefined;
}>;
export declare const workflowDuplicateLayerTree: z.ZodObject<{
    layerId: z.ZodNumber;
    newName: z.ZodString;
    includeAnimation: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    newName: string;
    layerId: number;
    includeAnimation?: boolean | undefined;
}, {
    newName: string;
    layerId: number;
    includeAnimation?: boolean | undefined;
}>;
export declare const workflowBatchRender: z.ZodObject<{
    scenes: z.ZodArray<z.ZodObject<{
        sceneName: z.ZodString;
        outputPath: z.ZodString;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
        sceneName: string;
        outputPath: string;
    }, {
        width: number;
        height: number;
        sceneName: string;
        outputPath: string;
    }>, "many">;
    previewHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    scenes: {
        width: number;
        height: number;
        sceneName: string;
        outputPath: string;
    }[];
    previewHash: string;
}, {
    scenes: {
        width: number;
        height: number;
        sceneName: string;
        outputPath: string;
    }[];
    previewHash: string;
}>;
export declare const workflowProjectDiagnostics: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const workflowCreateCharacterRig: z.ZodObject<{
    characterName: z.ZodString;
    rigProfile: z.ZodOptional<z.ZodEnum<["simple", "standard", "complex"]>>;
    views: z.ZodOptional<z.ZodArray<z.ZodEnum<["front", "front_3q_left", "side_left", "back_3q_left", "back", "back_3q_right", "side_right", "front_3q_right"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    characterName: string;
    views?: ("front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right")[] | undefined;
    rigProfile?: "standard" | "simple" | "complex" | undefined;
}, {
    characterName: string;
    views?: ("front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right")[] | undefined;
    rigProfile?: "standard" | "simple" | "complex" | undefined;
}>;
export declare const methodSchemas: {
    readonly "document.getInfo": z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    readonly "document.getLayers": z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    readonly "document.setFrame": z.ZodObject<{
        frame: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        frame: number;
    }, {
        frame: number;
    }>;
    readonly "document.screenshot": z.ZodObject<{
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        outputPath: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        width?: number | undefined;
        height?: number | undefined;
        outputPath?: string | undefined;
    }, {
        width?: number | undefined;
        height?: number | undefined;
        outputPath?: string | undefined;
    }>;
    readonly "document.createLayer": z.ZodObject<{
        layerType: z.ZodEnum<["vector", "bone", "group", "image", "audio", "switch", "particle", "note", "patch"]>;
        name: z.ZodString;
        parentId: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        layerType: "image" | "audio" | "note" | "bone" | "group" | "patch" | "vector" | "switch" | "particle";
        parentId?: number | undefined;
    }, {
        name: string;
        layerType: "image" | "audio" | "note" | "bone" | "group" | "patch" | "vector" | "switch" | "particle";
        parentId?: number | undefined;
    }>;
    readonly "document.save": z.ZodObject<{
        path: z.ZodOptional<z.ZodString>;
        format: z.ZodOptional<z.ZodEnum<["moho", "fbx", "json"]>>;
        previewHash: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path?: string | undefined;
        format?: "moho" | "json" | "fbx" | undefined;
        previewHash?: string | undefined;
    }, {
        path?: string | undefined;
        format?: "moho" | "json" | "fbx" | undefined;
        previewHash?: string | undefined;
    }>;
    readonly "document.close": z.ZodObject<{
        save: z.ZodOptional<z.ZodBoolean>;
        previewHash: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        save?: boolean | undefined;
        previewHash?: string | undefined;
    }, {
        save?: boolean | undefined;
        previewHash?: string | undefined;
    }>;
    readonly "document.open": z.ZodObject<{
        path: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
    }, {
        path: string;
    }>;
    readonly "document.render": z.ZodObject<{
        outputPath: z.ZodString;
        width: z.ZodNumber;
        height: z.ZodNumber;
        startFrame: z.ZodOptional<z.ZodNumber>;
        endFrame: z.ZodOptional<z.ZodNumber>;
        format: z.ZodOptional<z.ZodEnum<["png", "jpg", "tiff", "exr"]>>;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
        outputPath: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        format?: "png" | "tiff" | "exr" | "jpg" | undefined;
    }, {
        width: number;
        height: number;
        outputPath: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        format?: "png" | "tiff" | "exr" | "jpg" | undefined;
    }>;
    readonly "document.diagnose": z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    readonly "layer.getProperties": z.ZodObject<{
        layerId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
    }, {
        layerId: number;
    }>;
    readonly "layer.getChildren": z.ZodObject<{
        layerId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
    }, {
        layerId: number;
    }>;
    readonly "layer.getBones": z.ZodObject<{
        layerId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
    }, {
        layerId: number;
    }>;
    readonly "layer.setTransform": z.ZodObject<{
        frame: z.ZodOptional<z.ZodNumber>;
        translation: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>>;
        rotation: z.ZodOptional<z.ZodNumber>;
        scale: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>>;
        layerId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        frame?: number | undefined;
        rotation?: number | undefined;
        scale?: {
            x: number;
            y: number;
        } | undefined;
        translation?: {
            x: number;
            y: number;
        } | undefined;
    }, {
        layerId: number;
        frame?: number | undefined;
        rotation?: number | undefined;
        scale?: {
            x: number;
            y: number;
        } | undefined;
        translation?: {
            x: number;
            y: number;
        } | undefined;
    }>;
    readonly "layer.setVisibility": z.ZodObject<{
        layerId: z.ZodNumber;
        visible: z.ZodBoolean;
        frame: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        visible: boolean;
        frame?: number | undefined;
    }, {
        layerId: number;
        visible: boolean;
        frame?: number | undefined;
    }>;
    readonly "layer.setOpacity": z.ZodObject<{
        layerId: z.ZodNumber;
        opacity: z.ZodNumber;
        frame: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        opacity: number;
        frame?: number | undefined;
    }, {
        layerId: number;
        opacity: number;
        frame?: number | undefined;
    }>;
    readonly "layer.setName": z.ZodObject<{
        layerId: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        layerId: number;
    }, {
        name: string;
        layerId: number;
    }>;
    readonly "layer.selectLayer": z.ZodObject<{
        layerId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
    }, {
        layerId: number;
    }>;
    readonly "layer.reorder": z.ZodObject<{
        layerId: z.ZodNumber;
        newIndex: z.ZodNumber;
        parentId: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        newIndex: number;
        parentId?: number | undefined;
    }, {
        layerId: number;
        newIndex: number;
        parentId?: number | undefined;
    }>;
    readonly "layer.setBlendMode": z.ZodObject<{
        layerId: z.ZodNumber;
        blendMode: z.ZodEnum<["normal", "multiply", "screen", "overlay", "darken", "lighten", "color_dodge", "color_burn", "soft_light", "hard_light", "difference", "exclusion"]>;
        frame: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        blendMode: "overlay" | "normal" | "multiply" | "screen" | "darken" | "lighten" | "color_dodge" | "color_burn" | "soft_light" | "hard_light" | "difference" | "exclusion";
        frame?: number | undefined;
    }, {
        layerId: number;
        blendMode: "overlay" | "normal" | "multiply" | "screen" | "darken" | "lighten" | "color_dodge" | "color_burn" | "soft_light" | "hard_light" | "difference" | "exclusion";
        frame?: number | undefined;
    }>;
    readonly "layer.setMask": z.ZodObject<{
        layerId: z.ZodNumber;
        masked: z.ZodBoolean;
        maskLayerId: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        masked: boolean;
        maskLayerId?: number | undefined;
    }, {
        layerId: number;
        masked: boolean;
        maskLayerId?: number | undefined;
    }>;
    readonly "layer.createGroup": z.ZodObject<{
        name: z.ZodString;
        childLayerIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        childLayerIds?: number[] | undefined;
    }, {
        name: string;
        childLayerIds?: number[] | undefined;
    }>;
    readonly "layer.createSwitch": z.ZodObject<{
        name: z.ZodString;
        optionLayerIds: z.ZodArray<z.ZodNumber, "many">;
        activeIndex: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        optionLayerIds: number[];
        activeIndex?: number | undefined;
    }, {
        name: string;
        optionLayerIds: number[];
        activeIndex?: number | undefined;
    }>;
    readonly "layer.delete": z.ZodObject<{
        layerId: z.ZodNumber;
        previewHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        previewHash: string;
    }, {
        layerId: number;
        previewHash: string;
    }>;
    readonly "bone.getProperties": z.ZodObject<{
        layerId: z.ZodNumber;
        boneId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        boneId: number;
    }, {
        layerId: number;
        boneId: number;
    }>;
    readonly "bone.setTransform": z.ZodObject<{
        layerId: z.ZodNumber;
        boneId: z.ZodNumber;
        position: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>>;
        angle: z.ZodOptional<z.ZodNumber>;
        scale: z.ZodOptional<z.ZodNumber>;
        frame: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        boneId: number;
        frame?: number | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        scale?: number | undefined;
        angle?: number | undefined;
    }, {
        layerId: number;
        boneId: number;
        frame?: number | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        scale?: number | undefined;
        angle?: number | undefined;
    }>;
    readonly "bone.selectBone": z.ZodObject<{
        layerId: z.ZodNumber;
        boneId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        boneId: number;
    }, {
        layerId: number;
        boneId: number;
    }>;
    readonly "bone.createBone": z.ZodObject<{
        layerId: z.ZodNumber;
        name: z.ZodString;
        position: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>>;
        angle: z.ZodOptional<z.ZodNumber>;
        parentBoneId: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        layerId: number;
        position?: {
            x: number;
            y: number;
        } | undefined;
        angle?: number | undefined;
        parentBoneId?: number | undefined;
    }, {
        name: string;
        layerId: number;
        position?: {
            x: number;
            y: number;
        } | undefined;
        angle?: number | undefined;
        parentBoneId?: number | undefined;
    }>;
    readonly "bone.deleteBone": z.ZodObject<{
        layerId: z.ZodNumber;
        boneId: z.ZodNumber;
        previewHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        previewHash: string;
        boneId: number;
    }, {
        layerId: number;
        previewHash: string;
        boneId: number;
    }>;
    readonly "bone.setConstraints": z.ZodObject<{
        layerId: z.ZodNumber;
        boneId: z.ZodNumber;
        minAngle: z.ZodOptional<z.ZodNumber>;
        maxAngle: z.ZodOptional<z.ZodNumber>;
        enabled: z.ZodOptional<z.ZodBoolean>;
        positionControl: z.ZodOptional<z.ZodBoolean>;
        angleControl: z.ZodOptional<z.ZodBoolean>;
        scaleControl: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        boneId: number;
        minAngle?: number | undefined;
        maxAngle?: number | undefined;
        enabled?: boolean | undefined;
        positionControl?: boolean | undefined;
        angleControl?: boolean | undefined;
        scaleControl?: boolean | undefined;
    }, {
        layerId: number;
        boneId: number;
        minAngle?: number | undefined;
        maxAngle?: number | undefined;
        enabled?: boolean | undefined;
        positionControl?: boolean | undefined;
        angleControl?: boolean | undefined;
        scaleControl?: boolean | undefined;
    }>;
    readonly "bone.setTarget": z.ZodObject<{
        layerId: z.ZodNumber;
        boneId: z.ZodNumber;
        targetLayerId: z.ZodNumber;
        targetBoneId: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        boneId: number;
        targetLayerId: number;
        targetBoneId?: number | undefined;
    }, {
        layerId: number;
        boneId: number;
        targetLayerId: number;
        targetBoneId?: number | undefined;
    }>;
    readonly "bone.setParent": z.ZodObject<{
        layerId: z.ZodNumber;
        boneId: z.ZodNumber;
        parentBoneId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        boneId: number;
        parentBoneId: number;
    }, {
        layerId: number;
        boneId: number;
        parentBoneId: number;
    }>;
    readonly "animation.getKeyframes": z.ZodObject<{
        layerId: z.ZodNumber;
        channel: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        channel: string;
    }, {
        layerId: number;
        channel: string;
    }>;
    readonly "animation.getFrameState": z.ZodObject<{
        layerId: z.ZodNumber;
        frame: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        layerId: number;
    }, {
        frame: number;
        layerId: number;
    }>;
    readonly "animation.setKeyframe": z.ZodObject<{
        layerId: z.ZodNumber;
        channel: z.ZodString;
        frame: z.ZodNumber;
        value: z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>, z.ZodBoolean]>;
    }, "strip", z.ZodTypeAny, {
        value: number | boolean | {
            x: number;
            y: number;
        };
        frame: number;
        layerId: number;
        channel: string;
    }, {
        value: number | boolean | {
            x: number;
            y: number;
        };
        frame: number;
        layerId: number;
        channel: string;
    }>;
    readonly "animation.setMultiKeyframe": z.ZodObject<{
        layerId: z.ZodNumber;
        channel: z.ZodString;
        keyframes: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            value: z.ZodUnion<[z.ZodNumber, z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
            }, {
                x: number;
                y: number;
            }>, z.ZodBoolean]>;
        }, "strip", z.ZodTypeAny, {
            value: number | boolean | {
                x: number;
                y: number;
            };
            frame: number;
        }, {
            value: number | boolean | {
                x: number;
                y: number;
            };
            frame: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        keyframes: {
            value: number | boolean | {
                x: number;
                y: number;
            };
            frame: number;
        }[];
        layerId: number;
        channel: string;
    }, {
        keyframes: {
            value: number | boolean | {
                x: number;
                y: number;
            };
            frame: number;
        }[];
        layerId: number;
        channel: string;
    }>;
    readonly "animation.deleteKeyframe": z.ZodObject<{
        layerId: z.ZodNumber;
        channel: z.ZodString;
        frame: z.ZodNumber;
        previewHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        layerId: number;
        previewHash: string;
        channel: string;
    }, {
        frame: number;
        layerId: number;
        previewHash: string;
        channel: string;
    }>;
    readonly "animation.setInterpolation": z.ZodObject<{
        layerId: z.ZodNumber;
        channel: z.ZodString;
        frame: z.ZodNumber;
        interpMode: z.ZodEnum<["linear", "smooth", "ease_in", "ease_out", "step", "bezier", "noisy", "cycle"]>;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        layerId: number;
        channel: string;
        interpMode: "linear" | "ease_in" | "ease_out" | "smooth" | "bezier" | "step" | "noisy" | "cycle";
    }, {
        frame: number;
        layerId: number;
        channel: string;
        interpMode: "linear" | "ease_in" | "ease_out" | "smooth" | "bezier" | "step" | "noisy" | "cycle";
    }>;
    readonly "animation.getPointAnim": z.ZodObject<{
        layerId: z.ZodNumber;
        pointIndex: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        pointIndex: number;
    }, {
        layerId: number;
        pointIndex: number;
    }>;
    readonly "mesh.getPoints": z.ZodObject<{
        layerId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
    }, {
        layerId: number;
    }>;
    readonly "mesh.getShapes": z.ZodObject<{
        layerId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
    }, {
        layerId: number;
    }>;
    readonly "mesh.createPoint": z.ZodObject<{
        layerId: z.ZodNumber;
        x: z.ZodNumber;
        y: z.ZodNumber;
        bezierInX: z.ZodOptional<z.ZodNumber>;
        bezierInY: z.ZodOptional<z.ZodNumber>;
        bezierOutX: z.ZodOptional<z.ZodNumber>;
        bezierOutY: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        layerId: number;
        bezierInX?: number | undefined;
        bezierInY?: number | undefined;
        bezierOutX?: number | undefined;
        bezierOutY?: number | undefined;
    }, {
        x: number;
        y: number;
        layerId: number;
        bezierInX?: number | undefined;
        bezierInY?: number | undefined;
        bezierOutX?: number | undefined;
        bezierOutY?: number | undefined;
    }>;
    readonly "mesh.createBezier": z.ZodObject<{
        layerId: z.ZodNumber;
        points: z.ZodArray<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            bezierInX: z.ZodOptional<z.ZodNumber>;
            bezierInY: z.ZodOptional<z.ZodNumber>;
            bezierOutX: z.ZodOptional<z.ZodNumber>;
            bezierOutY: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            bezierInX?: number | undefined;
            bezierInY?: number | undefined;
            bezierOutX?: number | undefined;
            bezierOutY?: number | undefined;
        }, {
            x: number;
            y: number;
            bezierInX?: number | undefined;
            bezierInY?: number | undefined;
            bezierOutX?: number | undefined;
            bezierOutY?: number | undefined;
        }>, "many">;
        closed: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        points: {
            x: number;
            y: number;
            bezierInX?: number | undefined;
            bezierInY?: number | undefined;
            bezierOutX?: number | undefined;
            bezierOutY?: number | undefined;
        }[];
        layerId: number;
        closed?: boolean | undefined;
    }, {
        points: {
            x: number;
            y: number;
            bezierInX?: number | undefined;
            bezierInY?: number | undefined;
            bezierOutX?: number | undefined;
            bezierOutY?: number | undefined;
        }[];
        layerId: number;
        closed?: boolean | undefined;
    }>;
    readonly "mesh.weld": z.ZodObject<{
        layerId: z.ZodNumber;
        pointIndexA: z.ZodNumber;
        pointIndexB: z.ZodNumber;
        previewHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        previewHash: string;
        pointIndexA: number;
        pointIndexB: number;
    }, {
        layerId: number;
        previewHash: string;
        pointIndexA: number;
        pointIndexB: number;
    }>;
    readonly "mesh.setFill": z.ZodObject<{
        layerId: z.ZodNumber;
        shapeIndex: z.ZodNumber;
        hasFill: z.ZodBoolean;
        color: z.ZodOptional<z.ZodObject<{
            r: z.ZodNumber;
            g: z.ZodNumber;
            b: z.ZodNumber;
            a: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }, {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        shapeIndex: number;
        hasFill: boolean;
        color?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    }, {
        layerId: number;
        shapeIndex: number;
        hasFill: boolean;
        color?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    }>;
    readonly "mesh.setStroke": z.ZodObject<{
        layerId: z.ZodNumber;
        shapeIndex: z.ZodNumber;
        hasStroke: z.ZodBoolean;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodObject<{
            r: z.ZodNumber;
            g: z.ZodNumber;
            b: z.ZodNumber;
            a: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }, {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        shapeIndex: number;
        hasStroke: boolean;
        width?: number | undefined;
        color?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    }, {
        layerId: number;
        shapeIndex: number;
        hasStroke: boolean;
        width?: number | undefined;
        color?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    }>;
    readonly "mesh.setGradient": z.ZodObject<{
        layerId: z.ZodNumber;
        shapeIndex: z.ZodNumber;
        enabled: z.ZodBoolean;
        startColor: z.ZodOptional<z.ZodObject<{
            r: z.ZodNumber;
            g: z.ZodNumber;
            b: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            r: number;
            g: number;
            b: number;
        }, {
            r: number;
            g: number;
            b: number;
        }>>;
        endColor: z.ZodOptional<z.ZodObject<{
            r: z.ZodNumber;
            g: z.ZodNumber;
            b: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            r: number;
            g: number;
            b: number;
        }, {
            r: number;
            g: number;
            b: number;
        }>>;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        enabled: boolean;
        shapeIndex: number;
        angle?: number | undefined;
        startColor?: {
            r: number;
            g: number;
            b: number;
        } | undefined;
        endColor?: {
            r: number;
            g: number;
            b: number;
        } | undefined;
    }, {
        layerId: number;
        enabled: boolean;
        shapeIndex: number;
        angle?: number | undefined;
        startColor?: {
            r: number;
            g: number;
            b: number;
        } | undefined;
        endColor?: {
            r: number;
            g: number;
            b: number;
        } | undefined;
    }>;
    readonly "mesh.setCurvature": z.ZodObject<{
        layerId: z.ZodNumber;
        pointIndex: z.ZodNumber;
        bezierInX: z.ZodNumber;
        bezierInY: z.ZodNumber;
        bezierOutX: z.ZodNumber;
        bezierOutY: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        pointIndex: number;
        bezierInX: number;
        bezierInY: number;
        bezierOutX: number;
        bezierOutY: number;
    }, {
        layerId: number;
        pointIndex: number;
        bezierInX: number;
        bezierInY: number;
        bezierOutX: number;
        bezierOutY: number;
    }>;
    readonly "batch.execute": z.ZodObject<{
        operations: z.ZodArray<z.ZodObject<{
            method: z.ZodString;
            params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            method: string;
            params?: Record<string, unknown> | undefined;
        }, {
            method: string;
            params?: Record<string, unknown> | undefined;
        }>, "many">;
        stopOnError: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        operations: {
            method: string;
            params?: Record<string, unknown> | undefined;
        }[];
        stopOnError?: boolean | undefined;
    }, {
        operations: {
            method: string;
            params?: Record<string, unknown> | undefined;
        }[];
        stopOnError?: boolean | undefined;
    }>;
    readonly "workflow.applyLipSync": z.ZodObject<{
        layerId: z.ZodNumber;
        phonemes: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            phoneme: z.ZodEnum<["AI", "E", "U", "O", "MBP", "FV", "L", "WQ", "etc", "rest"]>;
        }, "strip", z.ZodTypeAny, {
            frame: number;
            phoneme: "E" | "O" | "U" | "L" | "rest" | "AI" | "MBP" | "FV" | "WQ" | "etc";
        }, {
            frame: number;
            phoneme: "E" | "O" | "U" | "L" | "rest" | "AI" | "MBP" | "FV" | "WQ" | "etc";
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        layerId: number;
        phonemes: {
            frame: number;
            phoneme: "E" | "O" | "U" | "L" | "rest" | "AI" | "MBP" | "FV" | "WQ" | "etc";
        }[];
    }, {
        layerId: number;
        phonemes: {
            frame: number;
            phoneme: "E" | "O" | "U" | "L" | "rest" | "AI" | "MBP" | "FV" | "WQ" | "etc";
        }[];
    }>;
    readonly "workflow.createSmartBone": z.ZodObject<{
        layerId: z.ZodNumber;
        boneId: z.ZodNumber;
        actionName: z.ZodString;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        startFrame: number;
        endFrame: number;
        layerId: number;
        boneId: number;
        actionName: string;
        parameters?: Record<string, number> | undefined;
    }, {
        startFrame: number;
        endFrame: number;
        layerId: number;
        boneId: number;
        actionName: string;
        parameters?: Record<string, number> | undefined;
    }>;
    readonly "workflow.duplicateLayerTree": z.ZodObject<{
        layerId: z.ZodNumber;
        newName: z.ZodString;
        includeAnimation: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        newName: string;
        layerId: number;
        includeAnimation?: boolean | undefined;
    }, {
        newName: string;
        layerId: number;
        includeAnimation?: boolean | undefined;
    }>;
    readonly "workflow.batchRender": z.ZodObject<{
        scenes: z.ZodArray<z.ZodObject<{
            sceneName: z.ZodString;
            outputPath: z.ZodString;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            width: number;
            height: number;
            sceneName: string;
            outputPath: string;
        }, {
            width: number;
            height: number;
            sceneName: string;
            outputPath: string;
        }>, "many">;
        previewHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        scenes: {
            width: number;
            height: number;
            sceneName: string;
            outputPath: string;
        }[];
        previewHash: string;
    }, {
        scenes: {
            width: number;
            height: number;
            sceneName: string;
            outputPath: string;
        }[];
        previewHash: string;
    }>;
    readonly "workflow.projectDiagnostics": z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    readonly "workflow.createCharacterRig": z.ZodObject<{
        characterName: z.ZodString;
        rigProfile: z.ZodOptional<z.ZodEnum<["simple", "standard", "complex"]>>;
        views: z.ZodOptional<z.ZodArray<z.ZodEnum<["front", "front_3q_left", "side_left", "back_3q_left", "back", "back_3q_right", "side_right", "front_3q_right"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        characterName: string;
        views?: ("front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right")[] | undefined;
        rigProfile?: "standard" | "simple" | "complex" | undefined;
    }, {
        characterName: string;
        views?: ("front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right")[] | undefined;
        rigProfile?: "standard" | "simple" | "complex" | undefined;
    }>;
};
export type MethodName = keyof typeof methodSchemas;
