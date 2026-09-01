import crypto from 'node:crypto';
import stringify from 'fast-json-stable-stringify';
import {
  MohoDialogueActingSynthesizer,
  type DialogueEmotion,
  type SynthesizedActingPerformance,
  type FacialActingTrack
} from '../mohoDialogueActingSynthesizer/index.js';
import {
  MohoSmartActionSynthesizer,
  type SynthesizedSmartAction
} from '../mohoSmartActionSynthesizer/index.js';
import type {
  MohoBoneKey,
  MohoSwitchKey,
  MohoSmartBoneActionKey
} from '../../schemas/mohoPerformancePir.js';
import { z } from 'zod';

const mohoFxKeySchema = z.object({
  type: z.string(),
  target: z.string(),
  frame: z.number().int().min(1),
  value: z.number()
}).strict();

export type MohoFxKey = z.infer<typeof mohoFxKeySchema>;

export const MOHO_ACTING_BRIDGE_SCHEMA_VERSION = '1.0' as const;

export type MohoActingActionType = 'idle' | 'talk' | 'gesture' | 'look_at' | 'walk' | 'react';

export interface MohoActingActionInput {
  type: MohoActingActionType;
  frames: [number, number];
  /** Text utterance — required for `talk`, optional for `react` / `gesture` */
  text?: string;
  /** Phoneme-driven emotion bias */
  emotion?: DialogueEmotion;
  /** Word-level stress for asymmetric head-nod amplitude */
  stressedWords?: string[];
  /** Named gesture for non-verbal actions (e.g. "wave", "shrug") */
  gestureName?: string;
}

export interface MohoActingCharacterInput {
  characterId: string;
  rigType: 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical';
  fps?: number;
  actions: MohoActingActionInput[];
}

export interface MohoActingBridgeInput {
  characters: MohoActingCharacterInput[];
}

export interface MohoActingBridgeOutput {
  schemaVersion: typeof MOHO_ACTING_BRIDGE_SCHEMA_VERSION;
  boneKeys: MohoBoneKey[];
  switchKeys: MohoSwitchKey[];
  smartBoneActions: MohoSmartBoneActionKey[];
  fxKeys: MohoFxKey[];
  diagnostics: {
    charactersProcessed: number;
    actionsProcessed: number;
    tracksEmitted: number;
    phonemeKeyframesEmitted: number;
    notes: string[];
  };
  fingerprint: string;
}

const GESTURE_LIBRARY: Record<string, { target: string; angleDeg: number; holdFrames: number }> = {
  wave: { target: 'Hand_R', angleDeg: -45, holdFrames: 12 },
  shrug: { target: 'Shoulder_L', angleDeg: 15, holdFrames: 6 },
  point: { target: 'Hand_R', angleDeg: -90, holdFrames: 8 },
  nod: { target: 'Head', angleDeg: 8, holdFrames: 4 },
  head_shake: { target: 'Head', angleDeg: -8, holdFrames: 6 },
  lean_in: { target: 'Torso', angleDeg: 4, holdFrames: 16 }
};

const NON_HUMANOID_NOTES = new Set(['quadruped', 'creature', 'mechanical']);

const TRACK_TYPE_TO_BONE_CHANNEL: Record<FacialActingTrack['type'], MohoBoneKey['channel']> = {
  switch: 'translation',
  angle: 'rotation',
  pos: 'translation',
  scale: 'scale'
};

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clampEmotion(value: string | undefined): DialogueEmotion {
  const allowed: DialogueEmotion[] = [
    'neutral',
    'happy',
    'angry',
    'sad',
    'surprised',
    'scheming',
    'sarcastic'
  ];
  if (value && (allowed as string[]).includes(value)) {
    return value as DialogueEmotion;
  }
  return 'neutral';
}

function fingerprintOf(canonical: unknown): string {
  return crypto.createHash('sha256').update(stringify(canonical)).digest('hex');
}

