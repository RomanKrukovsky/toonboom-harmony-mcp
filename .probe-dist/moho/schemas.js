/**
 * JSON-RPC 2.0 method and parameter schemas used by tools.ts.
 *
 * Centralized so adding a new tool updates exactly one place. Zod is used
 * at the boundary to reject malformed input before any IPC round-trip.
 */
import { z } from "zod";
import { INTERPOLATION_MODES, LAYER_TYPES } from "./security/mohoSafetyEngine.js";
/** Numeric identifiers (layer / bone / frame / etc.) — bounded to a safe int range. */
const nonNegativeInt = z.number().int().min(0).max(1_000_000_000);
/** Vector2 in 2D space: { x, y }. */
const vec2 = z.object({ x: z.number(), y: z.number() });
/** Vector3 in 3D space: { x, y, z }. */
const vec3 = z.object({ x: z.number(), y: z.number(), z: z.number() });
/** Layer transform payload: any of translation / rotation / scale optional. */
const transformPayload = {
    translation: vec2.optional(),
    rotation: z.number().optional(),
    scale: vec2.optional(),
};
const layerId = nonNegativeInt.describe("Numeric absolute layer ID");
const boneId = nonNegativeInt.describe("Numeric bone index inside the bone layer");
const frameNum = nonNegativeInt.describe("Timeline frame number (0-indexed)");
/* -------------------------------------------------------------------------- */
/* Document tools                                                             */
/* -------------------------------------------------------------------------- */
export const documentGetInfo = z.object({});
export const documentGetLayers = z.object({});
export const documentSetFrame = z.object({
    frame: z.number().int().min(0).max(1_000_000_000),
});
export const documentScreenshot = z.object({
    width: z.number().int().min(1).max(8192).optional(),
    height: z.number().int().min(1).max(8192).optional(),
    outputPath: z.string().optional(),
});
export const documentCreateLayer = z.object({
    layerType: z.enum(LAYER_TYPES),
    name: z.string().min(1).max(256),
    parentId: layerId.optional(),
});
export const documentSave = z.object({
    path: z.string().min(1).optional(),
    format: z.enum(["moho", "fbx", "json"]).optional(),
    previewHash: z.string().optional(),
});
export const documentClose = z.object({
    save: z.boolean().optional(),
    previewHash: z.string().optional(),
});
export const documentOpen = z.object({ path: z.string().min(1) });
export const documentRender = z.object({
    outputPath: z.string().min(1),
    width: z.number().int().min(1).max(8192),
    height: z.number().int().min(1).max(8192),
    startFrame: nonNegativeInt.optional(),
    endFrame: nonNegativeInt.optional(),
    format: z.enum(["png", "jpg", "tiff", "exr"]).optional(),
});
export const documentDiagnose = z.object({});
/* -------------------------------------------------------------------------- */
/* Layer tools                                                                */
/* -------------------------------------------------------------------------- */
export const layerGetProperties = z.object({ layerId });
export const layerGetChildren = z.object({ layerId });
export const layerGetBones = z.object({ layerId });
export const layerSetTransform = z.object({ layerId, ...transformPayload, frame: frameNum.optional() });
export const layerSetVisibility = z.object({
    layerId,
    visible: z.boolean(),
    frame: frameNum.optional(),
});
export const layerSetOpacity = z.object({
    layerId,
    opacity: z.number().min(0).max(1),
    frame: frameNum.optional(),
});
export const layerSetName = z.object({ layerId, name: z.string().min(1).max(256) });
export const layerSelectLayer = z.object({ layerId });
export const layerReorder = z.object({
    layerId,
    newIndex: z.number().int().min(0),
    parentId: layerId.optional(),
});
export const layerSetBlendMode = z.object({
    layerId,
    blendMode: z.enum([
        "normal",
        "multiply",
        "screen",
        "overlay",
        "darken",
        "lighten",
        "color_dodge",
        "color_burn",
        "soft_light",
        "hard_light",
        "difference",
        "exclusion",
    ]),
    frame: frameNum.optional(),
});
export const layerSetMask = z.object({
    layerId,
    masked: z.boolean(),
    maskLayerId: layerId.optional(),
});
export const layerCreateGroup = z.object({
    name: z.string().min(1).max(256),
    childLayerIds: z.array(layerId).optional(),
});
export const layerCreateSwitch = z.object({
    name: z.string().min(1).max(256),
    optionLayerIds: z.array(layerId).min(1),
    activeIndex: z.number().int().min(0).optional(),
});
export const layerDelete = z.object({
    layerId,
    previewHash: z.string(),
});
/* -------------------------------------------------------------------------- */
/* Bone tools                                                                 */
/* -------------------------------------------------------------------------- */
export const boneGetProperties = z.object({ layerId, boneId });
export const boneSetTransform = z.object({
    layerId,
    boneId,
    position: vec2.optional(),
    angle: z.number().optional(),
    scale: z.number().optional(),
    frame: frameNum.optional(),
});
export const boneSelectBone = z.object({ layerId, boneId });
export const boneCreateBone = z.object({
    layerId: z.number().int().min(0),
    name: z.string().min(1).max(256),
    position: vec2.optional(),
    angle: z.number().optional(),
    parentBoneId: boneId.optional(),
});
export const boneDeleteBone = z.object({
    layerId,
    boneId,
    previewHash: z.string(),
});
export const boneSetConstraints = z.object({
    layerId,
    boneId,
    minAngle: z.number().optional(),
    maxAngle: z.number().optional(),
    enabled: z.boolean().optional(),
    positionControl: z.boolean().optional(),
    angleControl: z.boolean().optional(),
    scaleControl: z.boolean().optional(),
});
export const boneSetTarget = z.object({
    layerId,
    boneId,
    targetLayerId: layerId,
    targetBoneId: boneId.optional(),
});
export const boneSetParent = z.object({
    layerId,
    boneId,
    parentBoneId: boneId,
});
/* -------------------------------------------------------------------------- */
/* Animation tools                                                            */
/* -------------------------------------------------------------------------- */
export const animationGetKeyframes = z.object({
    layerId,
    channel: z.string().min(1),
});
export const animationGetFrameState = z.object({ layerId, frame: frameNum });
export const animationSetKeyframe = z.object({
    layerId,
    channel: z.string().min(1),
    frame: frameNum,
    value: z.union([z.number(), vec2, z.boolean()]),
});
export const animationSetMultiKeyframe = z.object({
    layerId,
    channel: z.string().min(1),
    keyframes: z
        .array(z.object({
        frame: frameNum,
        value: z.union([z.number(), vec2, z.boolean()]),
    }))
        .min(1)
        .max(200),
});
export const animationDeleteKeyframe = z.object({
    layerId,
    channel: z.string().min(1),
    frame: frameNum,
    previewHash: z.string(),
});
export const animationSetInterpolation = z.object({
    layerId,
    channel: z.string().min(1),
    frame: frameNum,
    interpMode: z.enum(INTERPOLATION_MODES),
});
export const animationGetPointAnim = z.object({
    layerId,
    pointIndex: nonNegativeInt,
});
/* -------------------------------------------------------------------------- */
/* Mesh tools                                                                 */
/* -------------------------------------------------------------------------- */
export const meshGetPoints = z.object({ layerId });
export const meshGetShapes = z.object({ layerId });
export const meshCreatePoint = z.object({
    layerId,
    x: z.number(),
    y: z.number(),
    bezierInX: z.number().optional(),
    bezierInY: z.number().optional(),
    bezierOutX: z.number().optional(),
    bezierOutY: z.number().optional(),
});
export const meshCreateBezier = z.object({
    layerId,
    points: z
        .array(z.object({
        x: z.number(),
        y: z.number(),
        bezierInX: z.number().optional(),
        bezierInY: z.number().optional(),
        bezierOutX: z.number().optional(),
        bezierOutY: z.number().optional(),
    }))
        .min(2)
        .max(500),
    closed: z.boolean().optional(),
});
export const meshWeld = z.object({
    layerId,
    pointIndexA: nonNegativeInt,
    pointIndexB: nonNegativeInt,
    previewHash: z.string(),
});
export const meshSetFill = z.object({
    layerId,
    shapeIndex: nonNegativeInt,
    hasFill: z.boolean(),
    color: z
        .object({
        r: z.number().min(0).max(1),
        g: z.number().min(0).max(1),
        b: z.number().min(0).max(1),
        a: z.number().min(0).max(1).optional(),
    })
        .optional(),
});
export const meshSetStroke = z.object({
    layerId,
    shapeIndex: nonNegativeInt,
    hasStroke: z.boolean(),
    width: z.number().min(0).optional(),
    color: z
        .object({
        r: z.number().min(0).max(1),
        g: z.number().min(0).max(1),
        b: z.number().min(0).max(1),
        a: z.number().min(0).max(1).optional(),
    })
        .optional(),
});
export const meshSetGradient = z.object({
    layerId,
    shapeIndex: nonNegativeInt,
    enabled: z.boolean(),
    startColor: z.object({ r: z.number().min(0).max(1), g: z.number().min(0).max(1), b: z.number().min(0).max(1) }).optional(),
    endColor: z.object({ r: z.number().min(0).max(1), g: z.number().min(0).max(1), b: z.number().min(0).max(1) }).optional(),
    angle: z.number().optional(),
});
export const meshSetCurvature = z.object({
    layerId,
    pointIndex: nonNegativeInt,
    bezierInX: z.number(),
    bezierInY: z.number(),
    bezierOutX: z.number(),
    bezierOutY: z.number(),
});
/* -------------------------------------------------------------------------- */
/* Batch                                                                      */
/* -------------------------------------------------------------------------- */
export const batchExecute = z.object({
    operations: z
        .array(z.object({
        method: z.string().min(1),
        params: z.record(z.unknown()).optional(),
    }))
        .min(1)
        .max(50),
    stopOnError: z.boolean().optional(),
});
/* -------------------------------------------------------------------------- */
/* Workflows                                                                  */
/* -------------------------------------------------------------------------- */
const lipSyncPhoneme = z.enum([
    "AI",
    "E",
    "U",
    "O",
    "MBP",
    "FV",
    "L",
    "WQ",
    "etc",
    "rest",
]);
export const workflowApplyLipSync = z.object({
    layerId,
    phonemes: z
        .array(z.object({
        frame: frameNum,
        phoneme: lipSyncPhoneme,
    }))
        .min(1)
        .max(1000),
});
export const workflowCreateSmartBone = z.object({
    layerId,
    boneId,
    actionName: z.string().min(1).max(64),
    startFrame: frameNum,
    endFrame: frameNum,
    parameters: z.record(z.number()).optional(),
});
export const workflowDuplicateLayerTree = z.object({
    layerId,
    newName: z.string().min(1).max(256),
    includeAnimation: z.boolean().optional(),
});
export const workflowBatchRender = z.object({
    scenes: z
        .array(z.object({
        sceneName: z.string().min(1),
        outputPath: z.string().min(1),
        width: z.number().int().min(1).max(8192),
        height: z.number().int().min(1).max(8192),
    }))
        .min(1)
        .max(20),
    previewHash: z.string(),
});
export const workflowProjectDiagnostics = z.object({});
export const workflowCreateCharacterRig = z.object({
    characterName: z.string().min(1).max(64),
    rigProfile: z.enum(["simple", "standard", "complex"]).optional(),
    views: z
        .array(z.enum([
        "front",
        "front_3q_left",
        "side_left",
        "back_3q_left",
        "back",
        "back_3q_right",
        "side_right",
        "front_3q_right",
    ]))
        .optional(),
});
/* -------------------------------------------------------------------------- */
/* Map of method -> schema                                                    */
/* -------------------------------------------------------------------------- */
export const methodSchemas = {
    "document.getInfo": documentGetInfo,
    "document.getLayers": documentGetLayers,
    "document.setFrame": documentSetFrame,
    "document.screenshot": documentScreenshot,
    "document.createLayer": documentCreateLayer,
    "document.save": documentSave,
    "document.close": documentClose,
    "document.open": documentOpen,
    "document.render": documentRender,
    "document.diagnose": documentDiagnose,
    "layer.getProperties": layerGetProperties,
    "layer.getChildren": layerGetChildren,
    "layer.getBones": layerGetBones,
    "layer.setTransform": layerSetTransform,
    "layer.setVisibility": layerSetVisibility,
    "layer.setOpacity": layerSetOpacity,
    "layer.setName": layerSetName,
    "layer.selectLayer": layerSelectLayer,
    "layer.reorder": layerReorder,
    "layer.setBlendMode": layerSetBlendMode,
    "layer.setMask": layerSetMask,
    "layer.createGroup": layerCreateGroup,
    "layer.createSwitch": layerCreateSwitch,
    "layer.delete": layerDelete,
    "bone.getProperties": boneGetProperties,
    "bone.setTransform": boneSetTransform,
    "bone.selectBone": boneSelectBone,
    "bone.createBone": boneCreateBone,
    "bone.deleteBone": boneDeleteBone,
    "bone.setConstraints": boneSetConstraints,
    "bone.setTarget": boneSetTarget,
    "bone.setParent": boneSetParent,
    "animation.getKeyframes": animationGetKeyframes,
    "animation.getFrameState": animationGetFrameState,
    "animation.setKeyframe": animationSetKeyframe,
    "animation.setMultiKeyframe": animationSetMultiKeyframe,
    "animation.deleteKeyframe": animationDeleteKeyframe,
    "animation.setInterpolation": animationSetInterpolation,
    "animation.getPointAnim": animationGetPointAnim,
    "mesh.getPoints": meshGetPoints,
    "mesh.getShapes": meshGetShapes,
    "mesh.createPoint": meshCreatePoint,
    "mesh.createBezier": meshCreateBezier,
    "mesh.weld": meshWeld,
    "mesh.setFill": meshSetFill,
    "mesh.setStroke": meshSetStroke,
    "mesh.setGradient": meshSetGradient,
    "mesh.setCurvature": meshSetCurvature,
    "batch.execute": batchExecute,
    "workflow.applyLipSync": workflowApplyLipSync,
    "workflow.createSmartBone": workflowCreateSmartBone,
    "workflow.duplicateLayerTree": workflowDuplicateLayerTree,
    "workflow.batchRender": workflowBatchRender,
    "workflow.projectDiagnostics": workflowProjectDiagnostics,
    "workflow.createCharacterRig": workflowCreateCharacterRig,
};
