import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import {
  harmonyCommandPlanV4Schema,
  type HarmonyCommandPlanV4
} from '../../schemas/harmonyCommandPlanV4.js';
import type { CharacterRigAssemblyPlan, PartRigSpec } from '../../schemas/characterRigPIR.js';
import type { DeformerAssemblyPlan } from '../../schemas/deformerPIR.js';
import type { JointGuides } from '../../schemas/jointGuides.js';

/**
 * buildFullRigProductionPlan — ONE executable V4 plan that creates a complete
 * cut-out production rig in Harmony:
 *
 *   snapshot -> palette + swatches -> drawing elements -> drawings
 *     -> master peg + part pegs -> hierarchy links -> drawing attachments
 *     -> hinge pivots (joint-circle centers) -> typed deformers
 *     -> face master controller -> save -> close -> reopen -> inspect
 *     -> verify_rollback
 *
 * Parameter names match the bridge executor exactly (safe_harmony_name paths,
 * pegName/drawingNodeName/colorName/elementName/columnName/nodeName/pivotX...),
 * so the plan runs against scripts/python/harmony_bridge.py
 * execute_command_plan_v4 without translation.
 *
 * Verification is per-command and fail-closed; rollback on first failure.
 */

type V4Command = HarmonyCommandPlanV4['commands'][number];

const DEFORMER_NODE_TYPE: Record<string, string> = {
  Curve: 'CURVE_DEFORMER',
  Envelope: 'ENVELOPE_DEFORMER',
  Bone: 'BONE'
};

export interface FullRigPlanInput {
  rigAssemblyPlan: CharacterRigAssemblyPlan;
  deformerPlan: DeformerAssemblyPlan;
  jointGuides: JointGuides;
  palette: { paletteId: string; colours: Array<{ colourId: string; name: string; rgba: string; usage: string }> };
  hingeChildPart: Record<string, string>;
}

export interface FullRigPlanResult {
  plan: HarmonyCommandPlanV4;
  stats: {
    parts: number;
    pegs: number;
    hingePivots: number;
    deformers: number;
    masterControllers: number;
    totalCommands: number;
  };
}

