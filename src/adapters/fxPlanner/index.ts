/**
 * FxPlanner — derives a concrete Harmony effect list from a scene description.
 *
 * The previous implementation was eight lines that ignored its input entirely
 * and always answered `{ status: "success", fxList: [] }`. A caller could not
 * tell "no effects are needed" from "nothing was planned", and the scene text
 * was never read.
 *
 * This version is a real keyword/mood planner: it reads the prompt, setting,
 * mood and time of day out of a scene plan and maps them onto actual Harmony
 * node types with parameters. It is heuristic — there is no LLM here (see
 * PromptParser's note on the same constraint) — but it is deterministic and
 * driven by the input, so identical scenes plan identically and different
 * scenes plan differently.
 */

/** Harmony node types this planner is allowed to emit. */
export type HarmonyFxNodeType =
  | 'Blur-Radial'
  | 'Blur-Directional'
  | 'Glow'
  | 'Tone'
  | 'Highlight'
  | 'Shadow'
  | 'Colour-Card'
  | 'Colour-Scale'
  | 'Transparency'
  | 'Particle-Baker'
  | 'Particle-Visualizer'
  | 'Turbulence'
  | 'Focus-Apply';

export interface PlannedFx {
  /** Stable, scene-scoped identifier — also the Harmony node name suffix. */
  fxId: string;
  /** Short semantic label, e.g. `smoke`, `sparks`, `glow`. */
  kind: string;
  nodeType: HarmonyFxNodeType;
  /** Harmony attribute values for the node. */
  parameters: Record<string, number | string | boolean>;
  /**
   * Where the effect sits relative to the artwork it modifies:
   *   `pre_composite`  — between the drawing and the Composite,
   *   `post_composite` — after the Composite, affecting the whole frame.
   */
  stage: 'pre_composite' | 'post_composite';
  /** Why the planner chose this — the trigger that matched. */
  reason: string;
  /** Whether a particle system (Baker + Visualizer pair) is required. */
  requiresParticleSystem: boolean;
}

export interface FxPlanResult {
  status: 'success' | 'partial_success';
  sceneId: string;
  fxList: PlannedFx[];
  /** Effects requested by keyword that this planner has no node mapping for. */
  unmapped: string[];
  /** Signals that drove the plan, so the result is explainable. */
  derivedFrom: {
    keywords: string[];
    mood: string;
    timeOfDay: string;
    setting: string;
  };
  warnings: string[];
}

/**
 * Keyword → Harmony effect table.
 *
 * Patterns cover Russian and English because prompts in this project arrive in
 * both. Each entry names the node type Harmony actually has: `Particle-Baker`
 * plus `Particle-Visualizer` for particle systems, `Glow` for bloom, and so on.
 */
