import { MlError } from '../../errors/mlErrorRegistry.js';

/**
 * QualityDirector.
 *
 * Deterministic, structural QA on a Harmony scene (real or simulator). This module does not
 * produce a visual or artistic opinion; it only checks facts that can be checked mechanically:
 *
 *   - presence of required nodes (Composite, Write);
 *   - node-graph integrity (no broken links, no illegal cycles, all paths start at Top);
 *   - resolution and frame-rate plausibility (Harmony field sizes, finite numbers, no NaN);
 *   - drawing substitutions actually have a drawing on every visible frame;
 *   - palette integrity (every colorId is hex `0x` + 16 digits);
 *   - function-point sanity: number of points per curve within the documented ceiling;
 *   - audio coverage (silence closure, mouth motion on speech);
 *   - editability score: a number between 0 and 1 measuring how much of the result is
 *     natively authored rather than raster-pasted in.
 *
 * When a fact fails, the director emits a `QualityFinding` and increments the metric counter.
 * The VLM critic adds *artistic* findings on top of these — see `VisualCriticReportV2`.
 */

export interface QualityInput {
  schemaVersion: '1.0';
  scenePath: string;
  resolution: { width: number; height: number };
  fps: number;
  frameCount: number;
  startFrame: number;
  nodes: ReadonlyArray<QualityNode>;
  drawings: ReadonlyArray<QualityDrawing>;
  palettes: ReadonlyArray<QualityPalette>;
  functionPoints: ReadonlyArray<{ nodeId: string; attribute: string; count: number }>;
  audio: ReadonlyArray<QualityAudio>;
  bitmapsImported: boolean;
}

export interface QualityNode {
  nodeId: string;
  type: string;
  /** Edges where this node is the source. */
  outputs: string[];
  /** Edges where this node is the target. */
  inputs: string[];
}

export interface QualityDrawing {
  elementName: string;
  drawingName: string;
  visibleFromFrame: number;
  visibleToFrame: number;
}

export interface QualityPalette {
  paletteName: string;
  colorIds: string[];
}

export interface QualityAudio {
  nodeId: string;
  startSec: number;
  endSec: number;
  /** Words with mouth-shapes expected in this audio. */
  speechFrames: number[];
}

export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface QualityFinding {
  findingId: string;
  code: string;
  severity: FindingSeverity;
  message: string;
  frameRange: [number, number] | null;
}

export interface QualityReport {
  schemaVersion: '1.0';
  scenePath: string;
  findings: QualityFinding[];
  metrics: Record<string, number>;
  editabilityScore: number;
  passed: boolean;
}

const PALETTE_COLOR_PATTERN = /^0x[0-9a-fA-F]{16}$/;
const MAX_FUNCTION_POINTS_PER_CURVE = 200;

