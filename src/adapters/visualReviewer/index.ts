export class VisualReviewer {
    async review(previewPath: string) {
        return {
            status: "success",
            report: {
                sceneScore: 80,
                categories: {
                    composition: 80,
                    acting: 80,
                    timing: 80,
                    technical: 80,
                    continuity: 80
                },
                fixes: []
            }
        };
    }
}
