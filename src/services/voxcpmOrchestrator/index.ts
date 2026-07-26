import { z } from 'zod';

export const voxcpmGenerateOptionsSchema = z.object({
  text: z.string().min(1),
  outputWavPath: z.string().min(1),
  voiceDescription: z.string().optional(),
  referenceWavPath: z.string().optional(),
  instruct: z.string().optional(),
  guidanceScale: z.number().optional().default(2.0),
  numSteps: z.number().optional().default(10)
});

export const voxcpmResultSchema = z.object({
  status: z.string(),
  realInferenceExecuted: z.boolean(),
  outputWavPath: z.string().optional(),
  sampleRate: z.number(),
  durationSec: z.number(),
  provider: z.string(),
  errors: z.array(z.string()).default([])
});

export type VoxCPMGenerateOptions = z.input<typeof voxcpmGenerateOptionsSchema>;
export type VoxCPMResult = z.infer<typeof voxcpmResultSchema>;

export class VoxCPMOrchestrator {
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'http://127.0.0.1:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Triggers VoxCPM2 audio synthesis (Voice Design or Voice Cloning) via ML Runtime.
   */
  public async generateAudio(options: VoxCPMGenerateOptions): Promise<VoxCPMResult> {
    const validatedOptions = voxcpmGenerateOptionsSchema.parse(options);

    try {
      const response = await fetch(`${this.baseUrl}/infer/voxcpm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: validatedOptions.text,
          outputWavPath: validatedOptions.outputWavPath,
          voiceDescription: validatedOptions.voiceDescription,
          referenceWavPath: validatedOptions.referenceWavPath,
          instruct: validatedOptions.instruct,
          guidanceScale: validatedOptions.guidanceScale,
          numSteps: validatedOptions.numSteps
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return voxcpmResultSchema.parse(data);
    } catch (error) {
      console.error('VoxCPMOrchestrator error:', error);
      throw new Error(`VoxCPM audio generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
