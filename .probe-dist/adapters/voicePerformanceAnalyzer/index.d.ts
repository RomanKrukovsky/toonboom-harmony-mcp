import { type VoiceAnalysis } from '../../schemas/voicePerformance.js';
export interface VoiceInput {
    audioPath?: string;
    transcript: string;
    durationSeconds?: number;
    language?: string;
    speaker?: string;
    emotionHints?: string[];
}
export declare class VoicePerformanceAnalyzer {
    analyze(input: VoiceInput): VoiceAnalysis;
}
