export class IterationLoop {
    async runLoop(scenePlan: any, maxIterations = 3) {
        return {
            status: "success",
            finalPlan: scenePlan,
            iterations: 1
        };
    }
}
