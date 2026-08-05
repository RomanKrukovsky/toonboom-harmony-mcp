import { z } from 'zod';
import {
  rigManifestV1Schema,
  checkRigInvariants,
  resolveController,
  controllerForNodePath,
  type RigManifestV1
} from '../../schemas/rigManifestV1.js';
import type { HarmonyCommandPlanV5, HarmonyCommandV5 } from '../../schemas/harmonyCommandPlanV5.js';
import { SUPPORTED_COMMAND_TYPES, UNSUPPORTED_COMMAND_REASONS } from '../harmonyContractSimulator/index.js';
import { MlError } from '../../errors/mlErrorRegistry.js';

/**
 * RigCompatibilityValidator.
 *
 * Answers one question before anything executes: *can this rig receive this plan?*
 *
 * Without it, a plan compiled against the wrong rig only fails at execution — and without
 * Harmony, execution never happens, so it never failed at all. Checking up front is what turns
 * "the plan compiled" into a claim with content.
 *
 * A report with any `error` blocks execution. Warnings do not.
 */

export const compatibilityFindingSchema = z.object({
  severity: z.enum(['error', 'warning', 'info']),
  code: z.enum([
    'RIG_SCHEMA_INVALID',
    'RIG_INVARIANT_VIOLATED',
    'UNKNOWN_CONTROLLER',
    'UNKNOWN_NODE_PATH',
    'UNSUPPORTED_COMMAND_TYPE',
    'UNSUPPORTED_BY_SIMULATOR',
    'CHANNEL_NOT_ACCEPTED',
    'LIMIT_EXCEEDED',
    'UNKNOWN_DRAWING',
    'UNKNOWN_SWITCH_SELECTION',
    'MISSING_CAPABILITY',
    'REQUIRED_COMMAND_MISSING',
    'FRAME_RATE_MISMATCH',
    'SCENE_SIZE_MISMATCH'
  ]),
  message: z.string().min(1),
  commandIndex: z.number().int().nonnegative().nullable(),
  commandId: z.string().nullable(),
  /** Concrete alternatives, so a failing plan can be corrected without guesswork. */
  candidates: z.array(z.string()).default([])
}).strict();
export type CompatibilityFinding = z.infer<typeof compatibilityFindingSchema>;

export const compatibilityReportSchema = z.object({
  schemaVersion: z.literal('1.0'),
  kind: z.literal('RigCompatibilityReportV1'),
  rigId: z.string().min(1),
  rigVersion: z.string().min(1),
  planId: z.string().min(1),
  compatible: z.boolean(),
  findings: z.array(compatibilityFindingSchema),
  errorCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  /** Share of plan commands the simulator can execute against this rig, 0..1. */
  coverage: z.number().min(0).max(1),
  commandTypeCoverage: z.record(z.object({
    total: z.number().int().nonnegative(),
    supported: z.number().int().nonnegative()
  }).strict()),
  checkedAt: z.string().min(1)
}).strict();
export type CompatibilityReport = z.infer<typeof compatibilityReportSchema>;

export interface ValidateOptions {
  /** Scene frame rate and dimensions the plan is intended for, when known. */
  sceneFps?: number;
  sceneWidth?: number;
  sceneHeight?: number;
}

export class RigCompatibilityValidator {
  /** Validates a manifest on its own: schema plus structural invariants. */
  validateManifest(candidate: unknown): { manifest: RigManifestV1 | null; findings: CompatibilityFinding[] } {
    const parsed = rigManifestV1Schema.safeParse(candidate);
    if (!parsed.success) {
      return {
        manifest: null,
        findings: [{ severity: 'error', code: 'RIG_SCHEMA_INVALID', message: parsed.error.message, commandIndex: null, commandId: null, candidates: [] }]
      };
    }
    const findings: CompatibilityFinding[] = checkRigInvariants(parsed.data).map(violation => ({
      severity: violation.severity,
      code: 'RIG_INVARIANT_VIOLATED' as const,
      message: `${violation.rule}: ${violation.detail}`,
      commandIndex: null,
      commandId: violation.controllerId,
      candidates: []
    }));
    return { manifest: parsed.data, findings };
  }

