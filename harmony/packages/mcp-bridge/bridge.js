/* ============================================================================
 * bridge.js — MCP bridge внутри Toon Boom Harmony
 * ----------------------------------------------------------------------------
 * Транспорт по умолчанию: файловый спул + QTimer-поллинг.
 * Причина см. MINES.md #1 — экспозиция QTcpServer в QtScript Harmony
 * не гарантирована между версиями, а файловый спул работает везде,
 * включая -batch, и переживает падение любой из сторон.
 *
 * Контракт:
 *   MCP-сервер  пишет  <spool>/req-<id>.json   (атомарно: .part -> rename)
 *   bridge      клеймит <spool>/work-<id>.json (rename, защита от двойного забора)
 *   bridge      пишет   <spool>/res-<id>.json  (атомарно)
 *   MCP-сервер  читает и удаляет res-*.json
 *
 * ES3-совместимый код. Никаких let/const/=>/`...`/forEach.
 * ==========================================================================*/

if (typeof MCPB === "undefined") { MCPB = {}; }   /* глобал: переживает GC (MINES.md #3) */

(function () {
"use strict";

/* --------------------------------------------------------------------------
 * 0. Конфиг и состояние
 * ------------------------------------------------------------------------*/

var DEFAULTS = {
    spool:            null,      /* задаётся в install(); по умолчанию specialFolders.temp + "/mcp-harmony" */
    poll_ms:          40,
    max_response_kb:  4096,
    max_depth:        12,
    max_array:        20000,
    render_timeout_ms: 180000,
    audit:            true
};

MCPB.cfg        = MCPB.cfg        || {};
MCPB.armed      = (typeof MCPB.armed === "boolean") ? MCPB.armed : false;  /* по умолчанию ВЫКЛ */
MCPB.inHandler  = false;   /* защита от реентрантности (MINES.md #4) */
MCPB.undoDepth  = 0;
MCPB.job        = null;    /* активная асинхронная джоба (рендер) */
MCPB.timer      = null;
MCPB.token      = null;
MCPB.signalsBound = false;
MCPB.stats      = { served: 0, failed: 0, started: new Date().getTime() };

var DEFERRED = { __mcpb_deferred: true };   /* сентинел: ответ будет позже */

/* --------------------------------------------------------------------------
 * 1. Шимы. QtScript-движок Harmony местами ES3 (MINES.md #7)
 * ------------------------------------------------------------------------*/

function has(o, k) { return o && (o.hasOwnProperty ? o.hasOwnProperty(k) : (typeof o[k] !== "undefined")); }

function isArray(v) {
    if (typeof Array.isArray === "function") { return Array.isArray(v); }
    return Object.prototype.toString.call(v) === "[object Array]";
}

function keysOf(o) {
    var r = [], k;
    for (k in o) { if (!o.hasOwnProperty || o.hasOwnProperty(k)) { r.push(k); } }
    return r;
}

/* Экранируем ВСЁ, что вне ASCII: кириллические имена нод/сцен перестают
 * зависеть от того, какой кодек подсунул QTextStream (MINES.md #7). */
function esc(s) {
    var out = "", i, c, code, h;
    s = String(s);
    for (i = 0; i < s.length; i++) {
        c = s.charAt(i);
        code = s.charCodeAt(i);
        if (c === '"')       { out += '\\"'; }
        else if (c === "\\") { out += "\\\\"; }
        else if (code < 0x20 || code > 0x7e) {
            h = code.toString(16);
            while (h.length < 4) { h = "0" + h; }
            out += "\\u" + h;
        }
        else { out += c; }
    }
    return '"' + out + '"';
}

function enc(v, depth) {
    depth = depth || 0;
    if (depth > MCPB.cfg.max_depth) { return '"[max-depth]"'; }
    var t = typeof v, i, a, k, ks, p;
    if (v === null || t === "undefined")      { return "null"; }
    if (t === "boolean")                      { return v ? "true" : "false"; }
    if (t === "number")                       { return isFinite(v) ? String(v) : "null"; }
    if (t === "string")                       { return esc(v); }
    if (t === "function")                     { return "null"; }
    if (isArray(v)) {
        a = [];
        for (i = 0; i < v.length && i < MCPB.cfg.max_array; i++) { a.push(enc(v[i], depth + 1)); }
        if (v.length > MCPB.cfg.max_array) { a.push('"[truncated ' + (v.length - MCPB.cfg.max_array) + ']"'); }
        return "[" + a.join(",") + "]";
    }
    /* QObject наружу не отдаём — только строковое представление */
    if (typeof v.objectName !== "undefined" && typeof v.destroyed !== "undefined") {
        return esc("[QObject " + String(v.objectName) + "]");
    }
    p = []; ks = keysOf(v);
    for (i = 0; i < ks.length; i++) {
        k = ks[i];
        if (typeof v[k] === "function") { continue; }
        p.push(esc(k) + ":" + enc(v[k], depth + 1));
    }
    return "{" + p.join(",") + "}";
}

function dec(s) {
    if (typeof JSON !== "undefined" && JSON.parse) { return JSON.parse(s); }
    var probe = String(s)
        .replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
        .replace(/(?:^|:|,)(?:\s*\[)+/g, "");
    if (!(/^[\],:{}\s]*$/).test(probe)) { throw new Error("malformed JSON payload"); }
    return eval("(" + s + ")");
}

/* --------------------------------------------------------------------------
 * 2. Логирование и аудит
 * ------------------------------------------------------------------------*/

function sysLog(msg) { try { MessageLog.trace("[mcpb] " + msg); } catch (e) {} }

function audit(line) {
    if (!MCPB.cfg.audit) { return; }
    try {
        var f = new QFile(MCPB.cfg.spool + "/audit.log");
        if (f.open(QIODevice.WriteOnly | QIODevice.Append)) {
            var ts = new QTextStream(f);
            try { ts.setCodec("UTF-8"); } catch (e) {}
            ts.writeString((new Date()).toString() + "  " + line + "\n");
            f.close();
        }
    } catch (e) {}
}

/* --------------------------------------------------------------------------
 * 3. Файловые операции
 * ------------------------------------------------------------------------*/

function readFile(path) {
    var f = new QFile(path);
    if (!f.open(QIODevice.ReadOnly)) { return null; }
    var ts = new QTextStream(f);
    try { ts.setCodec("UTF-8"); } catch (e) {}
    var s = ts.readAll();
    f.close();
    return s;
}

/* Атомарная запись: читатель никогда не видит полуфайл */
function writeAtomic(path, text) {
    var tmp = path + ".part";
    var f = new QFile(tmp);
    if (!f.open(QIODevice.WriteOnly | QIODevice.Truncate)) {
        throw new Error("cannot open for write: " + tmp);
    }
    var ts = new QTextStream(f);
    try { ts.setCodec("UTF-8"); } catch (e) {}
    ts.writeString(text);
    f.close();
    var dst = new QFile(path);
    if (dst.exists()) { dst.remove(); }
    var src = new QFile(tmp);
    if (!src.rename(path)) { throw new Error("rename failed: " + tmp + " -> " + path); }
}

function removeFile(path) { try { var f = new QFile(path); if (f.exists()) { f.remove(); } } catch (e) {} }

function ensureDir(path) {
    var d = new QDir(path);
    if (!d.exists()) { d.mkpath(path); }
}

function listByPattern(dir, pattern) {
    var d = new QDir(dir);
    var filters = new Array(); filters.push(pattern);
    return d.entryList(filters, QDir.Files, QDir.Name);
}

/* --------------------------------------------------------------------------
 * 4. Undo-обёртка (MINES.md #5)
 *    Незакрытый аккумулятор ломает undo-стек на всю сессию — поэтому
 *    cancel в catch обязателен, а вложенность запрещена.
 * ------------------------------------------------------------------------*/

function withUndo(label, fn) {
    if (MCPB.undoDepth > 0) { return fn(); }   /* не вкладываем */
    var opened = false, r;
    try {
        scene.beginUndoRedoAccum(label);
        opened = true;
        MCPB.undoDepth++;
        r = fn();
        MCPB.undoDepth--;
        scene.endUndoRedoAccum();
        opened = false;
        return r;
    } catch (e) {
        if (opened) {
            MCPB.undoDepth--;
            try { scene.cancelUndoRedoAccum(); }
            catch (e2) { sysLog("cancelUndoRedoAccum failed: " + e2); }
        }
        throw e;
    }
}

/* --------------------------------------------------------------------------
 * 5. Песочница: шэдоуинг MessageLog + кооперативный бюджет
 *
 *    Глобальный MessageLog перехватить нельзя. Но код исполняется внутри
 *    функции, у которой MessageLog — ПАРАМЕТР: он затеняет глобал в области
 *    видимости всего пользовательского скрипта (MINES.md #6).
 * ------------------------------------------------------------------------*/

function makeLogShadow(sink) {
    function push(level) {
        return function (m) {
            var s = String(m);
            if (sink.length < 2000) { sink.push(level + ": " + s); }
            try { MessageLog.trace("[mcpb/script] " + s); } catch (e) {}
        };
    }
    return { trace: push("trace"), debug: push("debug"), error: push("error"), info: push("info") };
}

function makeBudget(deadlineMs) {
    return function () {
        var left = deadlineMs - (new Date()).getTime();
        if (left <= 0) { throw new Error("BUDGET_EXCEEDED"); }
        return left;
    };
}

/* Приводим результат к JSON-safe виду.
 *
 * Было: dec(enc(v)) — на сборках без JSON.parse это eval собственного вывода
 * на каждый мутирующий вызов: двойная стоимость и лишняя поверхность там, где
 * данные уже прошли через наш же кодек. Обход дерева даёт то же самое дешевле
 * и не зависит от наличия JSON.
 */
function sanitize(v, depth) {
    depth = depth || 0;
    if (depth > MCPB.cfg.max_depth) { return "[max-depth]"; }
    var t = typeof v, i, out, ks, k;
    if (v === null || t === "undefined" || t === "function") { return null; }
    if (t === "boolean" || t === "string") { return v; }
    if (t === "number") { return isFinite(v) ? v : null; }
    if (isArray(v)) {
        out = [];
        for (i = 0; i < v.length && i < MCPB.cfg.max_array; i++) { out.push(sanitize(v[i], depth + 1)); }
        return out;
    }
    if (typeof v.objectName !== "undefined" && typeof v.destroyed !== "undefined") {
        return "[QObject " + String(v.objectName) + "]";
    }
    out = {}; ks = keysOf(v);
    for (i = 0; i < ks.length; i++) {
        k = ks[i];
        if (typeof v[k] === "function") { continue; }
        out[k] = sanitize(v[k], depth + 1);
    }
    return out;
}

/* --------------------------------------------------------------------------
 * 6. Реестр операций
 * ------------------------------------------------------------------------*/

var OPS = {};

OPS.ping = { mutates: false, fn: function () {
    return { pong: true, armed: MCPB.armed, uptime_ms: (new Date()).getTime() - MCPB.stats.started };
}};

OPS.capabilities = { mutates: false, fn: function () {
    var caps = { version: null, scene: null, batch: null, ops: keysOf(OPS), probes: {} };
    try { caps.version = about.getVersionInfoStr(); } catch (e) {}
    try { caps.scene = scene.currentScene(); } catch (e) {}
    /* Проб-функции, а не предположения: набор API плавает между версиями (MINES.md #11).
     * Здесь было column.getColumnListOfType — функции с таким именем в
     * документированном API нет, и проба всегда возвращала false. Заменено на
     * то, на чём реально стоит обход колонок (MINES.md #15). */
    var probes = ["column.numberOf", "column.getName", "column.type", "column.getEntry",
                  "func.numberOfPoints", "func.setBezierPoint", "render.renderScene",
                  "PaletteObjectManager.getScenePaletteList", "Drawing.name", "element.numberOfDrawings"];
    var i, parts, root, ok;
    for (i = 0; i < probes.length; i++) {
        parts = probes[i].split(".");
        ok = false;
        try { root = eval(parts[0]); ok = (root && typeof root[parts[1]] === "function"); } catch (e) { ok = false; }
        caps.probes[probes[i]] = ok;
    }
    try { caps.batch = !(typeof Action !== "undefined" && Action.perform); } catch (e) { caps.batch = null; }
    return caps;
}};

OPS.status = { mutates: false, fn: function () {
    var s = { armed: MCPB.armed, busy: !!MCPB.job, served: MCPB.stats.served, failed: MCPB.stats.failed };
    try { s.dirty = scene.isDirty ? scene.isDirty() : null; } catch (e) { s.dirty = null; }
    try { s.frame = frame.current(); s.frameCount = frame.numberOf(); } catch (e) {}
    return s;
}};

/* Универсальный исполнитель — фундамент для всех остальных тулов */
OPS.eval = { mutates: true, fn: function (args, ctx) {
    var src = String(args.script || "");
    if (!src.length) { throw new Error("empty script"); }
    var factory;
    try {
        /* Именно так, а не new Function: нам нужно, чтобы MessageLog
           был локальным параметром и затенял глобал. */
        factory = eval("(function(args, MessageLog, log, budget){\n" + src + "\n/**/})");
    } catch (e) {
        var se = new Error("SyntaxError: " + e);
        se.code = "SCRIPT_SYNTAX";
        throw se;
    }
    var out = factory(args.args || {}, ctx.logShadow, ctx.logShadow.trace, ctx.budget);
    return sanitize(out);
}};

OPS.save = { mutates: false, fn: function (args) {
    /* Мутации живут в памяти, пока их не сохранили. Всё git-ориентированное
       (.xstage в репозитории) требует явных точек коммита (MINES.md #13). */
    var all = (args && args.all !== false);
    if (all) { scene.saveAll(); } else { scene.save(); }
    return { saved: true, scene: scene.currentScene(), path: scene.currentProjectPath() };
}};

/* Рендер — асинхронный. renderScene() не блокирует: результат приходит
   сигналами frameReady/renderFinished (MINES.md #9). */
OPS.render_frame = { mutates: false, fn: function (args, ctx) {
    if (MCPB.job) { var b = new Error("render already running"); b.code = "BUSY"; throw b; }

    var f       = parseInt(args.frame, 10);
    var width   = parseInt(args.width || 960, 10);
    var display = args.display || defaultDisplayNode();
    if (!display) { throw new Error("no display node; pass args.display"); }

    ensureDir(MCPB.cfg.spool + "/img");
    var outPath = MCPB.cfg.spool + "/img/" + ctx.id + ".png";

    var aspect = 0.5625;
    try { aspect = scene.defaultResolutionY() / scene.defaultResolutionX(); } catch (e) {}

    var prevW = null, prevH = null;
    try { prevW = scene.defaultResolutionX(); prevH = scene.defaultResolutionY(); } catch (e) {}

    render.setRenderDisplay(display);
    try { render.setResolution(width, Math.round(width * aspect)); } catch (e) {}
    try { render.setWriteEnabled(false); } catch (e) {}

    MCPB.job = {
        id:       ctx.id,
        kind:     "render",
        out:      outPath,
        expect:   f,
        got:      false,
        started:  (new Date()).getTime(),
        deadline: (new Date()).getTime() + (args.timeout_ms || MCPB.cfg.render_timeout_ms),
        restore:  { w: prevW, h: prevH },
        log:      ctx.logSink
    };

    render.renderScene(f, f);
    return DEFERRED;
}};

/* Контактный лист вместо одного кадра: модель должна видеть движение,
   а не позу. Реализуется тем же джоб-механизмом. */
OPS.render_range = { mutates: false, fn: function (args, ctx) {
    if (MCPB.job) { var b = new Error("render already running"); b.code = "BUSY"; throw b; }
    var from = parseInt(args.from, 10), to = parseInt(args.to, 10);
    var stride = parseInt(args.stride || 1, 10);
    var width = parseInt(args.width || 480, 10);
    var display = args.display || defaultDisplayNode();
    if (!display) { throw new Error("no display node; pass args.display"); }

    ensureDir(MCPB.cfg.spool + "/img/" + ctx.id);
    var aspect = 0.5625;
    try { aspect = scene.defaultResolutionY() / scene.defaultResolutionX(); } catch (e) {}

    render.setRenderDisplay(display);
    try { render.setResolution(width, Math.round(width * aspect)); } catch (e) {}
    try { render.setWriteEnabled(false); } catch (e) {}

    MCPB.job = {
        id:       ctx.id,
        kind:     "render_range",
        dir:      MCPB.cfg.spool + "/img/" + ctx.id,
        files:    [],
        stride:   stride,
        from:     from,
        started:  (new Date()).getTime(),
        deadline: (new Date()).getTime() + (args.timeout_ms || MCPB.cfg.render_timeout_ms),
        log:      ctx.logSink
    };

    render.renderScene(from, to);
    return DEFERRED;
}};

function defaultDisplayNode() {
    var i, all;
    try {
        all = node.getNodes(new Array("DISPLAY"));
        if (all && all.length) { return all[0]; }
    } catch (e) {}
    try {
        all = node.subNodes("Top");
        for (i = 0; i < all.length; i++) {
            if (node.type(all[i]) === "DISPLAY") { return all[i]; }
        }
    } catch (e) {}
    return null;
}

/* --------------------------------------------------------------------------
 * 7. Обработчики сигналов рендера
 * ------------------------------------------------------------------------*/

MCPB.onFrameReady = function (f, celImage) {
    var j = MCPB.job;
    if (!j) { return; }
    try {
        if (j.kind === "render") {
            celImage.imageFileAs(j.out, "", "PNG4");
            j.got = true;
        } else {
            var p = j.dir + "/f" + pad(f, 6) + ".png";
            celImage.imageFileAs(p, "", "PNG4");
            j.files.push({ frame: f, path: p });
        }
    } catch (e) {
        j.error = "frameReady failed: " + e;
    }
};

MCPB.onRenderFinished = function () {
    var j = MCPB.job;
    if (!j) { return; }
    MCPB.job = null;
    restoreResolution(j);

    if (j.error) { respondError(j.id, "RENDER_FAILED", j.error, j.log); return; }

    if (j.kind === "render") {
        if (!j.got) { respondError(j.id, "RENDER_EMPTY", "no frame produced", j.log); return; }
        /* Путь, а не base64. См. MINES.md #8 */
        respondOk(j.id, { path: j.out, frame: j.expect,
                          render_ms: (new Date()).getTime() - j.started }, j.log);
    } else {
        var kept = [], i;
        for (i = 0; i < j.files.length; i++) {
            if ((j.files[i].frame - j.from) % j.stride === 0) { kept.push(j.files[i]); }
        }
        respondOk(j.id, { dir: j.dir, frames: kept,
                          render_ms: (new Date()).getTime() - j.started }, j.log);
    }
};

function restoreResolution(j) {
    try { if (j.restore && j.restore.w) { render.setResolution(j.restore.w, j.restore.h); } } catch (e) {}
}

function pad(n, w) { var s = String(n); while (s.length < w) { s = "0" + s; } return s; }

/* --------------------------------------------------------------------------
 * 8. Протокол
 * ------------------------------------------------------------------------*/

function envelope(id, ok, payload, log, err) {
    var e = { v: 1, id: id, ok: ok, log: log || [] };
    if (ok) { e.result = payload; } else { e.error = err; }
    try { e.harmony = { version: about.getVersionInfoStr(), scene: scene.currentScene() }; } catch (x) {}
    return e;
}

function writeResponse(id, obj) {
    var text = enc(obj, 0);
    if (text.length > MCPB.cfg.max_response_kb * 1024) {
        obj = envelope(id, false, null, [], {
            code: "RESPONSE_TOO_LARGE",
            message: "response " + Math.round(text.length / 1024) + "KB exceeds limit; " +
                     "write to a file and return a path instead"
        });
        text = enc(obj, 0);
    }
    writeAtomic(MCPB.cfg.spool + "/res-" + id + ".json", text);
    removeFile(MCPB.cfg.spool + "/work-" + id + ".json");
}

function respondOk(id, result, log)              { MCPB.stats.served++; writeResponse(id, envelope(id, true, result, log)); }
function respondError(id, code, message, log, st) {
    MCPB.stats.failed++;
    writeResponse(id, envelope(id, false, null, log, { code: code, message: String(message), stack: st || null }));
    audit("ERR " + id + " " + code + " :: " + message);
}

/* --------------------------------------------------------------------------
 * 9. Диспетчер
 * ------------------------------------------------------------------------*/

function dispatch(req) {
    var id = req.id;

    if (!MCPB.token || req.token !== MCPB.token) {
        respondError(id, "BAD_TOKEN", "invalid or missing token", []);
        return;
    }

    var spec = OPS[req.op];
    if (!spec) { respondError(id, "UNKNOWN_OP", "no such op: " + req.op, []); return; }

    if (!MCPB.armed && req.op !== "ping" && req.op !== "status" && req.op !== "capabilities") {
        respondError(id, "DISARMED", "bridge is disarmed; arm it from the Scripts toolbar", []);
        return;
    }

    var logSink = [];
    var deadline = (new Date()).getTime() + (req.deadline_ms || 30000);
    var ctx = { id: id, logSink: logSink, logShadow: makeLogShadow(logSink), budget: makeBudget(deadline) };

    audit("OP  " + id + " " + req.op);

    var t0 = (new Date()).getTime(), out;
    try {
        if (spec.mutates) {
            out = withUndo("MCP: " + req.op + " [" + id + "]", function () { return spec.fn(req.args || {}, ctx); });
        } else {
            out = spec.fn(req.args || {}, ctx);
        }
    } catch (e) {
        respondError(id, e.code || "SCRIPT_ERROR", e.message || e, logSink, e.stack || null);
        return;
    }

    if (out === DEFERRED) { return; }   /* ответит onRenderFinished / watchdog */

    if (out && typeof out === "object") { out.elapsed_ms = (new Date()).getTime() - t0; }
    respondOk(id, out, logSink);
}

/* --------------------------------------------------------------------------
 * 10. Насос. Никаких while(true) — только QTimer (MINES.md #2, #4)
 * ------------------------------------------------------------------------*/

MCPB.pump = function () {
    if (MCPB.inHandler) { return; }        /* реентрантность через processEvents/диалоги */

    if (MCPB.job) {
        if ((new Date()).getTime() > MCPB.job.deadline) {
            var j = MCPB.job; MCPB.job = null;
            restoreResolution(j);
            try { render.cancelRender(); } catch (e) {}
            respondError(j.id, "RENDER_TIMEOUT", "render exceeded deadline", j.log);
        }
        return;
    }

    var list;
    try { list = listByPattern(MCPB.cfg.spool, "req-*.json"); }
    catch (e) { sysLog("spool unreadable: " + e); return; }
    if (!list || list.length === 0) { return; }

    var name = list[0];
    var id   = name.replace(/^req-/, "").replace(/\.json$/, "");
    var reqP = MCPB.cfg.spool + "/" + name;
    var wrkP = MCPB.cfg.spool + "/work-" + id + ".json";

    /* Клейм через rename: атомарен, спасает от двойного забора */
    var qf = new QFile(reqP);
    if (!qf.rename(wrkP)) { return; }

    var raw = readFile(wrkP), req;
    if (raw === null) { removeFile(wrkP); return; }

    try { req = dec(raw); req.id = req.id || id; }
    catch (e) { respondError(id, "BAD_REQUEST", "unparseable: " + e, []); return; }

    MCPB.inHandler = true;
    try { dispatch(req); }
    catch (e) { try { respondError(id, "BRIDGE_ERROR", e, []); } catch (e2) {} }
    finally { MCPB.inHandler = false; }
};

/* --------------------------------------------------------------------------
 * 11. Установка / снятие
 * ------------------------------------------------------------------------*/

MCPB.install = function (opts) {
    var k, ks;
    MCPB.uninstall();

    MCPB.cfg = {};
    ks = keysOf(DEFAULTS);
    for (k = 0; k < ks.length; k++) { MCPB.cfg[ks[k]] = DEFAULTS[ks[k]]; }
    if (opts) { ks = keysOf(opts); for (k = 0; k < ks.length; k++) { MCPB.cfg[ks[k]] = opts[ks[k]]; } }
    if (!MCPB.cfg.spool) { MCPB.cfg.spool = specialFolders.temp + "/mcp-harmony"; }

    ensureDir(MCPB.cfg.spool);
    ensureDir(MCPB.cfg.spool + "/img");

    /* Токен кладёт наружная сторона; без него мост не обслуживает ничего.
       Файл должен иметь права 0600 — bridge их не выставляет (MINES.md #10). */
    MCPB.token = readFile(MCPB.cfg.spool + "/.token");
    if (MCPB.token) { MCPB.token = MCPB.token.replace(/^\s+|\s+$/g, ""); }
    if (!MCPB.token) { sysLog("WARNING: no .token in spool — bridge will refuse every request"); }

    /* Осиротевшие work-* после падения Harmony: честно закрываем ошибкой */
    var stale = listByPattern(MCPB.cfg.spool, "work-*.json"), i, sid;
    for (i = 0; stale && i < stale.length; i++) {
        sid = stale[i].replace(/^work-/, "").replace(/\.json$/, "");
        try { respondError(sid, "BRIDGE_RESTARTED", "harmony restarted mid-request", []); } catch (e) {}
    }

    if (!MCPB.signalsBound) {
        try {
            render.frameReady.connect(MCPB, MCPB.onFrameReady);
            render.renderFinished.connect(MCPB, MCPB.onRenderFinished);
            MCPB.signalsBound = true;
        } catch (e) { sysLog("render signals unavailable: " + e); }
    }

    MCPB.timer = new QTimer();            /* ссылка живёт в глобале — иначе GC (MINES.md #3) */
    MCPB.timer.singleShot = false;
    MCPB.timer.timeout.connect(MCPB, MCPB.pump);
    MCPB.timer.start(MCPB.cfg.poll_ms);

    sysLog("installed; spool=" + MCPB.cfg.spool + "; armed=" + MCPB.armed);
    audit("INSTALL spool=" + MCPB.cfg.spool);
    return true;
};

MCPB.uninstall = function () {
    if (MCPB.timer) {
        try { MCPB.timer.stop(); MCPB.timer.timeout.disconnect(MCPB, MCPB.pump); } catch (e) {}
        MCPB.timer = null;
    }
    return true;
};

MCPB.arm     = function () { MCPB.armed = true;  audit("ARMED");    sysLog("ARMED");    return true; };
MCPB.disarm  = function () { MCPB.armed = false; audit("DISARMED"); sysLog("DISARMED"); return true; };
MCPB.toggle  = function () { return MCPB.armed ? MCPB.disarm() : MCPB.arm(); };

/* Горячая перезагрузка обработчиков без рестарта Harmony */
MCPB.registerOp = function (name, spec) { OPS[name] = spec; return true; };
MCPB.ops        = OPS;

})();
