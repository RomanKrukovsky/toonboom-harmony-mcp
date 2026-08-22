/**
 * blenderTools.ts — MCP-тулы вокруг доказанного Blender-конвейера.
 *
 * ПОЧЕМУ ЭТИ ТУЛЫ ОСМЫСЛЕННЫ, А 528 ОСТАЛЬНЫХ ПОКА НЕТ. Ценность
 * MCP-тула равна ценности того, к чему он подключён. Тулы Harmony
 * обёрнуты вокруг приложения, которое на этой машине не запускается
 * (нет лицензии FlexNet). Эти обёрнуты вокруг Blender 5.1.1, где
 * конвейер доказан пятью пробами до пикселей.
 *
 * ЧТО ТУЛ ДОБАВЛЯЕТ К `python3 smoke_full_shot.py`:
 *   - схему: пивот-строкой вместо числа ловится ДО запуска Blender,
 *     а не через минуту рендера;
 *   - проверку набора рисунков ОТДЕЛЬНО от сборки, чтобы художник узнал
 *     про отсутствие альфы до того, как ждал рендер;
 *   - различение бед: нет Blender / плохой набор / упал рендер — это три
 *     разных действия для человека, а не одно слово «ошибка»;
 *   - вызов из любого клиента, а не из одной папки в терминале.
 *
 * ЧЕГО ТУТ НЕТ: семантики ремесла. Изинги, риг, липсинк, проверки
 * рисунков живут в питоне под 343 тестами. Вторая копия правил стала бы
 * второй правдой.
 */
import { z } from 'zod';
export declare const blenderTools: (import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    partsJson: z.ZodString;
}, "strip", z.ZodTypeAny, {
    partsJson: string;
}, {
    partsJson: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    partsJson: z.ZodString;
    outDir: z.ZodString;
    frames: z.ZodNumber;
    fps: z.ZodOptional<z.ZodNumber>;
    resolution: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    /**
     * Каналы анимации: {"arm.rot": [[кадр, значение], ...]}.
     * Имя — "часть.свойство", свойства: rot, x, y, sx, sy.
     */
    channels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">>>;
    /** Липсинк: фонемы в секундах + карта фонема->вариант рта. */
    lipsync: z.ZodOptional<z.ZodObject<{
        phonemes: z.ZodArray<z.ZodObject<{
            sound: z.ZodString;
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            end: number;
            sound: string;
            start: number;
        }, {
            end: number;
            sound: string;
            start: number;
        }>, "many">;
        mouthMap: z.ZodRecord<z.ZodString, z.ZodString>;
        group: z.ZodOptional<z.ZodString>;
        defaultVariant: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        phonemes: {
            end: number;
            sound: string;
            start: number;
        }[];
        mouthMap: Record<string, string>;
        group?: string | undefined;
        defaultVariant?: string | undefined;
    }, {
        phonemes: {
            end: number;
            sound: string;
            start: number;
        }[];
        mouthMap: Record<string, string>;
        group?: string | undefined;
        defaultVariant?: string | undefined;
    }>>;
    audio: z.ZodOptional<z.ZodString>;
    allowSilentLipsync: z.ZodOptional<z.ZodBoolean>;
    cameraOrthoScale: z.ZodOptional<z.ZodNumber>;
    cameraLoc: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    bgColor: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
    render: z.ZodOptional<z.ZodBoolean>;
    encodeMp4: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    frames: number;
    partsJson: string;
    outDir: string;
    audio?: string | undefined;
    dryRun?: boolean | undefined;
    fps?: number | undefined;
    resolution?: [number, number] | undefined;
    channels?: Record<string, [number, number][]> | undefined;
    lipsync?: {
        phonemes: {
            end: number;
            sound: string;
            start: number;
        }[];
        mouthMap: Record<string, string>;
        group?: string | undefined;
        defaultVariant?: string | undefined;
    } | undefined;
    allowSilentLipsync?: boolean | undefined;
    cameraOrthoScale?: number | undefined;
    cameraLoc?: [number, number] | undefined;
    bgColor?: [number, number, number] | undefined;
    render?: boolean | undefined;
    encodeMp4?: boolean | undefined;
}, {
    frames: number;
    partsJson: string;
    outDir: string;
    audio?: string | undefined;
    dryRun?: boolean | undefined;
    fps?: number | undefined;
    resolution?: [number, number] | undefined;
    channels?: Record<string, [number, number][]> | undefined;
    lipsync?: {
        phonemes: {
            end: number;
            sound: string;
            start: number;
        }[];
        mouthMap: Record<string, string>;
        group?: string | undefined;
        defaultVariant?: string | undefined;
    } | undefined;
    allowSilentLipsync?: boolean | undefined;
    cameraOrthoScale?: number | undefined;
    cameraLoc?: [number, number] | undefined;
    bgColor?: [number, number, number] | undefined;
    render?: boolean | undefined;
    encodeMp4?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    only: z.ZodOptional<z.ZodArray<z.ZodEnum<["motion", "timing", "audio", "artwork", "full"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    only?: ("audio" | "full" | "artwork" | "motion" | "timing")[] | undefined;
}, {
    only?: ("audio" | "full" | "artwork" | "motion" | "timing")[] | undefined;
}>>)[];
