export declare class IterationLoop {
    runLoop(scenePlan: any, maxIterations?: number): Promise<{
        status: string;
        finalPlan: any;
        iterations: number;
    }>;
}
