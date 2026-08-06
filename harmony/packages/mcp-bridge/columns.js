/* ============================================================================
 * columns.js — xsheet_* и curve_* поверх bridge.js
 * ----------------------------------------------------------------------------
 * Регистрируется через MCPB.registerOp. Грузится ПОСЛЕ bridge.js.
 *
 * Общий обход колонок — причина, по которой xsheet и curve живут в одном файле.
 *
 * ES3-совместимо. Никаких let/const/=>/forEach/Object.keys.
 *
 * Отличия от исходной спеки — по местам, где спека опиралась на API,
 * которого может не быть. См. COLUMNS.md.
 * ==========================================================================*/

if (typeof MCPB === "undefined") { throw new Error("columns.js requires bridge.js loaded first"); }

(function () {
"use strict";

/* --------------------------------------------------------------------------
 * 0. Инвентарь колонок
 *
 *    Спека предполагала column.getColumnListOfType(). Такой функции нет в
 *    документированном API (bridge.js её пробит — и она вернёт false).
 *    Надёжный путь — column.numberOf() + column.getName(i).
 * ------------------------------------------------------------------------*/

var VALUE_TYPES  = { BEZIER: 1, EASE: 1, VELOBASED: 1, "3DPATH": 1, QUATERNIONPATH: 1, EXPR: 1 };
var DRAWING_TYPE = "DRAWING";

function columnCount() {
    if (typeof column.numberOf === "function") { return column.numberOf(); }
    throw opErr("UNSUPPORTED_API", "column.numberOf() unavailable on this build");
}

function columnNameAt(i) {
    if (typeof column.getName === "function") { return column.getName(i); }
    throw opErr("UNSUPPORTED_API", "column.getName() unavailable on this build");
}

function columnType(name) {
    try { return String(column.type(name)); } catch (e) { return null; }
}

/* Ноды, привязанные к колонке. Обратной ссылки column->node в API нет,
   поэтому строим прямой индекс node->column один раз за вызов. */
function buildNodeIndex() {
    var idx = {}, nodes, i, j, attrs, colName, np;
    try { nodes = node.subNodes("Top"); } catch (e) { return idx; }
    for (i = 0; i < nodes.length; i++) {
        np = nodes[i];
        try { attrs = node.getAttrList(np, 1); } catch (e) { attrs = null; }
        if (!attrs) { continue; }
        for (j = 0; j < attrs.length; j++) {
            try { colName = node.linkedColumn(np, attrs[j].fullKeyword()); } catch (e) { colName = null; }
            if (colName) {
                if (!idx[colName]) { idx[colName] = []; }
                idx[colName].push({ node: np, attr: String(attrs[j].fullKeyword()) });
            }
        }
    }
    return idx;
}

function opErr(code, msg) { var e = new Error(msg); e.code = code; return e; }

function matchAny(name, patterns) {
    var i, p;
    if (!patterns || !patterns.length) { return true; }
    for (i = 0; i < patterns.length; i++) {
        p = String(patterns[i]);
        if (p === name) { return true; }
        /* только префиксный glob — регэкспы от модели не принимаем */
        if (p.charAt(p.length - 1) === "*" && name.indexOf(p.substring(0, p.length - 1)) === 0) { return true; }
    }
    return false;
}

/* --------------------------------------------------------------------------
 * 1. xsheet_list — карта колонок без содержимого
 *
 *    Отдельная операция, потому что xsheet_get на большой сцене легко
 *    выбивает max_response_kb. Сначала карта, потом выборка.
 * ------------------------------------------------------------------------*/

MCPB.registerOp("xsheet_list", { mutates: false, fn: function (args) {
    var n = columnCount(), i, name, t, out = [], idx = null, links;
    if (args && args.with_nodes !== false) { idx = buildNodeIndex(); }

    for (i = 0; i < n; i++) {
        name = columnNameAt(i);
        if (!name) { continue; }
        t = columnType(name);
        if (args && args.types && !matchAny(String(t), args.types)) { continue; }
        if (args && args.columns && !matchAny(String(name), args.columns)) { continue; }

        links = idx ? (idx[name] || []) : null;
        out.push({
            name:    String(name),
            type:    t,
            nodes:   links,
            frames:  safeFrameCount(name, t)
        });
    }
    return { frameCount: frame.numberOf(), columns: out };
}});

function safeFrameCount(name, t) {
    if (t === DRAWING_TYPE) { return null; }
    try { return func.numberOfPoints(name); } catch (e) { return null; }
}

/* --------------------------------------------------------------------------
 * 2. xsheet_get — экспозиция и значения как таблица
 *
 *    Спека обещала единый интерфейс для drawing- и числовых колонок.
 *    Сохранено, но с честным различием: у drawing-колонки есть held/duration,
 *    у числовой — keyframe. Модель должна видеть разницу, иначе она будет
 *    «продлевать экспозицию» на кривой скейла.
 * ------------------------------------------------------------------------*/

MCPB.registerOp("xsheet_get", { mutates: false, fn: function (args, ctx) {
    var from  = intOr(args.from, 1);
    var to    = intOr(args.to, frame.numberOf());
    var names = resolveColumns(args.columns, args.types);
    var i, out = [], budgetEvery = 64, counter = 0;

    if (to < from) { throw opErr("BAD_RANGE", "to < from"); }
    if (names.length === 0) { return { frameCount: frame.numberOf(), columns: [] }; }

    for (i = 0; i < names.length; i++) {
        counter++;
        if (counter % budgetEvery === 0) { ctx.budget(); }
        out.push(readColumn(names[i], from, to, args.collapse_holds !== false, ctx));
    }
    return { frameCount: frame.numberOf(), from: from, to: to, columns: out };
}});

function resolveColumns(want, types) {
    var n = columnCount(), i, name, t, res = [];
    for (i = 0; i < n; i++) {
        name = columnNameAt(i);
        if (!name) { continue; }
        t = columnType(name);
        if (types && !matchAny(String(t), types)) { continue; }
        if (want && !matchAny(String(name), want)) { continue; }
        res.push(String(name));
    }
    return res;
}

function readColumn(name, from, to, collapse, ctx) {
    var t = columnType(name);
    var rec = { name: name, type: t };

    if (t === DRAWING_TYPE) {
        rec.entries = readDrawingColumn(name, from, to, collapse, ctx);
        return rec;
    }
    if (VALUE_TYPES[String(t)]) {
        rec.entries  = readValueColumn(name, from, to, ctx);
        rec.keyCount = safeFrameCount(name, t);
        return rec;
    }
    /* SOUND и прочее: экспортируем как есть, без интерпретации */
    rec.entries  = null;
    rec.readable = false;
    rec.note     = "type not handled by xsheet_get; use op:eval";
    return rec;
}

/* Drawing-колонка: значение — это ИМЯ рисунка (строка), не число.
   collapse=true отдаёт по одной записи на удержание, а не по кадру:
   400-кадровый шот перестаёт быть 400 строками JSON. */
function readDrawingColumn(name, from, to, collapse, ctx) {
    var f, v, out = [], prev = null, run = null, counter = 0;
    for (f = from; f <= to; f++) {
        counter++;
        if (counter % 256 === 0) { ctx.budget(); }
        try { v = column.getEntry(name, 1, f); } catch (e) { v = null; }
        v = (v === null || v === "") ? null : String(v);

        if (!collapse) {
            out.push({ frame: f, value: v });
            continue;
        }
        if (run && v === prev) { run.duration++; continue; }
        run = { frame: f, value: v, duration: 1 };
        out.push(run);
        prev = v;
    }
    return out;
}

/* Числовая колонка: отдаём КЛЮЧИ, а не семплы по кадрам.
   Семплы — это derived data; их можно посчитать через curve_sample. */
function readValueColumn(name, from, to, ctx) {
    var np = 0, i, f, out = [];
    try { np = func.numberOfPoints(name); } catch (e) { np = 0; }
    for (i = 0; i < np; i++) {
        if (i % 256 === 0) { ctx.budget(); }
        try { f = func.pointX(name, i); } catch (e) { continue; }
        if (f < from || f > to) { continue; }
        out.push({ frame: f, value: safe(func.pointY, name, i), keyframe: true });
    }
    return out;
}

function safe(fn, a, b) { try { return fn(a, b); } catch (e) { return null; } }
function intOr(v, d) { var n = parseInt(v, 10); return isFinite(n) ? n : d; }

/* --------------------------------------------------------------------------
 * 3. xsheet_set
 *
 *    ripple из спеки честно помечен как эмуляция — прямого ripple в API нет.
 *    Реализован как read-shift-write по колонке, и ТОЛЬКО для drawing-колонок:
 *    «сдвинуть экспозицию» на безье-кривой значит другое, и молча делать вид,
 *    что это одно и то же, — способ испортить тайминг незаметно.
 * ------------------------------------------------------------------------*/

MCPB.registerOp("xsheet_set", { mutates: true, fn: function (args, ctx) {
    var edits = args.edits;
    if (!edits || !edits.length) { throw opErr("BAD_REQUEST", "edits[] required"); }

    var applied = 0, rejected = [], i, e, t, ok;

    /* Валидируем ВСЁ до первой записи: withUndo делает вызов атомарным,
       но диагностика полезнее, когда она полная, а не до первой ошибки. */
    var seen = {};
    for (i = 0; i < edits.length; i++) {
        e = edits[i];
        if (!e || !e.column) { rejected.push({ index: i, reason: "missing column" }); continue; }
        if (!isFinite(parseInt(e.frame, 10))) { rejected.push({ index: i, reason: "bad frame" }); continue; }
        if (!has(seen, e.column)) { seen[e.column] = columnType(e.column); }
        if (seen[e.column] === null) { rejected.push({ index: i, reason: "unknown column: " + e.column }); }
    }
    if (rejected.length && args.strict !== false) {
        throw opErr("VALIDATION_FAILED", "rejected " + rejected.length + " edit(s): " +
                    rejected[0].reason + " (set strict=false to apply the rest)");
    }

    for (i = 0; i < edits.length; i++) {
        e = edits[i];
        if (!e || !e.column || !isFinite(parseInt(e.frame, 10))) { continue; }
        if (i % 64 === 0) { ctx.budget(); }
        t = seen[e.column];
        ok = false;
        try {
            if (t === DRAWING_TYPE) { ok = setDrawingEntry(e); }
            else if (VALUE_TYPES[String(t)]) { ok = setValueKey(e); }
            else { rejected.push({ index: i, reason: "unsupported column type: " + t }); continue; }
        } catch (ex) {
            rejected.push({ index: i, reason: String(ex) });
            continue;
        }
        if (ok) { applied++; } else { rejected.push({ index: i, reason: "write refused by Harmony" }); }
    }

    /* MINES.md #14: read-only сцена принимает мутации молча.
       Проверяем не флагом, а чтением обратно. */
    var verify = null;
    if (applied > 0 && args.verify !== false) { verify = verifyWriteback(edits, seen); }

    return { applied: applied, rejected: rejected, verified: verify,
             hint: "mutations live in memory until op:save" };
}});

function setDrawingEntry(e) {
    var dur = intOr(e.duration, 1), f = parseInt(e.frame, 10), k;
    if (dur < 1) { dur = 1; }
    for (k = 0; k < dur; k++) { column.setEntry(e.column, 1, f + k, String(e.value)); }
    return true;
}

function setValueKey(e) {
    var f = parseInt(e.frame, 10), v = Number(e.value);
    if (!isFinite(v)) { throw new Error("value must be numeric for column type " + columnType(e.column)); }

    /* Через func.*, а не column.setEntry: на кривых setEntry не создаёт ключ
       предсказуемым образом между сборками.
       Порядок веток — от самого явного к самому терпимому; каждая проверяется
       на существование ДО вызова, потому что набор функций плавает (MINES.md #11).
       Хендлы здесь не задаются сознательно: их синтез требует калибровки,
       а xsheet_set — это «поставить значение», не «вылепить изинг». */
    if (typeof func.setBezierPoint === "function" && VALUE_TYPES[String(columnType(e.column))]) {
        func.setBezierPoint(e.column, f, v, 0, 0, 0, 0, false, "SMOOTH");
        return true;
    }
    if (typeof func.addKeyFrame === "function") {
        func.addKeyFrame(e.column, f);
        if (typeof func.setKeyFrame === "function") { func.setKeyFrame(e.column, f, v); return true; }
    }
    column.setEntry(e.column, 1, f, v);
    return true;
}

function verifyWriteback(edits, types) {
    var i, e, got, want, mism = 0, checked = 0;
    for (i = 0; i < edits.length && checked < 8; i++) {
        e = edits[i];
        if (!e || !e.column) { continue; }
        checked++;
        try {
            if (types[e.column] === DRAWING_TYPE) {
                got  = String(column.getEntry(e.column, 1, parseInt(e.frame, 10)));
                want = String(e.value);
            } else {
                got  = Number(column.getEntry(e.column, 1, parseInt(e.frame, 10)));
                want = Number(e.value);
                if (Math.abs(got - want) < 1e-6) { got = want; }
            }
            if (got !== want) { mism++; }
        } catch (ex) { mism++; }
    }
    return { sampled: checked, mismatched: mism,
             scene_writable: mism === 0 ? true : "suspect — scene may be locked or read-only" };
}

function has(o, k) { return o && (o.hasOwnProperty ? o.hasOwnProperty(k) : (typeof o[k] !== "undefined")); }

/* --------------------------------------------------------------------------
 * 4. curve_get
 * ------------------------------------------------------------------------*/

MCPB.registerOp("curve_get", { mutates: false, fn: function (args) {
    var name = String(args.column || "");
    if (!name) { throw opErr("BAD_REQUEST", "column required"); }
    var t = columnType(name);
    if (!VALUE_TYPES[String(t)]) { throw opErr("WRONG_TYPE", "column " + name + " is " + t + ", not a function curve"); }

    var np = 0, i, keys = [], k;
    try { np = func.numberOfPoints(name); } catch (e) { throw opErr("UNSUPPORTED_API", "func.numberOfPoints failed: " + e); }

    for (i = 0; i < np; i++) {
        k = { index: i, frame: safe(func.pointX, name, i), value: safe(func.pointY, name, i) };
        k.handles = {
            lx: safe(func.pointHandleLeftX,  name, i), ly: safe(func.pointHandleLeftY,  name, i),
            rx: safe(func.pointHandleRightX, name, i), ry: safe(func.pointHandleRightY, name, i)
        };
        k.const_segment = safe(func.pointConstSeg, name, i);
        k.continuity    = safe(func.pointContinuity, name, i);
        if (String(t) === "EASE") {
            k.ease = { in: safe(func.pointEaseIn, name, i), out: safe(func.pointEaseOut, name, i) };
        }
        keys.push(k);
    }
    return { column: name, type: t, keys: keys,
             handle_convention: MCPB.curveConvention || "unknown — run op:curve_calibrate" };
}});

/* --------------------------------------------------------------------------
 * 5. curve_calibrate — то, чего не было в спеке, но без чего нельзя писать
 *
 *    Документация не фиксирует, абсолютны ли аргументы хендлов в
 *    setBezierPoint или это смещения от точки. Round-trip get->set безопасен
 *    при любой конвенции; синтез кривой с нуля — нет. Неверная догадка не
 *    падает, она даёт ТИХО неправильные изинги, что хуже.
 *
 *    Пишем зонд в служебную колонку, читаем обратно, делаем вывод, убираем.
 * ------------------------------------------------------------------------*/

MCPB.registerOp("curve_calibrate", { mutates: true, fn: function (args) {
    var probe = "MCPB_CALIB_" + (new Date()).getTime();
    var created = false, verdict = "unknown", detail = {};

    try {
        if (typeof column.add !== "function") { throw opErr("UNSUPPORTED_API", "column.add unavailable"); }
        column.add(probe, "BEZIER");
        created = true;

        func.setBezierPoint(probe, 1,  0.0, 0, 0,  6, 0, false, "SMOOTH");
        func.setBezierPoint(probe, 25, 100.0, -6, 0, 0, 0, false, "SMOOTH");

        var rx1 = func.pointHandleRightX(probe, 0);
        var lx2 = func.pointHandleLeftX(probe, 1);
        detail = { wrote_right_x: 6, read_right_x: rx1, wrote_left_x: -6, read_left_x: lx2,
                   key1_frame: func.pointX(probe, 0), key2_frame: func.pointX(probe, 1) };

        /* Если наружу отдаётся ~6 — хендлы относительные (как записали).
           Если ~7 (frame 1 + 6) — абсолютные в координатах кадра. */
        if (rx1 !== null && Math.abs(rx1 - 6) < 0.51)      { verdict = "relative"; }
        else if (rx1 !== null && Math.abs(rx1 - 7) < 0.51) { verdict = "absolute"; }
        else { verdict = "inconclusive"; }
    } catch (e) {
        detail.error = String(e);
        verdict = "failed";
    } finally {
        /* Служебную колонку убрать обязательно: иначе калибровка засоряет
           сцену художника по одной колонке за вызов. Если удалить нечем —
           говорим об этом вслух, а не оставляем мусор молча. */
        if (created) {
            var removed = false;
            try {
                if (typeof column.removeUnlinkedFunctionColumn === "function") {
                    column.removeUnlinkedFunctionColumn(probe); removed = true;
                }
            } catch (e2) { detail.cleanup_error = String(e2); }
            detail.probe_column = probe;
            detail.probe_removed = removed;
            if (!removed) { detail.cleanup_hint = "remove column '" + probe + "' manually"; }
        }
    }

    MCPB.curveConvention = verdict;
    return { convention: verdict, detail: detail,
             note: verdict === "relative" || verdict === "absolute"
                   ? "curve_set and spacing_synthesize may now write handles"
                   : "REFUSE to synthesize handles; use round-trip edits only" };
}});

/* --------------------------------------------------------------------------
 * 6. curve_set
 *
 *    replace=true — не «удалить все ключи», а «привести к заданному набору»:
 *    ключи вне списка удаляются, совпадающие по кадру перезаписываются.
 *    Полное обнуление колонки отдельным флагом clear=true, чтобы случайная
 *    передача пустого keys[] не стирала анимацию.
 * ------------------------------------------------------------------------*/

MCPB.registerOp("curve_set", { mutates: true, fn: function (args, ctx) {
    var name = String(args.column || "");
    if (!name) { throw opErr("BAD_REQUEST", "column required"); }
    var t = String(columnType(name));
    if (!VALUE_TYPES[t]) { throw opErr("WRONG_TYPE", "column " + name + " is " + t); }

    var keys = args.keys || [];
    if (!keys.length && !args.clear) {
        throw opErr("BAD_REQUEST", "empty keys[]; pass clear:true to wipe the column deliberately");
    }

    var synth = false, i, k;
    for (i = 0; i < keys.length; i++) {
        k = keys[i];
        if (k && k.handles && (k.handles.rx !== null && typeof k.handles.rx !== "undefined")) { synth = true; }
    }
    if (synth && !(MCPB.curveConvention === "relative" || MCPB.curveConvention === "absolute")) {
        throw opErr("UNCALIBRATED",
            "writing bezier handles requires a known convention; run op:curve_calibrate first " +
            "(or omit handles to let Harmony infer them)");
    }

    var wrote = 0, before = null;
    try { before = func.numberOfPoints(name); } catch (e) {}

    if (args.clear) { clearColumn(name); }

    for (i = 0; i < keys.length; i++) {
        if (i % 32 === 0) { ctx.budget(); }
        k = keys[i];
        if (!k || !isFinite(Number(k.frame))) { continue; }
        writeKey(name, t, k);
        wrote++;
    }

    if (args.replace && !args.clear) { pruneKeysNotIn(name, keys, ctx); }

    return { column: name, keys_written: wrote,
             points_before: before, points_after: safe(func.numberOfPoints, name),
             convention_used: MCPB.curveConvention || null };
}});

function writeKey(name, t, k) {
    var f = Number(k.frame), v = Number(k.value);
    var h = k.handles || {};
    var cont = k.continuity || "SMOOTH";
    var cs   = !!k.const_segment;

    if (t === "EASE" && k.ease && typeof func.setEaseKeyFrame === "function") {
        func.setEaseKeyFrame(name, f, v, num(k.ease.in, 0), num(k.ease.in_angle, 0),
                             num(k.ease.out, 0), num(k.ease.out_angle, 0), cs, cont);
        return;
    }
    if (typeof func.setBezierPoint !== "function") {
        throw opErr("UNSUPPORTED_API", "func.setBezierPoint unavailable on this build");
    }
    func.setBezierPoint(name, f, v,
        num(h.lx, 0), num(h.ly, 0), num(h.rx, 0), num(h.ry, 0), cs, cont);
}

function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }

function clearColumn(name) {
    var np = safe(func.numberOfPoints, name), i, f, frames = [];
    if (!np) { return; }
    for (i = 0; i < np; i++) { frames.push(func.pointX(name, i)); }
    for (i = frames.length - 1; i >= 0; i--) {
        try { func.removeKeyFrame(name, frames[i]); } catch (e) {}
    }
}

function pruneKeysNotIn(name, keys, ctx) {
    var keep = {}, i, np, f, drop = [];
    for (i = 0; i < keys.length; i++) { keep[String(Number(keys[i].frame))] = 1; }
    np = safe(func.numberOfPoints, name) || 0;
    for (i = 0; i < np; i++) {
        f = func.pointX(name, i);
        if (!keep[String(f)]) { drop.push(f); }
    }
    for (i = drop.length - 1; i >= 0; i--) {
        ctx.budget();
        try { func.removeKeyFrame(name, drop[i]); } catch (e) {}
    }
}

/* --------------------------------------------------------------------------
 * 7. curve_sample — семплы по кадрам
 *
 *    Нужен трижды: (а) модель проверяет спейсинг численно, не рендеря;
 *    (б) вход для аудита дуг (идея №18); (в) детектор мёртвых холдов (№25).
 *    Семплирует ИНТЕРПОЛИРОВАННОЕ значение, а не ключи.
 * ------------------------------------------------------------------------*/

MCPB.registerOp("curve_sample", { mutates: false, fn: function (args, ctx) {
    var name = String(args.column || "");
    var from = intOr(args.from, 1), to = intOr(args.to, frame.numberOf());
    var t = String(columnType(name));
    if (!VALUE_TYPES[t]) { throw opErr("WRONG_TYPE", "column " + name + " is " + t); }
    if (to < from) { throw opErr("BAD_RANGE", "to < from"); }
    if (to - from > 20000) { throw opErr("BAD_RANGE", "range too large; chunk it"); }

    var f, i = 0, vals = [], v, prev = null, vel = [], acc = [];
    for (f = from; f <= to; f++) {
        if (i % 256 === 0) { ctx.budget(); }
        v = null;
        try { v = column.getEntry(name, 1, f); } catch (e) {}
        if (v === null || v === "") { try { v = func.valueAtFrame ? func.valueAtFrame(name, f) : null; } catch (e2) { v = null; } }
        v = (v === null) ? null : Number(v);
        vals.push(v);
        if (prev !== null && v !== null) { vel.push(v - prev); }
        prev = v;
        i++;
    }
    for (i = 1; i < vel.length; i++) { acc.push(vel[i] - vel[i - 1]); }

    return { column: name, from: from, to: to, values: vals,
             velocity: vel, acceleration: acc,
             stats: { min: minOf(vals), max: maxOf(vals),
                      flat_frames: countFlat(vel), reversals: countSignFlips(vel) } };
}});

function minOf(a) { var m = null, i; for (i = 0; i < a.length; i++) { if (a[i] !== null && (m === null || a[i] < m)) { m = a[i]; } } return m; }
function maxOf(a) { var m = null, i; for (i = 0; i < a.length; i++) { if (a[i] !== null && (m === null || a[i] > m)) { m = a[i]; } } return m; }
function countFlat(v) { var c = 0, i; for (i = 0; i < v.length; i++) { if (v[i] !== null && Math.abs(v[i]) < 1e-9) { c++; } } return c; }
function countSignFlips(v) {
    var c = 0, i, p = 0, s;
    for (i = 0; i < v.length; i++) {
        if (v[i] === null || Math.abs(v[i]) < 1e-9) { continue; }
        s = v[i] > 0 ? 1 : -1;
        if (p !== 0 && s !== p) { c++; }
        p = s;
    }
    return c;
}

MCPB.registerOp("columns_selftest", { mutates: false, fn: function () {
    var probes = ["column.numberOf", "column.getName", "column.type", "column.getEntry", "column.setEntry",
                  "column.add", "func.numberOfPoints", "func.pointX", "func.pointY",
                  "func.pointHandleLeftX", "func.setBezierPoint", "func.setEaseKeyFrame",
                  "func.removeKeyFrame", "func.addKeyFrame", "func.valueAtFrame", "node.linkedColumn",
                  "node.getAttrList"];
    var out = {}, i, parts, root, ok;
    for (i = 0; i < probes.length; i++) {
        parts = probes[i].split(".");
        try { root = eval(parts[0]); ok = (root && typeof root[parts[1]] === "function"); } catch (e) { ok = false; }
        out[probes[i]] = ok;
    }
    return { probes: out, convention: MCPB.curveConvention || "unknown",
             ready_for_synthesis: (MCPB.curveConvention === "relative" || MCPB.curveConvention === "absolute") };
}});

MessageLog.trace("[mcpb] columns.js registered: xsheet_list/get/set, curve_get/set/sample/calibrate, columns_selftest");

})();