  /** Full check of a plan against a rig. */
  validate(manifestCandidate: unknown, plan: HarmonyCommandPlanV5, options: ValidateOptions = {}): CompatibilityReport {
    const { manifest, findings } = this.validateManifest(manifestCandidate);
    if (!manifest) {
      return this.buildReport('unknown', 'unknown', plan.planId, findings, {});
    }

    const all = [...findings];
    const typeCoverage: Record<string, { total: number; supported: number }> = {};

    // --- scene-level compatibility ----------------------------------------------------------
    if (options.sceneFps !== undefined && Math.abs(options.sceneFps - manifest.fps) > 1e-6) {
      all.push({ severity: 'warning', code: 'FRAME_RATE_MISMATCH', message: `plan targets ${options.sceneFps} fps, rig declares ${manifest.fps}`, commandIndex: null, commandId: null, candidates: [] });
    }
    if ((options.sceneWidth !== undefined && options.sceneWidth !== manifest.sceneWidth) ||
        (options.sceneHeight !== undefined && options.sceneHeight !== manifest.sceneHeight)) {
      all.push({ severity: 'warning', code: 'SCENE_SIZE_MISMATCH', message: `plan targets ${options.sceneWidth}x${options.sceneHeight}, rig declares ${manifest.sceneWidth}x${manifest.sceneHeight}`, commandIndex: null, commandId: null, candidates: [] });
    }

    // --- the rig must declare every command type it says it requires ------------------------
    const planTypes = new Set(plan.commands.map(c => c.payload.type));
    for (const required of manifest.requiredCommandTypes) {
      if (!planTypes.has(required as never)) {
        all.push({ severity: 'info', code: 'REQUIRED_COMMAND_MISSING', message: `rig lists ${required} as required but the plan does not use it`, commandIndex: null, commandId: null, candidates: [] });
      }
    }

    // --- per-command checks ------------------------------------------------------------------
    let supportedCommands = 0;
    for (const [index, command] of plan.commands.entries()) {
      const type = command.payload.type;
      typeCoverage[type] ??= { total: 0, supported: 0 };
      typeCoverage[type].total += 1;

      const commandFindings = this.checkCommand(manifest, command, index);
      all.push(...commandFindings);

      const blocked = commandFindings.some(f => f.severity === 'error');
      if (!blocked) {
        supportedCommands += 1;
        typeCoverage[type].supported += 1;
      }
    }

    const coverage = plan.commands.length === 0 ? 1 : supportedCommands / plan.commands.length;
    return this.buildReport(manifest.rigId, manifest.rigVersion, plan.planId, all, typeCoverage, coverage);
  }

  /** Throws when the plan cannot run. Used where a caller wants a hard gate. */
  requireCompatible(manifestCandidate: unknown, plan: HarmonyCommandPlanV5, options: ValidateOptions = {}): CompatibilityReport {
    const report = this.validate(manifestCandidate, plan, options);
    if (!report.compatible) {
      const first = report.findings.find(f => f.severity === 'error')!;
      throw new MlError('RIG_INCOMPATIBLE', `${first.code}: ${first.message}`, {
        detail: { planId: plan.planId, errorCount: report.errorCount, coverage: report.coverage }
      });
    }
    return report;
  }

