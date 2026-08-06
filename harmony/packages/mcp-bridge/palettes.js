/* ============================================================================
 * palettes.js — палитры: чтение и правка цветов (идея №33)
 * ----------------------------------------------------------------------------
 * Операции:
 *   palette_list  — все палитры сцены + их цвета
 *   palette_set   — правка цветов пакетом: {palette, colour_id|name, rgba}
 *
 * ВАЖНОЕ ОТЛИЧИЕ ОТ ОСТАЛЬНЫХ МУТАЦИЙ (MINES.md #5 задел):
 * правка палитры пишется В ФАЙЛ ПАЛИТРЫ, а не в память сцены — undo её
 * не откатывает. Поэтому palette_set по умолчанию работает в dry_run и
 * требует явного commit:true. Это единственная операция моста с таким
 * поведением, и это сознательно.
 *
 * Грузится ПОСЛЕ bridge.js. ES3.
 * ==========================================================================*/

if (typeof MCPB === "undefined") { throw new Error("palettes.js requires bridge.js loaded first"); }

(function () {
"use strict";

function opErr(code, msg) { var e = new Error(msg); e.code = code; return e; }

function sceneList() {
    if (typeof PaletteObjectManager === "undefined") {
        throw opErr("UNSUPPORTED_API", "PaletteObjectManager unavailable");
    }
    return PaletteObjectManager.getScenePaletteList();
}

function paletteName(p) {
    try { if (typeof p.getName === "function") { return String(p.getName()); } } catch (e) {}
    try { return String(p.name); } catch (e) {}
    return null;
}

function colourToJson(c) {
    var rec = { id: null, name: null, type: null, rgba: null };
    try { rec.id = String(c.id); } catch (e) {}
    try { rec.name = String(c.name); } catch (e) {}
    try { rec.type = c.isValid ? (c.isTexture ? "texture" : "colour") : "invalid"; } catch (e) {}
    try {
        var v = c.colorData;
        if (v) { rec.rgba = [v.r, v.g, v.b, v.a]; }
    } catch (e) {}
    return rec;
}

/* --------------------------------------------------------------------------
 * 1. palette_list
 * ------------------------------------------------------------------------*/

MCPB.registerOp("palette_list", { mutates: false, fn: function (args, ctx) {
    var pl = sceneList();
    var n = 0;
    try { n = pl.numPalettes; } catch (e) { throw opErr("UNSUPPORTED_API", "numPalettes unreadable"); }

    var out = [], i, j, p, nc, cols, c;
    for (i = 0; i < n; i++) {
        ctx.budget();
        p = pl.getPaletteByIndex(i);
        if (!p) { continue; }
        cols = [];
        nc = 0;
        try { nc = p.nColors; } catch (e) {}
        for (j = 0; j < nc; j++) {
            c = null;
            try { c = p.getColorByIndex(j); } catch (e) {}
            if (c) { cols.push(colourToJson(c)); }
        }
        out.push({ index: i, name: paletteName(p), id: safeStr(p, "id"),
                   path: safePath(p), colours: cols });
    }
    return { count: out.length, palettes: out };
}});

function safeStr(o, k) { try { return String(o[k]); } catch (e) { return null; } }
function safePath(p) {
    try { if (typeof p.getPath === "function") { return String(p.getPath()); } } catch (e) {}
    return null;
}

/* --------------------------------------------------------------------------
 * 2. palette_set — правка цветов
 *
 *    edits: [{palette: "имя или индекс", colour: "id или имя",
 *             rgba: [r,g,b,a] (0-255)}]
 *
 *    dry_run по умолчанию: возвращает, ЧТО изменилось бы. commit:true пишет.
 *    Причина в шапке файла: undo палитры не спасает.
 * ------------------------------------------------------------------------*/

MCPB.registerOp("palette_set", { mutates: true, fn: function (args, ctx) {
    var edits = args.edits;
    if (!edits || !edits.length) { throw opErr("BAD_REQUEST", "edits[] required"); }
    var commit = args.commit === true;

    var pl = sceneList();
    var plan = [], i, e, p, c, rgba, before;

    for (i = 0; i < edits.length; i++) {
        ctx.budget();
        e = edits[i];
        p = findPalette(pl, e.palette);
        if (!p) { throw opErr("NO_SUCH_PALETTE", String(e.palette)); }
        c = findColour(p, e.colour);
        if (!c) { throw opErr("NO_SUCH_COLOUR", e.palette + " / " + e.colour); }
        rgba = e.rgba;
        if (!rgba || rgba.length < 3) { throw opErr("BAD_REQUEST", "rgba must be [r,g,b,a?] 0-255"); }

        before = null;
        try { var v = c.colorData; if (v) { before = [v.r, v.g, v.b, v.a]; } } catch (ex) {}

        plan.push({ palette: paletteName(p), colour_id: safeStr(c, "id"),
                    colour_name: safeStr(c, "name"),
                    before: before,
                    after: [num(rgba[0]), num(rgba[1]), num(rgba[2]),
                            rgba.length > 3 ? num(rgba[3]) : 255] });

        if (commit) {
            c.setColorData({ r: num(rgba[0]), g: num(rgba[1]), b: num(rgba[2]),
                             a: rgba.length > 3 ? num(rgba[3]) : 255 });
        }
    }

    return { committed: commit, changes: plan,
             warning: commit
                ? "palette edits are written to palette files; UNDO DOES NOT REVERT THEM"
                : "dry run — pass commit:true to write (undo will NOT revert palette files)" };
}});

function num(v) { var n = Math.round(Number(v)); if (!isFinite(n)) { return 0; } return Math.max(0, Math.min(255, n)); }

function findPalette(pl, key) {
    var n = 0, i, p;
    try { n = pl.numPalettes; } catch (e) { return null; }
    if (typeof key === "number" || String(parseInt(key, 10)) === String(key)) {
        p = pl.getPaletteByIndex(parseInt(key, 10));
        if (p) { return p; }
    }
    for (i = 0; i < n; i++) {
        p = pl.getPaletteByIndex(i);
        if (p && paletteName(p) === String(key)) { return p; }
    }
    return null;
}

function findColour(p, key) {
    var nc = 0, j, c;
    try { nc = p.nColors; } catch (e) { return null; }
    for (j = 0; j < nc; j++) {
        c = null;
        try { c = p.getColorByIndex(j); } catch (e) { continue; }
        if (!c) { continue; }
        if (safeStr(c, "id") === String(key) || safeStr(c, "name") === String(key)) { return c; }
    }
    return null;
}

MCPB.registerOp("palettes_selftest", { mutates: false, fn: function () {
    var ok = { PaletteObjectManager: false, getScenePaletteList: false, numPalettes: null };
    try {
        ok.PaletteObjectManager = (typeof PaletteObjectManager !== "undefined");
        if (ok.PaletteObjectManager) {
            var pl = PaletteObjectManager.getScenePaletteList();
            ok.getScenePaletteList = !!pl;
            try { ok.numPalettes = pl.numPalettes; } catch (e) {}
        }
    } catch (e) { ok.error = String(e); }
    return ok;
}});

MessageLog.trace("[mcpb] palettes.js registered: palette_list, palette_set, palettes_selftest");

})();
