import type { AnalysisResult, OnePromptInput } from '../../schemas/onePrompt.js';
import type { SeriesBible } from '../../schemas/seriesBible.js';

/**
 * SeriesPlanner — derives a series bible from analysis.
 * Honest planning layer; not an LLM.
 */
export class SeriesPlanner {
  createBible(analysis: AnalysisResult, input: OnePromptInput): SeriesBible {
    const episodeCount = Math.max(3, Math.round(analysis.durationMinutes / 2));
    const episodeTitles = [];
    for (let i = 1; i <= episodeCount; i++) {
      episodeTitles.push(`E${String(i).padStart(2, '0')}: The ${capitalize(analysis.genre)} Catalyst`);
    }
    return {
      title: deriveTitle(analysis, input.prompt),
      logLine: analysis.logLine,
      genre: analysis.genre,
      tone: analysis.tone,
      visualStyle: 'premium 2D animated, clean shapes, expressive',
      targetAudience: analysis.targetAudience,
      seasonArc: `Stan и Professor Vex сталкиваются с ${analysis.themes.join(', ')} через серию возрастающих научных экспериментов.`,
      recurringCharacters: analysis.candidateCharacters.map(c => ({
        name: c.name,
        role: c.role,
        personality: c.oneLine,
        visualStyle: 'premium 2D animated, expressive',
        appearsInEpisodes: []
      })),
      recurringLocations: [analysis.setting],
      episodeTitles,
      themes: analysis.themes,
      origin: 'planned'
    };
  }
}

function deriveTitle(a: AnalysisResult, prompt: string): string {
  const candidateChar = a.candidateCharacters[0]?.name?.split(' ')[0] || 'The Pilots';
  return `${candidateChar} & The ${capitalize(a.genre)} Lab`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}