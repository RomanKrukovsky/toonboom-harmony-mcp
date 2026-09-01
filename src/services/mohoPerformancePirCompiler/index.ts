import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import {
  type ShotManifest,
  type ShotBeat,
  type ShowBibleCrossRefs,
  type CrossReferenceViolation,
  crossReferenceShotManifest
} from '../../schemas/shotManifest.js';
import {
  type MohoCharacterBible,
  type MohoControllerBinding
} from '../../schemas/mohoCharacterBible.js';
import { type MohoCameraRules } from '../../schemas/mohoCameraRules.js';
import { type MohoMotionGrammar } from '../../schemas/mohoMotionGrammar.js';
import {
  type MohoPerformancePir,
  type MohoBoneKey,
  type MohoSwitchKey,
  type MohoSmartBoneActionKey,
  MOHO_PERFORMANCE_PIR_SCHEMA_VERSION
} from '../../schemas/mohoPerformancePir.js';

export interface MohoPerformancePirCompilerOptions {
  shotManifest: ShotManifest;
  characterBible: MohoCharacterBible;
  cameraRules?: MohoCameraRules;
  motionGrammar?: MohoMotionGrammar;
  crossRefs?: ShowBibleCrossRefs;
  compilerVersion?: string;
}

export interface MohoPerformancePirCompilerResult {
  pir: MohoPerformancePir;
  violations: CrossReferenceViolation[];
  warnings: string[];
}

type NonStaticCameraMove = Exclude<ShotManifest['staging']['cameraMove'], 'static'>;

type CameraDelta = {
  x?: number;
  y?: number;
  zoom?: number;
  rotation?: number;
};

type CameraKeyEntry = CameraDelta & { frame: number };

const CAMERA_MOVE_ENDPOINTS: Record<NonStaticCameraMove, { from: CameraDelta; to: CameraDelta }> = {
  pan_left: { from: { x: 0 }, to: { x: -120 } },
  pan_right: { from: { x: 0 }, to: { x: 120 } },
  tilt_up: { from: { y: 0 }, to: { y: 96 } },
  tilt_down: { from: { y: 0 }, to: { y: -96 } },
  dolly_in: { from: { zoom: 1 }, to: { zoom: 1.25 } },
  dolly_out: { from: { zoom: 1 }, to: { zoom: 0.8 } },
  truck_left: { from: { x: 0 }, to: { x: -96 } },
  truck_right: { from: { x: 0 }, to: { x: 96 } },
  pedestal_up: { from: { y: 0 }, to: { y: 72 } },
  pedestal_down: { from: { y: 0 }, to: { y: -72 } },
  zoom_in: { from: { zoom: 1 }, to: { zoom: 1.4 } },
  zoom_out: { from: { zoom: 1 }, to: { zoom: 0.7 } },
  arc_left: { from: { x: 0, rotation: 0 }, to: { x: 72, rotation: -6 } },
  arc_right: { from: { x: 0, rotation: 0 }, to: { x: -72, rotation: 6 } },
  crane_up: { from: { y: 0 }, to: { y: 120 } },
  crane_down: { from: { y: 0 }, to: { y: -120 } }
};

const EMOTION_DEFAULTS: Record<string, { rotation: number; translation: number; scale: number; opacity: number }> = {
  happy: { rotation: 0, translation: 8, scale: 1.05, opacity: 1 },
  sad: { rotation: 0, translation: -8, scale: 0.95, opacity: 0.9 },
  angry: { rotation: 0, translation: 12, scale: 1.08, opacity: 1 },
  fear: { rotation: 0, translation: -12, scale: 0.92, opacity: 0.85 },
  surprise: { rotation: 0, translation: 16, scale: 1.1, opacity: 1 },
  neutral: { rotation: 0, translation: 0, scale: 1, opacity: 1 }
};

const DEFAULT_INTERPOLATION: MohoBoneKey['interpolation'] = 'ease_in_out';

