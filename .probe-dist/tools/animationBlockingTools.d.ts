import { z } from 'zod';
/**
 * animationBlockingTools.ts — Инструменты для черновой анимации (blocking)
 *
 * Блокинг — первый pass анимации: ключевые позы, тайминг, движение камеры.
 * Цель: агент создаёт основу, художник доводит актёрку и детали.
 *
 * Инструменты:
 *   harmony.blocking.generate_keyframe_plan  — генерация плана ключевых кадров
 *   harmony.blocking.apply_blocking          — применение blocking к сцене
 *   harmony.blocking.generate_camera_moves   — генерация движений камеры
 *   harmony.blocking.create_timing_sheet     — timing sheet (аниматик)
 *   harmony.blocking.apply_camera_plan       — применение camera plan к сцене
 */
export declare const animationBlockingTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    scenePlanPath: z.ZodOptional<z.ZodString>;
    scenePlanInline: z.ZodOptional<z.ZodAny>;
    animationStyle: z.ZodDefault<z.ZodOptional<z.ZodEnum<["snappy", "smooth", "bouncy", "realistic"]>>>;
    holdFrames: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    overlapFrames: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    holdFrames: number;
    animationStyle: "snappy" | "smooth" | "bouncy" | "realistic";
    overlapFrames: number;
    scenePlanPath?: string | undefined;
    scenePlanInline?: any;
}, {
    scenePlanPath?: string | undefined;
    holdFrames?: number | undefined;
    scenePlanInline?: any;
    animationStyle?: "snappy" | "smooth" | "bouncy" | "realistic" | undefined;
    overlapFrames?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    blockingPlanPath: z.ZodOptional<z.ZodString>;
    blockingPlanInline: z.ZodOptional<z.ZodAny>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    projectPath?: string | undefined;
    blockingPlanPath?: string | undefined;
    blockingPlanInline?: any;
}, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    blockingPlanPath?: string | undefined;
    blockingPlanInline?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scenePlanPath: z.ZodOptional<z.ZodString>;
    scenePlanInline: z.ZodOptional<z.ZodAny>;
    cameraPlanInline: z.ZodOptional<z.ZodAny>;
    totalFrames: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    cinematicStyle: z.ZodDefault<z.ZodOptional<z.ZodEnum<["static", "subtle", "dynamic", "cinematic"]>>>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    totalFrames: number;
    cinematicStyle: "static" | "subtle" | "dynamic" | "cinematic";
    scenePlanPath?: string | undefined;
    scenePlanInline?: any;
    cameraPlanInline?: any;
}, {
    fps?: number | undefined;
    scenePlanPath?: string | undefined;
    scenePlanInline?: any;
    totalFrames?: number | undefined;
    cameraPlanInline?: any;
    cinematicStyle?: "static" | "subtle" | "dynamic" | "cinematic" | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scenePlanInline: z.ZodOptional<z.ZodAny>;
    blockingPlanInline: z.ZodOptional<z.ZodAny>;
    lipsyncPlanInline: z.ZodOptional<z.ZodAny>;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    outputFormat: z.ZodDefault<z.ZodOptional<z.ZodEnum<["text", "json", "markdown"]>>>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    outputFormat: "text" | "json" | "markdown";
    lipsyncPlanInline?: any;
    scenePlanInline?: any;
    blockingPlanInline?: any;
}, {
    fps?: number | undefined;
    lipsyncPlanInline?: any;
    scenePlanInline?: any;
    outputFormat?: "text" | "json" | "markdown" | undefined;
    blockingPlanInline?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    cameraPlanInline: z.ZodAny;
    cameraNodeName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    cameraNodeName: string;
    projectPath?: string | undefined;
    cameraPlanInline?: any;
}, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    cameraPlanInline?: any;
    cameraNodeName?: string | undefined;
}>>)[];
