/**
 * finalPackage — bundles everything produced by One-Prompt Engine
 * into a single production package matching the ACTOR.MD layout.
 *
 * Layout:
 *   series_bible.json
 *   episode_plan.json
 *   script.json
 *   shot_list.json
 *   asset_requirements.json
 *   character_design_specs.json
 *   rig_requirements.json
 *   rig360_plan.json
 *   rig360_specs.json
 *   scene_plans/
 *   animation_blocking/
 *   camera_plans/
 *   lipsync_plans/
 *   fx_plans/
 *   render_plan.json
 *   review_reports/
 *   final_package/
 *   episode_package.json
 *   MANIFEST.json
 */
export interface PackageInput {
    prompt: string;
    mode: string;
    analysis: any;
    seriesBible: any;
    episodePlan: any;
    shotList: any[];
    characterSpecs: any[];
    rig360Specs: any[];
    assetRequirements: any[];
    actingPlans: any[];
    lipsyncPlans?: any[];
    cameraPlans: any[];
    fxPlans: any[];
    backgroundPlans?: any[];
    scenePlans?: any[];
    renderPlan: any;
    reviewReports: any[];
}
export interface PackageOutput {
    packagePath: string;
    manifestPath: string;
    artifacts: Record<string, string>;
    summary: any;
}
export declare class FinalPackager {
    assemble(input: PackageInput, outputDir?: string): PackageOutput;
    private defaultOutputDir;
    private write;
    private buildScriptJson;
    private buildRigRequirements;
    private buildRig360Plan;
    private summarizeWhatWasReal;
    private calculateScore;
    private honestSummary;
}
