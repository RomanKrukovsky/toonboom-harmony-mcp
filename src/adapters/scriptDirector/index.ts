import {
  directorPlanSchema,
  directorVariantSetSchema,
  type DirectorPlan,
  type DirectorStrategy,
  type DirectorVariantSet,
  type ShotPlan,
  type BlockingPlan,
  type AttentionPlan,
  type EditDecision,
  type CameraPlan,
  type SceneUnderstanding,
  type DramaticBeat
} from '../../schemas/sceneIntelligence.js';

/**
 * ScriptDirector — Rule-based AI Director (Master Prompt §2).
 *
 * Takes a previously-computed SceneUnderstanding and produces ≥3 distinct
 * director plans differing by readable strategy:
 *   - restrained_dialogue
 *   - commercial_dynamic
 *   - dramatic_closeup
 *   - comedic_timing
 *   - anime_limited
 *   - theatrical_staging
 *   - single_take
 *
 * Each plan is fully Zod-validated and produces shot decomposition, blocking,
 * attention plan and edit decisions. The default variant count is 3 but the
 * ScriptDirector exposes `generateVariants(count)` so downstream tools can
 * request more.
 *
 * The director does NOT edit Harmony — it produces the planning layer that
 * later passes through KeyPoseGenerator → MotionSynthesizer → Critic.
 *
 * Example shot decomposition from the demo beats:
 *   beat_01 (Masha, controlled_anger, asks)   → OTS → Masha close → reaction shot Ivan
 *   beat_02 (Ivan, fear, denies               → Ivan close → silent_listen Masha
 *   beat_03 (Masha, surprise, points_to_door  → wide → push-in → holds on door
 */
export const ALL_STRATEGIES: DirectorStrategy[] = [
  'restrained_dialogue',
  'commercial_dynamic',
  'dramatic_closeup',
  'comedic_timing',
  'anime_limited',
  'theatrical_staging',
  'single_take',
  'custom'
];

export interface DirectorStrategyProfile {
  strategy: DirectorStrategy;
  description: string;
  defaultFraming: ShotPlan['framing'];
  defaultCameraMove: ShotPlan['cameraMove'];
  editingPace: 'slow' | 'medium' | 'fast';
  reactionShotRatio: number; // 0..1 — probability of cutting to reactor each beat
  pushInOnClimax: boolean;
  pauseBias: number; // multiplier on suggestedPauseBefore
  blockingKeysByImportance: boolean;
  custom?: string;
}

