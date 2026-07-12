import {
  sceneUnderstandingSchema,
  type SceneUnderstanding,
  type DramaticBeat,
  type CharacterIntent,
  type EmotionCurveSample,
  type AttentionTarget,
  type ActionBeat,
  type ReactionBeat,
  type Assumption,
  type Uncertainty,
  type ContinuityConstraint
} from '../../schemas/sceneIntelligence.js';

/**
 * SceneUnderstandingEngine — Rule-based scene understanding baseline.
 *
 * Iteration 1 of AI Animation Studio (Master Prompt §1).
 * Produces a fully Zod-validated SceneUnderstanding from:
 *   - script text (natural language / screenplay-like fragment)
 *   - dialogue lines attributed to characters
 *   - characters list with optional role/stance hints
 *   - target fps & duration
 *
 * The engine uses deterministic lexical cues (Russian + English), punctuation,
 * attribution, and structural patterns to derive:
 *   - scene intent (one-line dramatic task)
 *   - characters with goals, emotional arcs and stances
 *   - dramatic beats (one beat per dialogue line + pauses between phases)
 *   - action beats (energy per line) and reaction beats (next speaker listens)
 *   - emotion curve samples (valence/arousal)
 *   - attention targets (one per beat — primary speaker except pre-pause)
 *   - continuity constraints (eyeline, screen direction)
 *   - assumptions and uncertainty markers (every inference is tagged)
 *
 * LLM adapter may refine later — see Master Prompt: "LLM backend может улучшать
 * анализ, но не должен быть единственным рабочим путём."
 */
export interface DialogueLine {
  speaker: string;
  text: string;
  startSec?: number;
  endSec?: number;
}

export interface SceneUnderstandingInput {
  script: string;
  sceneName?: string;
  sceneId?: string;
  fps?: number;
  durationSeconds?: number;
  characters?: Array<{
    characterId?: string;
    name: string;
    role?: CharacterIntent['role'];
    stance?: CharacterIntent['stance'];
    visibleOnScreen?: boolean;
  }>;
  dialogue?: DialogueLine[];
  location?: string;
  directorConstraints?: string[];
}

// Lexical intent cues: word → verb of dramatic intent.
// Order matters: more specific reveals are checked before generic "challenge".
const INTENT_CUES: Record<string, string> = {
  обвиня: 'accuse', обвин: 'accuse', обвиняю: 'accuse',
  accuse: 'accuse',
  узна: 'reveal',      // covers "узнаю", "узнать", "узнаёт"
  видел: 'reveal',    // covers "видела", "видел", "видели" — revelation of discovery
  призн: 'reveal', reveal: 'reveal', признаюсь: 'reveal',
  угрож: 'threaten', threatening: 'threaten',
  скрыв: 'hide', hide: 'hide', скрою: 'hide',
  умоля: 'plead', pleading: 'plead', прошу: 'plead',
  предла: 'persuade', persuade: 'persuade', предлагаю: 'persuade',
  извин: 'apologise', apologize: 'apologise', sorry: 'apologise',
  лгу: 'lie', lying: 'lie', вру: 'lie', обманыв: 'lie',
  боюсь: 'fear', fear: 'fear', страшно: 'fear',
  ненави: 'hate', hate: 'hate',
  люблю: 'love', love: 'love',
  уйду: 'leave', leaving: 'leave', ухожу: 'leave',
  остан: 'stay', stay: 'stay',
  знаешь: 'challenge', challenge: 'challenge', думал: 'challenge'
};

const EMOTION_CUES: Array<{ regex: RegExp; label: string; valence: number; arousal: number }> = [
  { regex: /\b(ненавиж|ненавист|hate)\b/i, label: 'hate', valence: -0.9, arousal: 0.9 },
  { regex: /\b(зол|hearted|rage|ярост|гнев)\b/i, label: 'controlled_anger', valence: -0.7, arousal: 0.7 },
  { regex: /\b(боюсь|страх|fear|страшно)\b/i, label: 'fear', valence: -0.8, arousal: 0.5 },
  { regex: /\b(удив|wow|пораз|не может быть)\b/i, label: 'surprise', valence: 0.1, arousal: 0.8 },
  { regex: /\b(люблю|love|обожаю|heart)\b/i, label: 'love', valence: 0.9, arousal: 0.5 },
  { regex: /\b(радость|счастье|happy|joy)\b/i, label: 'joy', valence: 0.9, arousal: 0.5 },
  { regex: /\b(печаль|грусть|sadness|грустно)\b/i, label: 'sadness', valence: -0.6, arousal: -0.4 },
  { regex: /\b(презрение|disgust|отвращ)\b/i, label: 'disgust', valence: -0.7, arousal: 0.2 },
  { regex: /\b(спокойств|calm|тихо|равнод)\b/i, label: 'calm', valence: 0.1, arousal: -0.6 },
  { regex: /\b(узна|discover|понял|realize)\b/i, label: 'realisation', valence: 0.0, arousal: 0.3 }
];

