export interface TelnetResponse {
    status: 'success' | 'error';
    data?: any;
    message?: string;
    logs?: string;
}
export declare class ControlCenterTelnet {
    static runScript(script: string): Promise<TelnetResponse>;
    static runTransaction(transaction: {
        compile: () => string;
    }): Promise<TelnetResponse>;
    private static parseBuffer;
}