export class MohoPerformancePirCompiler {
  compile(opts: MohoPerformancePirCompilerOptions): MohoPerformancePirCompilerResult {
    const warnings: string[] = [];
    const compilerVersion = opts.compilerVersion ?? 'moho-pir-compiler-v1';

    const violations = opts.crossRefs
      ? crossReferenceShotManifest(opts.shotManifest, opts.crossRefs)
      : [];

    const rigTypeViolations = violations.filter(v => v.kind === 'unknown_rig_type');
    if (rigTypeViolations.length > 0) {
      return {
        pir: this.emptyPir(opts, compilerVersion),
        violations,
        warnings: [...warnings, 'fail-closed: unknown_rig_type violation(s) present']
      };
    }

    const characterMatch =
      opts.characterBible.characterId === (opts.shotManifest.beats[0]?.characterId ?? opts.characterBible.characterId);

    if (!characterMatch && opts.shotManifest.beats.length > 0) {
      warnings.push(
        `character bible "${opts.characterBible.characterId}" does not match first beat characterId "${opts.shotManifest.beats[0]?.characterId}" — proceeding with bible controllers`
      );
    }

    const boneKeys = this.compileBoneKeys(
      opts.shotManifest.beats,
      opts.characterBible.controllers,
      opts.motionGrammar,
      warnings
    );

    const switchKeys = this.compileSwitchKeys(
      opts.shotManifest.beats,
      opts.characterBible.switchLayers,
      opts.characterBible.mouthShapes,
      warnings
    );

    const smartBoneActions = this.compileSmartBoneActions(
      opts.shotManifest.beats,
      opts.characterBible.gestureLibrary,
      opts.characterBible,
      warnings
    );

    const cameraKeys = this.compileCameraKeys(opts.shotManifest.staging, opts.shotManifest.timing, warnings);

    const fxKeys = this.compileFxKeys(opts.shotManifest.fx, warnings);

    const skeleton: Omit<MohoPerformancePir, 'deterministicFingerprint'> = {
      schemaVersion: MOHO_PERFORMANCE_PIR_SCHEMA_VERSION,
      performanceId: '',
      rigType: opts.characterBible.rigType,
      shotManifestRef: opts.shotManifest.shotId,
      mohoShowBibleRef: opts.characterBible.characterId,
      boneKeys,
      switchKeys,
      smartBoneActions,
      cameraKeys,
      fxKeys,
      provenance: {
        compiledAt: '1970-01-01T00:00:00.000Z',
        compilerVersion
      }
    };

    const fingerprint = this.computeFingerprint(skeleton);
    const pir: MohoPerformancePir = {
      ...skeleton,
      performanceId: `MOHO-${fingerprint.slice(0, 16)}`,
      deterministicFingerprint: fingerprint,
      provenance: {
        compiledAt: new Date(0).toISOString(),
        compilerVersion
      }
    };

    return { pir, violations, warnings };
  }

  private compileBoneKeys(
    beats: ShotBeat[],
    controllers: MohoControllerBinding[],
    motionGrammar: MohoMotionGrammar | undefined,
    warnings: string[]
  ): MohoBoneKey[] {
    const keys: MohoBoneKey[] = [];
    const interpolation = (motionGrammar?.defaultEasing && motionGrammar.defaultEasing !== 'custom')
      ? (motionGrammar.defaultEasing as MohoBoneKey['interpolation'])
      : DEFAULT_INTERPOLATION;

    const constraints = new Map<string, { min: number; max: number }>();
    if (motionGrammar) {
      for (const rule of motionGrammar.rules) {
        for (const c of rule.boneConstraints) {
          constraints.set(c.boneName, { min: c.minAngleDeg, max: c.maxAngleDeg });
        }
      }
    }

    for (const beat of beats) {
      const emotion = EMOTION_DEFAULTS[beat.emotion] ?? EMOTION_DEFAULTS['neutral'];

      for (const ctrl of controllers) {
        const baseValue = this.controllerBaseValue(ctrl, emotion);
        const constrained = this.applyBoneConstraint(ctrl.boneName, baseValue, constraints);
        const startKey: MohoBoneKey = {
          boneId: ctrl.boneId,
          boneName: ctrl.boneName,
          channel: ctrl.channel,
          frame: beat.startFrame,
          value: constrained,
          interpolation
        };
        keys.push(startKey);

        if (beat.endFrame > beat.startFrame) {
          const endValue = this.controllerEndValue(ctrl, emotion, constrained);
          const endConstrained = this.applyBoneConstraint(ctrl.boneName, endValue, constraints);
          keys.push({
            boneId: ctrl.boneId,
            boneName: ctrl.boneName,
            channel: ctrl.channel,
            frame: beat.endFrame,
            value: endConstrained,
            interpolation
          });
        }
      }

      if (beat.gestureId) {
        warnings.push(
          `beat "${beat.beatId}": gestureId "${beat.gestureId}" — bone channel placement uses character bible default; specific gesture curves resolved downstream`
        );
      }
    }

    keys.sort((a, b) => {
      if (a.boneId !== b.boneId) return a.boneId - b.boneId;
      if (a.frame !== b.frame) return a.frame - b.frame;
      return a.channel.localeCompare(b.channel);
    });

    return keys;
  }

