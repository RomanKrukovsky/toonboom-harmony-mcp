import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import { verifyPathAccess } from '../../security.js';

const execFilePromise = util.promisify(execFile);

export interface DialogueLine {
  text: string;
  startFrame: number;
  endFrame: number;
}

export interface AnimationPlanOptions {
  rigPath: string;
  briefText: string;
  durationFrames: number;
  fps: number;
  resolution: { width: number; height: number };
  emotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';
  dialogueLines: DialogueLine[];
  outputPath: string;
  cameraConstraints: 'static' | 'push-in' | 'whip-pan' | 'tracking';
}

export interface AnimationPlanJSON {
  scenes: any[];
  beats: any[];
  actions: any[];
  keyPoses: any[];
  transitions: any[];
  gaze: any[];
  blinks: any[];
  phonemes: any[];
  gestures: any[];
  ikTargets: any[];
  secondaryMotion: any[];
  camera: any[];
  inspectionFrames: number[];
}

export interface AnimationServiceResult {
  status: 'certified' | 'failed';
  outputPath: string;
  animationPlan: AnimationPlanJSON;
  score: number;
  certified: boolean;
  gates: Array<{
    name: string;
    passed: boolean;
    mandatory: boolean;
    detail?: string;
  }>;
  evidenceDirectory: string;
  errors: string[];
  renderResult?: any;
}

export class MohoAnimatorService {
  public static async animateFromBrief(options: AnimationPlanOptions): Promise<AnimationServiceResult> {
    if (options.durationFrames < 3 || options.fps <= 0) {
      throw new Error('durationFrames must be at least 3 and fps must be positive');
    }
    const rigPath = verifyPathAccess(path.resolve(options.rigPath));
    const outputPath = verifyPathAccess(path.resolve(options.outputPath));
    const plan = this.generatePlan(options);
    const evidenceDirectory = path.join(path.dirname(outputPath), 'evidence');
    fs.mkdirSync(evidenceDirectory, { recursive: true });

    // Write the JSON plan
    const planPath = path.join(evidenceDirectory, 'animation_plan.json');
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');

    // Run the Python animation engine to inject keyframes into the .moho file
    let animationResult: any = null;
    let certificationStatus: 'certified' | 'failed' = 'failed';
    let isCertified = false;
    let score = 0;
    const errors: string[] = [];

    try {
      const { stdout } = await execFilePromise('python3', [
        '-m', 'pipeline.tools.animate_moho',
        rigPath,
        planPath,
        outputPath,
        '--evidence',
        evidenceDirectory
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

  private static generatePlan(options: AnimationPlanOptions): AnimationPlanJSON {
    const beats = [
      { beat: 1, description: 'Enter', frame: 10 },
      { beat: 2, description: 'Action', frame: Math.floor(options.durationFrames / 2) },
      { beat: 3, description: 'Exit', frame: options.durationFrames - 10 }
    ];

    const blinks = [];
    const blinkIntervalFrames = options.fps * 3; // roughly every 3 seconds
    for (let f = 15; f < options.durationFrames; f += blinkIntervalFrames) {
      blinks.push({ frame: f, duration: 3 });
    }

    const phonemes = options.dialogueLines.map(line => {
      return {
        word: line.text,
        startFrame: line.startFrame,
        endFrame: line.endFrame,
        phonemeSequence: ['rest', 'A', 'E', 'O', 'rest'] // Preston Blair simplified
      };
    });

    const cameraMoves = [];
    if (options.cameraConstraints === 'push-in') {
      cameraMoves.push({ type: 'push-in', startFrame: 1, endFrame: options.durationFrames, scaleZ: 0.5 });
    } else if (options.cameraConstraints === 'whip-pan') {
      cameraMoves.push({ type: 'whip-pan', startFrame: 10, endFrame: 20, offsetX: 10 });
    } else if (options.cameraConstraints === 'tracking') {
      cameraMoves.push({ type: 'tracking', target: 'Character', startFrame: 1, endFrame: options.durationFrames });
    } else {
      cameraMoves.push({ type: 'static', startFrame: 1, endFrame: options.durationFrames });
    }

    return {
      scenes: [{ id: 1, duration: options.durationFrames }],
      beats,
      actions: [{ type: 'walk', startFrame: 1, endFrame: Math.min(40, options.durationFrames) }],
      keyPoses: [
        { frame: Math.min(10, options.durationFrames), pose: 'neutral' },
        { frame: Math.max(1, Math.min(50, options.durationFrames)), pose: options.emotion }
      ],
      transitions: [],
      gaze: [{ target: 'camera', startFrame: 1, endFrame: options.durationFrames }],
      blinks,
      phonemes,
      gestures: [{ frame: 20, type: 'hand-swap', newHand: 'point' }],
      ikTargets: [{ bone: 'Foot_L', lock: true, frame: 1 }],
      secondaryMotion: [{ type: 'hair-follow-through', magnitude: 0.5 }],
      camera: cameraMoves,
      inspectionFrames: [1, Math.floor(options.durationFrames / 2), options.durationFrames]
    };
  }
}
