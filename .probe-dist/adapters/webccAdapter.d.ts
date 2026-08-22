export interface WebccResponse {
    status: 'success' | 'error' | 'unsupported';
    code?: string;
    message?: string;
    data?: any;
}
export declare class WebccAdapter {
    static isAvailable(): boolean;
    static performAction(actionName: string, params: any): Promise<WebccResponse>;
}
