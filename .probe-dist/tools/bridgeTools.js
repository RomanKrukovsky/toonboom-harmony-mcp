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
import { bridge, BridgeError, BridgeTimeout, MUTATING_OPS } from '../adapters/bridgeSpool.js';
import { defineTool } from './defineTool.js';
/**
 * Единая обёртка вызова: превращает исключения моста в понятный ответ.
 *
 * Различение ошибок здесь — не украшение. «DISARMED» значит «нажми Arm в
 * Harmony», «CLIENT_TIMEOUT с orphaned» значит «Harmony повис, спасай
 * сцену», «мост не отвечает» значит «пакет не установлен». Слить это в
 * одно «ошибка» — значит оставить художника без действия.
 */
async function viaBridge(op, args, deadlineS) {
    try {
        const r = await bridge().call(op, args, deadlineS);
        return { ok: true, result: r.result, log: r.log };
    }
    catch (e) {
        if (e instanceof BridgeTimeout) {
            return {
                ok: false,
                error: {
                    code: e.code,
                    message: e.message,
                    orphaned: e.orphaned,
                    remedy: e.orphaned.length
                        ? 'Harmony likely hung on the GUI thread (a script loop or a modal dialog). ' +
                            'The bridge cannot interrupt it from inside — check Harmony, dismiss any dialog, ' +
                            'and consider running agents against a separate headless instance (MINES.md #2).'
                        : 'The bridge did not pick up the request. Check that the mcp-bridge package is ' +
                            'installed in Harmony user scripts and that Harmony is running.',
                },
            };
        }
        if (e instanceof BridgeError) {
            const remedy = e.code === 'DISARMED'
                ? 'The bridge starts disarmed on purpose. Arm it from Harmony: Windows > "MCP Bridge: Arm / Disarm".'
                : e.code === 'NO_TOKEN'
                    ? 'Token mismatch. Delete <spool>/.token and restart both sides.'
                    : undefined;
            return { ok: false, error: { code: e.code, message: e.message, log: e.log, remedy } };
        }
        return { ok: false, error: { code: 'INTERNAL', message: String(e?.message ?? e) } };
    }
}
export const bridgeTools = [
    defineTool({
        name: 'harmony.bridge.status',
        description: 'Состояние файлового моста в Harmony: установлен ли, отвечает ли, вооружён ли. ' +
            'Безопасно, ничего не меняет. Вызывать первым — все остальные тулы моста зависят от этого.',
        inputSchema: z.object({
            timeoutS: z.number().positive().max(30).optional(),
        }),
        handler: async (args) => {
            const b = bridge();
            const probe = await b.probe(args.timeoutS ?? 2.0);
            if (!probe.up) {
                return {
                    up: false,
                    spool: b.spool,
                    detail: probe.detail,
                    orphanedWork: b.orphanedWork(),
                    remedy: 'Install harmony/packages/mcp-bridge/ into Harmony user scripts ' +
                        '(specialFolders.userScripts + "/packages/mcp-bridge"), then restart Harmony.',
                };
            }
            const st = await viaBridge('status', {}, args.timeoutS ?? 3.0);
            return {
                up: true,
                spool: b.spool,
                armed: probe.armed,
                status: st.ok ? st.result : undefined,
                error: st.ok ? undefined : st.error,
            };
        },
    }),
    defineTool({
        name: 'harmony.bridge.capabilities',
        description: 'Карта API конкретной сборки Harmony: результаты ПРОБ отдельных функций. ' +
            'Ветвиться надо по этим пробам, а не по номеру версии — сигнатуры render.* и ' +
            'ScriptManager.* меняются между релизами (MINES.md #11).',
        inputSchema: z.object({ timeoutS: z.number().positive().max(60).optional() }),
        handler: async (args) => viaBridge('capabilities', {}, args.timeoutS ?? 10.0),
    }),
    defineTool({
        name: 'harmony.bridge.eval',
        description: 'Выполнить QtScript внутри работающего Harmony и получить JSON. ' +
            'ОПАСНО: это удалённое исполнение кода с правами пользователя. Требует вооружённого моста. ' +
            'Каждый вызов обёрнут в атомарный undo на стороне моста.',
        inputSchema: z.object({
            script: z.string().min(1),
            args: z.record(z.any()).optional(),
            deadlineS: z.number().positive().max(600).optional(),
        }),
        handler: async (a) => viaBridge('eval', { script: a.script, args: a.args ?? {} }, a.deadlineS ?? 30.0),
    }),
    defineTool({
        name: 'harmony.bridge.render_frame',
        description: 'Отрендерить один кадр и вернуть путь к PNG. Это «глаза» петли обратной связи: ' +
            'без рендера любой тул выше слеп.',
        inputSchema: z.object({
            frame: z.number().int().min(1),
            width: z.number().int().min(64).max(4096).optional(),
            display: z.string().optional(),
            timeoutS: z.number().positive().max(1800).optional(),
        }),
        handler: async (a) => viaBridge('render_frame', { frame: a.frame, width: a.width ?? 960, display: a.display,
            timeout_ms: Math.round((a.timeoutS ?? 180) * 1000) }, a.timeoutS ?? 180),
    }),
    defineTool({
        name: 'harmony.bridge.render_range',
        description: 'Отрендерить диапазон кадров с шагом — контактный лист. Нужен, чтобы видеть ДВИЖЕНИЕ, ' +
            'а не отдельный кадр: спейсинг и тайминг по одному кадру не проверяются.',
        inputSchema: z.object({
            from: z.number().int().min(1),
            to: z.number().int().min(1),
            stride: z.number().int().min(1).max(100).optional(),
            width: z.number().int().min(64).max(2048).optional(),
            timeoutS: z.number().positive().max(3600).optional(),
        }),
        handler: async (a) => {
            if (a.to < a.from) {
                return { ok: false, error: { code: 'BAD_RANGE', message: `to (${a.to}) < from (${a.from})` } };
            }
            return viaBridge('render_range', { from: a.from, to: a.to, stride: a.stride ?? 1, width: a.width ?? 480,
                timeout_ms: Math.round((a.timeoutS ?? 600) * 1000) }, a.timeoutS ?? 600);
        },
    }),
    defineTool({
        name: 'harmony.bridge.xsheet_get',
        description: 'Прочитать колонку экспозиции как таблицу: тайминг становится данными, а не мышкой по кадрам.',
        inputSchema: z.object({
            column: z.string().optional(),
            columns: z.array(z.string()).optional(),
            from: z.number().int().optional(),
            to: z.number().int().optional(),
            timeoutS: z.number().positive().max(120).optional(),
        }),
        handler: async (a) => viaBridge('xsheet_get', { column: a.column, columns: a.columns, from: a.from, to: a.to }, a.timeoutS ?? 30),
    }),
    defineTool({
        name: 'harmony.bridge.xsheet_set',
        description: 'Записать ячейки экспозиции. МЕНЯЕТ СЦЕНУ. По умолчанию dryRun=true: ' +
            'сначала показывает, что собирается сделать. Требует вооружённого моста.',
        inputSchema: z.object({
            column: z.string().min(1),
            edits: z.array(z.object({
                frame: z.number().int().min(1),
                value: z.union([z.string(), z.number()]),
            })).min(1),
            ripple: z.boolean().optional(),
            dryRun: z.boolean().optional(),
            timeoutS: z.number().positive().max(300).optional(),
        }),
        handler: async (a) => {
            const dry = a.dryRun !== false;
            if (dry) {
                // Показать намерение ДО правки. Молча менять чужую сцену нельзя:
                // undo есть, но доверие один раз.
                return {
                    ok: true,
                    dryRun: true,
                    intent: {
                        op: 'xsheet_set', column: a.column,
                        cells: a.edits.length,
                        frames: [Math.min(...a.edits.map((e) => e.frame)),
                            Math.max(...a.edits.map((e) => e.frame))],
                        ripple: !!a.ripple,
                    },
                    note: 'Nothing was written. Call again with dryRun:false to apply.',
                };
            }
            return viaBridge('xsheet_set', { column: a.column, edits: a.edits, ripple: !!a.ripple }, a.timeoutS ?? 60);
        },
    }),
    defineTool({
        name: 'harmony.bridge.curve_get',
        description: 'Прочитать функциональную кривую как безье-точки: изинг становится математикой, ' +
            'а не перетаскиванием манипуляторов.',
        inputSchema: z.object({
            column: z.string().min(1),
            timeoutS: z.number().positive().max(120).optional(),
        }),
        handler: async (a) => viaBridge('curve_get', { column: a.column }, a.timeoutS ?? 30),
    }),
    defineTool({
        name: 'harmony.bridge.curve_set',
        description: 'Записать функциональную кривую. МЕНЯЕТ СЦЕНУ, dryRun=true по умолчанию. ' +
            'Плотные ключи движка несут изинг в ЗНАЧЕНИЯХ — не «улучшать» их безье на стороне Harmony.',
        inputSchema: z.object({
            column: z.string().min(1),
            keys: z.array(z.object({
                frame: z.number(),
                value: z.number(),
                handles: z.object({
                    lx: z.number(), ly: z.number(), rx: z.number(), ry: z.number(),
                }).optional(),
                constSegment: z.boolean().optional(),
                continuity: z.enum(['SMOOTH', 'CORNER', 'STRAIGHT']).optional(),
            })).min(1),
            replace: z.boolean().optional(),
            dryRun: z.boolean().optional(),
            timeoutS: z.number().positive().max(300).optional(),
        }),
        handler: async (a) => {
            const dry = a.dryRun !== false;
            const frames = a.keys.map((k) => k.frame);
            if (dry) {
                return {
                    ok: true,
                    dryRun: true,
                    intent: {
                        op: 'curve_set', column: a.column, keys: a.keys.length,
                        frames: [Math.min(...frames), Math.max(...frames)],
                        replace: a.replace !== false,
                    },
                    note: 'Nothing was written. Call again with dryRun:false to apply.',
                };
            }
            return viaBridge('curve_set', { column: a.column, keys: a.keys, replace: a.replace !== false }, a.timeoutS ?? 60);
        },
    }),
    defineTool({
        name: 'harmony.bridge.scene_lint',
        description: 'Статический анализ сцены: висячие ноды, мёртвые холды, плоские дуги, ' +
            'битые Colour-Override, неэкспонированные рисунки. Только чтение. ' +
            'Машиночитаемый вывод — вешается на pre-commit, когда .xstage лежит в git.',
        inputSchema: z.object({
            rules: z.array(z.string()).optional(),
            timeoutS: z.number().positive().max(600).optional(),
        }),
        handler: async (a) => viaBridge('scene_lint', { rules: a.rules }, a.timeoutS ?? 120),
    }),
    defineTool({
        name: 'harmony.bridge.arm',
        description: 'Вооружить или разоружить мост. Разоружённый мост обслуживает только ping/status/' +
            'capabilities — это единственный барьер между localhost и произвольным исполнением ' +
            'кода в чужой сцене. Требует подтверждения.',
        inputSchema: z.object({
            armed: z.boolean(),
            confirm: z.literal('yes-arm-the-bridge').optional(),
            timeoutS: z.number().positive().max(60).optional(),
        }),
        handler: async (a) => {
            if (a.armed && a.confirm !== 'yes-arm-the-bridge') {
                return {
                    ok: false,
                    error: {
                        code: 'CONFIRMATION_REQUIRED',
                        message: 'Arming the bridge enables arbitrary code execution inside Harmony with the ' +
                            'user\'s privileges. Pass confirm:"yes-arm-the-bridge" to proceed.',
                        remedy: 'Prefer arming from inside Harmony (Windows > "MCP Bridge: Arm / Disarm") so a ' +
                            'human is present, and never arm the instance an artist is working in (MINES.md #10).',
                    },
                };
            }
            return viaBridge('arm', { armed: a.armed }, a.timeoutS ?? 10);
        },
    }),
];
/** Экспорт для тестов: какие операции считаются мутирующими. */
export { MUTATING_OPS };
