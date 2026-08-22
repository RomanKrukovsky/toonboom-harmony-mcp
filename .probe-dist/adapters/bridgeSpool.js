/**
 * bridgeSpool.ts — TypeScript-сторона файлового моста в Harmony.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ. Сервер (src/) и мост (harmony/packages/
 * mcp-bridge/) были написаны, но НИКОГДА НЕ СОЕДИНЕНЫ: сервер управлял
 * Harmony через Control Center, CLI и GUI-автоматизацию, то есть другими
 * путями. Восемь тулов из спеки существовали как код, но не как
 * инструмент.
 *
 * ПРОТОКОЛ (симметричен bridge.js и harmony/client/bridge_client.py):
 *   пишем   <spool>/req-<id>.json   атомарно (.part -> rename)
 *   мост    клеймит work-<id>.json  (rename, защита от двойного забора)
 *   читаем  <spool>/res-<id>.json   и удаляем
 *
 * Протокол проверен против поддельного хоста (harmony/client/
 * fake_bridge.py, 19 тестов). Здесь переносятся ОБА дефекта, найденных
 * в питоновском клиенте, — они архитектурные, а не языковые:
 *
 *   1. Надбавка к дедлайну обязана быть ДОЛЕЙ дедлайна, а не константой.
 *      Константа +5с превращала запрошенные 0.4с в 5.4с ожидания —
 *      для человека за экраном это «программа повисла».
 *
 *   2. При таймауте удаляется ТОЛЬКО req-файл. work-файл остаётся: он
 *      означает «мост забрал работу и не ответил» и является
 *      единственным следом зависания Harmony на GUI-потоке. Стирая его,
 *      клиент делает мину неотличимой от выдуманного таймаута.
 */
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
export const PROTOCOL_V = 1;
/** Операции, меняющие сцену. Разоружённый мост обязан их отклонять. */
export const MUTATING_OPS = new Set([
    'eval', 'save', 'xsheet_set', 'curve_set', 'node_edit',
    'substitution_set', 'palette_set',
]);
export class BridgeError extends Error {
    code;
    log;
    stack_;
    constructor(code, message, log = [], stack_) {
        super(`${code}: ${message}`);
        this.code = code;
        this.log = log;
        this.stack_ = stack_;
        this.name = 'BridgeError';
    }
}
export class BridgeTimeout extends BridgeError {
    orphaned;
    constructor(op, deadlineS, orphaned) {
        // Формулировка намеренная: это НАШ таймаут, а не смерть Harmony.
        // Скрипт на GUI-потоке невытесним и может крутиться вечно.
        super('CLIENT_TIMEOUT', `stopped waiting for "${op}" after ${deadlineS}s; ` +
            (orphaned.length
                ? `bridge claimed the request but did not answer (${orphaned.length} orphaned) — ` +
                    'Harmony may be hung on the GUI thread or showing a modal dialog'
                : 'the bridge never picked the request up — it may not be installed or armed'));
        this.orphaned = orphaned;
        this.name = 'BridgeTimeout';
    }
}
export function defaultSpool() {
    // Совпадает с bridge.js: specialFolders.temp + "/mcp-harmony".
    return process.env.HARMONY_MCP_SPOOL || path.join(os.tmpdir(), 'mcp-harmony');
}
export class BridgeSpool {
    spool;
    pollMs;
    token;
    constructor(opts = {}) {
        this.spool = opts.spool ?? defaultSpool();
        this.pollMs = opts.pollMs ?? 20;
        fs.mkdirSync(path.join(this.spool, 'img'), { recursive: true });
        this.token = this.ensureToken();
    }
    ensureToken() {
        const p = path.join(this.spool, '.token');
        if (fs.existsSync(p))
            return fs.readFileSync(p, 'utf8').trim();
        const tok = crypto.randomBytes(32).toString('base64url');
        // 0600: мост читает, больше никто. Токен — гигиена, не изоляция:
        // любой процесс с правами пользователя дочитается (MINES.md #10).
        fs.writeFileSync(p, tok, { encoding: 'utf8', mode: 0o600 });
        return tok;
    }
    writeAtomic(file, text) {
        const tmp = `${file}.part`;
        fs.writeFileSync(tmp, text, 'utf8');
        fs.renameSync(tmp, file); // атомарно в пределах одной ФС
    }
    /** Заявки, забранные мостом без ответа. Отличает «занят» от «мёртв». */
    orphanedWork() {
        try {
            return fs.readdirSync(this.spool).filter((f) => f.startsWith('work-'));
        }
        catch {
            return [];
        }
    }
    /** Установлен ли мост и отвечает ли он. Дешёвая проверка ДО работы. */
    async probe(timeoutS = 2.0) {
        if (!fs.existsSync(this.spool)) {
            return { up: false, detail: `spool ${this.spool} does not exist` };
        }
        try {
            const r = await this.call('ping', {}, timeoutS);
            return { up: true, detail: 'bridge responded to ping', armed: r.result.armed };
        }
        catch (e) {
            return { up: false, detail: e.message };
        }
    }
    async call(op, args = {}, deadlineS = 30.0, graceS) {
        if (deadlineS <= 0)
            throw new Error('deadlineS must be positive');
        // Надбавка — доля дедлайна с потолком. См. дефект #1 в заголовке.
        const grace = graceS ?? Math.min(2.0, Math.max(0.05, deadlineS * 0.25));
        const rid = crypto.randomBytes(8).toString('hex');
        const req = {
            v: PROTOCOL_V,
            id: rid,
            token: this.token,
            op,
            args,
            deadline_ms: Math.round(deadlineS * 1000),
        };
        this.writeAtomic(path.join(this.spool, `req-${rid}.json`), JSON.stringify(req));
        const resPath = path.join(this.spool, `res-${rid}.json`);
        const hardDeadline = Date.now() + (deadlineS + grace) * 1000;
        while (Date.now() < hardDeadline) {
            if (fs.existsSync(resPath)) {
                const raw = fs.readFileSync(resPath, 'utf8');
                fs.rmSync(resPath, { force: true });
                const env = JSON.parse(raw);
                if (!env.ok) {
                    const err = env.error ?? {};
                    throw new BridgeError(err.code ?? 'UNKNOWN', err.message ?? '', env.log ?? [], err.stack);
                }
                return { result: env.result, log: env.log ?? [], harmony: env.harmony ?? {} };
            }
            await new Promise((r) => setTimeout(r, this.pollMs));
        }
        // Снимаем с очереди только req: иначе мост исполнит правку через час,
        // когда клиента давно нет. work НЕ трогаем — см. дефект #2.
        fs.rmSync(path.join(this.spool, `req-${rid}.json`), { force: true });
        throw new BridgeTimeout(op, deadlineS, this.orphanedWork());
    }
    // -- удобные обёртки -----------------------------------------------------
    ping(timeoutS = 3.0) {
        return this.call('ping', {}, timeoutS);
    }
    capabilities(timeoutS = 10.0) {
        return this.call('capabilities', {}, timeoutS);
    }
    status(timeoutS = 3.0) {
        return this.call('status', {}, timeoutS);
    }
}
let shared = null;
/** Общий экземпляр: спул один на машину, плодить клиентов незачем. */
export function bridge() {
    if (!shared)
        shared = new BridgeSpool();
    return shared;
}
