import type { EpisodePlan, Shot } from '../../schemas/episodePlan.js';
/**
 * QualityDirector — AI production reviewer that scores scenes/episode
 * and emits fix lists (ACTOR §10).
 */
export declare class QualityDirector {
    reviewEpisode(data: {
        episodePlan: EpisodePlan;
        shotList: Shot[];
        characterSpecs: any[];
        rig360Specs: any[];
        actingPlans: any[];
        cameraPlans: any[];
        fxPlans: any[];
    }): any[];
    reviewScene(scene: any, data: any): any;
    reviewEpisodePlan(episodePlan: EpisodePlan): any;
    reviewRigs(rig360Specs: any[]): any;
    reviewActing(actingPlans: any[]): any;
    scoreScene(scene: any, data: any): {
        total: number;
        composition: number;
        acting: number;
        timing: number;
        technical: number;
        continuity: number;
    };
    scoreEpisode(reports: any[]): number;
    generateFixList(reports: any[]): string[];
}
