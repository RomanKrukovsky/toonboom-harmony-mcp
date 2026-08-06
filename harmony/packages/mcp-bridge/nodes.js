/* ============================================================================
 * nodes.js — сеть нод: чтение графа, правка связей, линтер сцены
 * ----------------------------------------------------------------------------
 * Идеи №7 (нода-сеть как декларативный конфиг) и №8 (scene-linter).
 *
 * Операции:
 *   node_graph   — весь граф сцены как JSON: ноды, порты, связи, атрибуты
 *   node_edit    — пакет правок: add / remove / link / unlink / rename / set_attr
 *   scene_lint   — статический анализ: висячие ноды, пустые группы,
 *                  отключённые ноды, мёртвые колонки, битые Colour-Override
 *
 * Грузится ПОСЛЕ bridge.js. ES3. Правило прежнее: здесь только доступ,
 * умные проверки (граф-анализ) — снаружи, в nodes.py.
 * ==========================================================================*/

if (typeof MCPB === "undefined") { throw new Error("nodes.js requires bridge.js loaded first"); }

(function () {
"use strict";

function opErr(code, msg) { var e = new Error(msg); e.code = code; return e; }
function intOr(v, d) { var n = parseInt(v, 10); return isFinite(n) ? n : d; }

/* --------------------------------------------------------------------------
 * 1. node_graph — сериализация графа
 *
 *    Схема наружу:
 *    { nodes: [{path, type, name, enabled, parent,
 *               in: [{port, src, src_port}], out_count,
 *               attrs?: [{name, type, value}] }] }
 *
 *    Атрибуты по флагу: полный дамп атрибутов утраивает размер и на большой
 *    сцене выбивает max_response_kb (та же логика, что xsheet_list/get).
 * ------------------------------------------------------------------------*/

MCPB.registerOp("node_graph", { mutates: false, fn: function (args, ctx) {
    var root = String(args.root || "Top");
    var withAttrs = !!args.attrs;
    var typeFilter = args.types || null;

    var all;
    try { all = node.subNodes(root); }
    catch (e) { throw opErr("UNSUPPORTED_API", "node.subNodes failed: " + e); }

    var out = [], i, np, rec, t;
    for (i = 0; i < all.length; i++) {
        if (i % 32 === 0) { ctx.budget(); }
        np = String(all[i]);
        t = null;
        try { t = String(node.type(np)); } catch (e) {}
        if (typeFilter && !inList(t, typeFilter)) { continue; }

        rec = { path: np, type: t, name: null, enabled: null, parent: null,
                in_links: [], out_count: null };
        try { rec.name = String(node.getName(np)); } catch (e) {}
        try { rec.enabled = node.getEnable(np); } catch (e) {}
        try { rec.parent = String(node.parentNode(np)); } catch (e) {}
        rec.in_links = readInputs(np);
        rec.out_count = countOutputs(np);
        if (withAttrs) { rec.attrs = readAttrs(np); }
        out.push(rec);
    }
    return { root: root, count: out.length, nodes: out };
}});

function inList(v, list) {
    var i;
    for (i = 0; i < list.length; i++) { if (String(list[i]) === String(v)) { return true; } }
    return false;
}

function readInputs(np) {
    var n = 0, i, src, links = [];
    try { n = node.numberOfInputPorts(np); } catch (e) { return links; }
    for (i = 0; i < n; i++) {
        src = null;
        try { src = node.srcNode(np, i); } catch (e) {}
        links.push({ port: i, src: src ? String(src) : null });
    }
    return links;
}

function countOutputs(np) {
    var n = 0, i, total = 0;
    try { n = node.numberOfOutputPorts(np); } catch (e) { return null; }
    for (i = 0; i < n; i++) {
        try { total += node.numberOfOutputLinks(np, i); } catch (e) {}
    }
    return total;
}

function readAttrs(np) {
    var attrs = null, i, out = [], a;
    try { attrs = node.getAttrList(np, 1); } catch (e) { return null; }
    if (!attrs) { return null; }
    for (i = 0; i < attrs.length; i++) {
        a = attrs[i];
        try {
            out.push({
                name: String(a.fullKeyword()),
                type: String(a.typeName()),
                value: readAttrValue(np, a)
            });
        } catch (e) {}
    }
    return out;
}

function readAttrValue(np, a) {
    var t = String(a.typeName());
    try {
        if (t === "BOOL")   { return a.boolValue(); }
        if (t === "DOUBLE" || t === "INT") { return a.doubleValue(); }
        if (t === "STRING") { return String(a.textValue()); }
        return String(a.textValue());
    } catch (e) { return null; }
}

/* --------------------------------------------------------------------------
 * 2. node_edit — пакет правок графа
 *
 *    edits: [{op:"add", type, name, parent, x?, y?},
 *            {op:"link", src, src_port?, dst, dst_port?},
 *            {op:"unlink", dst, dst_port},
 *            {op:"remove", path, del_columns?},
 *            {op:"rename", path, name},
 *            {op:"set_attr", path, attr, value, frame?},
 *            {op:"enable", path, enabled}]
 *
 *    Весь пакет — один undo (withUndo в bridge). Ошибка на середине
 *    откатывает всё: полусвязанный композит хуже несвязанного.
 * ------------------------------------------------------------------------*/

MCPB.registerOp("node_edit", { mutates: true, fn: function (args, ctx) {
    var edits = args.edits;
    if (!edits || !edits.length) { throw opErr("BAD_REQUEST", "edits[] required"); }

    var results = [], i, e, r;
    for (i = 0; i < edits.length; i++) {
        if (i % 16 === 0) { ctx.budget(); }
        e = edits[i];
        r = { index: i, op: e.op };
        /* Ошибки НЕ глотаем: пакет атомарен, бросаем — и withUndo откатит всё */
        if (e.op === "add")          { r.path = doAdd(e); }
        else if (e.op === "link")    { doLink(e); r.done = true; }
        else if (e.op === "unlink")  { doUnlink(e); r.done = true; }
        else if (e.op === "remove")  { doRemove(e); r.done = true; }
        else if (e.op === "rename")  { doRename(e); r.done = true; }
        else if (e.op === "set_attr"){ doSetAttr(e); r.done = true; }
        else if (e.op === "enable")  { node.setEnable(String(e.path), !!e.enabled); r.done = true; }
        else { throw opErr("BAD_REQUEST", "unknown edit op at index " + i + ": " + e.op); }
        results.push(r);
    }
    return { applied: results.length, results: results,
             hint: "mutations live in memory until op:save" };
}});

function doAdd(e) {
    if (typeof node.add !== "function") { throw opErr("UNSUPPORTED_API", "node.add unavailable"); }
    var parent = String(e.parent || "Top");
    var name   = String(e.name || e.type);
    var p = node.add(parent, name, String(e.type),
                     intOr(e.x, 0), intOr(e.y, 0), intOr(e.z, 0));
    if (!p) { throw opErr("ADD_FAILED", "node.add returned empty for " + name + " (" + e.type + ")"); }
    return String(p);
}

function doLink(e) {
    if (typeof node.link !== "function") { throw opErr("UNSUPPORTED_API", "node.link unavailable"); }
    var ok = node.link(String(e.src), intOr(e.src_port, 0), String(e.dst), intOr(e.dst_port, 0));
    if (ok === false) {
        throw opErr("LINK_FAILED", e.src + ":" + intOr(e.src_port, 0) + " -> " +
                    e.dst + ":" + intOr(e.dst_port, 0));
    }
}

function doUnlink(e) {
    if (typeof node.unlink !== "function") { throw opErr("UNSUPPORTED_API", "node.unlink unavailable"); }
    var ok = node.unlink(String(e.dst), intOr(e.dst_port, 0));
    if (ok === false) { throw opErr("UNLINK_FAILED", e.dst + ":" + intOr(e.dst_port, 0)); }
}

function doRemove(e) {
    if (typeof node.deleteNode !== "function") { throw opErr("UNSUPPORTED_API", "node.deleteNode unavailable"); }
    var ok = node.deleteNode(String(e.path), !!e.del_columns, !!e.del_elements);
    if (ok === false) { throw opErr("REMOVE_FAILED", String(e.path)); }
}

function doRename(e) {
    if (typeof node.rename !== "function") { throw opErr("UNSUPPORTED_API", "node.rename unavailable"); }
    var ok = node.rename(String(e.path), String(e.name));
    if (ok === false) { throw opErr("RENAME_FAILED", String(e.path)); }
}

function doSetAttr(e) {
    var f = e.frame;
    if (typeof node.setTextAttr === "function") {
        node.setTextAttr(String(e.path), String(e.attr), intOr(f, 1), String(e.value));
        return;
    }
    throw opErr("UNSUPPORTED_API", "node.setTextAttr unavailable");
}

/* --------------------------------------------------------------------------
 * 3. scene_lint — проверки, требующие данных, недоступных снаружи одним вызовом
 *
 *    Правила уровня графа здесь; правила уровня кривых (flat-arc, dead-hold)
 *    уже живут снаружи в columns.py — там математика.
 * ------------------------------------------------------------------------*/

MCPB.registerOp("scene_lint", { mutates: false, fn: function (args, ctx) {
    var findings = [];
    var rules = args.rules || null;
    var want = function (r) { return !rules || inList(r, rules); };

    var all, i, np, t;
    try { all = node.subNodes("Top"); } catch (e) { throw opErr("UNSUPPORTED_API", "node.subNodes failed"); }

    /* --- проход по нодам --- */
    for (i = 0; i < all.length; i++) {
        if (i % 32 === 0) { ctx.budget(); }
        np = String(all[i]);
        t = null;
        try { t = String(node.type(np)); } catch (e) { continue; }

        /* dangling-node: есть выходные порты, но ничего не подключено,
           и это не display/write — рисуется в никуда */
        if (want("dangling-node") && t !== "DISPLAY" && t !== "WRITE" && t !== "GROUP") {
            var outs = countOutputs(np);
            var haveOutPorts = 0;
            try { haveOutPorts = node.numberOfOutputPorts(np); } catch (e) {}
            if (haveOutPorts > 0 && outs === 0) {
                findings.push({ rule: "dangling-node", severity: "warning", node: np,
                                message: "node output connects to nothing; it renders nowhere" });
            }
        }

        /* disabled-node: выключенная нода, у которой есть потребители —
           кто-то ждёт от неё картинку и получает пустоту */
        if (want("disabled-node")) {
            var en = null;
            try { en = node.getEnable(np); } catch (e) {}
            if (en === false && countOutputs(np) > 0) {
                findings.push({ rule: "disabled-node", severity: "info", node: np,
                                message: "disabled node still wired into the comp" });
            }
        }

        /* empty-group */
        if (want("empty-group") && t === "GROUP") {
            var kids = null;
            try { kids = node.subNodes(np); } catch (e) {}
            if (kids && kids.length === 0) {
                findings.push({ rule: "empty-group", severity: "info", node: np,
                                message: "group contains nothing" });
            }
        }

        /* unconnected-input: порт входа пуст у ноды, которой вход обязателен */
        if (want("unconnected-input") && (t === "COMPOSITE" || t === "CUTTER" || t === "PEG")) {
            var ins = readInputs(np), k, empty = 0;
            for (k = 0; k < ins.length; k++) { if (!ins[k].src) { empty++; } }
            if (t === "CUTTER" && empty > 0) {
                findings.push({ rule: "unconnected-input", severity: "warning", node: np,
                                message: "cutter with empty input port cuts nothing" });
            }
        }

        /* stale-colour-override: Colour-Override со ссылкой на палитру,
           которой нет в списках сцены */
        if (want("stale-colour-override") && t === "COLOUR_OVERRIDE") {
            /* глубокая проверка требует PaletteObjectManager — под пробой */
            try {
                if (typeof PaletteObjectManager !== "undefined" &&
                    typeof node.getTextAttr === "function") {
                    var pal = node.getTextAttr(np, 1, "PALETTES");
                    /* если атрибут читается и непуст, но менеджер палитру не знает — битая */
                    if (pal && !paletteExists(String(pal))) {
                        findings.push({ rule: "stale-colour-override", severity: "error", node: np,
                                        message: "references palette not present in scene: " + pal });
                    }
                }
            } catch (e) {}
        }
    }

    /* --- мёртвые колонки: есть в сцене, не привязаны ни к одной ноде --- */
    if (want("orphan-column")) {
        var linked = {}, j, attrs, cn, cCount = 0;
        for (i = 0; i < all.length; i++) {
            if (i % 32 === 0) { ctx.budget(); }
            try { attrs = node.getAttrList(String(all[i]), 1); } catch (e) { attrs = null; }
            if (!attrs) { continue; }
            for (j = 0; j < attrs.length; j++) {
                try { cn = node.linkedColumn(String(all[i]), attrs[j].fullKeyword()); } catch (e) { cn = null; }
                if (cn) { linked[String(cn)] = 1; }
            }
        }
        try { cCount = column.numberOf(); } catch (e) { cCount = 0; }
        for (i = 0; i < cCount; i++) {
            if (i % 64 === 0) { ctx.budget(); }
            cn = null;
            try { cn = String(column.getName(i)); } catch (e) { continue; }
            if (cn && !linked[cn]) {
                findings.push({ rule: "orphan-column", severity: "info", column: cn,
                                message: "column linked to no node" });
            }
        }
    }

    return { findings: findings, checked_nodes: all.length,
             rules_run: rules || ["dangling-node", "disabled-node", "empty-group",
                                  "unconnected-input", "stale-colour-override", "orphan-column"] };
}});

function paletteExists(name) {
    try {
        var pl = PaletteObjectManager.getScenePaletteList();
        var n = pl.numPalettes, i, p;
        for (i = 0; i < n; i++) {
            p = pl.getPaletteByIndex(i);
            if (p && String(p.getName ? p.getName() : p.name) === name) { return true; }
        }
    } catch (e) { return true; }  /* не смогли проверить — не обвиняем */
    return false;
}

MCPB.registerOp("nodes_selftest", { mutates: false, fn: function () {
    var probes = ["node.subNodes", "node.type", "node.getName", "node.getEnable",
                  "node.parentNode", "node.numberOfInputPorts", "node.srcNode",
                  "node.numberOfOutputPorts", "node.numberOfOutputLinks",
                  "node.add", "node.link", "node.unlink", "node.deleteNode",
                  "node.rename", "node.setTextAttr", "node.getTextAttr", "node.getAttrList"];
    var out = {}, i, parts, root, ok;
    for (i = 0; i < probes.length; i++) {
        parts = probes[i].split(".");
        try { root = eval(parts[0]); ok = (root && typeof root[parts[1]] === "function"); } catch (e) { ok = false; }
        out[probes[i]] = ok;
    }
    return { probes: out };
}});

MessageLog.trace("[mcpb] nodes.js registered: node_graph, node_edit, scene_lint, nodes_selftest");

})();
