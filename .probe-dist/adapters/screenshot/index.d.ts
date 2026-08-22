export interface ScreenshotOptions {
    outputPath?: string;
    simulate?: boolean;
}
export declare class ScreenshotAdapter {
    static capture(options?: ScreenshotOptions): Promise<{
        status: 'success' | 'error';
        imagePath: string;
        base64: string;
    }>;
}