const STRATEGY_PROFILES: Record<DirectorStrategy, DirectorStrategyProfile> = {
  restrained_dialogue: {
    strategy: 'restrained_dialogue',
    description: 'Hold on the speaker; cut to reaction only at the emotional pivot. Long holds, no handheld.',
    defaultFraming: 'medium',
    defaultCameraMove: 'static',
    editingPace: 'slow',
    reactionShotRatio: 0.2,
    pushInOnClimax: false,
    pauseBias: 1.5,
    blockingKeysByImportance: true
  },
  commercial_dynamic: {
    strategy: 'commercial_dynamic',
    description: 'Tight cutting on every beat; reaction shots each beat; short framing for energy.',
    defaultFraming: 'medium_close',
    defaultCameraMove: 'static',
    editingPace: 'fast',
    reactionShotRatio: 0.8,
    pushInOnClimax: true,
    pauseBias: 0.7,
    blockingKeysByImportance: false
  },
  dramatic_closeup: {
    strategy: 'dramatic_closeup',
    description: 'Close-ups dominate; slow push-in on the accuser at the climax; reaction in extreme close-up.',
    defaultFraming: 'close_up',
    defaultCameraMove: 'dolly_in',
    editingPace: 'medium',
    reactionShotRatio: 0.5,
    pushInOnClimax: true,
    pauseBias: 1.2,
    blockingKeysByImportance: true
  },
  comedic_timing: {
    strategy: 'comedic_timing',
    description: 'Hold on deadpan reactor after the punchline; cut on the beat exactly.',
    defaultFraming: 'medium',
    defaultCameraMove: 'static',
    editingPace: 'fast',
    reactionShotRatio: 0.6,
    pushInOnClimax: false,
    pauseBias: 0.9,
    blockingKeysByImportance: false
  },
  anime_limited: {
    strategy: 'anime_limited',
    description: 'Few drawings — wide hold with subtle accents; important beats use close insert.',
    defaultFraming: 'medium_wide',
    defaultCameraMove: 'static',
    editingPace: 'slow',
    reactionShotRatio: 0.3,
    pushInOnClimax: false,
    pauseBias: 1.3,
    blockingKeysByImportance: true
  },
  theatrical_staging: {
    strategy: 'theatrical_staging',
    description: 'Symmetric two-shot throughout; minimal cuts; the actor carries the moment.',
    defaultFraming: 'two_shot',
    defaultCameraMove: 'static',
    editingPace: 'slow',
    reactionShotRatio: 0.15,
    pushInOnClimax: false,
    pauseBias: 1.4,
    blockingKeysByImportance: true
  },
  single_take: {
    strategy: 'single_take',
    description: 'One continuous take — no cuts; camera trucks between characters; push-in at climax.',
    defaultFraming: 'medium',
    defaultCameraMove: 'truck_left',
    editingPace: 'slow',
    reactionShotRatio: 0,
    pushInOnClimax: true,
    pauseBias: 1.0,
    blockingKeysByImportance: false
  },
  custom: {
    strategy: 'custom',
    description: 'User-defined strategy (uses defaults of theatrical staging as fallback).',
    defaultFraming: 'two_shot',
    defaultCameraMove: 'static',
    editingPace: 'slow',
    reactionShotRatio: 0.3,
    pushInOnClimax: false,
    pauseBias: 1.0,
    blockingKeysByImportance: true
  }
};

export class ScriptDirector {
  /** Default demo strategies — 3 readable variants per Master Prompt §2. */
  static defaultStrategies(): DirectorStrategy[] {
    return ['restrained_dialogue', 'commercial_dynamic', 'dramatic_closeup'];
  }

  /** Full cast of available strategies exposed for downstream selectors. */
  static allStrategies(): DirectorStrategy[] {
    return ALL_STRATEGIES;
  }

  /** Generate ≥3 variants by distinct strategies. Default 3 lines up with Master Prompt §2.
   *  A `seed` makes the entire variant set reproducible (used by demo + audit tests). */
  generateVariants(scene: SceneUnderstanding, count = 3, requested?: DirectorStrategy[], seed?: number): DirectorVariantSet {
    const strategies = (requested ?? ScriptDirector.defaultStrategies()).slice(0, count);
    const variants = strategies.map((s, i) => this.generate(scene, s, { seed: seed ?? hashSeed(scene, s) + i }));
    return directorVariantSetSchema.parse({
      schemaVersion: '1.0',
      sceneId: scene.sceneId,
      strategyCount: variants.length,
      variants,
      notes: 'Each variant uses a distinct strategy; the choice is downstream of the Animation Critic.'
    });
  }