const FX_KEYWORDS: Array<{
  kind: string;
  patterns: RegExp;
  nodeType: HarmonyFxNodeType;
  parameters: Record<string, number | string | boolean>;
  stage: 'pre_composite' | 'post_composite';
  particles: boolean;
}> = [
  {
    kind: 'smoke',
    patterns: /дым|дымк|smoke|fume|чад/i,
    nodeType: 'Particle-Baker',
    // Slow upward drift with strong spread reads as smoke rather than dust.
    parameters: { numberOfParticles: 240, lifespan: 90, gravity: -0.4, spread: 45, sizeStart: 30, sizeEnd: 90, opacityEnd: 0 },
    stage: 'pre_composite',
    particles: true
  },
  {
    kind: 'sparks',
    patterns: /искр|spark|свар|weld|шлиф|grind/i,
    nodeType: 'Particle-Baker',
    // Sparks are short-lived, fast and fall: high gravity, tiny size, no fade-in.
    parameters: { numberOfParticles: 120, lifespan: 14, gravity: 3.2, spread: 70, speed: 9, sizeStart: 5, sizeEnd: 1 },
    stage: 'pre_composite',
    particles: true
  },
  {
    kind: 'fire',
    patterns: /огон|огн|пламя|костёр|костер|fire|flame|blaze/i,
    nodeType: 'Particle-Baker',
    parameters: { numberOfParticles: 300, lifespan: 30, gravity: -2.5, spread: 25, sizeStart: 20, sizeEnd: 60, blendMode: 'add' },
    stage: 'pre_composite',
    particles: true
  },
  {
    kind: 'rain',
    patterns: /дожд|ливен|ливн|rain|drizzle|downpour/i,
    nodeType: 'Particle-Baker',
    // Rain needs a wide emitter and near-vertical fall; motion blur sells speed.
    parameters: { numberOfParticles: 800, lifespan: 45, gravity: 6, spread: 5, speed: 14, sizeStart: 3, sizeEnd: 3 },
    stage: 'pre_composite',
    particles: true
  },
  {
    kind: 'snow',
    patterns: /снег|снеж|метел|вьюг|snow|blizzard|flurr/i,
    nodeType: 'Particle-Baker',
    // Low gravity plus turbulence gives the drifting float snow needs.
    parameters: { numberOfParticles: 500, lifespan: 140, gravity: 0.6, spread: 30, speed: 2, sizeStart: 6, sizeEnd: 6 },
    stage: 'pre_composite',
    particles: true
  },
  {
    kind: 'dust',
    patterns: /пыл|прах|песчан|dust|sand|debris/i,
    nodeType: 'Particle-Baker',
    parameters: { numberOfParticles: 350, lifespan: 110, gravity: 0.2, spread: 60, speed: 1.5, sizeStart: 4, sizeEnd: 10, opacityEnd: 0 },
    stage: 'pre_composite',
    particles: true
  },
  {
    kind: 'glow',
    patterns: /свеч|сия|светит|неон|блик|glow|neon|bloom|shine|lantern|фонар/i,
    nodeType: 'Glow',
    parameters: { radius: 12, intensity: 1.4, blendMode: 'add', useMatte: false },
    stage: 'post_composite',
    particles: false
  },
  {
    kind: 'fog',
    patterns: /туман|мгл|дымов|fog|mist|haze/i,
    nodeType: 'Colour-Card',
    // Fog is a tinted card faded over the plate, cheaper than volumetrics.
    parameters: { colour: '#B8C4CC', opacity: 35, blendMode: 'screen' },
    stage: 'post_composite',
    particles: false
  },
  {
    kind: 'motion_blur',
    patterns: /смаз|размыт|скорост|быстр|motion blur|streak|whoosh/i,
    nodeType: 'Blur-Directional',
    parameters: { radius: 8, angle: 0, falloffRate: 0.5 },
    stage: 'pre_composite',
    particles: false
  },
  {
    kind: 'depth_of_field',
    patterns: /глубин резкост|расфокус|боке|depth of field|bokeh|defocus/i,
    nodeType: 'Focus-Apply',
    parameters: { mirrorEdges: true, quality: 'high' },
    stage: 'post_composite',
    particles: false
  },
  {
    kind: 'shadow',
    patterns: /тен[ьия]|падающ|shadow|silhouett/i,
    nodeType: 'Shadow',
    parameters: { offsetX: 8, offsetY: -8, blurRadius: 6, opacity: 60 },
    stage: 'pre_composite',
    particles: false
  },
  {
    kind: 'water',
    patterns: /вод[аыу]|волн|брызг|море|океан|water|wave|splash|ocean/i,
    nodeType: 'Turbulence',
    parameters: { frequency: 0.8, amount: 4, numOctaves: 2, animated: true },
    stage: 'pre_composite',
    particles: false
  }
];

/**
 * Mood → grade table. A mood always yields something, so a plan is never empty
 * for a described scene — but the effect is a colour treatment, not a fake
 * particle system.
 */
const MOOD_FX: Record<string, { kind: string; nodeType: HarmonyFxNodeType; parameters: Record<string, number | string | boolean> }> = {
  melancholic: { kind: 'desaturated_grade', nodeType: 'Colour-Scale', parameters: { saturation: 0.65, redScale: 0.95, blueScale: 1.1 } },
  joyful: { kind: 'warm_grade', nodeType: 'Colour-Scale', parameters: { saturation: 1.15, redScale: 1.08, blueScale: 0.95 } },
  tense: { kind: 'cold_contrast_grade', nodeType: 'Colour-Scale', parameters: { saturation: 0.8, redScale: 0.9, blueScale: 1.2 } },
  adventurous: { kind: 'punchy_grade', nodeType: 'Colour-Scale', parameters: { saturation: 1.2, redScale: 1.05, greenScale: 1.02 } },
  peaceful: { kind: 'soft_grade', nodeType: 'Colour-Scale', parameters: { saturation: 1.05, redScale: 1.03, blueScale: 1.02 } },
  comedic: { kind: 'saturated_grade', nodeType: 'Colour-Scale', parameters: { saturation: 1.3 } },
  neutral: { kind: 'neutral_grade', nodeType: 'Colour-Scale', parameters: { saturation: 1 } }
};