function pushPhonemeSwitches(
  performance: SynthesizedActingPerformance,
  switchKeys: MohoSwitchKey[]
): void {
  for (const ph of performance.phonemeKeyframes) {
    switchKeys.push({
      switchLayerName: 'Mouth',
      frame: ph.frame,
      choice: ph.phoneme,
      interpolation: 'step'
    });
  }
}

function pushActingTracksAsBonesAndSwitches(
  performance: SynthesizedActingPerformance,
  characterId: string,
  boneKeys: MohoBoneKey[],
  switchKeys: MohoSwitchKey[],
  notes: string[]
): void {
  for (const track of performance.actingTracks) {
    if (track.type === 'switch') {
      for (const kf of track.keyframes) {
        if (typeof kf.value !== 'string') continue;
        switchKeys.push({
          switchLayerName: track.boneOrLayerName,
          frame: kf.frame,
          choice: kf.value,
          interpolation: 'step'
        });
      }
      continue;
    }

    const channel = TRACK_TYPE_TO_BONE_CHANNEL[track.type];
    let boneId = 0;
    const boneName = `${track.boneOrLayerName}__${characterId}`;
    if (track.type === 'angle' && typeof track.keyframes[0]?.value === 'number') {
      boneId = 1;
    } else if (track.type === 'pos') {
      boneId = 2;
    } else if (track.type === 'scale') {
      boneId = 3;
    }

    for (const kf of track.keyframes) {
      const value =
        typeof kf.value === 'number'
          ? kf.value
          : track.type === 'pos'
            ? safeNumber(kf.posX, 0) + safeNumber(kf.posY, 0) * 0.01
            : track.type === 'scale'
              ? safeNumber(kf.scaleX, 1)
              : 0;

      boneKeys.push({
        boneId,
        boneName,
        channel,
        frame: kf.frame,
        value,
        interpolation: 'ease_in_out'
      });
    }
  }

  notes.push(
    `Acting tracks -> ${performance.actingTracks.length} tracks, ${boneKeys.length} boneKeys, ${switchKeys.length} switchKeys (cumulative)`
  );
}

function pushGestureActions(
  action: MohoActingActionInput,
  characterId: string,
  smartBoneActions: MohoSmartBoneActionKey[],
  notes: string[]
): void {
  if (!action.gestureName) return;
  const spec = GESTURE_LIBRARY[action.gestureName];
  if (!spec) {
    notes.push(`Unknown gesture "${action.gestureName}" — skipped`);
    return;
  }

  const [start, end] = action.frames;
  const mid = Math.round((start + end) / 2);
  const target = `${spec.target}__${characterId}`;

  smartBoneActions.push({
    actionName: `${action.gestureName}__${characterId}`,
    targetBone: target,
    frame: start,
    angleDeg: 0,
    scaleX: 1,
    scaleY: 1
  });
  smartBoneActions.push({
    actionName: `${action.gestureName}__${characterId}`,
    targetBone: target,
    frame: mid,
    angleDeg: spec.angleDeg,
    scaleX: 1,
    scaleY: 1
  });
  smartBoneActions.push({
    actionName: `${action.gestureName}__${characterId}`,
    targetBone: target,
    frame: end,
    angleDeg: 0,
    scaleX: 1,
    scaleY: 1
  });

  notes.push(`Gesture "${action.gestureName}" -> 3-key action on ${target}`);
}

function pushLookAtFx(
  action: MohoActingActionInput,
  characterId: string,
  fxKeys: MohoFxKey[]
): void {
  if (action.type !== 'look_at') return;
  const [start, end] = action.frames;
  fxKeys.push({
    type: 'look_at',
    target: `${characterId}_gaze`,
    frame: start,
    value: 0
  });
  fxKeys.push({
    type: 'look_at',
    target: `${characterId}_gaze`,
    frame: end,
    value: 1
  });
}

function pushWalkFx(
  action: MohoActingActionInput,
  characterId: string,
  fxKeys: MohoFxKey[]
): void {
  if (action.type !== 'walk') return;
  const [start, end] = action.frames;
  fxKeys.push({
    type: 'walk_cycle',
    target: `${characterId}_root`,
    frame: start,
    value: 0
  });
  fxKeys.push({
    type: 'walk_cycle',
    target: `${characterId}_root`,
    frame: Math.round((start + end) / 2),
    value: 0.5
  });
  fxKeys.push({
    type: 'walk_cycle',
    target: `${characterId}_root`,
    frame: end,
    value: 1
  });
}

