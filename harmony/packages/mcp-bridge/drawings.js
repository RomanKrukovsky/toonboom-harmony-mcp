/* ============================================================================
 * drawings.js — словарь рисунков и подмена (substitution) поверх bridge.js
 * ----------------------------------------------------------------------------
 * Идея №24 из исходного списка: у рига есть словарь ртов/глаз/кистей,
 * анимация — это выбор рисунка на кадр. Здесь три операции:
 *
 *   drawing_nodes     — какие ноды в сцене вообще имеют словарь рисунков
 *   substitution_get  — словарь конкретной ноды + что стоит на таймлайне
 *   substitution_set  — расставить рисунки по кадрам
 *
 * Грузится ПОСЛЕ bridge.js. ES3-совместимо.
 * Правило то же, что в columns.js: внутри Harmony только доступ,
 * вся логика (липсинк, моргания) — снаружи, в drawings.py.
 * ==========================================================================*/

if (typeof MCPB === "undefined") { throw new Error("drawings.js requires bridge.js loaded first"); }

(function () {
"use strict";

function opErr(code, msg) { var e = new Error(msg); e.code = code; return e; }
function intOr(v, d) { var n = parseInt(v, 10); return isFinite(n) ? n : d; }

/* --------------------------------------------------------------------------
 * 0. Резолв ноды -> element id -> drawing-колонка
 *
 *    Всё под пробами: набор функций плавает между сборками (MINES.md #11).
 * ------------------------------------------------------------------------*/

function elementIdOf(nodePath) {
    if (typeof node.getElementId === "function") {
        var id = node.getElementId(nodePath);
        if (id !== null && id >= 0) { return id; }
    }
    throw opErr("UNSUPPORTED_API", "node.getElementId unavailable or node has no element: " + nodePath);
}

function drawingColumnOf(nodePath) {
    var col = null;
    try { col = node.linkedColumn(nodePath, "DRAWING.ELEMENT"); } catch (e) {}
    if (!col) { try { col = node.linkedColumn(nodePath, "drawing.element"); } catch (e2) {} }
    if (!col) { throw opErr("NO_DRAWING_COLUMN", "node has no linked drawing column: " + nodePath); }
    return String(col);
}

function drawingLibrary(elementId) {
    var lib = [], n = 0, i, nm;
    if (typeof Drawing === "undefined" || typeof Drawing.numberOfDrawings !== "function") {
        throw opErr("UNSUPPORTED_API", "Drawing.numberOfDrawings unavailable on this build");
    }
    n = Drawing.numberOfDrawings(elementId);
    for (i = 0; i < n; i++) {
        nm = null;
        try { nm = Drawing.name(elementId, i); } catch (e) {}
        if (nm !== null) { lib.push(String(nm)); }
    }
    return lib;
}

/* --------------------------------------------------------------------------
 * 1. drawing_nodes — инвентарь: все READ-ноды со словарями
 * ------------------------------------------------------------------------*/

MCPB.registerOp("drawing_nodes", { mutates: false, fn: function (args, ctx) {
    var nodes = [], i, np, rec;
    var all;
    try { all = node.getNodes(new Array("READ")); }
    catch (e) { throw opErr("UNSUPPORTED_API", "node.getNodes failed: " + e); }

    for (i = 0; i < all.length; i++) {
        if (i % 32 === 0) { ctx.budget(); }
        np = all[i];
        rec = { node: String(np), name: null, enabled: null, element_id: null,
                column: null, drawing_count: null };
        try { rec.name = String(node.getName(np)); } catch (e) {}
        try { rec.enabled = node.getEnable(np); } catch (e) {}
        try { rec.element_id = elementIdOf(np); } catch (e) { nodes.push(rec); continue; }
        try { rec.column = drawingColumnOf(np); } catch (e) {}
        try { rec.drawing_count = drawingLibrary(rec.element_id).length; } catch (e) {}
        nodes.push(rec);
    }
    return { count: nodes.length, nodes: nodes };
}});

/* --------------------------------------------------------------------------
 * 2. substitution_get — словарь + таймлайн одной ноды
 *
 *    used_at сгруппирован по рисунку: модель сразу видит, какие рисунки
 *    вообще используются, а какие мертвы (вход для scene_lint: unused-drawing).
 * ------------------------------------------------------------------------*/

MCPB.registerOp("substitution_get", { mutates: false, fn: function (args, ctx) {
    var np = String(args.node || "");
    if (!np) { throw opErr("BAD_REQUEST", "node required"); }

    var eid  = elementIdOf(np);
    var col  = drawingColumnOf(np);
    var lib  = drawingLibrary(eid);
    var from = intOr(args.from, 1);
    var to   = intOr(args.to, frame.numberOf());

    var f, v, prev = null, run = null, timeline = [], usedAt = {}, i;
    for (f = from; f <= to; f++) {
        if ((f - from) % 256 === 0) { ctx.budget(); }
        try { v = column.getEntry(col, 1, f); } catch (e) { v = null; }
        v = (v === null || v === "") ? null : String(v);

        if (run && v === prev) { run.duration++; }
        else { run = { frame: f, drawing: v, duration: 1 }; timeline.push(run); prev = v; }

        if (v !== null) {
            if (!usedAt[v]) { usedAt[v] = 0; }
            usedAt[v]++;
        }
    }

    var library = [];
    for (i = 0; i < lib.length; i++) {
        library.push({ drawing: lib[i], frames_used: usedAt[lib[i]] || 0 });
    }

    return { node: np, element_id: eid, column: col,
             library: library, timeline: timeline, from: from, to: to };
}});

/* --------------------------------------------------------------------------
 * 3. substitution_set — расставить рисунки по кадрам
 *
 *    validate=true (по умолчанию): каждый рисунок сверяется со словарём ДО
 *    первой записи. Опечатка модели в имени рисунка иначе даёт пустой кадр,
 *    который замечают на просмотре — то есть поздно и человеком.
 * ------------------------------------------------------------------------*/

MCPB.registerOp("substitution_set", { mutates: true, fn: function (args, ctx) {
    var np = String(args.node || "");
    if (!np) { throw opErr("BAD_REQUEST", "node required"); }
    var asg = args.assignments;
    if (!asg || !asg.length) { throw opErr("BAD_REQUEST", "assignments[] required"); }

    var eid = elementIdOf(np);
    var col = drawingColumnOf(np);

    var i, a, f, dur, k;

    if (args.validate !== false) {
        var lib = drawingLibrary(eid), dict = {}, bad = [];
        for (i = 0; i < lib.length; i++) { dict[lib[i]] = 1; }
        for (i = 0; i < asg.length; i++) {
            a = asg[i];
            if (!a || !isFinite(parseInt(a.frame, 10))) { bad.push({ index: i, reason: "bad frame" }); continue; }
            if (a.drawing !== null && !dict[String(a.drawing)]) {
                bad.push({ index: i, reason: "no such drawing: " + a.drawing });
            }
        }
        if (bad.length) {
            throw opErr("VALIDATION_FAILED",
                bad.length + " assignment(s) reference drawings not in the element; first: " +
                bad[0].reason + " (pass validate:false to force)");
        }
    }

    var applied = 0;
    for (i = 0; i < asg.length; i++) {
        if (i % 64 === 0) { ctx.budget(); }
        a = asg[i];
        f = parseInt(a.frame, 10);
        dur = intOr(a.duration, 1); if (dur < 1) { dur = 1; }
        for (k = 0; k < dur; k++) {
            column.setEntry(col, 1, f + k, a.drawing === null ? "" : String(a.drawing));
        }
        applied++;
    }

    /* MINES.md #14/#18: read-only сцена молчит — читаем обратно выборку */
    var verify = null;
    if (args.verify !== false && applied > 0) {
        var mism = 0, checked = 0, got;
        for (i = 0; i < asg.length && checked < 8; i++) {
            a = asg[i]; checked++;
            try { got = String(column.getEntry(col, 1, parseInt(a.frame, 10))); }
            catch (e) { mism++; continue; }
            if (a.drawing !== null && got !== String(a.drawing)) { mism++; }
        }
        verify = { sampled: checked, mismatched: mism,
                   scene_writable: mism === 0 ? true : "suspect — scene may be locked or read-only" };
    }

    return { node: np, column: col, applied: applied, verified: verify,
             hint: "mutations live in memory until op:save" };
}});

MCPB.registerOp("drawings_selftest", { mutates: false, fn: function () {
    var probes = ["node.getNodes", "node.getElementId", "node.linkedColumn", "node.getName",
                  "node.getEnable", "Drawing.numberOfDrawings", "Drawing.name",
                  "column.getEntry", "column.setEntry"];
    var out = {}, i, parts, root, ok;
    for (i = 0; i < probes.length; i++) {
        parts = probes[i].split(".");
        try { root = eval(parts[0]); ok = (root && typeof root[parts[1]] === "function"); } catch (e) { ok = false; }
        out[probes[i]] = ok;
    }
    return { probes: out };
}});

MessageLog.trace("[mcpb] drawings.js registered: drawing_nodes, substitution_get/set, drawings_selftest");

})();
