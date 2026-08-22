export interface LiveGuiResponse {
    status: 'success' | 'error' | 'offline';
    message: string;
    data?: any;
}
export declare class LiveGuiAdapter {
    private static port;
    private static host;
    static sendCommand(command: string, args?: any): Promise<LiveGuiResponse>;
}