function pushIdleRestBones(
  action: MohoActingActionInput,
  characterId: string,
  boneKeys: MohoBoneKey[]
): void {
  if (action.type !== 'idle') return;
  const [start, end] = action.frames;
  boneKeys.push({
    boneId: 0,
    boneName: `Root__${characterId}`,
    channel: 'translation',
    frame: start,
    value: 0,
    interpolation: 'ease_in_out'
  });
  boneKeys.push({
    boneId: 0,
    boneName: `Root__${characterId}`,
    channel: 'translation',
    frame: end,
    value: 0,
    interpolation: 'ease_in_out'
  });
}

function pushReactEmotionFx(
  action: MohoActingActionInput,
  characterId: string,
  fxKeys: MohoFxKey[],
  notes: string[]
): void {
  if (action.type !== 'react') return;
  const [start, end] = action.frames;
  const emotion = clampEmotion(action.emotion);
  const valueMap: Record<DialogueEmotion, number> = {
    neutral: 0,
    happy: 0.8,
    angry: -0.7,
    sad: -0.5,
    surprised: 1.0,
    scheming: -0.2,
    sarcastic: 0.4
  };
  fxKeys.push({
    type: 'react_emotion',
    target: `${characterId}_expression`,
    frame: start,
    value: 0
  });
  fxKeys.push({
    type: 'react_emotion',
    target: `${characterId}_expression`,
    frame: Math.round((start + end) / 2),
    value: valueMap[emotion]
  });
  fxKeys.push({
    type: 'react_emotion',
    target: `${characterId}_expression`,
    frame: end,
    value: 0
  });
  notes.push(`react emotion -> ${emotion} (amplitude ${valueMap[emotion]})`);
}

function pushSquashStretchSmartActions(
  characterId: string,
  smartBoneActions: MohoSmartBoneActionKey[]
): void {
  const synth = MohoSmartActionSynthesizer.synthesizeSquashStretch([
    {
      targetPart: 'Head',
      controlBoneName: 'Head',
      horizontalSpreaderBones: [],
      scaleRatioYtoX: -0.95,
      eyelidCompensationEnabled: true
    },
    {
      targetPart: 'Body',
      controlBoneName: 'Torso',
      horizontalSpreaderBones: [],
      scaleRatioYtoX: -0.6,
      eyelidCompensationEnabled: false
    }
  ]);

  for (const sa of synth.actions) {
    for (const kf of sa.keyframes) {
      smartBoneActions.push({
        actionName: `${sa.actionName}__${characterId}`,
        targetBone: `${sa.targetBone}__${characterId}`,
        frame: kf.frame,
        angleDeg: kf.angleDeg ?? 0,
        scaleX: kf.scale?.x ?? 1,
        scaleY: kf.scale?.y ?? 1
      });
    }
  }
}

