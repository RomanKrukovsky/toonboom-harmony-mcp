export declare class VisualReviewer {
    review(previewPath: string): Promise<{
        status: string;
        report: {
            sceneScore: number;
            categories: {
                composition: number;
                acting: number;
                timing: number;
                technical: number;
                continuity: number;
            };
            fixes: never[];
        };
    }>;
}
