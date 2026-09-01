import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { verifyPathAccess } from '../../security.js';

const execFileAsync = promisify(execFile) as (
  executable: string,
  args: string[],
  options: { timeout: number; maxBuffer: number }
) => Promise<{ stdout: string; stderr: string }>;

const rhubarbOutputSchema = z.object({
  mouthCues: z.array(z.object({
    start: z.number().nonnegative(),
    end: z.number().positive(),
    value: z.enum(['X', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
  }).strict()).min(1)
}).passthrough();

export class ForcedAlignmentError extends Error {
  constructor(readonly code: 'ALIGNER_UNAVAILABLE' | 'ALIGNMENT_FAILED' | 'ALIGNMENT_INVALID', message: string) {
    super(message);
    this.name = 'ForcedAlignmentError';
  }
}

export interface ForcedAlignmentCueV3 {
  startSec: number;
  endSec: number;
  startFrame: number;
  endFrame: number;
  viseme: 'X' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
}

export interface ForcedAlignmentResultV3 {
  engine: 'rhubarb';
  characterRef: string;
  audioPath: string;
  exactTextSha256: string;
  startFrame: number;
  fps: number;
  cues: ForcedAlignmentCueV3[];
  maxQuantizationDriftFrames: number;
}

export type RhubarbExecute = (
  executable: string,
  args: string[],
  options: { timeout: number; maxBuffer: number }
) => Promise<{ stdout: string; stderr: string }>;

function detectRhubarbExecutable(): string | null {
  const candidates = [
    process.env.RHUBARB_BIN,
    '/opt/homebrew/bin/rhubarb',
    '/usr/local/bin/rhubarb',
    '/usr/bin/rhubarb'
  ].filter((candidate): candidate is string => Boolean(candidate));
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

function quantizedFrame(seconds: number, fps: number, startFrame: number): number {
  return startFrame + Math.round(seconds * fps);
}

export class RhubarbForcedAligner {
  private readonly detectExecutable: () => string | null;
  private readonly execute: RhubarbExecute;

  constructor(dependencies: {
    detectExecutable?: () => string | null;
    execute?: RhubarbExecute;
  } = {}) {
    this.detectExecutable = dependencies.detectExecutable ?? detectRhubarbExecutable;
    this.execute = dependencies.execute ?? (async (executable, args, options) => {
      const result = await execFileAsync(executable, args, options);
      return { stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
    });
  }

  async align(input: {
    characterRef: string;
    audioPath: string;
    text: string;
    startFrame: number;
    fps: number;
    workDir: string;
  }): Promise<ForcedAlignmentResultV3> {
    const executable = this.detectExecutable();
    if (!executable) {
      throw new ForcedAlignmentError(
        'ALIGNER_UNAVAILABLE',
        'Rhubarb Lip Sync is required for production forced alignment; no mock fallback is allowed.'
      );
    }
    const audioPath = verifyPathAccess(input.audioPath);
    if (!fs.existsSync(audioPath) || !fs.statSync(audioPath).isFile() || fs.statSync(audioPath).size === 0) {
      throw new ForcedAlignmentError('ALIGNMENT_FAILED', `Dialogue WAV is missing or empty: ${input.audioPath}`);
    }
    if (!/\.wav$/i.test(audioPath)) {
      throw new ForcedAlignmentError('ALIGNMENT_FAILED', `Dialogue audio must be WAV: ${input.audioPath}`);
    }
    const workDir = verifyPathAccess(input.workDir);
    fs.mkdirSync(workDir, { recursive: true });
    const digest = crypto.createHash('sha256').update(`${audioPath}\0${input.text}`).digest('hex').slice(0, 16);
    const transcriptPath = path.join(workDir, `dialogue_${digest}.txt`);
    const outputPath = path.join(workDir, `alignment_${digest}.json`);
    fs.writeFileSync(transcriptPath, input.text, 'utf8');
    try {
      await this.execute(
        executable,
        ['-r', 'phonetic', '-f', 'json', '-d', transcriptPath, '-o', outputPath, audioPath],
        { timeout: 300_000, maxBuffer: 16 * 1024 * 1024 }
      );
    } catch (error) {
      throw new ForcedAlignmentError('ALIGNMENT_FAILED', `Rhubarb alignment failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new ForcedAlignmentError('ALIGNMENT_FAILED', 'Rhubarb did not produce a non-empty alignment JSON file.');
    }
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    } catch {
      throw new ForcedAlignmentError('ALIGNMENT_INVALID', 'Rhubarb output is not valid JSON.');
    }
    const parsed = rhubarbOutputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ForcedAlignmentError('ALIGNMENT_INVALID', `Rhubarb output failed validation: ${parsed.error.message}`);
    }
    const cues = parsed.data.mouthCues.map(cue => ({
      startSec: cue.start,
      endSec: cue.end,
      startFrame: quantizedFrame(cue.start, input.fps, input.startFrame),
      endFrame: quantizedFrame(cue.end, input.fps, input.startFrame),
      viseme: cue.value
    }));
    const driftValues = cues.flatMap(cue => [
      Math.abs(((cue.startFrame - input.startFrame) / input.fps - cue.startSec) * input.fps),
      Math.abs(((cue.endFrame - input.startFrame) / input.fps - cue.endSec) * input.fps)
    ]);
    const maxQuantizationDriftFrames = Math.max(...driftValues, 0);
    if (maxQuantizationDriftFrames > 2) {
      throw new ForcedAlignmentError(
        'ALIGNMENT_INVALID',
        `Lipsync quantization drift ${maxQuantizationDriftFrames.toFixed(3)} exceeds two frames.`
      );
    }
    return {
      engine: 'rhubarb',
      characterRef: input.characterRef,
      audioPath,
      exactTextSha256: crypto.createHash('sha256').update(input.text).digest('hex'),
      startFrame: input.startFrame,
      fps: input.fps,
      cues,
      maxQuantizationDriftFrames
    };
  }
}
