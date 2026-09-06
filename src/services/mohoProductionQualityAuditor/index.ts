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

export interface MohoNativeRigStructure {
  saved_bone_ids: string[];
  saved_layer_ids: string[];
  saved_layer_order: string[];
  parent_bone_pairs: Array<{ boneId: string; parentBoneId: string }>;
  binding_pairs: Array<{ partId: string; boneId: string }>;
  switch_choices: Record<string, string[]>;
  action_driver_targets: Array<{
    actionId: string;
    driverBoneId: string | null;
    targetBoneIds: string[];
  }>;
  mesh_point_counts: Record<string, number>;
  vitruvian_membership: Record<string, string[]>;
}

export interface MohoNativeStructureComparison {
  passed: boolean;
  bonesMatch: boolean;
  layersMatch: boolean;
  layerOrderingMatch: boolean;
  parentGraphMatch: boolean;
  bindingsMatch: boolean;
  switchesMatch: boolean;
  smartActionsMatch: boolean;
  smartWarpMatch: boolean;
  vitruvianMatch: boolean;
  mismatches: Array<'bones' | 'layers' | 'layer_ordering' | 'parent_graph' | 'bindings' | 'switches' | 'smart_actions' | 'smart_warp' | 'vitruvian'>;
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function sortedStringArrays(values: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(values)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, items]) => [key, sortedUnique(items)])
  );
}

function normalizedNativeStructure(structure: MohoNativeRigStructure): MohoNativeRigStructure {
  return {
    saved_bone_ids: sortedUnique(structure.saved_bone_ids),
    saved_layer_ids: sortedUnique(structure.saved_layer_ids),
    saved_layer_order: [...structure.saved_layer_order],
    parent_bone_pairs: [...structure.parent_bone_pairs].sort((left, right) =>
      `${left.boneId}\0${left.parentBoneId}`.localeCompare(`${right.boneId}\0${right.parentBoneId}`)
    ),
    binding_pairs: [...structure.binding_pairs].sort((left, right) =>
      `${left.partId}\0${left.boneId}`.localeCompare(`${right.partId}\0${right.boneId}`)
    ),
    switch_choices: sortedStringArrays(structure.switch_choices),
    action_driver_targets: structure.action_driver_targets
      .map(action => ({ ...action, targetBoneIds: sortedUnique(action.targetBoneIds) }))
      .sort((left, right) => left.actionId.localeCompare(right.actionId)),
    mesh_point_counts: Object.fromEntries(
      Object.entries(structure.mesh_point_counts).sort(([left], [right]) => left.localeCompare(right))
    ),
    vitruvian_membership: sortedStringArrays(structure.vitruvian_membership)
  };
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function flattenMohoLayers(layers: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const flattened: Array<Record<string, unknown>> = [];
  const visit = (items: Array<Record<string, unknown>>): void => {
    for (const layer of items) {
      flattened.push(layer);
      const nested = layer.layers ?? layer.layer_list;
      if (Array.isArray(nested)) {
        visit(nested.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object'));
      }
    }
  };
  visit(layers);
  return flattened;
}

/**
 * MohoProductionQualityAuditor — Automated QC engine that inspects Moho projects
 * against 10 studio criteria (Borsch / Industry Standard) and automatically repairs issues.
 */
export class MohoProductionQualityAuditor {
  public static compareNativeStructure(
    expectedInput: MohoNativeRigStructure,
    actualInput: MohoNativeRigStructure
  ): MohoNativeStructureComparison {
    const expected = normalizedNativeStructure(expectedInput);
    const actual = normalizedNativeStructure(actualInput);
    const bonesMatch = same(expected.saved_bone_ids, actual.saved_bone_ids);
    const layersMatch = same(expected.saved_layer_ids, actual.saved_layer_ids);
    const layerOrderingMatch = same(expected.saved_layer_order, actual.saved_layer_order);
    const parentGraphMatch = same(expected.parent_bone_pairs, actual.parent_bone_pairs);
    const bindingsMatch = same(expected.binding_pairs, actual.binding_pairs);
    const switchesMatch = same(expected.switch_choices, actual.switch_choices);
    const smartActionsMatch = same(expected.action_driver_targets, actual.action_driver_targets);
    const smartWarpMatch = same(expected.mesh_point_counts, actual.mesh_point_counts);
    const vitruvianMatch = same(expected.vitruvian_membership, actual.vitruvian_membership);
    const mismatches: MohoNativeStructureComparison['mismatches'] = [];
    if (!bonesMatch) mismatches.push('bones');
    if (!layersMatch) mismatches.push('layers');
    if (!layerOrderingMatch) mismatches.push('layer_ordering');
    if (!parentGraphMatch) mismatches.push('parent_graph');
    if (!bindingsMatch) mismatches.push('bindings');
    if (!switchesMatch) mismatches.push('switches');
    if (!smartActionsMatch) mismatches.push('smart_actions');
    if (!smartWarpMatch) mismatches.push('smart_warp');
    if (!vitruvianMatch) mismatches.push('vitruvian');

    return {
      passed: mismatches.length === 0,
      bonesMatch,
      layersMatch,
      layerOrderingMatch,
      parentGraphMatch,
      bindingsMatch,
      switchesMatch,
      smartActionsMatch,
      smartWarpMatch,
      vitruvianMatch,
      mismatches
    };
  }

  public static auditDocumentJson(docJson: Record<string, unknown>, projectName = 'Project'): MohoAuditReport {
    const issues: MohoQCIssue[] = [];
    const layers = flattenMohoLayers((docJson.layers as Array<Record<string, unknown>>) || []);
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
        const sublayers = (layer.layers as unknown[]) || (layer.layer_list as unknown[]) || [];
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
    const layers = flattenMohoLayers((docJson.layers as Array<Record<string, unknown>>) || []);

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
