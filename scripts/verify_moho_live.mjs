#!/usr/bin/env node
/**
 * verify_moho_live.mjs — живая проверка связи «единый MCP-сервер -> Moho».
 *
 * Это НЕ юнит-тест и НЕ мок. Скрипт поднимает собранный сервер настоящим
 * дочерним процессом, проводит настоящий MCP-хендшейк по stdio и вызывает
 * настоящий read-only тул. Единственный источник истины о том, отвечает ли
 * живой Moho — файл ответа, который пишет Lua-плагин внутри приложения.
 *
 * Почему различать три исхода, а не просто «прошло/упало»:
 * общий таймаут скрывает главное. Отсутствие ответа означает совершенно
 * разные вещи в зависимости от того, лежит ли req_<id>.json в spool. Если
 * запрос не ушёл — виноват мост. Если ушёл и лежит непрочитанным — виноват
 * опрос внутри Moho, который привязан к перерисовке окна (~4 Гц) и
 * замедляется на простаивающем неактивном окне (см. ARCHITECTURE.md §2.3).
 * Поэтому спул инспектируется до, во время и после вызова.
 *
 * Исходы и коды выхода:
 *   0  LIVE_OK            — живой Moho ответил данными
 *   3  NOT_CONNECTED      — Moho не запущен / плагин не установлен, связь не проверена
 *   4  SPOOL_STALLED      — запрос ушёл в spool, ответа нет: простаивающий опрос
 *   5  BRIDGE_FAILED      — мост не смог даже записать запрос
 *   6  HARNESS_FAILED     — сломался сам стенд (сборка, хендшейк, протокол)
 *
 * Использование:
 *   node scripts/verify_moho_live.mjs
 *   node scripts/verify_moho_live.mjs --tool moho.document.get_info --timeout 45000
 *   node scripts/verify_moho_live.mjs --ipc-dir /tmp/moho-mcp
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

const EXIT = {
  LIVE_OK: 0,
  NOT_CONNECTED: 3,
  SPOOL_STALLED: 4,
  BRIDGE_FAILED: 5,
  HARNESS_FAILED: 6,
};

/* ------------------------------------------------------------------ */
/* Аргументы                                                          */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const out = {
    tool: "moho.system.diagnose",
    // Запас над дефолтным requestTimeout моста (10 c). Опрос Moho идёт на
    // ~4 Гц и просыпается по перерисовке, поэтому первый ответ после
    // старта приложения приходит заметно позже последующих.
    timeoutMs: 45_000,
    ipcDir: null,
    serverEntry: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined) throw new Error(`Опция ${a} требует значение`);
      i += 1;
      return v;
    };
    if (a === "--tool") out.tool = next();
    else if (a === "--timeout") {
      const n = Number(next());
      if (!Number.isFinite(n) || n <= 0) throw new Error("--timeout должен быть положительным числом мс");
      out.timeoutMs = n;
    } else if (a === "--ipc-dir") out.ipcDir = next();
    else if (a === "--server") out.serverEntry = next();
    else if (a === "-h" || a === "--help") {
      process.stdout.write(
        [
          "Использование: node scripts/verify_moho_live.mjs [опции]",
          "",
          "  --tool <name>     MCP-тул для вызова (по умолчанию moho.system.diagnose)",
          "  --timeout <ms>    ожидание ответа тула (по умолчанию 45000)",
          "  --ipc-dir <path>  переопределить spool (иначе как решит config моста)",
          "  --server <path>   путь к собранному index.js",
          "",
          "Коды выхода: 0 живой ответ | 3 нет связи | 4 spool завис | 5 мост упал | 6 стенд упал",
          "",
        ].join("\n"),
      );
      process.exit(0);
    } else throw new Error(`Неизвестная опция: ${a}`);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Вывод                                                              */
/* ------------------------------------------------------------------ */

const log = (s = "") => process.stdout.write(`${s}\n`);
const section = (t) => {
  log();
  log(`── ${t} ${"─".repeat(Math.max(0, 66 - t.length))}`);
};
const kv = (k, v) => log(`  ${k.padEnd(22)} ${v}`);

