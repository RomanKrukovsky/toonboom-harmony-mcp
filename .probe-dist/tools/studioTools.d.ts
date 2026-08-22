import { z } from 'zod';
/**
 * studioTools.ts — Центральный модуль AI Production System
 *
 * Реализует пайплайн:
 *   Промпт → ParsedScene → scene_plan.json → Autopilot → Harmony → Review Package
 *
 * Инструменты:
 *   harmony.studio.from_prompt         — THE core: промпт → все планы
 *   harmony.studio.run_full_pipeline   — end-to-end выполнение
 *   harmony.studio.generate_asset_checklist — список ассетов в markdown
 *   harmony.studio.build_360_rig_plan  — план 360° рига
 *   harmony.studio.export_client_package — пакет для ревью
 */
export declare const studioTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
    production: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    episode: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    sceneName: z.ZodOptional<z.ZodString>;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    durationSeconds: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    resolutionWidth: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    resolutionHeight: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    language: z.ZodDefault<z.ZodOptional<z.ZodEnum<["ru", "en", "auto"]>>>;
    saveToDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    durationSeconds: number;
    resolutionWidth: number;
    resolutionHeight: number;
    production: string;
    episode: string;
    language: "ru" | "en" | "auto";
    prompt: string;
    sceneName?: string | undefined;
    saveToDir?: string | undefined;
}, {
    prompt: string;
    fps?: number | undefined;
    durationSeconds?: number | undefined;
    sceneName?: string | undefined;
    resolutionWidth?: number | undefined;
    resolutionHeight?: number | undefined;
    production?: string | undefined;
    episode?: string | undefined;
    language?: "ru" | "en" | "auto" | undefined;
    saveToDir?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scenePlanPath: z.ZodOptional<z.ZodString>;
    scenePlanInline: z.ZodOptional<z.ZodAny>;
    outputDir: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    skipRender: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    autoFix: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    autoFix: boolean;
    skipRender: boolean;
    scenePlanPath?: string | undefined;
    outputDir?: string | undefined;
    scenePlanInline?: any;
}, {
    dryRun?: boolean | undefined;
    scenePlanPath?: string | undefined;
    outputDir?: string | undefined;
    scenePlanInline?: any;
    autoFix?: boolean | undefined;
    skipRender?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scenePlanPath: z.ZodOptional<z.ZodString>;
    scenePlanInline: z.ZodOptional<z.ZodAny>;
    outputFormat: z.ZodDefault<z.ZodOptional<z.ZodEnum<["json", "markdown", "both"]>>>;
}, "strip", z.ZodTypeAny, {
    outputFormat: "json" | "markdown" | "both";
    scenePlanPath?: string | undefined;
    scenePlanInline?: any;
}, {
    scenePlanPath?: string | undefined;
    scenePlanInline?: any;
    outputFormat?: "json" | "markdown" | "both" | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterName: z.ZodString;
    style: z.ZodDefault<z.ZodOptional<z.ZodEnum<["cutout", "traditional", "hybrid"]>>>;
    views: z.ZodOptional<z.ZodArray<z.ZodEnum<["front", "front_3q_left", "side_left", "back_3q_left", "back", "back_3q_right", "side_right", "front_3q_right"]>, "many">>;
    bodyComplexity: z.ZodDefault<z.ZodOptional<z.ZodEnum<["simple", "standard", "complex"]>>>;
    hasFingersDetail: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    hasFacialDetail: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    characterName: string;
    style: "hybrid" | "cutout" | "traditional";
    bodyComplexity: "standard" | "simple" | "complex";
    hasFingersDetail: boolean;
    hasFacialDetail: boolean;
    views?: ("front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right")[] | undefined;
}, {
    characterName: string;
    style?: "hybrid" | "cutout" | "traditional" | undefined;
    views?: ("front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right")[] | undefined;
    bodyComplexity?: "standard" | "simple" | "complex" | undefined;
    hasFingersDetail?: boolean | undefined;
    hasFacialDetail?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneName: z.ZodString;
    projectPath: z.ZodOptional<z.ZodString>;
    scenePlanPath: z.ZodOptional<z.ZodString>;
    outputDir: z.ZodString;
    packageName: z.ZodOptional<z.ZodString>;
    includeHarmonyProject: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    clientName: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sceneName: string;
    outputDir: string;
    includeHarmonyProject: boolean;
    projectPath?: string | undefined;
    scenePlanPath?: string | undefined;
    notes?: string | undefined;
    packageName?: string | undefined;
    clientName?: string | undefined;
}, {
    sceneName: string;
    outputDir: string;
    projectPath?: string | undefined;
    scenePlanPath?: string | undefined;
    notes?: string | undefined;
    packageName?: string | undefined;
    includeHarmonyProject?: boolean | undefined;
    clientName?: string | undefined;
}>>)[];
