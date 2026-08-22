export class RigQualityAuditor {
    /**
     * Processes the raw response from Harmony Bridge and generates an auto-fix plan
     * for issues that are safely fixable.
     */
    static generateAutoFixPlan(report) {
        const plan = {
            planId: `fix_plan_${Date.now()}`,
            targetGroup: report.targetGroup,
            fixes: []
        };
        for (const issue of report.issues) {
            if (issue.autoFixable && issue.autoFixAction) {
                plan.fixes.push({
                    nodePath: issue.nodePath,
                    actionType: issue.autoFixAction.actionType,
                    attributeName: issue.autoFixAction.attributeName,
                    attributeValue: issue.autoFixAction.attributeValue
                });
            }
        }
        return plan;
    }
    /**
     * Determines if a report is considered a passing state for production.
     */
    static isProductionReady(report) {
        return report.summary.errors === 0;
    }
}