/** Печать значения целиком, дословно. Никаких пересказов и сокращений. */
function verbatim(label, value) {
  log(`  ${label}:`);
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  for (const line of String(text).split("\n")) log(`    | ${line}`);
}

/* ------------------------------------------------------------------ */
/* Разведка окружения                                                 */
/* ------------------------------------------------------------------ */

/**
 * Запущен ли Moho. Читаем таблицу процессов напрямую, без вызова `ps` через
 * shell: строка `grep -i moho` матчит и командную строку самого агента, и
 * конфиги клиентов, где встречается слово moho. Точный матч по имени
 * исполняемого файла в bundle исключает такие ложные срабатывания.
 */
async function detectMohoProcess() {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  try {
    const { stdout } = await run("/bin/ps", ["-Ao", "pid=,comm="], { maxBuffer: 8 * 1024 * 1024 });
    const hits = stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = l.match(/^(\d+)\s+(.*)$/);
        return m ? { pid: Number(m[1]), comm: m[2] } : null;
      })
      .filter((p) => p && /\/Moho\.app\/Contents\/MacOS\/|(^|\/)Moho( Pro)?[^/]*$/i.test(p.comm));
    return { running: hits.length > 0, processes: hits };
  } catch (err) {
    return { running: false, processes: [], error: err instanceof Error ? err.message : String(err) };
  }
}

/** Установлен ли Lua-плагин. Плагин обязан лежать рядом со своим moho_mcp/. */
async function detectPlugin() {
  const scriptsRoot = path.join(os.homedir(), "Library", "Application Support", "Moho", "scripts");
  const candidates = [
    path.join(scriptsRoot, "menu"),
    path.join(scriptsRoot, "menu", "MohoMCP"),
    path.join(scriptsRoot, "tool"),
  ];
  const found = [];
  for (const dir of candidates) {
    const server = path.join(dir, "MohoMCP_Server.lua");
    const poller = path.join(dir, "MohoMCP_Poller.lua");
    const core = path.join(dir, "moho_mcp", "server.lua");
    const has = (p) => fs.existsSync(p);
    if (has(server) || has(poller)) {
      found.push({
        dir,
        server: has(server),
        poller: has(poller),
        core: has(core),
        // Стенд не судит о содержимом плагина: он лишь фиксирует, что
        // загружаемый модуль на месте. Диагностика конкретных ошибок Lua —
        // дело владельца moho-plugin/.
      });
    }
  }
  return { installed: found.length > 0, locations: found, scriptsRoot };
}

/** Снимок spool-директории: что именно в ней лежит на данный момент. */
async function snapshotSpool(dir) {
  try {
    const names = await fsp.readdir(dir);
    const entries = [];
    for (const name of names.sort()) {
      const p = path.join(dir, name);
      try {
        const st = await fsp.lstat(p);
        entries.push({
          name,
          bytes: st.isFile() ? st.size : null,
          kind: st.isDirectory() ? "dir" : st.isSymbolicLink() ? "symlink" : "file",
          mtime: st.mtime.toISOString(),
        });
      } catch {
        // Файл исчез между readdir и lstat — нормальная гонка с плагином.
      }
    }
    return { exists: true, dir, entries };
  } catch (err) {
    const code = err?.code;
    return { exists: false, dir, error: code === "ENOENT" ? "директории нет" : String(err?.message ?? err) };
  }
}

const isRequest = (n) => /^req_\d+\.json$/.test(n);
const isResponse = (n) => /^resp_\d+\.json$/.test(n);
const isTemp = (n) => n.endsWith(".tmp");

/**
 * Состояние single-consumer блокировки моста.
 *
 * Отдельная проверка, потому что чужой `client_lock.json` даёт ровно тот же
 * внешний симптом, что мёртвый Moho — `status: DEGRADED` и никакого ответа, —
 * но причина совершенно другая и к Moho отношения не имеет. Без этой проверки
 * брошенный процесс другого прогона выглядел бы как «Moho не отвечает», и
 * вердикт обвинял бы не того. Живой держатель — законная причина отложить
 * прогон; мёртвый — мусор, который нужно назвать мусором.
 */
