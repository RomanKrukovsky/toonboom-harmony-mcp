import { TelnetResponse } from './controlCenterTelnet.js';
export declare class ControlCenterBatch {
    static runScript(script: string): Promise<TelnetResponse>;
}
