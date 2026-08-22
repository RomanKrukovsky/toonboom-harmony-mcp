export interface ScreenshotResult {
    status: 'success' | 'error';
    imagePath?: string;
    base64?: string;
    width: number;
    height: number;
    timestamp: string;
}
export interface WindowInfo {
    title: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    isActive: boolean;
    pid?: number;
}
export interface ActionResult {
    status: 'success' | 'error';
    message: string;
    durationMs: number;
    timestamp: string;
}
export interface WaitResult {
    status: 'success' | 'timeout' | 'error';
    found: boolean;
    location?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    message: string;
}
export interface ElementLocationResult {
    status: 'success' | 'not_found' | 'error';
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
}
export interface VerificationResult {
    status: 'passed' | 'failed' | 'uncertain';
    details: string;
}
export interface UIAutomationAdapter {
    getScreenshot(): Promise<ScreenshotResult>;
    getActiveWindow(): Promise<WindowInfo>;
    click(x: number, y: number): Promise<ActionResult>;
    doubleClick(x: number, y: number): Promise<ActionResult>;
    rightClick(x: number, y: number): Promise<ActionResult>;
    hotkey(keys: string[]): Promise<ActionResult>;
    typeText(text: string): Promise<ActionResult>;
    wait(ms: number): Promise<ActionResult>;
    waitForImageOrText(query: string, timeoutMs: number): Promise<WaitResult>;
    locateElement(query: string): Promise<ElementLocationResult>;
    verifyState(expectation: string): Promise<VerificationResult>;
}
export declare class HarmonyUIAutomationAdapter implements UIAutomationAdapter {
    private simulate;
    private currentSceneOpen;
    private importedAssets;
    private currentActiveWindow;
    constructor();
    private checkBackendAvailability;
    getScreenshot(): Promise<ScreenshotResult>;
    getActiveWindow(): Promise<WindowInfo>;
    click(x: number, y: number): Promise<ActionResult>;
    doubleClick(x: number, y: number): Promise<ActionResult>;
    rightClick(x: number, y: number): Promise<ActionResult>;
    hotkey(keys: string[]): Promise<ActionResult>;
    typeText(text: string): Promise<ActionResult>;
    wait(ms: number): Promise<ActionResult>;
    waitForImageOrText(query: string, timeoutMs: number): Promise<WaitResult>;
    locateElement(query: string): Promise<ElementLocationResult>;
    verifyState(expectation: string): Promise<VerificationResult>;
    setSimulatedSceneOpen(open: boolean): void;
    addSimulatedAsset(asset: string): void;
    getSimulatedAssets(): string[];
    clearSimulatedState(): void;
}
export declare const uiAutomation: HarmonyUIAutomationAdapter;