/** Time of day → light treatment. Night and sunset genuinely change lighting. */
const TIME_FX: Record<string, { kind: string; nodeType: HarmonyFxNodeType; parameters: Record<string, number | string | boolean> }> = {
  night: { kind: 'night_tone', nodeType: 'Tone', parameters: { colour: '#1B2A4A', opacity: 45, blurRadius: 10 } },
  sunset: { kind: 'sunset_highlight', nodeType: 'Highlight', parameters: { colour: '#FF9A4D', opacity: 40, blurRadius: 14 } },
  dawn: { kind: 'dawn_highlight', nodeType: 'Highlight', parameters: { colour: '#FFD9A0', opacity: 30, blurRadius: 12 } },
  day: { kind: 'day_highlight', nodeType: 'Highlight', parameters: { colour: '#FFFFFF', opacity: 18, blurRadius: 8 } },
  indoor: { kind: 'indoor_tone', nodeType: 'Tone', parameters: { colour: '#3A3226', opacity: 25, blurRadius: 8 } }
};

/** Collect every text field of a scene plan that could describe effects. */
function collectText(scenePlan: any): string {
  if (!scenePlan) return '';
  if (typeof scenePlan === 'string') return scenePlan;

  const parts: unknown[] = [
    scenePlan.prompt,
    scenePlan.sourcePrompt,
    scenePlan.description,
    scenePlan.sceneName,
    scenePlan.setting,
    scenePlan.mood,
    scenePlan.timeOfDay,
    scenePlan.notes,
    ...(Array.isArray(scenePlan.effects) ? scenePlan.effects : []),
    ...(Array.isArray(scenePlan.fxRequests) ? scenePlan.fxRequests : []),
    ...(Array.isArray(scenePlan.actions) ? scenePlan.actions.map((a: any) => a?.description ?? a) : [])
  ];

  return parts
    .filter(part => typeof part === 'string' || typeof part === 'number')
    .join(' \n ');
}

export class FxPlanner {
  /**
   * Plan effects for a scene.
   *
   * Accepts either a scene-plan object or a bare prompt string. Returns the
   * effects the description actually justifies, plus the signals used, so a
   * reviewer can see why each node is there.
   */
  async planFx(scenePlan: any): Promise<FxPlanResult> {
    return this.planFxSync(scenePlan);
  }

