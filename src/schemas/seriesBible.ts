import { z } from 'zod';
import { honestyOriginSchema } from './onePrompt.js';

/**
 * seriesBible.ts — the high-level "show bible" produced by SeriesPlanner.
 * One series bible spans multiple episodes. All fields are production
 * planning metadata — not final creative.
 */

export const recurringCharacterSchema = z.object({
  name: z.string(),
  role: z.string(),
  personality: z.string(),
  visualStyle: z.string(),
  appearsInEpisodes: z.array(z.string()).default([])
});

export const seriesBibleSchema = z.object({
  title: z.string(),
  logLine: z.string(),
  genre: z.string(),
  tone: z.string(),
  visualStyle: z.string(),
  targetAudience: z.string().optional(),
  seasonArc: z.string().optional(),
  recurringCharacters: z.array(recurringCharacterSchema).default([]),
  recurringLocations: z.array(z.string()).default([]),
  episodeTitles: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  origin: honestyOriginSchema
});

export type SeriesBible = z.infer<typeof seriesBibleSchema>;
export type RecurringCharacter = z.infer<typeof recurringCharacterSchema>;