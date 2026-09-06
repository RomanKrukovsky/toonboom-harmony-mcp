import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import { verifyPathAccess } from '../../security.js';
import {
  type MohoAnimateFromBriefInput,
  type MohoAnimateFromBriefOutput,
  type MohoAnimationPlan,
  type DialogueLine,
  type MotionStyle,
  type Emotion,
  type CameraConstraint,
  type Language
} from '../../schemas/mohoAnimator.js';

const execFilePromise = util.promisify(execFile);

export {
  type DialogueLine,
  type MotionStyle,
  type Emotion,
  type CameraConstraint,
  type Language,
  type MohoAnimationPlan as AnimationPlanJSON,
  type MohoAnimateFromBriefOutput as AnimationServiceResult
};

export interface AnimationPlanOptions {
  rigPath: string;
  brief?: string;
  briefText?: string;
  durationSeconds?: number;
  durationFrames?: number;
  fps?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  resolution?: { width: number; height: number };
  motionStyle?: MotionStyle;
  emotion?: Emotion;
  dialogue?: string;
  lyrics?: string;
  dialogueLines?: DialogueLine[];
  language?: Language;
  outputPath: string;
  cameraConstraints?: CameraConstraint;
}

export class MohoAnimatorService {
  public static async animateFromBrief(options: AnimationPlanOptions): Promise<MohoAnimateFromBriefOutput> {
    const fps = options.fps ?? 24;
    if (fps <= 0) {
      throw new Error('fps must be positive');
    }

    let durationFrames = options.durationFrames;
    if (!durationFrames || durationFrames <= 0) {
      if (options.durationSeconds && options.durationSeconds > 0) {
        durationFrames = Math.round(options.durationSeconds * fps);
      } else {
        durationFrames = 120;
      }
    }
    if (durationFrames < 3) {
      throw new Error('durationFrames must be at least 3');
    }

    const briefText = (options.brief && options.brief.trim().length > 0)
      ? options.brief.trim()
      : (options.briefText && options.briefText.trim().length > 0)
        ? options.briefText.trim()
        : 'Character walks, stops, blinks, and camera settles';

    const rigPath = verifyPathAccess(path.resolve(options.rigPath));
    const outputPath = verifyPathAccess(path.resolve(options.outputPath));
    const evidenceDirectory = path.join(path.dirname(outputPath), 'evidence');
    fs.mkdirSync(evidenceDirectory, { recursive: true });

    const emotion: Emotion = options.emotion ?? 'neutral';
    const motionStyle: MotionStyle = options.motionStyle ?? 'default';
    const cameraConstraints: CameraConstraint = options.cameraConstraints ?? 'static';
    const language: Language = options.language ?? 'en';
    const dialogueLines: DialogueLine[] = options.dialogueLines ?? [];

    const plan = this.generatePlan({
      ...options,
      brief: briefText,
      durationFrames,
      fps,
      emotion,
      motionStyle,
      cameraConstraints,
      dialogueLines
    });

    const planPath = path.join(evidenceDirectory, 'animation_plan.json');
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');

    let animationResult: any = null;
    let certificationStatus: 'certified' | 'failed' = 'failed';
    let isCertified = false;
    let score = 0;
    const errors: string[] = [];

    try {
      const { stdout } = await execFilePromise('python3', [
        '-m', 'pipeline.tools.moho_animator_cli',
        rigPath,
        planPath,
        outputPath,
        '--evidence', evidenceDirectory,
        '--fps', String(fps),
        '--duration-frames', String(durationFrames),
        '--brief', briefText,
        '--emotion', emotion,
        '--motion-style', motionStyle,
        '--camera', cameraConstraints,
        '--language', language
      ], {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONPATH: process.cwd() }
      });

      animationResult = JSON.parse(stdout.trim());
      if (animationResult.status === 'certified' && animationResult.certified === true && fs.existsSync(outputPath)) {
        certificationStatus = 'certified';
        isCertified = true;
        score = Number(animationResult.score);
      } else {
        errors.push(...(animationResult.errors || ['Animation certification failed']));
        certificationStatus = 'failed';
        isCertified = false;
        score = Number(animationResult.score || 0);
      }
    } catch (e: any) {
      errors.push(`Animation engine error: ${e.message}`);
      certificationStatus = 'failed';
      isCertified = false;
      score = 0;
    }

    const gates = animationResult?.gates || [
      { name: 'animation_engine', passed: false, mandatory: true, detail: errors.join('; ') }
    ];

