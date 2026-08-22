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
export declare const PROTOCOL_V = 1;
/** Операции, меняющие сцену. Разоружённый мост обязан их отклонять. */
export declare const MUTATING_OPS: Set<string>;
export interface BridgeResponse<T = any> {
    result: T;
    log: string[];
    harmony: Record<string, any>;
}
export declare class BridgeError extends Error {
    code: string;
    log: string[];
    stack_?: string | undefined;
    constructor(code: string, message: string, log?: string[], stack_?: string | undefined);
}
export declare class BridgeTimeout extends BridgeError {
    orphaned: string[];
    constructor(op: string, deadlineS: number, orphaned: string[]);
}
export interface SpoolOptions {
    spool?: string;
    pollMs?: number;
}
export declare function defaultSpool(): string;
export declare class BridgeSpool {
    readonly spool: string;
    private pollMs;
    private token;
    constructor(opts?: SpoolOptions);
    private ensureToken;
    private writeAtomic;
    /** Заявки, забранные мостом без ответа. Отличает «занят» от «мёртв». */
    orphanedWork(): string[];
    /** Установлен ли мост и отвечает ли он. Дешёвая проверка ДО работы. */
    probe(timeoutS?: number): Promise<{
        up: boolean;
        detail: string;
        armed?: boolean;
    }>;
    call<T = any>(op: string, args?: Record<string, any>, deadlineS?: number, graceS?: number): Promise<BridgeResponse<T>>;
    ping(timeoutS?: number): Promise<BridgeResponse<{
        pong: boolean;
        armed: boolean;
    }>>;
    capabilities(timeoutS?: number): Promise<BridgeResponse<{
        version: string;
        protocol: number;
        probes: Record<string, boolean>;
    }>>;
    status(timeoutS?: number): Promise<BridgeResponse<{
        armed: boolean;
        busy: boolean;
        served: number;
        failed: number;
    }>>;
}
/** Общий экземпляр: спул один на машину, плодить клиентов незачем. */
export declare function bridge(): BridgeSpool;