  private compileSwitchKeys(
    beats: ShotBeat[],
    switchLayers: MohoCharacterBible['switchLayers'],
    mouthShapes: MohoCharacterBible['mouthShapes'],
    warnings: string[]
  ): MohoSwitchKey[] {
    const keys: MohoSwitchKey[] = [];

    for (const beat of beats) {
      const requestedShape = beat.audioCue?.transcript
        ? this.phonemeFromTranscript(beat.audioCue.transcript)
        : 'Rest';
      const shape = mouthShapes.find(m => m.shapeId === requestedShape)
        ?? mouthShapes.find(m => m.shapeId === 'Rest');

      if (shape) {
        for (const layer of switchLayers) {
          if (!layer.layerName.toLowerCase().includes('mouth')) continue;

          const choiceExists = layer.choices.some(choice => choice.drawingName === shape.drawingName);
          if (!choiceExists) {
            warnings.push(
              `beat "${beat.beatId}": mouth shape "${shape.drawingName}" is absent from switch layer "${layer.layerName}" — switch key skipped`
            );
            continue;
          }

          keys.push({
            switchLayerName: layer.layerName,
            frame: beat.startFrame,
            choice: shape.drawingName,
            interpolation: 'step'
          });
        }
      }

      const emotionChoice = this.emotionToSwitchChoice(beat.emotion);
      if (emotionChoice) {
        for (const layer of switchLayers) {
          if (layer.layerName.toLowerCase().includes('expression') || layer.layerName.toLowerCase().includes('face')) {
            const choice = layer.choices.find(c => c.choiceId === emotionChoice || c.drawingName === emotionChoice);
            if (choice) {
              keys.push({
                switchLayerName: layer.layerName,
                frame: beat.startFrame,
                choice: choice.drawingName,
                interpolation: 'step'
              });
            }
          }
        }
      }
    }

    if (beats.length > 0 && switchLayers.length > 0 && keys.length === 0) {
      warnings.push(
        `no switch keys emitted — beat transcripts and emotions did not match any switch layer choices`
      );
    }

    return keys;
  }

  private compileSmartBoneActions(
    beats: ShotBeat[],
    gestureLibrary: MohoCharacterBible['gestureLibrary'],
    characterBible: MohoCharacterBible,
    warnings: string[]
  ): MohoSmartBoneActionKey[] {
    const keys: MohoSmartBoneActionKey[] = [];

    for (const beat of beats) {
      if (!beat.gestureId) continue;
      const entry = gestureLibrary.find(g => g.gestureId === beat.gestureId);
      if (!entry) {
        warnings.push(
          `beat "${beat.beatId}": gestureId "${beat.gestureId}" not in gestureLibrary — smart bone action skipped`
        );
        continue;
      }

      const targetRef = entry.targetControllerId ?? entry.controllerTrackRef;
      const targetController = characterBible.controllers.find(
        c => c.controllerId === targetRef || c.boneName === targetRef
      );
      if (!targetController) {
        warnings.push(
          `beat "${beat.beatId}": gesture "${entry.gestureId}" has no controller mapping — smart bone action skipped`
        );
        continue;
      }
      const targetBone = targetController.boneName;

      keys.push({
        actionName: entry.gestureId,
        targetBone,
        frame: beat.startFrame,
        angleDeg: 0,
        scaleX: 1,
        scaleY: 1
      });

      if (beat.endFrame > beat.startFrame) {
        keys.push({
          actionName: entry.gestureId,
          targetBone,
          frame: beat.endFrame,
          angleDeg: 0,
          scaleX: 1,
          scaleY: 1
        });
      }
    }

    return keys;
  }

  private compileCameraKeys(
    staging: ShotManifest['staging'],
    timing: ShotManifest['timing'],
    warnings: string[]
  ): MohoPerformancePir['cameraKeys'] {
    const move = staging.cameraMove;
    if (move === 'static') return [];

    const endpoints = CAMERA_MOVE_ENDPOINTS[move];
    if (!endpoints) {
      warnings.push(`camera move "${move}" has no endpoint mapping — skipped`);
      return [];
    }

    const startFrame = staging.cameraStartFrame ?? 1;
    const endFrame = staging.cameraEndFrame ?? timing.totalFrames;

    const keys: MohoPerformancePir['cameraKeys'] = [];
    const from: CameraKeyEntry = { frame: startFrame };
    if (endpoints.from.x !== undefined) from.x = endpoints.from.x;
    if (endpoints.from.y !== undefined) from.y = endpoints.from.y;
    if (endpoints.from.zoom !== undefined) from.zoom = endpoints.from.zoom;
    if (endpoints.from.rotation !== undefined) from.rotation = endpoints.from.rotation;
    keys.push(from);

    if (endFrame > startFrame) {
      const to: CameraKeyEntry = { frame: endFrame };
      if (endpoints.to.x !== undefined) to.x = endpoints.to.x;
      if (endpoints.to.y !== undefined) to.y = endpoints.to.y;
      if (endpoints.to.zoom !== undefined) to.zoom = endpoints.to.zoom;
      if (endpoints.to.rotation !== undefined) to.rotation = endpoints.to.rotation;
      keys.push(to);
    }

    warnings.push(`camera "${move}" compiled to cameraKeys (${keys.length} entries)`);
    return keys;
  }

