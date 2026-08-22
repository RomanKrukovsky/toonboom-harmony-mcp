export interface ReviewReport {
    sceneScore: number;
    categories: {
        composition: number;
        acting: number;
        timing: number;
        technical: number;
        continuity: number;
    };
    fixes: string[];
}
