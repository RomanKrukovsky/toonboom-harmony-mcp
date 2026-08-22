/**
 * sceneAddress.ts — адресация сцены в студийном Harmony.
 *
 * ЗАЧЕМ. Студии работают НЕ с файлами `.xstage`, а с базой данных:
 * окружение → джоб → сцена → версия → пользователь. Весь написанный до
 * этого код умел только «путь к файлу», то есть покрывал режим
 * фрилансера и не покрывал ту работу, ради которой инструмент делается.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И ПОЧЕМУ. Здесь нет вызовов Harmony. Это разбор,
 * проверка и форматирование адреса — то, что можно проверить тестами
 * без лицензии. Всё, что требует базы, помечено и уходит в мост.
 *
 * ГЛАВНОЕ ОБЯЗАТЕЛЬСТВО: адрес обязан быть ОДНОЗНАЧНЫМ. Молчаливая
 * догадка «наверное он имел в виду последнюю версию» в студии стоит
 * чужой работы: правка уезжает в версию, которую кто-то сдал вчера.
 */
export class AddressError extends Error {
    code;
    remedy;
    constructor(code, message, remedy) {
        super(message);
        this.code = code;
        this.remedy = remedy;
        this.name = 'AddressError';
    }
}
/**
 * Имена в базе Harmony ограничены: буквы, цифры, подчёркивание, дефис.
 * Пробелы и слэши ломают CLI-адресацию (`-env`, `-job`, `-scene`) и
 * приводят к тому, что команда открывает НЕ ТУ сцену вместо ошибки.
 */
const NAME_RE = /^[A-Za-z0-9_][A-Za-z0-9_-]*$/;
function checkName(kind, value) {
    if (!value) {
        throw new AddressError('EMPTY_NAME', `${kind} is empty`);
    }
    if (!NAME_RE.test(value)) {
        throw new AddressError('BAD_NAME', `${kind} ${JSON.stringify(value)} contains characters that break database addressing`, 'Use letters, digits, underscore and dash only. Spaces and slashes silently ' +
            'resolve to a different scene instead of failing.');
    }
}
/**
 * Разбор адреса из строки.
 *
 * Формы:
 *   /abs/path/scene.xstage           -> standalone
 *   db://ENV/JOB/SCENE               -> database, версия не указана
 *   db://ENV/JOB/SCENE@VERSION       -> database с версией
 *   db://ENV/JOB/SCENE@VERSION#USER  -> и с пользователем
 */
export function parseAddress(raw) {
    const s = raw.trim();
    if (!s)
        throw new AddressError('EMPTY', 'scene address is empty');
    if (!s.startsWith('db://')) {
        if (!s.endsWith('.xstage')) {
            throw new AddressError('NOT_A_SCENE', `${JSON.stringify(s)} is neither a db:// address nor a .xstage file`, 'Standalone scenes must point at the .xstage file itself.');
        }
        return { mode: 'standalone', path: s };
    }
    const rest = s.slice('db://'.length);
    let user = null;
    let body = rest;
    const hash = body.indexOf('#');
    if (hash !== -1) {
        user = body.slice(hash + 1);
        body = body.slice(0, hash);
        checkName('user', user);
    }
    let version = null;
    const at = body.indexOf('@');
    if (at !== -1) {
        version = body.slice(at + 1);
        body = body.slice(0, at);
        checkName('version', version);
    }
    const parts = body.split('/');
    if (parts.length !== 3) {
        throw new AddressError('BAD_DB_ADDRESS', `expected db://ENVIRONMENT/JOB/SCENE, got ${JSON.stringify(s)}`);
    }
    const [environment, job, scene] = parts;
    checkName('environment', environment);
    checkName('job', job);
    checkName('scene', scene);
    return { mode: 'database', environment, job, scene, version, user };
}
/** Обратно в строку — для логов, аудита и провенанса. */
export function formatAddress(a) {
    if (a.mode === 'standalone')
        return a.path;
    let s = `db://${a.environment}/${a.job}/${a.scene}`;
    if (a.version)
        s += `@${a.version}`;
    if (a.user)
        s += `#${a.user}`;
    return s;
}
/**
 * Аргументы Harmony CLI для этого адреса.
 *
 * Порядок и форма взяты из `Harmony Premium -help`:
 *   database:   [Options] environment job scene [version user]
 *   standalone: [Options] [digital_file]
 */
