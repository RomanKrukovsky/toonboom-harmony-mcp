import path from 'path';
import fs from 'fs';
import child_process from 'child_process';

export interface VisualAuditIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  category: string;
  message: string;
  suggestedFix?: string;
}

export interface VisualFeedbackResult {
  mohoPath: string;
  previewPngPath: string;
  isVisuallyCertified: boolean;
  scorePercent: number;
  totalRenderedPixels: number;
  characterBbox: [number, number, number, number];
  issuesCount: number;
  issues: VisualAuditIssue[];
}

/**
 * MohoVisualFeedbackLoop — Autonomous Computer Vision & Visual QC Gate.
 * Headless-renders any .moho file, inspects canvas bounds, checks for seam tears / joint gaps,
 * verifies facial alignment and Z-depth order, and provides auto-fix diagnosis.
 */
export class MohoVisualFeedbackLoop {
  public static runVisualAudit(mohoPath: string, outPngPath?: string): VisualFeedbackResult {
    const fullMoho = path.resolve(mohoPath);
    if (!fs.existsSync(fullMoho)) {
      throw new Error(`Moho file not found: ${fullMoho}`);
    }

    const previewPng = outPngPath
      ? path.resolve(outPngPath)
      : path.resolve(path.dirname(fullMoho), `${path.basename(fullMoho, path.extname(fullMoho))}_preview.png`);

    const pyCode = `
import json
from pipeline.tools.visual_feedback_loop import MohoVisualFeedbackLoop

res = MohoVisualFeedbackLoop.audit_moho_project(${JSON.stringify(fullMoho)}, ${JSON.stringify(previewPng)})
out_data = {
    "mohoPath": res.moho_path,
    "previewPngPath": res.preview_png_path,
    "isVisuallyCertified": res.is_visually_certified,
    "scorePercent": res.score_percent,
    "totalRenderedPixels": res.total_rendered_pixels,
    "characterBbox": list(res.character_bbox),
    "issuesCount": len(res.issues),
    "issues": [
        {
            "severity": i.severity,
            "category": i.category,
            "message": i.message,
            "suggestedFix": i.suggested_fix
        } for i in res.issues
    ]
}
print("JSON_RESULT:" + json.dumps(out_data))
`;

    const res = child_process.execFileSync('python3', ['-c', pyCode], { cwd: process.cwd() });
    const outputStr = res.toString();
    const jsonMatch = outputStr.match(/JSON_RESULT:(.*)/);

    if (!jsonMatch) {
      throw new Error(`Failed to parse visual audit result: ${outputStr}`);
    }

    return JSON.parse(jsonMatch[1]) as VisualFeedbackResult;
  }
}
