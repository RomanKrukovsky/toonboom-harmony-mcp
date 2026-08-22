import { z } from 'zod';
export declare const rigTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    characterName: z.ZodString;
    parts: z.ZodArray<z.ZodString, "many">;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    characterName: string;
    parts: string[];
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    characterName: string;
    parts: string[];
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    psdPath: z.ZodString;
    characterName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    characterName: string;
    psdPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    characterName: string;
    psdPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    characterName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    characterName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    characterName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterName: z.ZodDefault<z.ZodString>;
    characterDrawingPIR: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    characterName: string;
    characterDrawingPIR?: Record<string, unknown> | undefined;
}, {
    dryRun?: boolean | undefined;
    characterName?: string | undefined;
    characterDrawingPIR?: Record<string, unknown> | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePaths: z.ZodArray<z.ZodString, "many">;
    pivotMatchingPreset: z.ZodOptional<z.ZodBoolean>;
    jointCenterMarkers: z.ZodOptional<z.ZodArray<z.ZodObject<{
        nodePath: z.ZodString;
        pivotX: z.ZodNumber;
        pivotY: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        pivotX: number;
        pivotY: number;
        nodePath: string;
    }, {
        pivotX: number;
        pivotY: number;
        nodePath: string;
    }>, "many">>;
    useSeparateCoordinates: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nodePaths: string[];
    useSeparateCoordinates: boolean;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    pivotMatchingPreset?: boolean | undefined;
    jointCenterMarkers?: {
        pivotX: number;
        pivotY: number;
        nodePath: string;
    }[] | undefined;
}, {
    nodePaths: string[];
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    pivotMatchingPreset?: boolean | undefined;
    jointCenterMarkers?: {
        pivotX: number;
        pivotY: number;
        nodePath: string;
    }[] | undefined;
    useSeparateCoordinates?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterName: z.ZodDefault<z.ZodString>;
    assemblyPlan: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    characterName: string;
    assemblyPlan?: Record<string, unknown> | undefined;
}, {
    dryRun?: boolean | undefined;
    characterName?: string | undefined;
    assemblyPlan?: Record<string, unknown> | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    controllerName: z.ZodString;
    controlledNodePaths: z.ZodArray<z.ZodString, "many">;
    characterName: z.ZodOptional<z.ZodString>;
    gridWidth: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    gridHeight: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    gridWidth: number;
    gridHeight: number;
    controllerName: string;
    controlledNodePaths: string[];
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    characterName?: string | undefined;
}, {
    controllerName: string;
    controlledNodePaths: string[];
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    characterName?: string | undefined;
    gridWidth?: number | undefined;
    gridHeight?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    characterName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterName: string;
    projectPath?: string | undefined;
}, {
    characterName: string;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    mouthNodePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    mouthNodePath: string;
    projectPath?: string | undefined;
}, {
    mouthNodePath: string;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    characterName: z.ZodString;
    eyeCutterPreset: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    eyelidCount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    characterName: string;
    eyeCutterPreset: boolean;
    eyelidCount: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    characterName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    eyeCutterPreset?: boolean | undefined;
    eyelidCount?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    targetNodePath: z.ZodString;
    constraintType: z.ZodDefault<z.ZodOptional<z.ZodEnum<["TwoPointConstraint", "PositionConstraint", "RotationConstraint"]>>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    targetNodePath: string;
    constraintType: "TwoPointConstraint" | "PositionConstraint" | "RotationConstraint";
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    targetNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    constraintType?: "TwoPointConstraint" | "PositionConstraint" | "RotationConstraint" | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    handNodePath: z.ZodString;
    handDrawingsCount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    handNodePath: string;
    handDrawingsCount: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    handNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    handDrawingsCount?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    libraryPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    libraryPath: string;
    projectPath?: string | undefined;
}, {
    libraryPath: string;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    poseTemplatePath: z.ZodString;
    targetNodePath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    targetNodePath: string;
    poseTemplatePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    targetNodePath: string;
    poseTemplatePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    templateDestinationPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nodePath: string;
    templateDestinationPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    nodePath: string;
    templateDestinationPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    angleMappings: z.ZodArray<z.ZodObject<{
        angle: z.ZodEnum<["front", "front_3q_left", "side_left", "back_3q_left", "back", "back_3q_right", "side_right", "front_3q_right"]>;
        drawingName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        drawingName: string;
        angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
    }, {
        drawingName: string;
        angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
    }>, "many">;
    createNewDeformationChains: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nodePath: string;
    angleMappings: {
        drawingName: string;
        angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
    }[];
    createNewDeformationChains: boolean;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    nodePath: string;
    angleMappings: {
        drawingName: string;
        angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
    }[];
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    createNewDeformationChains?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    characterName: z.ZodString;
    templateDestinationPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    templateDestinationPath: string;
    characterName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    templateDestinationPath: string;
    characterName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    upperLimbNodePath: z.ZodString;
    lowerLimbNodePath: z.ZodString;
    jointName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    roundJointAlignment: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    colorArtPaletteMatch: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    jointName: string;
    upperLimbNodePath: string;
    lowerLimbNodePath: string;
    roundJointAlignment: boolean;
    colorArtPaletteMatch: boolean;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    upperLimbNodePath: string;
    lowerLimbNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    jointName?: string | undefined;
    roundJointAlignment?: boolean | undefined;
    colorArtPaletteMatch?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    deformedNodePath: z.ZodString;
    accessoryPegPath: z.ZodString;
    accessoryName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    deformedNodePath: string;
    accessoryPegPath: string;
    accessoryName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    deformedNodePath: string;
    accessoryPegPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    accessoryName?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    pegNodePath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    pegNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    pegNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
    nodePath?: string | undefined;
}, {
    projectPath?: string | undefined;
    nodePath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    deformerNodePath: z.ZodString;
    pegNodePath: z.ZodString;
    tolerance: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    pegNodePath: string;
    deformerNodePath: string;
    tolerance: number;
    projectPath?: string | undefined;
}, {
    pegNodePath: string;
    deformerNodePath: string;
    projectPath?: string | undefined;
    tolerance?: number | undefined;
}>>)[];