  /** Build a single validated DirectorPlan for one strategy. Optional `seed`
   *  makes the plan reproducible — used by demo + regression tests. */
  generate(scene: SceneUnderstanding, strategy: DirectorStrategy, opts?: { seed?: number }): DirectorPlan {
    const profile = STRATEGY_PROFILES[strategy] ?? STRATEGY_PROFILES.theatrical_staging;
    const rng = new DeterministicRng(opts?.seed);
    const shots: ShotPlan[] = [];
    const editDecisions: EditDecision[] = [];
    const blocking: BlockingPlan[] = scene.characters.map((c, i) => ({
      characterId: c.characterId,
      startPosition: i % 2 === 0 ? 'left' : 'right',
      endPosition: i % 2 === 0 ? 'left' : 'right',
      movement: 'none',
      notes: `${profile.strategy} anchored key for ${c.name}`
    }));
    const attention: AttentionPlan[] = [];
    const pushInBeatIds: string[] = [];
    const reactionShotIds: string[] = [];
    const emphasizedBeatIds: string[] = [];

    // For single_take we produce exactly one shot covering whole scene.
    if (strategy === 'single_take') {
      const totalFrames = Math.round(scene.totalDurationSeconds * scene.fps);
      const climaxBeat = pickClimaxBeat(scene.beats);
      shots.push({
        shotId: 'shot_0',
        shotIndex: 0,
        beatId: null,
        framing: profile.defaultFraming,
        cameraMove: profile.defaultCameraMove,
        durationFrames: totalFrames,
        startFrame: scene.startFrame,
        endFrame: scene.startFrame + totalFrames - 1,
        charactersInFrame: scene.characters.map((c) => c.characterId),
        primaryFocusCharacterId: climaxBeat?.primaryCharacter ?? scene.characters[0].characterId,
        staging: 'symmetric',
        dialogue: scene.beats.some((b) => b.intent !== 'observe'),
        eyeline: null,
        description: 'Single take — anchored on the protagonist with subtle camera drift.',
        rationale: 'Single-take continuity preserves dramatic tension without cut risk.',
        confidence: 0.6
      });
      attention.push({
        shotId: 'shot_0',
        focusCharacterId: climaxBeat?.primaryCharacter ?? scene.characters[0].characterId,
        focusType: 'speaker',
        reason: 'Protagonist is the dramatic engine'
      });
      if (climaxBeat) {
        pushInBeatIds.push(climaxBeat.beatId);
        emphasizedBeatIds.push(climaxBeat.beatId);
      }
    } else {
      // One shot per beat, with optional reaction shot alternating.
      let shotIndexCounter = 0;
      let lastShotId: string | null = null;
      let cumulativeFrame = scene.startFrame;
      const climaxBeat = pickClimaxBeat(scene.beats);
      for (let i = 0; i < scene.beats.length; i++) {
        const beat = scene.beats[i];
        const durationSec = Math.max(0.5, beat.endTime - beat.startTime + beat.suggestedPauseBefore * profile.pauseBias);
        const durationFrames = Math.max(2, Math.round(durationSec * scene.fps));
        const isClimax = climaxBeat != null && beat.beatId === climaxBeat.beatId;
        const isClosing = i === scene.beats.length - 1;

        // Speaker shot
        const framing = isClimax && profile.pushInOnClimax ? 'close_up' : profile.defaultFraming;
        const cameraMove = isClimax && profile.pushInOnClimax ? 'dolly_in' : profile.defaultCameraMove;
        const shotId = `shot_${String(shotIndexCounter).padStart(2, '0')}`;
        shots.push({
          shotId,
          shotIndex: shotIndexCounter,
          beatId: beat.beatId,
          framing,
          cameraMove,
          durationFrames,
          startFrame: cumulativeFrame,
          endFrame: cumulativeFrame + durationFrames - 1,
          charactersInFrame: [beat.primaryCharacter],
          primaryFocusCharacterId: beat.primaryCharacter,
          staging: beatStaging(beat, scene, blocking),
          dialogue: beat.intent !== 'observe',
          eyeline: eyelineFor(beat, scene),
          description: `Beat ${beat.beatId} — ${beat.intent} (${beat.emotion}). Focus ${beat.primaryCharacter}.`,
          rationale: `${profile.strategy} — ${profile.description}`,
          confidence: clamp01(0.4 + beat.importance * 0.4)
        });
        attention.push({
          shotId,
          focusCharacterId: beat.primaryCharacter,
          focusType: 'speaker',
          reason: `${beat.beatId}: speaker carries the line.`
        });
        if (lastShotId) {
          editDecisions.push({
            cutFrame: cumulativeFrame,
            fromShotId: lastShotId,
            toShotId: shotId,
            cutType: cutTypeFor(profile, beat),
            rationale: `${profile.strategy} — ${profile.editingPace} pace`
          });
        }
        lastShotId = shotId;
        if (isClimax) {
          pushInBeatIds.push(beat.beatId);
          emphasizedBeatIds.push(beat.beatId);
        }
        cumulativeFrame += durationFrames;
        shotIndexCounter++;

        // Reaction shot — drawn from reactor if profile.allow & not the last beat.
        // Uses deterministic rng so a plan with a given seed reproduces exactly
        // between demo and audit runs; default seed="sceneId+strategy" hash.
        const reactorId = beat.reactionTarget
          ?? (i < scene.beats.length - 1 ? scene.beats[i + 1].primaryCharacter : null);
        const reactionThreshold = profile.reactionShotRatio + beat.importance * 0.1;
        const wantsReaction = reactorId && reactorId !== beat.primaryCharacter &&
          rng.next() < reactionThreshold;
        if (wantsReaction && reactorId && !isClosing) {
          const reactDurationFrames = Math.max(2, Math.round(durationFrames * 0.35));
          const reactShotId = `shot_${String(shotIndexCounter).padStart(2, '0')}`;
          shots.push({
            shotId: reactShotId,
            shotIndex: shotIndexCounter,
            beatId: beat.beatId,
            framing: reactionFraming(profile),
            cameraMove: 'static',
            durationFrames: reactDurationFrames,
            startFrame: cumulativeFrame,
            endFrame: cumulativeFrame + reactDurationFrames - 1,
            charactersInFrame: [reactorId],
            primaryFocusCharacterId: reactorId,
            staging: reactorStaging(beat, scene, blocking),
            dialogue: false,
            eyeline: eyelineForReaction(beat, reactorId, scene),
            description: `Reaction of ${reactorId} to beat ${beat.beatId} (${beat.emotion}).`,
            rationale: `${profile.strategy} — reaction ratio ${(profile.reactionShotRatio * 100).toFixed(0)}%.`,
            confidence: clamp01(0.3 + beat.importance * 0.3)
          });
          attention.push({
            shotId: reactShotId,
            focusCharacterId: reactorId,
            focusType: 'reactor',
            reason: `Reactor after beat ${beat.beatId}`
          });
          reactionShotIds.push(reactShotId);
          if (lastShotId) {
            editDecisions.push({
              cutFrame: cumulativeFrame,
              fromShotId: lastShotId,
              toShotId: reactShotId,
              cutType: 'match_on_look',
              rationale: 'Reveal the non-verbal reaction before the next line.'
            });
          }
          lastShotId = reactShotId;
          cumulativeFrame += reactDurationFrames;
          shotIndexCounter++;
        }
      }
    }

    const camera: CameraPlan = {
      shotCount: shots.length,
      dominantFraming: profile.defaultFraming,
      dominantCameraMove: profile.defaultCameraMove,
      hasCameraMotion: shots.some((s) => s.cameraMove !== 'static'),
      pushInBeatIds,
      reactionShotIds
    };

    const pauses = scene.beats
      .filter((b) => b.suggestedPauseBefore > 0)
      .map((b) => ({
        beatId: b.beatId,
        durationFrames: Math.max(1, Math.round(b.suggestedPauseBefore * profile.pauseBias * scene.fps)),
        rationale: `${profile.strategy} pause bias ×${profile.pauseBias.toFixed(2)}`
      }));

    const totalDurationFrames = shots.reduce((sum, s) => sum + s.durationFrames, 0);

    const plan: DirectorPlan = {
      schemaVersion: '1.0',
      planId: generatePlanId(scene.sceneId, strategy),
      sceneId: scene.sceneId,
      strategy,
      strategyDescription: profile.description,
      shots,
      camera,
      blocking,
      attention,
      editDecisions,
      pauses,
      dramaticEmphasisBeatIds: emphasizedBeatIds,
      reactionShotCount: reactionShotIds.length,
      shotCount: shots.length,
      totalDurationFrames,
      confidence: clamp01(0.4 + (scene.sceneIntentConfidence ?? 0) * 0.4),
      rationale: `${profile.strategy} — ${profile.description}`,
      provenance: {
        engine: 'rule_based ScriptDirector v1',
        createdAt: new Date().toISOString()
      }
    };

    return directorPlanSchema.parse(plan);
  }
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function pickClimaxBeat(beats: DramaticBeat[]): DramaticBeat | undefined {
  if (beats.length === 0) return undefined;
  return beats.reduce((top, b) => (b.importance > top.importance ? b : top), beats[0]);
}

function cutTypeFor(profile: DirectorStrategyProfile, beat: DramaticBeat): EditDecision['cutType'] {
  if (profile.editingPace === 'fast') return beat.intent === 'reveal' ? 'smash' : 'hard';
  if (profile.editingPace === 'medium') return 'match_action';
  return 'L_cut';
}

function reactionFraming(profile: DirectorStrategyProfile): ShotPlan['framing'] {
  if (profile.strategy === 'dramatic_closeup') return 'extreme_close_up';
  if (profile.strategy === 'restrained_dialogue') return 'medium';
  return 'medium_close';
}

function beatStaging(
  beat: DramaticBeat,
  scene: SceneUnderstanding,
  blocking: BlockingPlan[]
): ShotPlan['staging'] {
  if (scene.characters.length === 1) return 'center';
  const self = blocking.find((b) => b.characterId === beat.primaryCharacter);
  if (!self) return 'center';
  return self.startPosition === 'left' ? 'left' : self.startPosition === 'right' ? 'right' : 'center';
}

function reactorStaging(
  beat: DramaticBeat,
  scene: SceneUnderstanding,
  blocking: BlockingPlan[]
): ShotPlan['staging'] {
  if (!beat.reactionTarget) return 'right';
  const partner = blocking.find((b) => b.characterId === beat.reactionTarget);
  if (!partner) return 'right';
  return partner.startPosition === 'left' ? 'left' : partner.startPosition === 'right' ? 'right' : 'center';
}

function eyelineFor(beat: DramaticBeat, scene: SceneUnderstanding): string | null {
  if (scene.characters.length === 1) return 'camera';
  return beat.reactionTarget ?? 'offscreen_right';
}

function eyelineForReaction(
  beat: DramaticBeat,
  reactorId: string,
  scene: SceneUnderstanding
): string | null {
  return beat.primaryCharacter;
}

function generatePlanId(sceneId: string, strategy: DirectorStrategy): string {
  const stamp = Date.now().toString(36).slice(-4);
  return `${sceneId}_${strategy}_${stamp}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48);
}

/** DeterministicRng — xorshift32 PRNG with a stable seed so that a given scene
 *  + strategy always produces an identical plan. Avoids the non-determinism bug
 *  flagged in the integration audit (Math.random() produced different shot counts
 *  across demo runs). */
export class DeterministicRng {
  private state: number;
  constructor(seed?: number) {
    this.state = (seed ?? 0xC0FFEE) >>> 0;
    if (this.state === 0) this.state = 0xC0FFEE;
  }
  /** Returns a float in [0, 1) — same range as Math.random(). */
  next(): number {
    let x = this.state;
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    this.state = x;
    return (x >>> 0) / 0x100000000;
  }
}

/** Stable seed from scene+strategy so demo and audit tests agree. */
function hashSeed(scene: SceneUnderstanding, strategy: DirectorStrategy): number {
  let s = 0;
  for (const ch of scene.sceneId + strategy) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return s;
}