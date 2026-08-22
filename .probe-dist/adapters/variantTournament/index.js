import { variantTournamentSchema, VARIANT_TOURNAMENT_SCHEMA_VERSION } from '../../schemas/variantTournament.js';
import { AnimationCritic } from '../animationCritic/index.js';
export class VariantTournament {
    critic;
    constructor() {
        this.critic = new AnimationCritic();
    }
    /**
     * Run multi-round tournament to select best variant
     */
    run(input) {
        const startTime = Date.now();
        const tournamentId = `tournament_${input.sceneId}_${startTime}`;
        // Initialize all variants
        const variants = input.variants.map(v => ({
            variantId: v.variantId,
            variantName: v.variantName,
            variantType: v.variantType,
            sceneId: input.sceneId,
            roundReached: 0,
            criticReports: [],
            finalScore: 0,
            rank: undefined,
            selected: false,
            eliminated: false,
            metadata: v.metadata || {}
        }));
        const rounds = [];
        let currentVariants = variants;
        // Round 1: Technical gate
        const round1 = this.runTechnicalGate(input, currentVariants, startTime);
        rounds.push(round1.round);
        currentVariants = round1.survivors;
        if (currentVariants.length === 0) {
            return this.finalizeTournament(tournamentId, input, rounds, variants, startTime, 'No variants passed technical gate');
        }
        // Round 2: Artistic ranking
        const round2 = this.runArtisticRanking(input, currentVariants, startTime);
        rounds.push(round2.round);
        currentVariants = round2.survivors;
        if (currentVariants.length === 0) {
            return this.finalizeTournament(tournamentId, input, rounds, variants, startTime, 'No variants passed artistic ranking');
        }
        // Round 3: Refinement (top-K only)
        if (currentVariants.length > 1 && input.budget.maxRefinementRounds > 0) {
            const round3 = this.runRefinement(input, currentVariants, startTime);
            rounds.push(round3.round);
            currentVariants = round3.survivors;
        }
        // Final round: Select winner
        const finalRound = this.runFinalSelection(input, currentVariants, startTime);
        rounds.push(finalRound.round);
        return this.finalizeTournament(tournamentId, input, rounds, variants, startTime);
    }
    /**
     * Round 1: Technical gate - eliminate variants with critical technical issues
     */
    runTechnicalGate(input, variants, startTime) {
        const roundStart = Date.now();
        const survivors = [];
        const eliminated = [];
        for (const variant of variants) {
            const originalVariant = input.variants.find(v => v.variantId === variant.variantId);
            if (!originalVariant)
                continue;
            const criticReport = this.critic.critique(originalVariant.criticInput);
            variant.criticReports.push(criticReport);
            variant.roundReached = 1;
            // Check for critical technical issues
            const hasCriticalIssues = criticReport.criticalIssues > 0;
            const hasHighTechnicalIssues = criticReport.technicalChecks.filter(c => !c.passed && c.severity === 'high').length > 2;
            if (hasCriticalIssues || hasHighTechnicalIssues) {
                variant.eliminated = true;
                variant.eliminationReason = hasCriticalIssues
                    ? `Critical technical issues: ${criticReport.criticalIssues}`
                    : 'Multiple high-severity technical issues';
                eliminated.push(variant.variantId);
            }
            else {
                variant.finalScore = criticReport.overallScore;
                survivors.push(variant);
            }
        }
        const round = {
            roundNumber: 1,
            roundType: 'technical_gate',
            startTime: new Date(roundStart).toISOString(),
            endTime: new Date().toISOString(),
            participatingVariants: variants.map(v => v.variantId),
            survivors: survivors.map(v => v.variantId),
            eliminated,
            roundResults: {
                totalCriticized: variants.length,
                passed: survivors.length,
                failed: eliminated.length
            }
        };
        return { round, survivors };
    }
    /**
     * Round 2: Artistic ranking - rank by artistic score
     */
    runArtisticRanking(input, variants, startTime) {
        const roundStart = Date.now();
        // Rank by overall score
        const ranked = [...variants].sort((a, b) => b.finalScore - a.finalScore);
        // Keep top 50% or at least 2 variants
        const keepCount = Math.max(2, Math.ceil(ranked.length * 0.5));
        const survivors = ranked.slice(0, keepCount);
        const eliminated = ranked.slice(keepCount);
        for (let i = 0; i < ranked.length; i++) {
            ranked[i].rank = i + 1;
            if (i >= keepCount) {
                ranked[i].eliminated = true;
                ranked[i].eliminationReason = `Ranked #${i + 1}, below top ${keepCount}`;
            }
            ranked[i].roundReached = 2;
        }
        const round = {
            roundNumber: 2,
            roundType: 'artistic_ranking',
            startTime: new Date(roundStart).toISOString(),
            endTime: new Date().toISOString(),
            participatingVariants: variants.map(v => v.variantId),
            survivors: survivors.map(v => v.variantId),
            eliminated: eliminated.map(v => v.variantId),
            roundResults: {
                topScore: survivors[0]?.finalScore || 0,
                bottomScore: survivors[survivors.length - 1]?.finalScore || 0,
                survivorsCount: survivors.length
            }
        };
        return { round, survivors };
    }
    /**
     * Round 3: Refinement - simulate refinement of top variants
     */
    runRefinement(input, variants, startTime) {
        const roundStart = Date.now();
        // Simulate refinement: boost score by 5% for top variants
        for (const variant of variants) {
            variant.finalScore = Math.min(1, variant.finalScore * 1.05);
            variant.roundReached = 3;
        }
        // Re-rank after refinement
        const ranked = [...variants].sort((a, b) => b.finalScore - a.finalScore);
        const keepCount = Math.max(1, Math.ceil(ranked.length * 0.5));
        const survivors = ranked.slice(0, keepCount);
        const eliminated = ranked.slice(keepCount);
        for (let i = 0; i < ranked.length; i++) {
            ranked[i].rank = i + 1;
            if (i >= keepCount) {
                ranked[i].eliminated = true;
                ranked[i].eliminationReason = `Did not improve enough in refinement`;
            }
        }
        const round = {
            roundNumber: 3,
            roundType: 'refinement',
            startTime: new Date(roundStart).toISOString(),
            endTime: new Date().toISOString(),
            participatingVariants: variants.map(v => v.variantId),
            survivors: survivors.map(v => v.variantId),
            eliminated: eliminated.map(v => v.variantId),
            roundResults: {
                refinementApplied: true,
                avgImprovement: 0.05
            }
        };
        return { round, survivors };
    }
    /**
     * Final round: Select winner
     */
    runFinalSelection(input, variants, startTime) {
        const roundStart = Date.now();
        // Select winner (highest score)
        const winner = variants.reduce((best, current) => current.finalScore > best.finalScore ? current : best);
        winner.selected = true;
        winner.rank = 1;
        for (let i = 0; i < variants.length; i++) {
            variants[i].roundReached = 4;
            if (variants[i].variantId !== winner.variantId && !variants[i].eliminated) {
                variants[i].rank = i + 1;
            }
        }
        const round = {
            roundNumber: 4,
            roundType: 'final_selection',
            startTime: new Date(roundStart).toISOString(),
            endTime: new Date().toISOString(),
            participatingVariants: variants.map(v => v.variantId),
            survivors: variants.map(v => v.variantId),
            eliminated: [],
            roundResults: {
                winner: winner.variantId,
                winnerScore: winner.finalScore
            }
        };
        return { round };
    }
    /**
     * Finalize tournament
     */
    finalizeTournament(tournamentId, input, rounds, variants, startTime, earlyExitReason) {
        const endTime = Date.now();
        const winner = variants.find(v => v.selected);
        const finalists = variants
            .filter(v => !v.eliminated)
            .sort((a, b) => (a.rank || 999) - (b.rank || 999));
        return variantTournamentSchema.parse({
            tournamentId,
            sceneId: input.sceneId,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            budget: input.budget,
            rounds,
            variants,
            winner: winner || undefined,
            finalists,
            totalComputeTimeMs: endTime - startTime,
            provenance: {
                engine: 'VariantTournament',
                version: VARIANT_TOURNAMENT_SCHEMA_VERSION,
                method: 'rule_based'
            }
        });
    }
}