export function buildFullRigProductionPlan(
  input: FullRigPlanInput,
  opts: { characterName: string }
): FullRigPlanResult {
  const { rigAssemblyPlan, deformerPlan, jointGuides, palette } = input;
  const parts = rigAssemblyPlan.parts as PartRigSpec[];
  const commands: V4Command[] = [];
  let counter = 1;
  const gen = (): string => `cmd_${counter++}`;

  const push = (
    type: V4Command['type'],
    params: Record<string, unknown>,
    preconditions: string[],
    idempotencyKey: string,
    method: string,
    rollback: V4Command['rollback'] = { strategy: 'none', snapshotRequired: false },
    expectedArtifact = { kind: 'node', path: null as string | null, nonempty: true }
  ) => {
    commands.push({
      commandId: gen(),
      type,
      params,
      preconditions,
      destructiveLevel: 'reversible',
      idempotencyKey: idempotencyKey.padEnd(12, '_'),
      rollback,
      expectedArtifact,
      verification: { method, required: true, acceptance: [] }
    });
  };

  const top = (name: string): string => `Top/${opts.characterName}/${name}`;

  // 0. Snapshot first — mandatory precondition for every mutation.
  push('snapshot_project', {}, ['project_open'], 'rig_snapshot_first', 'none');

  // 1. Locked palette + swatches.
  push('create_palette', { paletteName: palette.paletteId }, ['project_open'], `palette_${palette.paletteId}`, 'check_attr');
  for (const c of palette.colours) {
    push('add_palette_swatch', {
      paletteName: palette.paletteId,
      colorId: c.colourId,
      colorName: c.name,
      rgba: c.rgba
    }, [`palette_exists:${palette.paletteId}`], `swatch_${c.colourId}`, 'check_attr');
  }

  // 2. Drawing element + first drawing per part.
  for (const part of parts) {
    push('create_drawing_element', {
      elementName: part.drawingNodeName,
      columnName: `${part.drawingNodeName}_C`,
      nodeName: part.drawingNodeName
    }, ['project_open'], `elem_${part.partId}`, 'node_exists');
    push('create_drawing', {
      elementName: part.drawingNodeName,
      drawingName: `${part.partId}_1`
    }, [`element_exists:${part.drawingNodeName}`], `drawing_${part.partId}`, 'check_attr');
  }

  // 3. Master peg, part pegs, hierarchy links, drawing attachments.
  push('create_peg', { pegName: rigAssemblyPlan.masterPegName }, ['project_open'], 'peg_master', 'node_exists');
  const pegOf = (partId: string | null): string =>
    partId ? parts.find(p => p.partId === partId)?.pegNodeName ?? rigAssemblyPlan.masterPegName : rigAssemblyPlan.masterPegName;
  for (const part of parts) {
    push('create_peg', { pegName: part.pegNodeName }, ['project_open'], `peg_${part.partId}`, 'node_exists');
    push('connect_nodes', {
      fromNode: pegOf(part.parentPartId),
      toNode: part.pegNodeName,
      fromPort: 0,
      toPort: 0
    }, [`peg_exists:${part.pegNodeName}`], `connect_${part.partId}`, 'link_check');
    push('attach_drawing_to_peg', {
      pegName: part.pegNodeName,
      drawingNodeName: part.drawingNodeName
    }, [`peg_exists:${part.pegNodeName}`], `attach_${part.partId}`, 'link_check');
  }

  // 4. Hinge pivots snap child-part pegs to the joint-circle centers.
  for (const guide of jointGuides.guides) {
    const childPartId = input.hingeChildPart[guide.jointName];
    const part = parts.find(p => p.partId === childPartId);
    if (!part) continue;
    push('set_peg_pivot', {
      pegName: part.pegNodeName,
      pivotX: guide.centerX,
      pivotY: guide.centerY,
      source_binding: `joint_guide:${guide.jointName}`,
      overlap_radius_px: guide.radiusPx
    }, [`peg_exists:${part.pegNodeName}`], `pivot_hinge_${guide.jointName}`, 'check_attr');
  }

  // 5. Typed deformers wired to their target drawings.
  for (const d of deformerPlan.deformers) {
    push('create_deformer', {
      deformer_id: d.deformerId,
      node_type: DEFORMER_NODE_TYPE[d.type] ?? 'CURVE_DEFORMER',
      target_node: d.targetNode,
      num_points: d.numPoints,
      closed: d.closed
    }, [`node_exists:${d.targetNode}`], `deformer_${d.deformerId}`, 'node_exists',
    { strategy: 'delete_created', snapshotRequired: false });
  }

  // 6. Face master controller wired to eyes/brows/mouth pegs.
  for (const mc of deformerPlan.masterControllers) {
    push('create_master_controller', {
      controller_id: mc.mcId,
      name: mc.name,
      widget: mc.widgetType,
      grid: { width: mc.gridWidth, height: mc.gridHeight },
      controlled_nodes: mc.controlledNodes
    }, ['project_open'], `mc_${mc.mcId}`, 'node_exists',
    { strategy: 'delete_created', snapshotRequired: false });
  }

  // 7. Save -> close -> reopen -> inspect -> verify_rollback.
  push('save_project', {}, ['project_open'], 'rig_save', 'none');
  push('close_project', {}, ['project_open'], 'rig_close', 'none');
  push('reopen_project', {}, ['project_closed'], 'rig_reopen', 'none');
  push('inspect_native_entities', {
    expect_parts: parts.length,
    expect_deformers: deformerPlan.deformers.length
  }, ['project_open'], 'rig_inspect', 'native_audit');
  push('verify_rollback', {}, ['project_open'], 'rig_verify_rollback', 'native_audit');

  const plan = {
    schemaVersion: '4.0',
    planId: `RIGPRO-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
    manifestId: `MAN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: 'implemented_unverified' as const,
    requiresRealHarmony: true as const,
    sourceManifestSha256: crypto.createHash('sha256')
      .update(stringify({ parts: parts.map(p => p.partId), deformers: deformerPlan.deformers.map(d => d.deformerId) }) ?? '')
      .digest('hex'),
    commands,
    acceptanceGates: [
      'all_parts_created', 'hierarchy_linked', 'drawings_attached',
      'hinge_pivots_at_circle_centers', 'deformers_typed',
      'master_controller_wired', 'save_close_reopen', 'native_audit_match'
    ],
    provenance: { compiler: 'HarmonyCommandPlanV4Compiler v1', source: `FullRigProduction:${opts.characterName}` }
  };

  const parsed = harmonyCommandPlanV4Schema.safeParse(plan);
  if (!parsed.success) {
    throw new Error(`full rig plan failed schema validation: ${JSON.stringify(parsed.error.errors)}`);
  }

  return {
    plan: parsed.data,
    stats: {
      parts: parts.length,
      pegs: parts.length + 1,
      hingePivots: jointGuides.guides.length,
      deformers: deformerPlan.deformers.length,
      masterControllers: deformerPlan.masterControllers.length,
      totalCommands: commands.length
    }
  };
}
