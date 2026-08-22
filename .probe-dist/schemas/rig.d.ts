import { z } from 'zod';
export declare const createCharacterStructureSchema: z.ZodObject<{
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
}>;
export declare const importLayeredCharacterSchema: z.ZodObject<{
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
}>;
export declare const createCutoutHierarchySchema: z.ZodObject<{
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
}>;
export declare const createPegsSchema: z.ZodObject<{
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
}>;
export declare const zeroOutPegSchema: z.ZodObject<{
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
}>;
export declare const createDeformersSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    type: z.ZodEnum<["Curve", "Bone", "Envelope"]>;
    kinematicIsolation: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "Envelope" | "Curve" | "Bone";
    nodePath: string;
    kinematicIsolation: boolean;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    type: "Envelope" | "Curve" | "Bone";
    nodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    kinematicIsolation?: boolean | undefined;
}>;
export declare const createMasterControllerPlanSchema: z.ZodObject<{
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
}>;
export declare const createHeadTurnPlanSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    characterName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterName: string;
    projectPath?: string | undefined;
}, {
    characterName: string;
    projectPath?: string | undefined;
}>;
export declare const createBodyTurnPlanSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    characterName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterName: string;
    projectPath?: string | undefined;
}, {
    characterName: string;
    projectPath?: string | undefined;
}>;
export declare const createMouthChartSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    mouthNodePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    mouthNodePath: string;
    projectPath?: string | undefined;
}, {
    mouthNodePath: string;
    projectPath?: string | undefined;
}>;
export declare const createEyeSystemSchema: z.ZodObject<{
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
}>;
export declare const createConstraintSchema: z.ZodObject<{
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
}>;
export declare const createBrowSystemSchema: z.ZodObject<{
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
}>;
export declare const createHandSwapsSchema: z.ZodObject<{
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
}>;
export declare const createPoseLibrarySchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    libraryPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    libraryPath: string;
    projectPath?: string | undefined;
}, {
    libraryPath: string;
    projectPath?: string | undefined;
}>;
export declare const applyPoseSchema: z.ZodObject<{
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
}>;
export declare const validateRigSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>;
export declare const validateDeformersSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>;
export declare const validateNamingSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>;
export declare const exportTemplateSchema: z.ZodObject<{
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
}>;
export declare const createTestAnimationSchema: z.ZodObject<{
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
}>;
export declare const analyzeCharacterTurnaroundSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    characterName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterName: string;
    projectPath?: string | undefined;
}, {
    characterName: string;
    projectPath?: string | undefined;
}>;
export declare const createHead360StructureSchema: z.ZodObject<{
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
}>;
export declare const createBody360StructureSchema: z.ZodObject<{
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
}>;
export declare const mapDrawingsToAnglesSchema: z.ZodObject<{
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
}>;
export declare const createAngleControlsSchema: z.ZodObject<{
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
}>;
export declare const createFaceControlsSchema: z.ZodObject<{
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
}>;
export declare const createSmoothTurnPlanSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    characterName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterName: string;
    projectPath?: string | undefined;
}, {
    characterName: string;
    projectPath?: string | undefined;
}>;
export declare const validateAngleCoverageSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    characterName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterName: string;
    projectPath?: string | undefined;
}, {
    characterName: string;
    projectPath?: string | undefined;
}>;
export declare const createTurnTestSchema: z.ZodObject<{
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
}>;
export declare const export360RigTemplateSchema: z.ZodObject<{
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
}>;
export declare const createAutopatchJointSchema: z.ZodObject<{
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
}>;
export declare const attachKinematicAccessorySchema: z.ZodObject<{
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
}>;
