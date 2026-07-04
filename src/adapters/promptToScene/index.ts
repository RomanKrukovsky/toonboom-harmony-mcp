export class PromptToSceneAdapter {
    async convert(prompt: string) {
        return {
            status: "success",
            scenePlan: {
                sceneName: "GeneratedScene",
                durationFrames: 24,
                fps: 24
            }
        };
    }
}
