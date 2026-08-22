export class PromptToSceneAdapter {
    async convert(prompt) {
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