async function inspectClientLock(ipcDir) {
  const lockPath = path.join(ipcDir, "client_lock.json");
  if (!fs.existsSync(lockPath)) return { present: false };
  let pid = null;
  let raw = "";
  try {
    raw = await fsp.readFile(lockPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.pid === "number") pid = parsed.pid;
  } catch {
    return { present: true, path: lockPath, pid: null, holderAlive: false, raw, corrupt: true };
  }
  let holderAlive = false;
  if (pid !== null) {
    try {
      process.kill(pid, 0); // сигнал 0 — только проверка существования
      holderAlive = true;
    } catch (err) {
      holderAlive = err?.code === "EPERM"; // жив, но чужой пользователь
    }
  }
  return { present: true, path: lockPath, pid, holderAlive, raw, corrupt: false };
}

/**
 * Работает ли опрос плагина, судя по его собственным файлам состояния.
 *
 * Плагин пишет `health.json` первым делом в каждом `poll()` и удаляет его в
 * `server.stop()`; `cursor.json` он пишет, наоборот, при остановке. Поэтому
 * пара «cursor есть, health нет» — не случайность, а подпись остановленного
 * сервера: `poll()` выходит на первой строке по `if not isRunning`.
 *
 * Это отличает «плагин установлен» от «плагин работает» — снаружи неразличимые
 * состояния, дающие одинаковую тишину в ответ. Без этого совет пользователю был
 * бы гаданием: перезапускать Moho или нажать «Start» в меню Scripts.
 */
async function inspectPluginRuntime(ipcDir) {
  const read = async (name) => {
    try {
      const p = path.join(ipcDir, name);
      const st = await fsp.lstat(p);
      return { present: true, mtime: st.mtime.toISOString(), text: await fsp.readFile(p, "utf-8") };
    } catch {
      return { present: false };
    }
  };
  const [health, cursor] = await Promise.all([read("health.json"), read("cursor.json")]);
  let state = "UNKNOWN";
  if (health.present) state = "POLLING";
  else if (cursor.present) state = "STOPPED";
  else state = "NEVER_STARTED";
  return { state, health, cursor };
}

/* ------------------------------------------------------------------ */
/* MCP-клиент по stdio                                                */
/* ------------------------------------------------------------------ */

/**
 * Минимальный MCP-клиент. Читает построчный JSON-RPC с stdout сервера.
 * Свой клиент, а не SDK: стенд должен ломаться на своих ошибках, а не на
 * чужой обёртке, и обязан видеть сырой транспорт как есть.
 */