  private compileFxKeys(
    fx: ShotManifest['fx'],
    warnings: string[]
  ): MohoPerformancePir['fxKeys'] {
    const keys: MohoPerformancePir['fxKeys'] = [];
    for (const f of fx) {
      const startValue = 0;
      const endValue = 1;
      keys.push({
        type: f.type,
        target: f.target,
        frame: f.startFrame,
        value: startValue
      });
      if (f.endFrame > f.startFrame) {
        keys.push({
          type: f.type,
          target: f.target,
          frame: f.endFrame,
          value: endValue
        });
      }
    }
    if (fx.length > 0) {
      warnings.push(`fx: ${fx.length} effect(s) compiled to fxKeys (intensity 0->1 envelope)`);
    }
    return keys;
  }

  private computeFingerprint(
    pirWithoutFingerprint: Omit<MohoPerformancePir, 'deterministicFingerprint'>
  ): string {
    const stable = stringify(pirWithoutFingerprint);
    return crypto.createHash('sha256').update(stable ?? '').digest('hex');
  }

  private emptyPir(
    opts: MohoPerformancePirCompilerOptions,
    compilerVersion: string
  ): MohoPerformancePir {
    const skeleton: Omit<MohoPerformancePir, 'deterministicFingerprint'> = {
      schemaVersion: MOHO_PERFORMANCE_PIR_SCHEMA_VERSION,
      performanceId: '',
      rigType: opts.characterBible.rigType,
      shotManifestRef: opts.shotManifest.shotId,
      mohoShowBibleRef: opts.characterBible.characterId,
      boneKeys: [],
      switchKeys: [],
      smartBoneActions: [],
      cameraKeys: [],
      fxKeys: [],
      provenance: {
        compiledAt: '1970-01-01T00:00:00.000Z',
        compilerVersion
      }
    };
    const fingerprint = this.computeFingerprint(skeleton);
    return {
      ...skeleton,
      performanceId: `MOHO-${fingerprint.slice(0, 16)}`,
      deterministicFingerprint: fingerprint,
      provenance: {
        compiledAt: new Date(0).toISOString(),
        compilerVersion
      }
    };
  }

  private controllerBaseValue(
    ctrl: MohoControllerBinding,
    emotion: { rotation: number; translation: number; scale: number; opacity: number }
  ): number {
    switch (ctrl.channel) {
      case 'rotation': return emotion.rotation;
      case 'translation': return emotion.translation;
      case 'scale': return emotion.scale;
      case 'opacity': return emotion.opacity;
    }
  }

  private controllerEndValue(
    ctrl: MohoControllerBinding,
    emotion: { rotation: number; translation: number; scale: number; opacity: number },
    baseValue: number
  ): number {
    const range = ctrl.range;
    if (!range) return baseValue;
    const peak = (baseValue >= 0 ? 1 : -1) * Math.abs(baseValue) * 1.5;
    const clamped = Math.max(range.min, Math.min(range.max, peak));
    if (ctrl.channel === 'opacity' || ctrl.channel === 'scale') {
      return Math.max(0, clamped);
    }
    return clamped;
  }

  private applyBoneConstraint(
    boneName: string,
    value: number,
    constraints: Map<string, { min: number; max: number }>
  ): number {
    const c = constraints.get(boneName);
    if (!c) return value;
    return Math.max(c.min, Math.min(c.max, value));
  }

  private phonemeFromTranscript(transcript: string): MohoCharacterBible['mouthShapes'][number]['shapeId'] {
    const t = transcript.toLowerCase();
    if (/[aeiou]+/.test(t) && /[o]/.test(t)) return 'O';
    if (/[aeiou]+/.test(t) && /[e]/.test(t)) return 'E';
    if (/[l]/.test(t)) return 'L';
    if (/[f]/.test(t)) return 'F';
    if (/[bdg]/.test(t)) return 'D';
    if (/[c]/.test(t)) return 'C';
    if (/[g]/.test(t)) return 'G';
    if (/[a]/.test(t)) return 'A';
    if (/[bmp]/.test(t)) return 'B';
    if (/smile|happy/.test(t)) return 'Smile';
    if (/frown|sad/.test(t)) return 'Frown';
    return 'Rest';
  }

  private emotionToSwitchChoice(emotion: string): string | null {
    const map: Record<string, string> = {
      happy: 'Smile',
      sad: 'Frown',
      angry: 'angry',
      fear: 'fear',
      surprise: 'surprise',
      neutral: 'Rest'
    };
    return map[emotion] ?? null;
  }
}