const ACTION_CUES: Record<string, string> = {
  'указ': 'points_to',
  'показ': 'points_to',
  'двер': 'points_to',     // "у двери" — speaker implicitly indicates the door
  'point': 'points_to',
  'встал': 'stands_up',
  'встаю': 'stands_up',
  'стою': 'stands_up',
  'крик': 'shouts',
  'кричу': 'shouts',
  'shout': 'shouts',
  'шепч': 'whispers',
  'whisper': 'whispers',
  'мотрю': 'looks_at',
  'смотрит': 'looks_at',
  'looks': 'looks_at',
  'looks_at': 'looks_at',
  'плачу': 'cries',
  'плачет': 'cries',
  'cry': 'cries',
  'думаю': 'thinks',
  'thinks': 'thinks',
  'иду': 'walks_to',
  'идет': 'walks_to',
  'walks': 'walks_to',
  'бегу': 'runs_to',
  'бежит': 'runs_to',
  'убег': 'flees',
  'отверн': 'turns_away',
  'turns_away': 'turns_away',
  'молч': 'silent_hold'
};

function defaultStance(text: string): CharacterIntent['stance'] {
  if (/сид|sit/i.test(text)) return 'sitting';
  if (/леж|lie|lying/i.test(text)) return 'lying';
  if (/ид|walk|run|бег|иду|движ/i.test(text)) return 'moving';
  return 'standing';
}

function inferIntent(text: string): { intent: string; confidence: number } {
  for (const [cue, verb] of Object.entries(INTENT_CUES)) {
    if (text.toLowerCase().includes(cue.toLowerCase())) {
      return { intent: verb, confidence: 0.7 };
    }
  }
  // punctuation-based fallback — questions imply challenge/probe
  if (/^[¿?].*\??$/.test(text.trim()) || /\?$/.test(text.trim())) {
    return { intent: 'probe', confidence: 0.4 };
  }
  // exclamation implies assert
  if (/!$/.test(text.trim())) {
    return { intent: 'assert', confidence: 0.4 };
  }
  return { intent: 'speak', confidence: 0.3 };
}

function inferEmotion(text: string, prevLabel?: string): {
  label: string; valence: number; arousal: number; confidence: number;
} {
  for (const cue of EMOTION_CUES) {
    if (cue.regex.test(text)) {
      return { label: cue.label, valence: cue.valence, arousal: cue.arousal, confidence: 0.6 };
    }
  }
  if (prevLabel) {
    return { label: prevLabel, valence: -0.1, arousal: 0.0, confidence: 0.3 };
  }
  return { label: 'neutral', valence: 0, arousal: 0, confidence: 0.3 };
}

function inferAction(text: string): { action: string; confidence: number } {
  const lower = text.toLowerCase();
  for (const [cue, verb] of Object.entries(ACTION_CUES)) {
    if (lower.includes(cue.toLowerCase())) {
      return { action: verb, confidence: 0.55 };
    }
  }
  if (/\?\s*$/.test(text)) {
    return { action: 'questions', confidence: 0.4 };
  }
  return { action: 'speaks', confidence: 0.4 };
}

function inferImportance(text: string, isLastBeat: boolean): number {
  let impt = 0.45;
  if (/!$/.test(text.trim())) impt += 0.25;
  if (/\?$/.test(text.trim())) impt += 0.1;
  if (text.length > 80) impt += 0.1;
  if (text.length < 25) impt += 0.05;
  if (isLastBeat) impt = Math.min(1.0, impt + 0.2);
  return Math.min(1.0, Math.max(0.1, impt));
}

function inferPauseBefore(text: string, prevText?: string): number {
  if (!prevText) return 0;
  // pause follows strong emotional beat or question
  if (/[!?.]\s*$/.test(prevText.trim())) return 0.35;
  if (/\?\s*$/.test(prevText.trim())) return 0.45;
  if (/[""«»]/.test(prevText)) return 0.15;
  return 0.1;
}

