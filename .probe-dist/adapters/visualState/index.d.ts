export interface VisualStateReport {
    application: string;
    activeWindow: string;
    detectedPanels: string[];
    dialogs: string[];
    sceneOpen: boolean;
    timelineVisible: boolean;
    nodeViewVisible: boolean;
    warnings: string[];
}
export declare class VisualStateEngine {
    static detectState(screenshotBase64?: string): Promise<VisualStateReport>;
    static verifyWorkspaceLayout(): Promise<{
        isCorrect: boolean;
        issue?: string;
    }>;
}
