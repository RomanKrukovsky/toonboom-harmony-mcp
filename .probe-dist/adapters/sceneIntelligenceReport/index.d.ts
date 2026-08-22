import type { SceneUnderstanding, DirectorVariantSet } from '../../schemas/sceneIntelligence.js';
/**
 * sceneIntelligenceReport — Iteration 1 HTML report (Master Prompt §28).
 *
 * Produces a single self-contained HTML document presenting:
 *   - scene intent + confidence
 *   - characters (with stance / role / goal)
 *   - dramatic beats timeline (with importance, intent, emotion, suggested pause)
 *   - emotion curve samples table
 *   - attention targets per beat
 *   - continuity constraints
 *   - assumptions and uncertainties (HONEST LIMITATIONS always visible)
 *   - for each director variant: shots, blocking, cameras, edit decisions, pauses
 *
 * The HTML is intentionally plain — no external CSS, no JS framework, works offline.
 */
export interface SceneIntelligenceReportInput {
    scene: SceneUnderstanding;
    variantSet: DirectorVariantSet;
}
export declare class SceneIntelligenceReportBuilder {
    /** Build HTML string for the report. */
    build(input: SceneIntelligenceReportInput): string;
    /** Build HTML and write it to outputPath. Returns the path on success. */
    buildToFile(input: SceneIntelligenceReportInput, outputPath: string): string;
}
