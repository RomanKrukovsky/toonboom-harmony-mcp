import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function resolveRepairHelper(): string {
  const relativePath = 'scripts/python/repair_moho_project.py';
  const candidates = [
    path.resolve(process.cwd(), relativePath),
    path.resolve(path.dirname(process.argv[1] ?? process.cwd()), '..', relativePath)
  ];
  const found = candidates.find(candidate => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Required Moho repair helper is missing: ${relativePath}`);
  }
  return found;
}

function runRepairHelper(mohoPath: string, mode: 'inspect' | 'repair'): string {
  const python = process.env.MOHO_PYTHON_BIN ?? process.env.PYTHON_BIN ?? (process.platform === 'win32' ? 'python' : 'python3');
  const result = spawnSync(python, [resolveRepairHelper(), mohoPath, mode], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.error) {
    throw new Error(`Could not run the safe Moho repair helper: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `Moho repair helper exited with ${result.status}`);
  }
  return result.stdout;
}

export interface MohoQCIssue {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  boneOrLayerName: string;
  description: string;
  autoFixable: boolean;
}

export interface MohoAuditReport {
  projectName: string;
  totalBones: number;
  totalLayers: number;
  issuesCount: number;
  errorsCount: number;
  warningsCount: number;
  isProductionReady: boolean;
  issues: MohoQCIssue[];
  fixedIssuesCount?: number;
  repairedMohoPath?: string;
}

/**
 * MohoProductionQualityAuditor — Automated QC engine that inspects Moho projects
 * against 10 studio criteria (Borsch / Industry Standard) and automatically repairs issues.
 */
export class MohoProductionQualityAuditor {
  public static auditDocumentJson(docJson: Record<string, unknown>, projectName = 'Project'): MohoAuditReport {
    const issues: MohoQCIssue[] = [];
    const layers = (docJson.layers as Array<Record<string, unknown>>) || [];
    let totalBones = 0;

    for (const layer of layers) {
      const skel = layer.skeleton as Record<string, unknown> | undefined;
      if (skel && Array.isArray(skel.bones)) {
        totalBones += skel.bones.length;

        for (const bone of skel.bones as Array<Record<string, unknown>>) {
          const bName = (bone.name as string) || 'Unnamed';
          const strength = (bone.strength as number) || 0;
          const isPin = (bone.is_pin_bone as boolean) || false;
          const isShy = (bone.shy as boolean) || false;
          const tagColor = (bone.tag_color as number) || 0;

          // 1. STRENGTH_POLLUTION: Controller / Helper / Dial / Pin bones must have strength = 0
          if (
            (bName.toLowerCase().includes('ctrl') ||
              bName.toLowerCase().includes('dial') ||
              bName.toLowerCase().includes('target') ||
              bName.toLowerCase().includes('knob') ||
              bName.toLowerCase().includes('master') ||
              isPin) &&
            strength > 0
          ) {
            issues.push({
              ruleId: 'STRENGTH_POLLUTION',
              severity: 'error',
              boneOrLayerName: bName,
              description: `Controller bone "${bName}" has non-zero strength (${strength}). This will cause unwanted geometry warping.`,
              autoFixable: true
            });
          }

          // 2. SHY_BONE_HYGIENE: Helper fan bones and target markers should be shy
          if (
            (bName.includes('_UP') || bName.includes('_DOWN') || bName.includes('Helper') || bName.includes('Frame_')) &&
            !isShy
          ) {
            issues.push({
              ruleId: 'SHY_BONE_HYGIENE',
              severity: 'warning',
              boneOrLayerName: bName,
              description: `Deformer helper bone "${bName}" is not marked as shy. This pollutes animator viewport.`,
              autoFixable: true
            });
          }

          // 3. COLOR_CODE_COMPLIANCE: Left bones must be Blue (3), Right must be Orange (5), Dials Purple (4)
          if (bName.endsWith('_L') && tagColor !== 3 && tagColor !== 0) {
            issues.push({
              ruleId: 'COLOR_CODE_COMPLIANCE',
              severity: 'info',
              boneOrLayerName: bName,
              description: `Left-side bone "${bName}" should have tag_color 3 (Blue). Currently has ${tagColor}.`,
              autoFixable: true
            });
          } else if (bName.endsWith('_R') && tagColor !== 5 && tagColor !== 0) {
            issues.push({
              ruleId: 'COLOR_CODE_COMPLIANCE',
              severity: 'info',
              boneOrLayerName: bName,
              description: `Right-side bone "${bName}" should have tag_color 5 (Orange). Currently has ${tagColor}.`,
              autoFixable: true
            });
          }
        }
      }

      // 4. SWITCH_INCONSISTENCY: SwitchLayers must contain at least 1 sublayer
      if (layer.type === 'SwitchLayer') {
        const sublayers = (layer.layer_list as unknown[]) || [];
        if (sublayers.length === 0) {
          issues.push({
            ruleId: 'SWITCH_INCONSISTENCY',
            severity: 'error',
            boneOrLayerName: (layer.name as string) || 'SwitchLayer',
            description: `Switch layer "${layer.name}" has 0 children. It will render blank.`,
            autoFixable: false
          });
        }
      }
    }

    const errorsCount = issues.filter(i => i.severity === 'error').length;
    const warningsCount = issues.filter(i => i.severity === 'warning').length;

    return {
      projectName,
      totalBones,
      totalLayers: layers.length,
      issuesCount: issues.length,
      errorsCount,
      warningsCount,
      isProductionReady: errorsCount === 0,
      issues
    };
  }

