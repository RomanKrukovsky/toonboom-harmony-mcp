import { z } from 'zod';
/**
 * onePrompt.ts — the input envelope for the One-Prompt Pipeline.
 *
 * One free-form creative prompt is unpacked into a structured
 * AnalysisResult that downstream planners consume. Honesty labels follow
 * §12 of ACTOR.MD: every field carries an `origin` of
 * "generated" | "assembled" | "simulated" | "planned" | "placeholder" |
 * "requires_human" | "requires_external_model" | "requires_real_harmony".
 */
export declare const honestyOriginSchema: z.ZodEnum<["generated", "assembled", "simulated", "planned", "placeholder", "requires_human", "requires_external_model", "requires_real_harmony"]>;
export declare const onePromptSchema: z.ZodObject<{
    prompt: z.ZodString;
    targetDurationMinutes: z.ZodOptional<z.ZodNumber>;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
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
    mode: z.ZodOptional<z.ZodEnum<["real", "simulation", "hybrid", "moonshot"]>>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    resolution: {
        width: number;
        height: number;
    };
    prompt: string;
    mode?: "real" | "simulation" | "hybrid" | "moonshot" | undefined;
    targetDurationMinutes?: number | undefined;
}, {
    prompt: string;
    mode?: "real" | "simulation" | "hybrid" | "moonshot" | undefined;
    fps?: number | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    targetDurationMinutes?: number | undefined;
}>;
export declare const analysisResultSchema: z.ZodObject<{
    logLine: z.ZodString;
    genre: z.ZodString;
    tone: z.ZodString;
    setting: z.ZodString;
    targetAudience: z.ZodOptional<z.ZodString>;
    durationMinutes: z.ZodNumber;
    estimatedSceneCount: z.ZodNumber;
    estimatedShotCount: z.ZodNumber;
    candidateCharacters: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        role: z.ZodString;
        oneLine: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        role: string;
        oneLine: string;
    }, {
        name: string;
        role: string;
        oneLine: string;
    }>, "many">;
    themes: z.ZodArray<z.ZodString, "many">;
    origin: z.ZodEnum<["generated", "assembled", "simulated", "planned", "placeholder", "requires_human", "requires_external_model", "requires_real_harmony"]>;
}, "strip", z.ZodTypeAny, {
    origin: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model";
    setting: string;
    logLine: string;
    genre: string;
    tone: string;
    durationMinutes: number;
    estimatedSceneCount: number;
    estimatedShotCount: number;
    candidateCharacters: {
        name: string;
        role: string;
        oneLine: string;
    }[];
    themes: string[];
    targetAudience?: string | undefined;
}, {
    origin: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model";
    setting: string;
    logLine: string;
    genre: string;
    tone: string;
    durationMinutes: number;
    estimatedSceneCount: number;
    estimatedShotCount: number;
    candidateCharacters: {
        name: string;
        role: string;
        oneLine: string;
    }[];
    themes: string[];
    targetAudience?: string | undefined;
}>;
/**
 * Output type: what `onePromptSchema.parse()` returns. `fps` and `resolution`
 * are required here because the schema fills in defaults.
 */
export type OnePromptParsed = z.output<typeof onePromptSchema>;
/**
 * Input type: what a caller may supply. `fps` and `resolution` are optional.
 *
 * Planner adapters take this looser shape because individual tool schemas expose
 * only a subset of these fields (some omit fps/resolution entirely) and every
 * consumer already defaults defensively (`input.fps ?? 24`). Using the output
 * type here would force ~20 call sites to invent values they never received.
 */
export type OnePromptInput = z.input<typeof onePromptSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type HonestyOrigin = z.infer<typeof honestyOriginSchema>;
