/**
 * bridgeTools.ts — восемь тулов спеки поверх файлового моста.
 *
 * Это шаг 1 из ROADMAP.md: сервер соединяется с мостом. До этого файла
 * мост существовал как 2028 строк QtScript, к которым никто не обращался,
 * а сервер управлял Harmony через Control Center и GUI-автоматизацию.
 *
 * ПРИНЦИП: тул НЕ содержит семантики ремесла. Он проверяет вход, зовёт
 * мост и честно передаёт наружу код ошибки. Вся логика изингов, ригов и
 * континуити живёт в harmony/client/*.py и остаётся там.
 *
 * ОБЯЗАТЕЛЬСТВО ПЕРЕД ХУДОЖНИКОМ: любой тул, меняющий сцену, обязан
 * сообщить, что именно он собирается сделать, ДО того как сделает
 * (dryRun по умолчанию там, где правка необратима), и обязан отличать
 * «мост не установлен» от «Harmony повис» — иначе человек за экраном не
 * знает, ждать ему или перезапускать.
 */
import { z } from 'zod';
import { MUTATING_OPS } from '../adapters/bridgeSpool.js';
export declare const bridgeTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    timeoutS: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeoutS?: number | undefined;
}, {
    timeoutS?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    script: z.ZodString;
    args: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    deadlineS: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    script: string;
    args?: Record<string, any> | undefined;
    deadlineS?: number | undefined;
}, {
    script: string;
    args?: Record<string, any> | undefined;
    deadlineS?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    frame: z.ZodNumber;
    width: z.ZodOptional<z.ZodNumber>;
    display: z.ZodOptional<z.ZodString>;
    timeoutS: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    frame: number;
    width?: number | undefined;
    timeoutS?: number | undefined;
    display?: string | undefined;
}, {
    frame: number;
    width?: number | undefined;
    timeoutS?: number | undefined;
    display?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    from: z.ZodNumber;
    to: z.ZodNumber;
    stride: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    timeoutS: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    from: number;
    to: number;
    width?: number | undefined;
    timeoutS?: number | undefined;
    stride?: number | undefined;
}, {
    from: number;
    to: number;
    width?: number | undefined;
    timeoutS?: number | undefined;
    stride?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    column: z.ZodOptional<z.ZodString>;
    columns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    from: z.ZodOptional<z.ZodNumber>;
    to: z.ZodOptional<z.ZodNumber>;
    timeoutS: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    from?: number | undefined;
    to?: number | undefined;
    timeoutS?: number | undefined;
    column?: string | undefined;
    columns?: string[] | undefined;
}, {
    from?: number | undefined;
    to?: number | undefined;
    timeoutS?: number | undefined;
    column?: string | undefined;
    columns?: string[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    column: z.ZodString;
    edits: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    }, "strip", z.ZodTypeAny, {
        value: string | number;
        frame: number;
    }, {
        value: string | number;
        frame: number;
    }>, "many">;
    ripple: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
    timeoutS: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    column: string;
    edits: {
        value: string | number;
        frame: number;
    }[];
    dryRun?: boolean | undefined;
    timeoutS?: number | undefined;
    ripple?: boolean | undefined;
}, {
    column: string;
    edits: {
        value: string | number;
        frame: number;
    }[];
    dryRun?: boolean | undefined;
    timeoutS?: number | undefined;
    ripple?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    column: z.ZodString;
    timeoutS: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    column: string;
    timeoutS?: number | undefined;
}, {
    column: string;
    timeoutS?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    column: z.ZodString;
    keys: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        value: z.ZodNumber;
        handles: z.ZodOptional<z.ZodObject<{
            lx: z.ZodNumber;
            ly: z.ZodNumber;
            rx: z.ZodNumber;
            ry: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            lx: number;
            ly: number;
            rx: number;
            ry: number;
        }, {
            lx: number;
            ly: number;
            rx: number;
            ry: number;
        }>>;
        constSegment: z.ZodOptional<z.ZodBoolean>;
        continuity: z.ZodOptional<z.ZodEnum<["SMOOTH", "CORNER", "STRAIGHT"]>>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        frame: number;
        handles?: {
            lx: number;
            ly: number;
            rx: number;
            ry: number;
        } | undefined;
        constSegment?: boolean | undefined;
        continuity?: "SMOOTH" | "CORNER" | "STRAIGHT" | undefined;
    }, {
        value: number;
        frame: number;
        handles?: {
            lx: number;
            ly: number;
            rx: number;
            ry: number;
        } | undefined;
        constSegment?: boolean | undefined;
        continuity?: "SMOOTH" | "CORNER" | "STRAIGHT" | undefined;
    }>, "many">;
    replace: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
    timeoutS: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    keys: {
        value: number;
        frame: number;
        handles?: {
            lx: number;
            ly: number;
            rx: number;
            ry: number;
        } | undefined;
        constSegment?: boolean | undefined;
        continuity?: "SMOOTH" | "CORNER" | "STRAIGHT" | undefined;
    }[];
    column: string;
    dryRun?: boolean | undefined;
    replace?: boolean | undefined;
    timeoutS?: number | undefined;
}, {
    keys: {
        value: number;
        frame: number;
        handles?: {
            lx: number;
            ly: number;
            rx: number;
            ry: number;
        } | undefined;
        constSegment?: boolean | undefined;
        continuity?: "SMOOTH" | "CORNER" | "STRAIGHT" | undefined;
    }[];
    column: string;
    dryRun?: boolean | undefined;
    replace?: boolean | undefined;
    timeoutS?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    rules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    timeoutS: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeoutS?: number | undefined;
    rules?: string[] | undefined;
}, {
    timeoutS?: number | undefined;
    rules?: string[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    armed: z.ZodBoolean;
    confirm: z.ZodOptional<z.ZodLiteral<"yes-arm-the-bridge">>;
    timeoutS: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    armed: boolean;
    confirm?: "yes-arm-the-bridge" | undefined;
    timeoutS?: number | undefined;
}, {
    armed: boolean;
    confirm?: "yes-arm-the-bridge" | undefined;
    timeoutS?: number | undefined;
}>>)[];
/** Экспорт для тестов: какие операции считаются мутирующими. */
export { MUTATING_OPS };
