import { z } from 'zod';
import { criticReportSchema } from './animationCritic.js';

export const VARIANT_TOURNAMENT_SCHEMA_VERSION = '1.0';

export const tournamentVariantSchema = z.object({
  variantId: z.string(),
  variantName: z.string(),
  variantType: z.enum(['director', 'performance', 'combined']),
  sceneId: z.string(),
  roundReached: z.number().int().min(0),
  criticReports: z.array(criticReportSchema).default([]),
  finalScore: z.number().min(0).max(1),
  rank: z.number().int().optional(),
  selected: z.boolean().default(false),
  eliminated: z.boolean().default(false),
  eliminationReason: z.string().optional(),
  metadata: z.record(z.any()).default({})
}).strict();

export const tournamentRoundSchema = z.object({
  roundNumber: z.number().int().min(0),
  roundType: z.enum(['technical_gate', 'artistic_ranking', 'refinement', 'final_selection']),
  startTime: z.string(),
  endTime: z.string().optional(),
  participatingVariants: z.array(z.string()),
  survivors: z.array(z.string()),
  eliminated: z.array(z.string()),
  roundResults: z.record(z.any())
}).strict();

export const tournamentBudgetSchema = z.object({
  maxVariants: z.number().int().positive(),
  maxComputeTimeMs: z.number().int().positive(),
  maxGpuMemoryMb: z.number().int().positive().optional(),
  maxRefinementRounds: z.number().int().nonnegative(),
  maxPreviewResolution: z.string().optional()
}).strict();

export const variantTournamentSchema = z.object({
  tournamentId: z.string(),
  sceneId: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  budget: tournamentBudgetSchema,
  rounds: z.array(tournamentRoundSchema),
  variants: z.array(tournamentVariantSchema),
  winner: tournamentVariantSchema.optional(),
  finalists: z.array(tournamentVariantSchema).default([]),
  totalComputeTimeMs: z.number().int().min(0).optional(),
  provenance: z.object({
    engine: z.string(),
    version: z.string(),
    method: z.enum(['rule_based', 'ml_tournament', 'hybrid'])
  }).strict()
}).strict();

export type VariantTournament = z.infer<typeof variantTournamentSchema>;
export type TournamentVariant = z.infer<typeof tournamentVariantSchema>;
export type TournamentRound = z.infer<typeof tournamentRoundSchema>;
export type TournamentBudget = z.infer<typeof tournamentBudgetSchema>;