    return {
      status: certificationStatus,
      outputPath,
      animationPlan: plan,
      score,
      certified: isCertified,
      gates,
      evidenceDirectory,
      errors,
      renderResult: animationResult
    };
  }

  public static generatePlan(options: AnimationPlanOptions & { durationFrames: number; fps: number }): MohoAnimationPlan {
    const brief = (options.brief ?? options.briefText ?? '').toLowerCase();
    const duration = options.durationFrames;
    const fps = options.fps;
    const mid = Math.floor(duration / 2);

    const isRun = brief.includes('run') || brief.includes('sprint') || brief.includes('hurry');
    const isWalk = brief.includes('walk') || brief.includes('step') || (!isRun && !brief.includes('idle'));
    const hasStop = brief.includes('stop') || brief.includes('stand') || brief.includes('pause');

    const actions: MohoAnimationPlan['actions'] = [];
    if (isRun) {
      const runEnd = hasStop ? Math.min(40, duration) : duration;
      actions.push({ type: 'run', startFrame: 1, endFrame: runEnd });
      if (runEnd < duration) {
        actions.push({ type: 'idle', startFrame: runEnd + 1, endFrame: duration });
      }
    } else if (isWalk) {
      const walkEnd = (hasStop || duration > 60) ? Math.min(40, duration) : duration;
      actions.push({ type: 'walk', startFrame: 1, endFrame: walkEnd });
      if (walkEnd < duration) {
        actions.push({ type: 'idle', startFrame: walkEnd + 1, endFrame: duration });
      }
    } else {
      actions.push({ type: 'idle', startFrame: 1, endFrame: duration });
    }

    const beats: MohoAnimationPlan['beats'] = [
      { beat: 1, description: 'Enter', frame: Math.min(10, Math.floor(duration * 0.1)) },
      { beat: 2, description: 'Action', frame: mid },
      { beat: 3, description: 'Exit', frame: Math.max(mid + 1, duration - 10) }
    ];

    const blinks: MohoAnimationPlan['blinks'] = [];
    const blinkIntervalFrames = fps * (options.motionStyle === 'snappy' ? 2 : 3);
    for (let f = 15; f < duration - 6; f += blinkIntervalFrames) {
      blinks.push({ frame: f, duration: 3 });
    }

    const phonemes: MohoAnimationPlan['phonemes'] = [];
    if (options.dialogueLines && options.dialogueLines.length > 0) {
      for (const line of options.dialogueLines) {
        phonemes.push({
          word: line.text,
          startFrame: line.startFrame,
          endFrame: line.endFrame,
          phonemeSequence: ['Rest', 'A', 'E', 'O', 'Rest']
        });
      }
    } else if (options.dialogue || options.lyrics) {
      const text = options.dialogue || options.lyrics || '';
      phonemes.push({
        word: text,
        startFrame: Math.min(10, duration - 5),
        endFrame: Math.min(35, duration),
        phonemeSequence: ['Closed', 'A', 'E', 'I', 'O', 'U', 'Rest']
      });
    } else {
      phonemes.push({
        word: 'Default',
        startFrame: Math.min(10, duration - 5),
        endFrame: Math.min(25, duration),
        phonemeSequence: ['Rest', 'A', 'E', 'O', 'Rest']
      });
    }

    let gazeTarget = 'camera';
    if (brief.includes('left') && (brief.includes('look') || brief.includes('glance') || brief.includes('turn'))) {
      gazeTarget = 'left';
    } else if (brief.includes('right') && (brief.includes('look') || brief.includes('glance') || brief.includes('turn'))) {
      gazeTarget = 'right';
    }

    const cameraMoves: MohoAnimationPlan['camera'] = [];
    const cameraConstraint = options.cameraConstraints ?? 'static';
    if (cameraConstraint === 'push-in' || brief.includes('push-in') || brief.includes('zoom')) {
      cameraMoves.push({ type: 'push-in', startFrame: 1, endFrame: duration, scaleZ: 0.5 });
    } else if (cameraConstraint === 'whip-pan' || brief.includes('whip-pan')) {
      cameraMoves.push({ type: 'whip-pan', startFrame: Math.max(1, mid - 10), endFrame: Math.min(duration, mid + 10), offsetX: 0.8 });
    } else if (cameraConstraint === 'tracking' || brief.includes('tracking')) {
      cameraMoves.push({ type: 'tracking', target: 'Character', startFrame: 1, endFrame: duration });
    } else {
      cameraMoves.push({ type: 'static', startFrame: 1, endFrame: duration });
    }

    let handPose = 'point';
    if (brief.includes('wave')) handPose = 'open';
    else if (brief.includes('fist')) handPose = 'fist';
    else if (brief.includes('relax')) handPose = 'relaxed';

    const diagnosticFrames = Array.from(new Set([1, Math.floor(duration / 2), duration])).sort((a, b) => a - b);

    return {
      scenes: [{ id: 1, duration, description: options.brief ?? options.briefText }],
      beats,
      actions,
      keyPoses: [
        { frame: Math.min(10, duration), pose: 'neutral' },
        { frame: Math.max(1, Math.min(50, mid)), pose: options.emotion ?? 'neutral' }
      ],
      transitions: [],
      gaze: [{ target: gazeTarget, startFrame: 1, endFrame: duration }],
      blinks,
      phonemes,
      gestures: [{ frame: Math.min(20, mid), type: 'hand-swap', newHand: handPose }],
      ikTargets: [
        { bone: 'Foot_L', lock: true, frame: 1 },
        { bone: 'Foot_R', lock: true, frame: 1 }
      ],
      secondaryMotion: [{ type: 'hair-follow-through', magnitude: options.motionStyle === 'expressive' ? 0.8 : 0.5 }],
      camera: cameraMoves,
      diagnosticFrames,
      inspectionFrames: diagnosticFrames
    };
  }
}
