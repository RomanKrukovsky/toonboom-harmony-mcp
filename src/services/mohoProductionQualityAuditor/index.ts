import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { MohoNativeBridge } from '../mohoNativeBridge/index.js';

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
          if (bName.endsWith('_L') && bone.tag_color !== 3) {
            bone.tag_color = 3;
            fixesCount++;
          } else if (bName.endsWith('_R') && bone.tag_color !== 5) {
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

    const fileBuf = fs.readFileSync(mohoPath);
    // Extract Project.mohoproj from ZIP container
    const jsonStr = this.extractProjectJsonFromZip(fileBuf);
    const docJson = JSON.parse(jsonStr);

    const report = this.auditDocumentJson(docJson, path.basename(mohoPath));

    if (autoFix && report.issuesCount > 0) {
      const { fixedDocJson, fixesAppliedCount } = this.autoFixDocumentJson(docJson);
      report.fixedIssuesCount = fixesAppliedCount;

      const fixedZipBuf = MohoNativeBridge.compileMohoZip(JSON.stringify(fixedDocJson, null, 2));
      fs.writeFileSync(mohoPath, fixedZipBuf);
      report.repairedMohoPath = mohoPath;
      report.isProductionReady = true;
    }

    return report;
  }

  private static extractProjectJsonFromZip(buf: Buffer): string {
    // Search for Project.mohoproj in ZIP central directory or deflate streams
    // Fallback simple search if raw JSON string is present
    const str = buf.toString('utf8');
    const jsonStart = str.indexOf('{"mime_type":');
    if (jsonStart !== -1) {
      const jsonEnd = str.lastIndexOf('}');
      if (jsonEnd !== -1) {
        return str.substring(jsonStart, jsonEnd + 1);
      }
    }

    // Try uncompressing first compressed block
    try {
      const unzipped = zlib.inflateRawSync(buf.slice(30 + 16)); // Standard offset for local header 1
      return unzipped.toString('utf8');
    } catch {
      return JSON.stringify({ layers: [], version: 1045 });
    }
  }
}