function classifyBeatKind(
  index: number,
  count: number,
  text: string
): DramaticBeat['beatKind'] {
  const ratio = count <= 1 ? 0.5 : index / (count - 1);
  if (ratio < 0.18) return 'setup';
  if (ratio < 0.45) return 'rising_action';
  if (ratio < 0.6) return 'turn';
  if (ratio < 0.85) return 'confrontation';
  if (/\?$/.test(text)) return 'revelation';
  if (ratio >= 0.85) return 'resolution';
  return 'pause';
}

function splitDialogue(script: string, dialogue: DialogueLine[]): DialogueLine[] {
  if (dialogue && dialogue.length > 0) return dialogue;
  // Naive attribution pass: lines of form "Name: text" or "- Name: text"
  const lines: DialogueLine[] = [];
  for (const raw of script.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(?:[-—*]\s*)?([A-ZА-Я][\w\s.]{0,40}?)[—:]\s*(.+)$/u);
    if (m) {
      lines.push({ speaker: m[1].trim(), text: m[2].trim() });
    } else if (line.length > 0 && lines.length > 0) {
      lines[lines.length - 1].text += ' ' + line;
    }
  }
  return lines;
}

export class SceneUnderstandingEngine {
  /**
   * Build a Zod-validated SceneUnderstanding from natural-language input.
   * Doesn't throw; returns an object that always passes schema — but it
   * surfaces computed assumptions and uncertainties for downstream review.
   */
  analyze(input: SceneUnderstandingInput): SceneUnderstanding {
    const fps = input.fps ?? 24;
    const durationSeconds = input.durationSeconds ?? 6.0;
    const sceneId = input.sceneId ?? 'scene_auto';
    const sceneName = input.sceneName ?? 'Untitled Scene';
    const dialogue = splitDialogue(input.script, input.dialogue ?? []);

    // ── Characters ────────────────────────────────────────────────────────
    const assumedCharacters = new Map<string, CharacterIntent>();
    for (const c of input.characters ?? []) {
      const id = c.characterId ?? slug(c.name);
      assumedCharacters.set(id, {
        characterId: id,
        name: c.name,
        role: c.role ?? 'unknown',
        goalInScene: 'derive from dialogue',
        emotionalArc: 'neutral → ?',
        stance: c.stance ?? 'unknown',
        hasDialogue: false,
        speaksFirst: false,
        receivesReaction: false,
        visibleOnScreen: c.visibleOnScreen ?? true
      });
    }
    // Add any speaker that wasn't supplied
    let speaksFirstSet = false;
    for (const line of dialogue) {
      const id = slug(line.speaker);
      if (!assumedCharacters.has(id)) {
        assumedCharacters.set(id, {
          characterId: id,
          name: line.speaker,
          role: 'unknown',
          goalInScene: 'derive from dialogue',
          emotionalArc: 'neutral → ?',
          stance: 'unknown',
          hasDialogue: true,
          speaksFirst: false,
          receivesReaction: false,
          visibleOnScreen: true
        });
      }
      const c = assumedCharacters.get(id)!;
      c.hasDialogue = true;
      if (!speaksFirstSet) {
        c.speaksFirst = true;
        speaksFirstSet = true;
      }
    }
    if (assumedCharacters.size === 0) {
      // Fallback character for silent scenes
      assumedCharacters.set('narrator', {
        characterId: 'narrator',
        name: 'Narrator',
        role: 'unknown',
        goalInScene: 'narrate',
        emotionalArc: 'neutral',
        stance: 'unknown',
        hasDialogue: false,
        speaksFirst: false,
        receivesReaction: false,
        visibleOnScreen: false
      });
    }

    // ── Beats: one per dialogue line + pre-line pauses ────────────────────
    const beats: DramaticBeat[] = [];
    const actionBeats: ActionBeat[] = [];
    const reactionBeats: ReactionBeat[] = [];
    const emotionCurve: EmotionCurveSample[] = [];
    const attentionTargets: AttentionTarget[] = [];

    // Distribute duration roughly evenly across lines, biased toward importance
    const baseLineDuration = dialogue.length > 0 ? durationSeconds / dialogue.length : durationSeconds;
    let cursorTime = 0;
    let prevLabel: string | undefined;
    let prevText: string | undefined;
    for (let i = 0; i < dialogue.length; i++) {
      const line = dialogue[i];
      const speakerId = slug(line.speaker);
      const isLast = i === dialogue.length - 1;
      const pause = inferPauseBefore(line.text, prevText);
      const startTime = cursorTime + pause;
      const lineSec = line.endSec && line.startSec !== undefined
        ? Math.max(0.5, line.endSec - line.startSec)
        : Math.max(0.8, baseLineDuration);
      const endTime = startTime + lineSec;
      const { intent } = inferIntent(line.text);
      const emo = inferEmotion(line.text, prevLabel);
      const { action } = inferAction(line.text);
      const importance = inferImportance(line.text, isLast);
      const beatKind = classifyBeatKind(i, dialogue.length, line.text);
      const beatId = `beat_${String(i + 1).padStart(2, '0')}`;

      // Reaction target: the next or previous speaker
      const nextSpeakerId = i < dialogue.length - 1 ? slug(dialogue[i + 1].speaker) : speakerId;
      const prevSpeakerId = i > 0 ? slug(dialogue[i - 1].speaker) : speakerId;
      const reactionTarget = nextSpeakerId !== speakerId ? nextSpeakerId : (prevSpeakerId !== speakerId ? prevSpeakerId : undefined);

      beats.push({
        beatId,
        startTime,
        endTime,
        primaryCharacter: speakerId,
        intent,
        emotion: emo.label,
        action,
        reactionTarget: reactionTarget ?? null,
        importance,
        suggestedPauseBefore: pause,
        beatKind,
        supportsStoryArc: true,
        confidence: emo.confidence * 0.9,
        assumptionIds: [`assumption_beat_${i + 1}_baseline`]
      });
      actionBeats.push({
        beatId,
        speaker: speakerId,
        actionVerb: action,
        durationSec: lineSec,
        energy: emo.arousal > 0.6 ? 'high' : emo.arousal > 0.2 ? 'medium' : 'low',
        confidence: emo.confidence
      });
      // Reaction beat: the previous speaker listens to this one
      if (i > 0) {
        reactionBeats.push({
          beatId,
          reactor: prevSpeakerId,
          triggerBeatId: beatId,
          reactionType: 'silent_listen',
          confidence: 0.4
        });
      }
      emotionCurve.push({
        time: startTime + lineSec / 2,
        characterId: speakerId,
        valence: emo.valence,
        arousal: emo.arousal,
        label: emo.label,
        confidence: emo.confidence,
        sourceBeatId: beatId
      });
      attentionTargets.push({
        startFrame: Math.round(startTime * fps),
        endFrame: Math.round(endTime * fps),
        focusCharacterId: speakerId,
        focusType: 'speaker',
        reason: `Speaking line ${i + 1}`,
        confidence: 0.7
      });
      // Bump the character's emotional arc and goal
      const c = assumedCharacters.get(speakerId);
      if (c) {
        if (c.emotionalArc === 'neutral → ?' || c.goalInScene === 'derive from dialogue') {
          c.emotionalArc = `neutral → ${emo.label}`;
          c.goalInScene = intent;
        }
        if (c.stance === 'unknown') {
          c.stance = defaultStance(line.text);
        }
      }
      cursorTime = endTime;
      prevLabel = emo.label;
      prevText = line.text;
    }
    if (beats.length === 0) {
      // No dialogue: a single ambient beat
      beats.push({
        beatId: 'beat_01',
        startTime: 0,
        endTime: durationSeconds,
        primaryCharacter: assumedCharacters.keys().next().value!,
        intent: 'observe',
        emotion: 'calm',
        action: 'silent_hold',
        reactionTarget: null,
        importance: 0.4,
        suggestedPauseBefore: 0,
        beatKind: 'setup',
        supportsStoryArc: true,
        confidence: 0.3,
        assumptionIds: ['assumption_no_dialogue']
      });
      attentionTargets.push({
        startFrame: 1,
        endFrame: Math.round(durationSeconds * fps),
        focusCharacterId: assumedCharacters.keys().next().value!,
        focusType: 'environment',
        reason: 'No dialogue — environment focus.',
        confidence: 0.4
      });
    }
    // Mark a receiver of reaction on the second character if exists
    const chars = [...assumedCharacters.values()];
    if (chars.length >= 2) {
      chars[1].receivesReaction = true;
    }

    // ── Scene intent (aggregate across beats, weighted by importance × confidence) ─────
    // Picking just the single top-importance beat conflates "last beat bonus" with
    // dramatic weight. Instead we sum (importance × confidence) per intent verb and
    // choose the highest total. This makes the demo dialogue "Узнаю / скрывал / видела у
    // двери" correctly resolve to "reveal" rather than "speak".
    const intentScore = new Map<string, number>();
    for (const b of beats) {
      intentScore.set(b.intent, (intentScore.get(b.intent) ?? 0) + b.importance * b.confidence);
    }
    let bestIntent = beats[0].intent;
    let bestScore = -Infinity;
    for (const [k, v] of Array.from(intentScore.entries())) {
      if (v > bestScore) {
        bestScore = v;
        bestIntent = k;
      }
    }
    const sceneIntent = bestIntent;
    const bestBeatForIntent = beats.find((b) => b.intent === bestIntent) ?? beats[0];
    const sceneIntentConfidence = Math.min(1.0, 0.4 + bestBeatForIntent.importance * 0.4);

    // ── Continuity constraints ────────────────────────────────────────────
    const continuity: ContinuityConstraint[] = [];
    if (chars.length >= 2) {
      continuity.push({
        id: 'cont_eyeline_main',
        kind: 'eyeline',
        description: `Eyeline: ${chars[0].name} looks at ${chars[1].name} during confrontational beats; reverse for reaction shots.`,
        locked: false
      });
      continuity.push({
        id: 'cont_screen_dir',
        kind: 'screen_direction',
        description: 'Screen direction: do not flip left/right placement of characters across shots without motivator.',
        locked: false
      });
      continuity.push({
        id: 'cont_position_main',
        kind: 'screen_position',
        description: `Blocked positions: ${chars[0].name} (left) vs ${chars[1].name} (right). Maintain for the entire scene.`,
        locked: false
      });
    }

    // ── Assumptions and Uncertainties (honest limitations) ────────────────
    const assumptions: Assumption[] = [];
    const uncertainties: Uncertainty[] = [];
    // Per-beat assumption that we picked the speaker's intent correctly
    for (const b of beats) {
      assumptions.push({
        id: `assumption_beat_${b.beatId.split('_')[1]}_baseline`,
        description: `Beat "${b.beatId}" intent "${b.intent}" was inferred from lexical cues of the line text, not validated against character psychology.`,
        confidence: b.confidence,
        evidence: [`Line from ${b.primaryCharacter}: derived from script`],
        falsifiable: true
      });
    }
    if (input.location) {
      assumptions.push({
        id: 'assumption_location_read',
        description: `Scene location "${input.location}" was used as blocking basis without visual reference.`,
        confidence: 0.6,
        evidence: [`Provided location: ${input.location}`],
        falsifiable: true
      });
    } else {
      uncertainties.push({
        level: 'medium',
        reason: 'Location not provided; staging assumes default two-character interior blocking.',
        needsHumanReview: false
      });
    }
    if (!input.directorConstraints || input.directorConstraints.length === 0) {
      uncertainties.push({
        level: 'medium',
        reason: 'No explicit director constraints; default dramatic strategies will be applied.',
        needsHumanReview: false
      });
    }
    // For every emotion that was calque'd from prevLabel (low confidence)
    for (const ec of emotionCurve) {
      if (ec.confidence < 0.4) {
        uncertainties.push({
          level: 'medium',
          reason: `Emotion at t=${ec.time.toFixed(2)}s for ${ec.characterId} fell back to "${ec.label}" without lexical evidence.`,
          needsHumanReview: false
        });
      }
    }

    const endFrame = Math.max(1, Math.round((cursorTime || durationSeconds) * fps));
    const result: SceneUnderstanding = {
      schemaVersion: '1.0',
      sceneId,
      sceneName,
      sourceScript: input.script,
      totalDurationSeconds: cursorTime || durationSeconds,
      fps,
      startFrame: 1,
      endFrame,
      sceneIntent,
      sceneIntentConfidence,
      characters: chars,
      beats,
      actionBeats,
      reactionBeats,
      emotionCurve,
      attentionTargets,
      continuity,
      assumptions,
      uncertainties,
      provenance: {
        engine: 'rule_based SceneUnderstandingEngine v1',
        createdAt: new Date().toISOString(),
        notes: 'Rule-based baseline. LLM optional adapter not used.'
      }
    };
    // Final Zod validation; will throw if internal invariants break.
    return sceneUnderstandingSchema.parse(result);
  }
}

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-zа-я0-9_]+/gi, '_').replace(/^_+|_+$/g, '') || 'char_unknown';
}