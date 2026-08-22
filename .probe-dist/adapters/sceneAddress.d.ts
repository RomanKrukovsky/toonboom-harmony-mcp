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
/** Режим работы: файл на диске или студийная база. */
export type SceneMode = 'standalone' | 'database';
export interface StandaloneAddress {
    mode: 'standalone';
    /** Абсолютный путь к .xstage. */
    path: string;
}
export interface DatabaseAddress {
    mode: 'database';
    environment: string;
    job: string;
    scene: string;
    /** Версия. null означает «не указана» — НЕ «последняя». */
    version: string | null;
    /** Пользователь базы, от чьего имени открывается сцена. */
    user: string | null;
}
export type SceneAddress = StandaloneAddress | DatabaseAddress;
export declare class AddressError extends Error {
    code: string;
    remedy?: string | undefined;
    constructor(code: string, message: string, remedy?: string | undefined);
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
export declare function parseAddress(raw: string): SceneAddress;
/** Обратно в строку — для логов, аудита и провенанса. */
export declare function formatAddress(a: SceneAddress): string;
/**
 * Аргументы Harmony CLI для этого адреса.
 *
 * Порядок и форма взяты из `Harmony Premium -help`:
 *   database:   [Options] environment job scene [version user]
 *   standalone: [Options] [digital_file]
 */
export declare function cliArgs(a: SceneAddress): string[];
/**
 * Требовать однозначности перед ЗАПИСЬЮ.
 *
 * Читать «последнюю версию» безопасно. Писать в неуказанную версию —
 * нет: между чтением и записью кто-то мог сдать новую, и правка уедет
 * в чужую работу. Поэтому мутация без версии запрещена явно, а не
 * «разрешена с догадкой».
 */
export declare function requireUnambiguousForWrite(a: SceneAddress): void;
export type LockState = 'free' | 'held-by-me' | 'held-by-other' | 'unknown';
export interface SceneLock {
    state: LockState;
    owner: string | null;
    /** Можно ли писать. `false` при любом сомнении. */
    writable: boolean;
    reason: string;
}
/**
 * Решение о записи по данным блокировки.
 *
 * ГЛАВНОЕ: при `unknown` ответ — НЕТ. Мина №14 из MINES.md: сцена без
 * прав на запись принимает мутации МОЛЧА, API не всегда сообщает об
 * отказе. Значит «не знаю» обязано читаться как «нельзя», иначе мы
 * пишем в чужую сцену и узнаём об этом от художника.
 */
export declare function decideWritable(state: LockState, owner: string | null, me: string | null): SceneLock;
/**
 * Проверка правом пробной правки с откатом — единственный надёжный
 * способ узнать, что сцена принимает запись. Здесь только ПЛАН такой
 * проверки: исполнять его будет мост.
 */
export declare function writeProbePlan(a: SceneAddress): {
    script: string;
    note: string;
};
