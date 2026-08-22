import { type VariantTournament as VariantTournamentType, type TournamentBudget } from '../../schemas/variantTournament.js';
import { type CriticInput } from '../animationCritic/index.js';
export interface TournamentInput {
    sceneId: string;
    variants: Array<{
        variantId: string;
        variantName: string;
        variantType: 'director' | 'performance' | 'combined';
        criticInput: CriticInput;
        metadata?: Record<string, any>;
    }>;
    budget: TournamentBudget;
}
export declare class VariantTournament {
    private critic;
    constructor();
    /**
     * Run multi-round tournament to select best variant
     */
    run(input: TournamentInput): VariantTournamentType;
    /**
     * Round 1: Technical gate - eliminate variants with critical technical issues
     */
    private runTechnicalGate;
    /**
     * Round 2: Artistic ranking - rank by artistic score
     */
    private runArtisticRanking;
    /**
     * Round 3: Refinement - simulate refinement of top variants
     */
    private runRefinement;
    /**
     * Final round: Select winner
     */
    private runFinalSelection;
    /**
     * Finalize tournament
     */
    private finalizeTournament;
}