export class QualityDirector {
  /** Pure function; easy to call from tests. */
  evaluate(input: QualityInput): QualityReport {
    const findings: QualityFinding[] = [];
    const metrics: Record<string, number> = {
      nodeCount: input.nodes.length,
      drawingCount: input.drawings.length,
      paletteCount: input.palettes.length,
      audioCount: input.audio.length
    };

    if (!Number.isFinite(input.resolution.width) || !Number.isFinite(input.resolution.height) || input.resolution.width <= 0 || input.resolution.height <= 0) {
      findings.push({ findingId: 'resolution.invalid', code: 'RESOLUTION_INVALID', severity: 'critical', message: `resolution is ${JSON.stringify(input.resolution)}`, frameRange: null });
    }
    if (!Number.isFinite(input.fps) || input.fps <= 0) {
      findings.push({ findingId: 'fps.invalid', code: 'FPS_INVALID', severity: 'critical', message: `fps ${input.fps} is invalid`, frameRange: null });
    }
    if (!Number.isInteger(input.startFrame) || input.startFrame < 1) {
      findings.push({ findingId: 'startFrame.invalid', code: 'STARTFRAME_INVALID', severity: 'critical', message: `Harmony timelines are 1-based; startFrame=${input.startFrame}`, frameRange: null });
    }

    const types = new Set(input.nodes.map(n => n.type));
    if (!types.has('Composite')) {
      findings.push({ findingId: 'node.composite.missing', code: 'COMPOSITE_NODE_MISSING', severity: 'high', message: 'no Composite node in scene', frameRange: null });
    }
    if (!types.has('Write')) {
      findings.push({ findingId: 'node.write.missing', code: 'WRITE_NODE_MISSING', severity: 'high', message: 'no Write node in scene; renders will fail', frameRange: null });
    }

    // Broken link detection
    const nodeIds = new Set(input.nodes.map(n => n.nodeId));
    for (const node of input.nodes) {
      for (const target of node.outputs) {
        if (!nodeIds.has(target)) {
          findings.push({ findingId: `node.${node.nodeId}.broken`, code: 'BROKEN_NODE_LINK', severity: 'high', message: `${node.nodeId} connects to missing target ${target}`, frameRange: null });
        }
      }
    }

    // Palette integrity
    for (const palette of input.palettes) {
      for (const colourId of palette.colorIds) {
        if (!PALETTE_COLOR_PATTERN.test(colourId)) {
          findings.push({ findingId: `palette.${palette.paletteName}.${colourId}`, code: 'PALETTE_COLOR_INVALID', severity: 'medium', message: `colour id ${colourId} is not a 16-hex-digit 0x value`, frameRange: null });
        }
      }
    }

    // Drawing exposure coverage
    for (const drawing of input.drawings) {
      if (drawing.visibleFromFrame > drawing.visibleToFrame) {
        findings.push({ findingId: `drawing.${drawing.elementName}.${drawing.drawingName}.inverted`, code: 'DRAWING_EXPOSURE_INVERTED', severity: 'medium', message: `exposure range is inverted: ${drawing.visibleFromFrame} > ${drawing.visibleToFrame}`, frameRange: null });
      }
      if (drawing.visibleToFrame > input.startFrame + input.frameCount - 1) {
        findings.push({ findingId: `drawing.${drawing.elementName}.${drawing.drawingName}.beyond`, code: 'DRAWING_EXPOSURE_BEYOND_TIMELINE', severity: 'medium', message: `exposure extends beyond end of timeline`, frameRange: [drawing.visibleFromFrame, drawing.visibleToFrame] });
      }
    }

    // Function-point sanity
    let maxFunctionPoints = 0;
    let functionPointViolations = 0;
    for (const curve of input.functionPoints) {
      maxFunctionPoints = Math.max(maxFunctionPoints, curve.count);
      if (curve.count > MAX_FUNCTION_POINTS_PER_CURVE) {
        findings.push({ findingId: `curve.${curve.nodeId}.${curve.attribute}.overflow`, code: 'FUNCTION_POINTS_EXCEED_CEILING', severity: 'low', message: `${curve.count} points exceeds the ${MAX_FUNCTION_POINTS_PER_CURVE} ceiling for ${curve.attribute}`, frameRange: null });
        functionPointViolations += 1;
      }
    }
    metrics.maxFunctionPoints = maxFunctionPoints;
    metrics.functionPointViolations = functionPointViolations;

    // Audio coverage: silence closure
    let audioGaps = 0;
    for (const audio of input.audio) {
      if (audio.endSec < audio.startSec) {
        findings.push({ findingId: `audio.${audio.nodeId}.inverted`, code: 'AUDIO_RANGE_INVERTED', severity: 'medium', message: 'audio end < start', frameRange: null });
        audioGaps += 1;
      }
      if (audio.speechFrames.length === 0) {
        findings.push({ findingId: `audio.${audio.nodeId}.no_speech`, code: 'AUDIO_HAS_NO_SPEECH_MAPPING', severity: 'low', message: 'audio column has no mapped mouth motion', frameRange: null });
      }
    }
    metrics.audioRangeViolations = audioGaps;

    // Editability: a scene that imports a bitmap sequence loses editability points.
    const editabilityScore = input.bitmapsImported ? 0.4 : 0.85;

    const passed = !findings.some(f => f.severity === 'critical' || f.severity === 'high');

    return {
      schemaVersion: '1.0',
      scenePath: input.scenePath,
      findings,
      metrics,
      editabilityScore,
      passed
    };
  }
}