  private checkCommand(manifest: RigManifestV1, command: HarmonyCommandV5, index: number): CompatibilityFinding[] {
    const findings: CompatibilityFinding[] = [];
    const payload = command.payload;
    const add = (severity: CompatibilityFinding['severity'], code: CompatibilityFinding['code'], message: string, candidates: string[] = []) =>
      findings.push({ severity, code, message, commandIndex: index, commandId: command.commandId, candidates });

    // --- can the simulator run it at all? ----------------------------------------------------
    if (payload.type in UNSUPPORTED_COMMAND_REASONS) {
      add('error', 'UNSUPPORTED_BY_SIMULATOR', `${payload.type}: ${UNSUPPORTED_COMMAND_REASONS[payload.type]}`, [...SUPPORTED_COMMAND_TYPES]);
      return findings;
    }
    if (!(SUPPORTED_COMMAND_TYPES as readonly string[]).includes(payload.type)) {
      add('error', 'UNSUPPORTED_COMMAND_TYPE', `${payload.type} has no simulator handler`, [...SUPPORTED_COMMAND_TYPES]);
      return findings;
    }

    // --- capability declarations --------------------------------------------------------------
    const needsCapability: Partial<Record<string, RigManifestV1['supportedCapabilities'][number]>> = {
      set_transform_keyframe: 'transform_keys',
      set_function_point: 'transform_keys',
      set_drawing_substitution: 'drawing_substitution',
      set_exposure: 'drawing_substitution',
      set_switch_selection: 'switch_selection',
      create_palette: 'palettes',
      add_palette_swatch: 'palettes',
      set_camera_keyframe: 'camera_animation',
      create_camera: 'camera_animation',
      create_group: 'grouping',
      create_sound_column: 'sound'
    };
    const capability = needsCapability[payload.type];
    if (capability && !manifest.supportedCapabilities.includes(capability)) {
      add('error', 'MISSING_CAPABILITY', `${payload.type} needs capability ${capability}, which the rig does not declare`, [...manifest.supportedCapabilities]);
    }

    // --- controller and channel resolution ----------------------------------------------------
    switch (payload.type) {
      case 'set_switch_selection': {
        const controller = resolveController(manifest, payload.params.controllerId);
        if (!controller) {
          add('error', 'UNKNOWN_CONTROLLER', `controller ${payload.params.controllerId} is not declared by the rig`, manifest.controllers.map(c => c.controllerId));
          break;
        }
        const declared = manifest.switchDrawings.find(s => s.controllerId === controller.controllerId && s.elementName === payload.params.elementName);
        if (!declared) {
          add('error', 'UNKNOWN_SWITCH_SELECTION', `rig declares no switch for ${controller.controllerId} on ${payload.params.elementName}`, manifest.switchDrawings.map(s => `${s.controllerId}:${s.elementName}`));
        } else if (!declared.drawings.includes(payload.params.drawingName)) {
          add('error', 'UNKNOWN_DRAWING', `${payload.params.drawingName} is not selectable on ${payload.params.elementName}`, declared.drawings);
        }
        break;
      }

      case 'set_transform_keyframe': {
        const controller = controllerForNodePath(manifest, payload.params.nodePath);
        if (!controller) {
          add('warning', 'UNKNOWN_NODE_PATH', `${payload.params.nodePath} is not a rig-declared controller node; it will be treated as an unbound node`, manifest.controllers.map(c => c.target.nodePath));
          break;
        }
        const used: Array<[string, number]> = [];
        if (payload.params.offset) used.push(['offsetX', payload.params.offset.x], ['offsetY', payload.params.offset.y], ['offsetZ', payload.params.offset.z]);
        if (payload.params.rotationZ !== null) used.push(['rotationZ', payload.params.rotationZ]);
        if (payload.params.scale) used.push(['scaleX', payload.params.scale.x], ['scaleY', payload.params.scale.y]);
        if (payload.params.skew !== null) used.push(['skew', payload.params.skew]);
        for (const [channel, value] of used) {
          if (!controller.channels.includes(channel as never)) {
            add('error', 'CHANNEL_NOT_ACCEPTED', `${controller.controllerId} does not accept ${channel}`, [...controller.channels]);
            continue;
          }
          const limit = controller.limits.find(l => l.channel === channel);
          if (limit && (value < limit.min || value > limit.max)) {
            add(
              limit.onViolation === 'reject' ? 'error' : 'warning',
              'LIMIT_EXCEEDED',
              `${controller.controllerId}.${channel} = ${value} is outside [${limit.min}, ${limit.max}] (${limit.onViolation})`,
              [String(limit.min), String(limit.max)]
            );
          }
        }
        break;
      }

      case 'set_pivot':
      case 'attach_drawing_to_peg':
      case 'delete_node':
      case 'rename_node': {
        const nodePath = 'nodePath' in payload.params ? payload.params.nodePath : payload.params.drawingNodePath;
        if (!controllerForNodePath(manifest, nodePath)) {
          add('warning', 'UNKNOWN_NODE_PATH', `${nodePath} is not a rig-declared controller node`, manifest.controllers.map(c => c.target.nodePath));
        }
        break;
      }

      case 'set_exposure':
      case 'set_drawing_substitution': {
        const known = new Set(manifest.drawings.flatMap(d => d.drawings));
        if (known.size > 0 && !known.has(payload.params.drawingName)) {
          add('error', 'UNKNOWN_DRAWING', `${payload.params.drawingName} is not declared by any rig element`, [...known].slice(0, 40));
        }
        break;
      }

      default:
        break;
    }

    return findings;
  }

  private buildReport(
    rigId: string,
    rigVersion: string,
    planId: string,
    findings: CompatibilityFinding[],
    typeCoverage: Record<string, { total: number; supported: number }>,
    coverage = 0
  ): CompatibilityReport {
    const errorCount = findings.filter(f => f.severity === 'error').length;
    return compatibilityReportSchema.parse({
      schemaVersion: '1.0',
      kind: 'RigCompatibilityReportV1',
      rigId,
      rigVersion,
      planId,
      compatible: errorCount === 0,
      findings,
      errorCount,
      warningCount: findings.filter(f => f.severity === 'warning').length,
      coverage: errorCount === 0 ? coverage : Math.min(coverage, 0.999999),
      commandTypeCoverage: typeCoverage,
      checkedAt: new Date().toISOString()
    });
  }
}
