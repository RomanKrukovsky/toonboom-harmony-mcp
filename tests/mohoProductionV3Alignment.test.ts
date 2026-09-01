import fs from 'fs';
import path from 'path';
import {
  RhubarbForcedAligner,
  ForcedAlignmentError
} from '../src/services/mohoForcedAlignmentV3/index.js';

describe('Moho Production v3 forced alignment', () => {
  it('uses the exact supplied transcript and keeps frame quantization drift under two frames', async () => {
    const root = fs.mkdtempSync(path.join(process.cwd(), 'output', 'v3-align-'));
    const audioPath = path.join(root, 'line.wav');
    fs.writeFileSync(audioPath, 'wav-bytes');
    const calls: Array<{ executable: string; args: string[]; transcript: string }> = [];
    const aligner = new RhubarbForcedAligner({
      detectExecutable: () => '/usr/local/bin/rhubarb',
      execute: async (executable, args) => {
        const transcriptPath = args[args.indexOf('-d') + 1];
        const outputPath = args[args.indexOf('-o') + 1];
        calls.push({ executable, args, transcript: fs.readFileSync(transcriptPath, 'utf8') });
        fs.writeFileSync(outputPath, JSON.stringify({
          mouthCues: [
            { start: 0, end: 0.12, value: 'X' },
            { start: 0.12, end: 0.38, value: 'A' },
            { start: 0.38, end: 0.64, value: 'B' }
          ]
        }));
        return { stdout: '', stderr: '' };
      }
    });

    const result = await aligner.align({
      characterRef: 'hero',
      audioPath,
      text: 'Exact supplied line.',
      startFrame: 24,
      fps: 24,
      workDir: root
    });

    expect(calls[0].transcript).toBe('Exact supplied line.');
    expect(result.engine).toBe('rhubarb');
    expect(result.cues[1]).toMatchObject({ startFrame: 27, endFrame: 33, viseme: 'A' });
    expect(result.maxQuantizationDriftFrames).toBeLessThanOrEqual(2);
  });

  it('fails closed when no real aligner is installed', async () => {
    const aligner = new RhubarbForcedAligner({ detectExecutable: () => null });
    await expect(aligner.align({
      characterRef: 'hero',
      audioPath: '/missing/line.wav',
      text: 'Line.',
      startFrame: 0,
      fps: 24,
      workDir: '/tmp'
    })).rejects.toBeInstanceOf(ForcedAlignmentError);
  });
});
