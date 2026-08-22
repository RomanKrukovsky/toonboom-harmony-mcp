import type { PerformanceVariantSet } from '../../schemas/voicePerformance.js';
export declare class VoicePerformanceReportBuilder {
    build(set: PerformanceVariantSet): string;
    buildToFile(set: PerformanceVariantSet, outputPath: string): string;
}