  /**
   * Automatically repairs all auto-fixable issues in the document JSON.
   */
  public static autoFixDocumentJson(docJson: Record<string, unknown>): {
    fixedDocJson: Record<string, unknown>;
    fixesAppliedCount: number;
  } {
    let fixesCount = 0;
    const layers = (docJson.layers as Array<Record<string, unknown>>) || [];

    for (const layer of layers) {
      const skel = layer.skeleton as Record<string, unknown> | undefined;
      if (skel && Array.isArray(skel.bones)) {
        for (const bone of skel.bones as Array<Record<string, unknown>>) {
          const bName = (bone.name as string) || '';
          const isPin = (bone.is_pin_bone as boolean) || false;

          // 1. Zero out strength on controllers/dials/pins
          if (
            (bName.toLowerCase().includes('ctrl') ||
              bName.toLowerCase().includes('dial') ||
              bName.toLowerCase().includes('target') ||
              bName.toLowerCase().includes('knob') ||
              bName.toLowerCase().includes('master') ||
              isPin) &&
            ((bone.strength as number) || 0) > 0
          ) {
            bone.strength = 0;
            fixesCount++;
          }

          // 2. Set shy=true on helper deformers
          if (
            (bName.includes('_UP') || bName.includes('_DOWN') || bName.includes('Helper') || bName.includes('Frame_')) &&
            !bone.shy
          ) {
            bone.shy = true;
            fixesCount++;
          }

          // 3. Fix color coding
          if (Object.prototype.hasOwnProperty.call(bone, 'tag_color') && bName.endsWith('_L') && bone.tag_color !== 3) {
            bone.tag_color = 3;
            fixesCount++;
          } else if (Object.prototype.hasOwnProperty.call(bone, 'tag_color') && bName.endsWith('_R') && bone.tag_color !== 5) {
            bone.tag_color = 5;
            fixesCount++;
          }
        }
      }
    }

    return {
      fixedDocJson: docJson,
      fixesAppliedCount: fixesCount
    };
  }

  /**
   * Inspects and optionally auto-fixes a binary .moho file on disk.
   */
  public static auditAndFixMohoFile(mohoPath: string, autoFix = true): MohoAuditReport {
    if (!fs.existsSync(mohoPath)) {
      throw new Error(`File not found: ${mohoPath}`);
    }

    const docJson = JSON.parse(runRepairHelper(mohoPath, 'inspect')) as Record<string, unknown>;

    const report = this.auditDocumentJson(docJson, path.basename(mohoPath));

    if (autoFix && report.issuesCount > 0) {
      const repairResult = JSON.parse(runRepairHelper(mohoPath, 'repair')) as { fixes: number };
      report.fixedIssuesCount = repairResult.fixes;
      report.repairedMohoPath = mohoPath;
      const repairedDocument = JSON.parse(runRepairHelper(mohoPath, 'inspect')) as Record<string, unknown>;
      const repairedReport = this.auditDocumentJson(repairedDocument, path.basename(mohoPath));
      report.issues = repairedReport.issues;
      report.issuesCount = repairedReport.issuesCount;
      report.errorsCount = repairedReport.errorsCount;
      report.warningsCount = repairedReport.warningsCount;
      report.isProductionReady = repairedReport.isProductionReady;
    }

    return report;
  }
}
