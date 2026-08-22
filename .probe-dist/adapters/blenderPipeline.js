/**
 * blenderPipeline.ts — адаптер к доказанному Blender-конвейеру.
 *
 * ЗАЧЕМ. Конвейер (harmony/client/*.py) — единственная часть проекта,
 * которая реально доехала до пикселей в живом приложении: пять проб на
 * Blender 5.1.1. Но вызывался он только из терминала, руками. Всё
 * остальное — 528 тулов вокруг Harmony, который на этой машине не
 * запускается без лицензии.
 *
 * Обёртка нужна не для красоты. Она даёт три вещи, которых у
 * `subprocess.run` в терминале нет и быть не может:
 *   - схему аргументов: ошибка ловится ДО запуска Blender, а не через
 *     минуту рендера;
 *   - вызов из любого клиента, а не из одной папки одного человека;
 *   - отчёт, различающий беды (нет Blender / плохой набор рисунков /
 *     упал рендер), потому что художнику нужно действие, а не слово
 *     «ошибка».
 *
 * ГРАНИЦА ЧЕСТНАЯ: тут нет ни грамма семантики ремесла. Изинги, риг,
 * липсинк и проверки рисунков остаются в питоне, где они покрыты 343
 * тестами. Дублировать их здесь — значит завести вторую правду.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
/** Корень питоновского конвейера. */
export function clientDir() {
    return process.env.HARMONY_CLIENT_DIR
        || path.resolve(process.cwd(), 'harmony', 'client');
}
export function blenderBinary() {
    return process.env.BLENDER_BIN
        || '/Applications/Blender.app/Contents/MacOS/Blender';
}
export function pythonBinary() {
    return process.env.HARMONY_PYTHON || 'python3';
}
/**
 * Запустить питоновский фрагмент в каталоге конвейера.
 *
 * Скрипт передаётся через stdin, а не через `-c`: строка кода с кавычками
 * и переводами строк в аргументах командной строки ломается по-разному на
 * разных платформах, и отладка такой поломки уходит в шелл, а не в код.
 */
export async function runPython(code, timeoutMs = 900_000) {
    const cwd = clientDir();
    if (!fs.existsSync(cwd)) {
        return {
            ok: false, code: null, stdout: '',
            stderr: `pipeline directory not found: ${cwd}. Set HARMONY_CLIENT_DIR.`,
        };
    }
    return new Promise((resolve) => {
        const child = spawn(pythonBinary(), ['-'], { cwd });
        let out = '';
        let err = '';
        const timer = setTimeout(() => {
            child.kill('SIGKILL');
            err += `\n[timeout after ${timeoutMs} ms]`;
        }, timeoutMs);
        child.stdout.on('data', (d) => { out += d.toString(); });
        child.stderr.on('data', (d) => { err += d.toString(); });
        child.on('error', (e) => {
            clearTimeout(timer);
            resolve({ ok: false, code: null, stdout: out, stderr: `${err}\n${e.message}` });
        });
        child.on('close', (code) => {
            clearTimeout(timer);
            let parsed;
            // Ищем последнюю строку, которая целиком является JSON-объектом:
            // питон может печатать и логи, и результат.
            for (const line of out.trim().split('\n').reverse()) {
                const t = line.trim();
                if (t.startsWith('{') && t.endsWith('}')) {
                    try {
                        parsed = JSON.parse(t);
                        break;
                    }
                    catch { /* не тот */ }
                }
            }
            resolve({ ok: code === 0, code, stdout: out, stderr: err, json: parsed });
        });
        child.stdin.write(code);
        child.stdin.end();
    });
}
/** Доступен ли Blender. Дешёвая проверка ДО работы, а не после. */
export function blenderStatus() {
    const p = blenderBinary();
    if (!fs.existsSync(p)) {
        return {
            present: false, path: p,
            detail: `Blender not found at ${p}. Install it or set BLENDER_BIN.`,
        };
    }
    return { present: true, path: p, detail: 'binary present' };
}
/** Есть ли питоновский конвейер там, где мы его ждём. */
export function pipelineStatus() {
    const dir = clientDir();
    const need = ['artwork.py', 'audio.py', 'swaps.py', 'blender_host.py',
        'columns.py', 'craft.py', 'provenance.py'];
    const missing = need.filter((f) => !fs.existsSync(path.join(dir, f)));
    return { present: missing.length === 0, dir, missing };
}
/**
 * Экранирование пути для вставки в питоновский литерал.
 *
 * Не косметика: путь с апострофом (`/Users/o'brien/parts`) без этого
 * закрывает строку и превращает остаток пути в код. Пользовательский
 * ввод попадает в генерируемый скрипт, поэтому кавычки обязательны.
 */
export function pyStr(s) {
    return JSON.stringify(String(s));
}
