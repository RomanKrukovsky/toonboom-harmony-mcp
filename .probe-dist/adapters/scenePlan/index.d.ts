export interface PlanStep {
    id: string;
    type: 'ui' | 'api_or_ui' | 'ui_or_script' | 'template' | 'ui_or_python' | 'script_or_ui' | 'render' | 'audit' | 'manual';
    description: string;
    precondition: string;
    action: {
        method: string;
        params: any;
    };
    verification: {
        expected: string;
        type: 'ui_state' | 'file_exists' | 'api_query' | 'log_regex';
    };
    fallback: {
        strategy: 'retry' | 'hotkey_reset' | 'api_fallback' | 'human_confirm';
        params?: any;
    };
    riskLevel: 'low' | 'medium' | 'high';
    rollbackNote?: string;
}
export interface ExecutionPlan {
    goal: string;
    production: string;
    episode: string;
    sceneName: string;
    steps: PlanStep[];
}
export declare class ScenePlanAdapter {
    static validate(plan: any): void;
    static generateExecutionPlan(plan: any): ExecutionPlan;
}