export function cliArgs(a) {
    if (a.mode === 'standalone')
        return [a.path];
    const out = ['-env', a.environment, '-job', a.job, '-scene', a.scene];
    if (a.version)
        out.push('-version', a.version);
    if (a.user)
        out.push('-user', a.user);
    return out;
}
/**
 * Требовать однозначности перед ЗАПИСЬЮ.
 *
 * Читать «последнюю версию» безопасно. Писать в неуказанную версию —
 * нет: между чтением и записью кто-то мог сдать новую, и правка уедет
 * в чужую работу. Поэтому мутация без версии запрещена явно, а не
 * «разрешена с догадкой».
 */
export function requireUnambiguousForWrite(a) {
    if (a.mode === 'standalone')
        return;
    if (!a.version) {
        throw new AddressError('AMBIGUOUS_VERSION', `refusing to write to ${formatAddress(a)}: version is not specified`, 'Resolve the version explicitly first (harmony.db.resolve), then write to that exact ' +
            'version. Writing to "whatever is latest" can land in work someone submitted meanwhile.');
    }
    if (!a.user) {
        throw new AddressError('NO_USER', `refusing to write to ${formatAddress(a)}: database user is not specified`, 'Harmony records who changed a scene. Anonymous writes make an audit trail useless.');
    }
}
/**
 * Решение о записи по данным блокировки.
 *
 * ГЛАВНОЕ: при `unknown` ответ — НЕТ. Мина №14 из MINES.md: сцена без
 * прав на запись принимает мутации МОЛЧА, API не всегда сообщает об
 * отказе. Значит «не знаю» обязано читаться как «нельзя», иначе мы
 * пишем в чужую сцену и узнаём об этом от художника.
 */
export function decideWritable(state, owner, me) {
    switch (state) {
        case 'free':
            return { state, owner: null, writable: true, reason: 'scene is not locked' };
        case 'held-by-me':
            return {
                state, owner: owner ?? me, writable: true,
                reason: `lock is held by ${owner ?? me ?? 'this session'}`,
            };
        case 'held-by-other':
            return {
                state, owner, writable: false,
                reason: `scene is locked by ${owner ?? 'another user'}; writing would collide with live work`,
            };
        case 'unknown':
        default:
            return {
                state: 'unknown', owner,
                writable: false,
                reason: 'lock state could not be determined; refusing to write. Harmony accepts mutations ' +
                    'to read-only scenes silently (MINES.md #14), so an unknown lock must be treated as taken',
            };
    }
}
/**
 * Проверка правом пробной правки с откатом — единственный надёжный
 * способ узнать, что сцена принимает запись. Здесь только ПЛАН такой
 * проверки: исполнять его будет мост.
 */
export function writeProbePlan(a) {
    return {
        script: 
        // Пробная правка обязана быть внутри одного undo, чтобы откат был
        // атомарным, и обязана не менять ничего видимого.
        'scene.beginUndoRedoAccum("mcpb-write-probe");\n' +
            'var ok = false;\n' +
            'try { ok = scene.setDefaultResolution(scene.defaultResolutionX(), ' +
            'scene.defaultResolutionY(), scene.defaultResolutionFOV()); }\n' +
            'catch (e) { ok = false; }\n' +
            'scene.cancelUndoRedoAccum();\n' +
            'ok;',
        note: `Write-probe for ${formatAddress(a)}: sets the resolution to its current value inside an ` +
            'undo block, then cancels. Nothing changes, but a read-only scene reports failure instead ' +
            'of accepting the write silently.',
    };
}
