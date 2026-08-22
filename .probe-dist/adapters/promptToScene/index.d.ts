export declare class PromptToSceneAdapter {
    convert(prompt: string): Promise<{
        status: string;
        scenePlan: {
            sceneName: string;
            durationFrames: number;
            fps: number;
        };
    }>;
}