class StdioMcpClient {
  constructor(child) {
    this.child = child;
    this.nextId = 1;
    this.pending = new Map();
    this.stderr = "";
    this.exited = null;
    this.buffer = "";

    child.stdout.setEncoding("utf-8");
    child.stdout.on("data", (chunk) => this.#onStdout(chunk));
    child.stderr.setEncoding("utf-8");
    child.stderr.on("data", (chunk) => {
      this.stderr += chunk;
    });
    child.on("exit", (code, signal) => {
      this.exited = { code, signal };
      const err = new Error(`сервер завершился раньше ответа (code=${code}, signal=${signal})`);
      for (const [, p] of this.pending) p.reject(err);
      this.pending.clear();
    });
  }

  #onStdout(chunk) {
    this.buffer += chunk;
    let idx;
    while ((idx = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue; // не-JSON строка на stdout: не наше сообщение
      }
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        p.resolve(msg);
      }
    }
  }

  notify(method, params = {}) {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  request(method, params = {}, timeoutMs = 15_000) {
    const id = this.nextId++;
    const payload = { jsonrpc: "2.0", id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`таймаут ${timeoutMs}ms на ${method}`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.child.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  async close() {
    if (this.exited) return;
    this.child.stdin.end();
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        this.child.kill("SIGKILL");
        resolve();
      }, 3000);
      this.child.once("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
}

/* ------------------------------------------------------------------ */
/* Классификация исхода                                               */
/* ------------------------------------------------------------------ */

/**
 * Что означает текст ответа тула. Тулы Moho ловят ошибки IPC и возвращают их
 * как обычный успешный MCP-результат (`status: DEGRADED`), поэтому «пришёл
 * ответ по MCP» не равно «Moho ответил». Судим по содержимому и по тому,
 * остался ли запрос лежать в spool.
 */
function classify({ toolText, spoolDuring, spoolAfter }) {
  const text = toolText ?? "";
  const notRunning =
    /MOHO_NOT_RUNNING|Not connected to MOHO|Is the MOHO application running/i.test(text);
  const timedOut = /IPC_TIMEOUT|timed out after \d+ms|running and polling/i.test(text);
  const degraded = /"status"\s*:\s*"DEGRADED"/i.test(text);

  const leftoverDuring = spoolDuring.exists
    ? spoolDuring.entries.filter((e) => isRequest(e.name))
    : [];
  const leftoverAfter = spoolAfter.exists ? spoolAfter.entries.filter((e) => isRequest(e.name)) : [];
  const requestWasSpooled = leftoverDuring.length > 0 || leftoverAfter.length > 0;

  if (notRunning) {
    return {
      verdict: "NOT_CONNECTED",
      exit: EXIT.NOT_CONNECTED,
      confirmed: false,
      reason:
        "Мост не смог установить связь: Moho не запущен либо плагин не загружен. " +
        "Связь НЕ проверена.",
    };
  }

  if (timedOut || degraded) {
    // Ключевое различение. Запрос ушёл в spool и остался непрочитанным ->
    // это ровно поведение простаивающего опроса, а не поломка моста.
    if (requestWasSpooled) {
      return {
        verdict: "SPOOL_STALLED",
        exit: EXIT.SPOOL_STALLED,
        confirmed: false,
        reason:
          "Запрос УШЁЛ в spool, но плагин его не прочитал и ответа не вернул. " +
          "Мост исправен. Опрос внутри Moho работает на событиях перерисовки окна (~4 Гц) " +
          "и на простаивающем неактивном окне может не обрабатывать запросы вовсе.",
      };
    }
    return {
      verdict: "SPOOL_STALLED",
      exit: EXIT.SPOOL_STALLED,
      confirmed: false,
      reason:
        "Ответа нет. Запрос в spool при проверке не наблюдался — мост его либо уже убрал " +
        "по таймауту (он удаляет req_ при истечении), либо плагин прочитал запрос, но не ответил. " +
        "Живой ответ НЕ получен.",
    };
  }

  return {
    verdict: "LIVE_OK",
    exit: EXIT.LIVE_OK,
    confirmed: true,
    reason: "Живой Moho вернул данные через файловый IPC.",
  };
}

/* ------------------------------------------------------------------ */
/* Основной сценарий                                                  */
/* ------------------------------------------------------------------ */

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  log("═".repeat(72));
  log(" ЖИВАЯ ПРОВЕРКА СВЯЗИ: единый MCP-сервер -> Moho");
  log("═".repeat(72));
  kv("время", new Date().toISOString());
  kv("репозиторий", REPO);
  kv("node", process.version);
  kv("платформа", `${os.platform()} ${os.release()}`);

  /* --- 1. Точка входа сервера ------------------------------------- */
  section("1. Собранный сервер");
  const entryCandidates = opts.serverEntry
    ? [path.resolve(opts.serverEntry)]
    : [path.join(REPO, ".probe-dist", "index.js"), path.join(REPO, "dist", "index.js")];
  const entry = entryCandidates.find((p) => fs.existsSync(p));
  if (!entry) {
    kv("статус", "НЕ НАЙДЕН");
    for (const c of entryCandidates) kv("искал", c);
    log();
    log("  Сначала соберите проект (в проекте, не в /tmp — иначе не видно node_modules):");
    log("    npx tsc --outDir .probe-dist");
    log();
    log("ВЕРДИКТ: HARNESS_FAILED — стенд не может запуститься, связь НЕ проверена.");
    return EXIT.HARNESS_FAILED;
  }
  kv("точка входа", entry);

  /* --- 2. Окружение Moho ------------------------------------------ */
  section("2. Окружение Moho");
  const [proc, plugin] = await Promise.all([detectMohoProcess(), detectPlugin()]);
  kv("Moho запущен", proc.running ? "ДА" : "НЕТ");
  for (const p of proc.processes) kv("  процесс", `pid=${p.pid} ${p.comm}`);
  if (proc.error) kv("  ошибка ps", proc.error);
  kv("плагин установлен", plugin.installed ? "ДА" : "НЕТ");
  for (const loc of plugin.locations) {
    kv(
      "  расположение",
      `${loc.dir} [server=${loc.server ? "да" : "нет"} poller=${loc.poller ? "да" : "нет"} moho_mcp=${loc.core ? "да" : "нет"}]`,
    );
  }
  if (!plugin.installed) kv("  ожидалось в", plugin.scriptsRoot);

  /* --- 3. Spool до вызова ----------------------------------------- */
  section("3. Spool-директория (до вызова)");
  // Тот же порядок разрешения, что в src/moho/config.ts: MOHO_IPC_DIR, потом
  // MOHO_MCP_IPC_DIR, потом дефолт платформы. Если порядок разойдётся,
  // стенд будет смотреть не в ту директорию, куда пишет мост.
  const childEnv = { ...process.env, ANIM_HOST: "moho" };
  if (opts.ipcDir) {
    childEnv.MOHO_IPC_DIR = opts.ipcDir;
    delete childEnv.MOHO_MCP_IPC_DIR;
  }
  const ipcDir =
    childEnv.MOHO_IPC_DIR ??
    childEnv.MOHO_MCP_IPC_DIR ??
    path.join(os.homedir(), "Library", "Application Support", "MohoMCP", "ipc");
  kv("spool", ipcDir);
  kv("источник", opts.ipcDir ? "--ipc-dir" : childEnv.MOHO_IPC_DIR ? "MOHO_IPC_DIR" : childEnv.MOHO_MCP_IPC_DIR ? "MOHO_MCP_IPC_DIR" : "дефолт платформы");
  const spoolBefore = await snapshotSpool(ipcDir);
  if (!spoolBefore.exists) kv("состояние", spoolBefore.error);
  else if (spoolBefore.entries.length === 0) kv("состояние", "пусто");
  else for (const e of spoolBefore.entries) kv(`  ${e.kind}`, `${e.name} (${e.bytes ?? "-"} б, ${e.mtime})`);

  // Блокировка проверяется ДО запуска: чужой держатель не даст моста
  // подключиться, и без явного диагноза это выглядело бы как отказ Moho.
  const lock = await inspectClientLock(ipcDir);
  if (lock.present) {
    kv(
      "client_lock.json",
      lock.corrupt
        ? "присутствует, но нечитаем (мост сочтёт его устаревшим и заберёт)"
        : `держит PID ${lock.pid ?? "?"} — ${lock.holderAlive ? "ПРОЦЕСС ЖИВ" : "процесс мёртв (мусор)"}`,
    );
    if (lock.holderAlive) {
      log();
      log("  Другой MCP-клиент уже держит spool. Мост не сможет подключиться, и");
      log("  результат не будет говорить ничего о живом Moho. Прогон прерван,");
      log("  чтобы не выдать чужую блокировку за отказ Moho.");
      log();
      log(`  Отпустите держателя (PID ${lock.pid}) и повторите.`);
      log();
      log("ВЕРДИКТ: связь с живым Moho НЕ проверена (spool занят другим клиентом).");
      return EXIT.HARNESS_FAILED;
    }
    if (!lock.holderAlive) {
      // Мост сам умеет забирать просроченную блокировку, но только после
      // истечения TTL. До этого он честно отказывается стартовать. Убираем
      // заведомо мёртвую блокировку, иначе прогон измерял бы этот TTL.
      await fsp.unlink(lock.path).catch(() => undefined);
      kv("  действие", "мёртвая блокировка удалена стендом");
    }
  } else {
    kv("client_lock.json", "нет — spool свободен");
  }

  const runtime = await inspectPluginRuntime(ipcDir);
  kv(
    "опрос плагина",
    runtime.state === "POLLING"
      ? "РАБОТАЕТ (health.json пишется)"
      : runtime.state === "STOPPED"
        ? "ОСТАНОВЛЕН (есть cursor.json, нет health.json — подпись server.stop())"
        : "НИКОГДА НЕ СТАРТОВАЛ (ни health.json, ни cursor.json)",
  );
  if (runtime.health.present) kv("  health.json", `${runtime.health.mtime}`);
  if (runtime.cursor.present) kv("  cursor.json", `${runtime.cursor.mtime}`);

  /* --- 4. Запуск и хендшейк --------------------------------------- */
  section("4. Запуск сервера и MCP-хендшейк");
  const child = spawn(process.execPath, [entry], {
    cwd: REPO,
    env: childEnv,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const client = new StdioMcpClient(child);
  kv("команда", `ANIM_HOST=moho ${path.basename(process.execPath)} ${path.relative(REPO, entry)}`);
  kv("pid сервера", String(child.pid));

  let toolText = null;
  let toolRaw = null;
  let spoolDuring = { exists: false, dir: ipcDir, entries: [] };
  let bridgeFailure = null;

  try {
    const init = await client.request(
      "initialize",
      {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "verify_moho_live", version: "1.0.0" },
      },
      20_000,
    );
    if (init.error) throw new Error(`initialize вернул ошибку: ${JSON.stringify(init.error)}`);
    kv("initialize", "OK");
    kv("  сервер", `${init.result?.serverInfo?.name ?? "?"} ${init.result?.serverInfo?.version ?? ""}`);
    kv("  протокол", String(init.result?.protocolVersion ?? "?"));

    client.notify("notifications/initialized");
    kv("initialized", "отправлено");

    const list = await client.request("tools/list", {}, 20_000);
    if (list.error) throw new Error(`tools/list вернул ошибку: ${JSON.stringify(list.error)}`);
    const names = (list.result?.tools ?? []).map((t) => t.name);
    kv("тулов", String(names.length));
    kv("все с moho.", names.length > 0 && names.every((n) => n.startsWith("moho.")) ? "ДА" : "НЕТ");

    if (!names.includes(opts.tool)) {
      kv("целевой тул", `${opts.tool} — НЕ НАЙДЕН`);
      verbatim("доступные (первые 15)", names.slice(0, 15));
      log();
      log("ВЕРДИКТ: HARNESS_FAILED — целевого тула нет в наборе, связь НЕ проверена.");
      await client.close();
      return EXIT.HARNESS_FAILED;
    }
    kv("целевой тул", `${opts.tool} — найден`);

    /* --- 5. Реальный вызов --------------------------------------- */
    section("5. Вызов реального тула (read-only)");
    kv("тул", opts.tool);
    kv("Lua-метод", "document.getInfo (по инварианту нейминга контракта)");
    kv("таймаут", `${opts.timeoutMs} мс`);
    log("  ожидание ответа от живого Moho...");

    // Спул снимается ПОКА вызов в полёте: только так видно, ушёл ли запрос.
    // После таймаута мост сам удаляет req_<id>.json, и следов уже не будет —
    // именно тот случай, который иначе выглядел бы как «мост не записал».
    const started = Date.now();
    const midpoint = setTimeout(async () => {
      spoolDuring = await snapshotSpool(ipcDir);
    }, Math.min(2500, Math.floor(opts.timeoutMs / 3)));

    let call;
    try {
      call = await client.request(
        "tools/call",
        { name: opts.tool, arguments: {} },
        opts.timeoutMs,
      );
    } finally {
      clearTimeout(midpoint);
    }
    const elapsed = Date.now() - started;
    kv("прошло", `${elapsed} мс`);

    if (call.error) {
      toolRaw = call.error;
      toolText = JSON.stringify(call.error);
      kv("транспорт", "JSON-RPC error");
    } else {
      toolRaw = call.result;
      const parts = call.result?.content ?? [];
      toolText = parts.map((p) => (typeof p?.text === "string" ? p.text : JSON.stringify(p))).join("\n");
      kv("транспорт", `OK, isError=${String(call.result?.isError ?? false)}`);
    }

    log();
    verbatim("ДОСЛОВНЫЙ ОТВЕТ ТУЛА", toolText);
  } catch (err) {
    bridgeFailure = err instanceof Error ? err.message : String(err);
    kv("сбой стенда/моста", bridgeFailure);
  }

  /* --- 6. Spool во время и после ---------------------------------- */
  section("6. Spool во время вызова");
  if (!spoolDuring.exists) kv("состояние", spoolDuring.error ?? "снимок не снят");
  else if (spoolDuring.entries.length === 0) kv("состояние", "пусто (запрос не наблюдался)");
  else
    for (const e of spoolDuring.entries)
      kv(`  ${isRequest(e.name) ? "ЗАПРОС" : isResponse(e.name) ? "ОТВЕТ" : e.kind}`, `${e.name} (${e.bytes ?? "-"} б)`);

  section("7. Spool после прогона (проверка мусора)");
  await client.close();
  const spoolAfter = await snapshotSpool(ipcDir);
  if (!spoolAfter.exists) {
    kv("состояние", spoolAfter.error);
  } else if (spoolAfter.entries.length === 0) {
    kv("состояние", "пусто — мусора нет");
  } else {
    for (const e of spoolAfter.entries)
      kv(`  ${e.kind}`, `${e.name} (${e.bytes ?? "-"} б, ${e.mtime})`);
    const junk = spoolAfter.entries.filter(
      (e) => isRequest(e.name) || isResponse(e.name) || isTemp(e.name) || e.name === "client_lock.json",
    );
    kv("мусор", junk.length === 0 ? "нет" : junk.map((e) => e.name).join(", "));
    if (junk.some((e) => e.name === "client_lock.json")) {
      kv("  внимание", "client_lock.json остался: мост не снял блокировку при выходе");
    }
  }

  if (client.stderr.trim()) {
    section("8. stderr сервера (дословно)");
    for (const line of client.stderr.trimEnd().split("\n")) log(`    | ${line}`);
  }

  /* --- 9. Вердикт ------------------------------------------------- */
  section("9. Вердикт");

  if (bridgeFailure && toolText === null) {
    // Даже когда MCP-вызов не дождался ответа, spool уже сказал главное.
    // Лежащий непрочитанным req_ означает, что мост свою часть выполнил, и
    // это НЕ его сбой: молчит опрос внутри Moho. Свалить такой исход в
    // BRIDGE_FAILED значило бы обвинить исправный компонент.
    // Один и тот же req_ виден и в снимке «во время», и в снимке «после».
    // Дедуп по имени, иначе один файл выглядел бы как два запроса.
    const spooled = [
      ...new Map(
        [spoolDuring, spoolAfter]
          .filter((s) => s.exists)
          .flatMap((s) => s.entries)
          .filter((e) => isRequest(e.name))
          .map((e) => [e.name, e]),
      ).values(),
    ];

    kv("Moho запущен", proc.running ? "ДА" : "НЕТ");
    kv("плагин установлен", plugin.installed ? "ДА" : "НЕТ");
    kv("вызванный тул", opts.tool);

    if (spooled.length > 0) {
      kv("исход", "SPOOL_STALLED");
      kv("запрос в spool", spooled.map((e) => `${e.name} (${e.bytes} б)`).join(", "));
      log();
      log(`  MCP-вызов не дождался ответа: ${bridgeFailure}`);
      log("  Но запрос УШЁЛ в spool и остался непрочитанным. Мост исправен:");
      log("  он записал req_ и держал его всё время ожидания. Плагин внутри Moho");
      log("  запрос не прочитал и ответа не вернул. Опрос там работает на событиях");
      log("  перерисовки окна (~4 Гц) и на простаивающем окне не обрабатывает запросы.");
      if (runtime.state === "STOPPED" || runtime.state === "NEVER_STARTED") {
        log();
        log(`  Файлы состояния плагина подтверждают: опрос ${runtime.state === "STOPPED" ? "ОСТАНОВЛЕН" : "НЕ СТАРТОВАЛ"}.`);
        log("  Его нужно включить в Moho вручную (меню Scripts -> MohoMCP Server).");
      }
      log();
      log("ВЕРДИКТ: связь с живым Moho НЕ подтверждена — НЕТ.");
      log("  Ценный факт: сторона моста доказана, молчит сторона Moho.");
      return EXIT.SPOOL_STALLED;
    }

    kv("исход", "BRIDGE_FAILED");
    log();
    log(`  Причина: ${bridgeFailure}`);
    log("  Запрос в spool не наблюдался — тул не был вызван до конца, ответа от Moho нет.");
    log();
    log("ВЕРДИКТ: связь с живым Moho НЕ подтверждена (сбой моста/стенда).");
    return EXIT.BRIDGE_FAILED;
  }

  const result = classify({ toolText, spoolDuring, spoolAfter });
  kv("Moho запущен", proc.running ? "ДА" : "НЕТ");
  kv("плагин установлен", plugin.installed ? "ДА" : "НЕТ");
  kv("вызванный тул", opts.tool);
  kv("исход", result.verdict);
  log();
  log(`  ${result.reason}`);
  log();

  if (result.confirmed) {
    log("ВЕРДИКТ: связь с живым Moho ПОДТВЕРЖДЕНА — ДА.");
    log("  Тул вернул реальные данные документа из работающего приложения.");
  } else {
    log("ВЕРДИКТ: связь с живым Moho НЕ подтверждена — НЕТ.");
    log();
    log("  Что нужно сделать человеку (руками, скриптом это не автоматизируется):");
    if (!proc.running) {
      log("   1. Запустить Moho:  open -a Moho");
    }
    if (!plugin.installed) {
      log("   2. Установить плагин:  bash scripts/install_moho_plugin.sh");
      log("      затем перезапустить Moho.");
    }
    if (proc.running && plugin.installed) {
      // Совет зависит от того, что показали файлы состояния плагина: без этого
      // различения пользователю пришлось бы наугад выбирать между перезапуском
      // Moho и запуском опроса.
      if (runtime.state === "STOPPED" || runtime.state === "NEVER_STARTED") {
        log("   1. Опрос плагина НЕ запущен — это и есть причина тишины.");
        log(runtime.state === "STOPPED"
          ? "      Файлы состояния показывают подпись остановленного сервера"
          : "      Плагин ни разу не стартовал в этой сессии");
        log("      (см. раздел 3 выше). Сам он не поднимется.");
        log("   2. В Moho: открыть документ, затем в меню Scripts выбрать");
        log("      \"MohoMCP Server\" — заголовок должен стать 🟢 (Active).");
        log("      Либо выбрать инструмент \"MohoMCP Poller\" на панели инструментов.");
        log("   3. Держать окно Moho в фокусе и подвигать мышью над рабочей областью:");
        log("      опрос висит на событиях перерисовки (~4 Гц).");
        log("   4. Повторить:  node scripts/verify_moho_live.mjs");
      } else {
        log("   1. Опрос плагина запущен (health.json пишется), но ответа нет.");
        log("      Значит запрос доходит, а обработчик молчит: проверьте, открыт ли");
        log("      документ — читать состояние без документа нечего.");
        log("   2. Держать окно Moho в фокусе и подвигать мышью над рабочей областью.");
        log("   3. Повторить:  node scripts/verify_moho_live.mjs");
      }
    }
  }
  log();
  log("═".repeat(72));
  return result.exit;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    log();
    log(`СТЕНД УПАЛ: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
    log("ВЕРДИКТ: связь с живым Moho НЕ проверена.");
    process.exit(EXIT.HARNESS_FAILED);
  });
