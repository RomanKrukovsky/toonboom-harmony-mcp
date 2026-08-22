export interface PythonBridgeResponse {
    status: 'success' | 'error';
    message?: string;
    data?: any;
    [key: string]: any;
}
export declare class HarmonyPython {
    private static daemonProcess;
    private static pendingPromises;
    private static stdoutBuffer;
    private static daemonStderr;
    static killDaemon(): void;
    static shutdownDaemon(): Promise<void>;
    private static getPythonExecutable;
    private static getSpawnEnv;
    private static initDaemon;
    static runCommand(command: string, args?: any, timeoutMs?: number): Promise<PythonBridgeResponse>;
    private static runSingleCommand;
    static stopDaemon(): Promise<void>;
}