  /** Synchronous core: the planning itself does no I/O. */
  planFxSync(scenePlan: any): FxPlanResult {
    const text = collectText(scenePlan);
    const sceneId = (typeof scenePlan === 'object' && scenePlan)
      ? (scenePlan.sceneId ?? scenePlan.sceneName ?? 'unknown_scene')
      : 'unknown_scene';

    const mood = (typeof scenePlan === 'object' && scenePlan?.mood)
      ? String(scenePlan.mood)
      : this.inferMood(text);
    const timeOfDay = (typeof scenePlan === 'object' && scenePlan?.timeOfDay)
      ? String(scenePlan.timeOfDay)
      : this.inferTimeOfDay(text);
    const setting = (typeof scenePlan === 'object' && scenePlan?.setting)
      ? String(scenePlan.setting)
      : 'unspecified';

    const fxList: PlannedFx[] = [];
    const matchedKeywords: string[] = [];

    // 1. Keyword-driven effects — the concrete, visible ones.
    for (const entry of FX_KEYWORDS) {
      const match = text.match(entry.patterns);
      if (!match) continue;
      matchedKeywords.push(entry.kind);
      fxList.push({
        fxId: `${entry.kind}_01`,
        kind: entry.kind,
        nodeType: entry.nodeType,
        parameters: { ...entry.parameters },
        stage: entry.stage,
        reason: `Ключевое слово «${match[0]}» в описании сцены.`,
        requiresParticleSystem: entry.particles
      });
    }

    // 2. Snow and dust drift: turbulence makes them read as airborne.
    if (fxList.some(fx => fx.kind === 'snow' || fx.kind === 'dust')) {
      fxList.push({
        fxId: 'drift_turbulence_01',
        kind: 'drift_turbulence',
        nodeType: 'Turbulence',
        parameters: { frequency: 0.4, amount: 2.5, numOctaves: 2, animated: true },
        stage: 'pre_composite',
        reason: 'Частицы снега/пыли без турбулентности падают неестественно ровно.',
        requiresParticleSystem: false
      });
    }

    // 3. Time-of-day lighting.
    const timeEntry = TIME_FX[timeOfDay];
    if (timeEntry) {
      fxList.push({
        fxId: `${timeEntry.kind}_01`,
        kind: timeEntry.kind,
        nodeType: timeEntry.nodeType,
        parameters: { ...timeEntry.parameters },
        stage: 'post_composite',
        reason: `Время суток: ${timeOfDay}.`,
        requiresParticleSystem: false
      });
    }

    // 4. Mood grade. Always present, so the plan documents its own look.
    const moodEntry = MOOD_FX[mood] ?? MOOD_FX.neutral;
    fxList.push({
      fxId: `${moodEntry.kind}_01`,
      kind: moodEntry.kind,
      nodeType: moodEntry.nodeType,
      parameters: { ...moodEntry.parameters },
      stage: 'post_composite',
      reason: `Настроение сцены: ${mood}.`,
      requiresParticleSystem: false
    });

    // Explicit requests we have no node mapping for must be surfaced, not
    // silently dropped — that was the old behaviour's real failure.
    const explicit: string[] = [
      ...(Array.isArray(scenePlan?.effects) ? scenePlan.effects : []),
      ...(Array.isArray(scenePlan?.fxRequests) ? scenePlan.fxRequests : [])
    ].filter((value): value is string => typeof value === 'string');

    const unmapped = explicit.filter(request =>
      !FX_KEYWORDS.some(entry => entry.patterns.test(request))
    );

    const warnings: string[] = [];
    if (text.trim().length === 0) {
      warnings.push('Описание сцены пустое — спланирован только нейтральный грейд.');
    }
    if (unmapped.length > 0) {
      warnings.push(`Нет сопоставления с нодами Harmony для: ${unmapped.join(', ')}.`);
    }

    return {
      status: unmapped.length === 0 ? 'success' : 'partial_success',
      sceneId: String(sceneId),
      fxList,
      unmapped,
      derivedFrom: { keywords: matchedKeywords, mood, timeOfDay, setting },
      warnings
    };
  }

  /**
   * Mood heuristic, kept aligned with PromptParser.extractMood so a scene
   * parsed there and planned here agree on the mood label.
   */
  private inferMood(text: string): string {
    if (/грусть|грустн|печаль|тоск|sad|melanchol/i.test(text)) return 'melancholic';
    if (/радост|весел|счастли|happy|joyful/i.test(text)) return 'joyful';
    if (/страх|ужас|пугает|horror|scary|fear|напряж/i.test(text)) return 'tense';
    if (/приключен|adventure|action|пого|бегств/i.test(text)) return 'adventurous';
    if (/покой|тихо|спокойн|calm|peaceful/i.test(text)) return 'peaceful';
    if (/смешн|юмор|комед|funny|comedy|гротеск/i.test(text)) return 'comedic';
    return 'neutral';
  }

  /** Time-of-day heuristic, same vocabulary as PromptParser.extractTimeOfDay. */
  private inferTimeOfDay(text: string): string {
    if (/закат|sunset|вечер|evening/i.test(text)) return 'sunset';
    if (/ночь|ночью|ночн|night|темнот/i.test(text)) return 'night';
    if (/рассвет|dawn|утро|morning/i.test(text)) return 'dawn';
    if (/днём|днем|дневн|day|afternoon|солнц/i.test(text)) return 'day';
    if (/комнат|помещ|indoor|inside|внутри/i.test(text)) return 'indoor';
    return 'unspecified';
  }
}
