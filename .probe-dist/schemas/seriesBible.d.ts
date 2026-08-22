import { z } from 'zod';
/**
 * seriesBible.ts — the high-level "show bible" produced by SeriesPlanner.
 * One series bible spans multiple episodes. All fields are production
 * planning metadata — not final creative.
 */
export declare const recurringCharacterSchema: z.ZodObject<{
    name: z.ZodString;
    role: z.ZodString;
    personality: z.ZodString;
    visualStyle: z.ZodString;
    appearsInEpisodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    role: string;
    personality: string;
    visualStyle: string;
    appearsInEpisodes: string[];
}, {
    name: string;
    role: string;
    personality: string;
    visualStyle: string;
    appearsInEpisodes?: string[] | undefined;
}>;
export declare const seriesBibleSchema: z.ZodObject<{
    title: z.ZodString;
    logLine: z.ZodString;
    genre: z.ZodString;
    tone: z.ZodString;
    visualStyle: z.ZodString;
    targetAudience: z.ZodOptional<z.ZodString>;
    seasonArc: z.ZodOptional<z.ZodString>;
    recurringCharacters: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        role: z.ZodString;
        personality: z.ZodString;
        visualStyle: z.ZodString;
        appearsInEpisodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        role: string;
        personality: string;
        visualStyle: string;
        appearsInEpisodes: string[];
    }, {
        name: string;
        role: string;
        personality: string;
        visualStyle: string;
        appearsInEpisodes?: string[] | undefined;
    }>, "many">>;
    recurringLocations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    episodeTitles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    themes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    origin: z.ZodEnum<["generated", "assembled", "simulated", "planned", "placeholder", "requires_human", "requires_external_model", "requires_real_harmony"]>;
}, "strip", z.ZodTypeAny, {
    origin: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model";
    title: string;
    logLine: string;
    genre: string;
    tone: string;
    themes: string[];
    visualStyle: string;
    recurringCharacters: {
        name: string;
        role: string;
        personality: string;
        visualStyle: string;
        appearsInEpisodes: string[];
    }[];
    recurringLocations: string[];
    episodeTitles: string[];
    targetAudience?: string | undefined;
    seasonArc?: string | undefined;
}, {
    origin: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model";
    title: string;
    logLine: string;
    genre: string;
    tone: string;
    visualStyle: string;
    targetAudience?: string | undefined;
    themes?: string[] | undefined;
    seasonArc?: string | undefined;
    recurringCharacters?: {
        name: string;
        role: string;
        personality: string;
        visualStyle: string;
        appearsInEpisodes?: string[] | undefined;
    }[] | undefined;
    recurringLocations?: string[] | undefined;
    episodeTitles?: string[] | undefined;
}>;
export type SeriesBible = z.infer<typeof seriesBibleSchema>;
export type RecurringCharacter = z.infer<typeof recurringCharacterSchema>;