export class MohoActingBridge {
  static generate(input: MohoActingBridgeInput): MohoActingBridgeOutput {
    const boneKeys: MohoBoneKey[] = [];
    const switchKeys: MohoSwitchKey[] = [];
    const smartBoneActions: MohoSmartBoneActionKey[] = [];
    const fxKeys: MohoFxKey[] = [];
    const notes: string[] = [];

    let actionsProcessed = 0;
    let tracksEmitted = 0;
    let phonemesEmitted = 0;

    for (const character of input.characters) {
      if (NON_HUMANOID_NOTES.has(character.rigType)) {
        notes.push(
          `Character "${character.characterId}" rigType=${character.rigType} — only squash/stretch smart-actions emitted; phoneme + facial tracks skipped`
        );
      }

      pushSquashStretchSmartActions(character.characterId, smartBoneActions);

      for (const action of character.actions) {
        actionsProcessed += 1;

        if (
          action.type === 'talk' &&
          typeof action.text === 'string' &&
          action.text.length > 0 &&
          character.rigType === 'humanoid_2leg'
        ) {
          const performance: SynthesizedActingPerformance =
            MohoDialogueActingSynthesizer.synthesizeActing(
              {
                speaker: character.characterId,
                text: action.text,
                startFrame: action.frames[0],
                endFrame: action.frames[1],
                emotion: clampEmotion(action.emotion),
                stressedWords: action.stressedWords
              },
              character.fps ?? 24
            );

          pushPhonemeSwitches(performance, switchKeys);
          pushActingTracksAsBonesAndSwitches(
            performance,
            character.characterId,
            boneKeys,
            switchKeys,
            notes
          );
          phonemesEmitted += performance.phonemeKeyframes.length;
          tracksEmitted += performance.actingTracks.length;
        } else if (action.type === 'talk') {
          notes.push(
            `Talk action on "${character.characterId}" (${character.rigType}) without synthesized phonemes — using stepped switch fall-back`
          );
          const [s, e] = action.frames;
          switchKeys.push({
            switchLayerName: 'Mouth',
            frame: s,
            choice: 'A_I',
            interpolation: 'step'
          });
          switchKeys.push({
            switchLayerName: 'Mouth',
            frame: Math.round((s + e) / 2),
            choice: 'E',
            interpolation: 'step'
          });
          switchKeys.push({
            switchLayerName: 'Mouth',
            frame: e,
            choice: 'Rest',
            interpolation: 'step'
          });
        }

        pushGestureActions(action, character.characterId, smartBoneActions, notes);
        pushLookAtFx(action, character.characterId, fxKeys);
        pushWalkFx(action, character.characterId, fxKeys);
        pushIdleRestBones(action, character.characterId, boneKeys);
        pushReactEmotionFx(action, character.characterId, fxKeys, notes);
      }
    }

    const fingerprintInput = {
      schemaVersion: MOHO_ACTING_BRIDGE_SCHEMA_VERSION,
      boneKeys,
      switchKeys,
      smartBoneActions,
      fxKeys
    };

    return {
      schemaVersion: MOHO_ACTING_BRIDGE_SCHEMA_VERSION,
      boneKeys,
      switchKeys,
      smartBoneActions,
      fxKeys,
      diagnostics: {
        charactersProcessed: input.characters.length,
        actionsProcessed,
        tracksEmitted,
        phonemeKeyframesEmitted: phonemesEmitted,
        notes
      },
      fingerprint: fingerprintOf(fingerprintInput)
    };
  }

  static mergeIntoPir(
    pir: {
      boneKeys: MohoBoneKey[];
      switchKeys: MohoSwitchKey[];
      smartBoneActions: MohoSmartBoneActionKey[];
      fxKeys: MohoFxKey[];
    },
    bridgeOutput: MohoActingBridgeOutput
  ): {
    boneKeys: MohoBoneKey[];
    switchKeys: MohoSwitchKey[];
    smartBoneActions: MohoSmartBoneActionKey[];
    fxKeys: MohoFxKey[];
  } {
    return {
      boneKeys: [...pir.boneKeys, ...bridgeOutput.boneKeys].sort((a, b) => {
        if (a.frame !== b.frame) return a.frame - b.frame;
        return a.boneName.localeCompare(b.boneName);
      }),
      switchKeys: [...pir.switchKeys, ...bridgeOutput.switchKeys].sort((a, b) => {
        if (a.frame !== b.frame) return a.frame - b.frame;
        return a.switchLayerName.localeCompare(b.switchLayerName);
      }),
      smartBoneActions: [...pir.smartBoneActions, ...bridgeOutput.smartBoneActions].sort(
        (a, b) => {
          if (a.frame !== b.frame) return a.frame - b.frame;
          return a.actionName.localeCompare(b.actionName);
        }
      ),
      fxKeys: [...pir.fxKeys, ...bridgeOutput.fxKeys].sort((a, b) => {
        if (a.frame !== b.frame) return a.frame - b.frame;
        return a.target.localeCompare(b.target);
      })
    };
  }
}
