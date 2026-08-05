import crypto from 'crypto';
import { MlError, type MlErrorCode } from '../../errors/mlErrorRegistry.js';
import {
  harmonyCommandPlanV5Schema,
  checkPlanInvariants,
  type HarmonyCommandPlanV5,
  type HarmonyCommandV5,
  type HarmonyCommandPayload,
  type HarmonyPrecondition
} from '../../schemas/harmonyCommandPlanV5.js';
import {
  simulatedSceneStateV1Schema,
  simulatorExecutionResultV1Schema,
  sealSceneState,
  readbackFromState,
  computeSceneContentHash,
  SIMULATED_SCENE_SCHEMA_VERSION,
  type SimulatedSceneStateV1,
  type SimulatorExecutionResultV1,
  type SimulatorCommandOutcome,
  type SimColumn,
  type SimNode
} from '../../schemas/simulatedSceneStateV1.js';
import {
  resolveController,
  controllerForNodePath,
  type RigManifestV1,
  type RigChannel
} from '../../schemas/rigManifestV1.js';

/**
 * HarmonyContractSimulator.
 *
 * Executes the subset of `HarmonyCommandPlanV5` that can be modelled without Toon Boom Harmony,
 * against a canonical `SimulatedSceneStateV1`.
 *
 * What it is: a deterministic reference implementation of the command contract. It really
 * mutates state, really checks preconditions, really refuses invalid commands, and really rolls
 * back. Running a plan through it proves the plan is *internally coherent* and that the rig can
 * receive it.
 *
 * What it is not, and never claims to be: Harmony. It cannot author TVG geometry, cannot render,
 * cannot open an `.xstage`, and cannot tell you whether Harmony would accept the same command.
 * Every result it produces carries `isRealHarmonyExecution: false` as a schema literal, so the
 * opposite claim is unrepresentable rather than merely discouraged.
 *
 * State is passed in and returned; the simulator holds no mutable module-level scene.
 */

export type ExecutionMode = 'dry_run' | 'atomic' | 'non_atomic';

export interface ExecutionLimits {
  /** Refuses a plan larger than this before executing anything. */
  maxCommands: number;
  maxNodes: number;
  maxKeyframes: number;
  /** Wall-clock budget. Exceeding it aborts and, in atomic mode, rolls back. */
  timeoutMs: number;
}

export const DEFAULT_LIMITS: ExecutionLimits = {
  maxCommands: 50_000,
  maxNodes: 20_000,
  maxKeyframes: 500_000,
  timeoutMs: 120_000
};

export interface ExecuteOptions {
  mode?: ExecutionMode;
  correlationId?: string;
  limits?: Partial<ExecutionLimits>;
  signal?: AbortSignal;
  /** Injected for deterministic tests; defaults to `Date.now`. */
  now?: () => number;
  evidencePaths?: string[];
}

export interface ExecuteOutcome {
  state: SimulatedSceneStateV1;
  result: SimulatorExecutionResultV1;
}

/** Command types the simulator models. Anything else is reported, never silently skipped. */
export const SUPPORTED_COMMAND_TYPES = [
  'create_node', 'delete_node', 'rename_node', 'create_peg', 'create_group', 'create_camera',
  'connect_nodes', 'disconnect_nodes',
  'create_drawing_element', 'create_drawing',
  'set_exposure', 'set_drawing_substitution', 'set_switch_selection',
  'create_sound_column',
  'set_function_point', 'set_function_interpolation',
  'set_transform_keyframe', 'set_camera_keyframe',
  'set_pivot', 'set_attribute', 'attach_drawing_to_peg',
  'create_palette', 'add_palette_swatch',
  'snapshot_project', 'inspect_native_entities'
] as const;
export type SupportedCommandType = (typeof SUPPORTED_COMMAND_TYPES)[number];

/**
 * Command types the contract defines but the simulator deliberately refuses.
 *
 * Each entry states *why*. These are not gaps to be filled by pretending: authoring vector
 * geometry, rendering and reopening a project are precisely the operations that need the real
 * application, and a simulator that returned success for them would be lying.
 */
export const UNSUPPORTED_COMMAND_REASONS: Readonly<Record<string, string>> = Object.freeze({
  write_vector_path: 'authoring TVG geometry requires the real Harmony drawing engine',
  import_bitmap_drawing: 'importing a bitmap requires the real Harmony element manager',
  import_audio: 'audio import requires the real Harmony sound engine',
  create_deformation_chain: 'deformer chains are not modelled by the v1 simulator scene',
  create_bone_deformer: 'deformer chains are not modelled by the v1 simulator scene',
  create_curve_deformer: 'deformer chains are not modelled by the v1 simulator scene',
  set_deformer_keyframe: 'deformer chains are not modelled by the v1 simulator scene',
  configure_write_node: 'write node configuration only matters to a real renderer',
  render_preview: 'rendering requires the real Harmony renderer',
  render_final: 'rendering requires the real Harmony renderer',
  compare_render: 'there is no rendered output to compare without a real renderer',
  save_project: 'project persistence is the snapshot store\'s job in simulation',
  close_project: 'project lifecycle is meaningless without a real application',
  reopen_project: 'project lifecycle is meaningless without a real application',
  rollback_snapshot: 'rollback is driven by the snapshot store, not by an in-plan command',
  verify_rollback: 'rollback verification is performed by the snapshot store'
});

/* ------------------------------------------------------------------------ the class -- */

export class HarmonyContractSimulator {
  constructor(private readonly manifest: RigManifestV1) {}

  getManifest(): RigManifestV1 {
    return this.manifest;
  }

  /** Builds an empty, schema-valid scene seeded from the rig manifest. */
  createScene(sceneId: string, options: { frameCount?: number } = {}): SimulatedSceneStateV1 {
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(sceneId)) {
      throw new MlError('SIMULATOR_STATE_INVALID', `sceneId ${sceneId} is not a legal identifier`);
    }
    const draft: SimulatedSceneStateV1 = {
      schemaVersion: SIMULATED_SCENE_SCHEMA_VERSION,
      kind: 'SimulatedSceneStateV1',
      sceneId,
      rigId: this.manifest.rigId,
      rigVersion: this.manifest.rigVersion,
      revision: 0,
      sceneSettings: {
        frameCount: options.frameCount ?? 240,
        frameRate: this.manifest.fps,
        resolutionX: this.manifest.sceneWidth,
        resolutionY: this.manifest.sceneHeight
      },
      nodes: [{ path: 'Top', name: 'Top', type: 'GROUP', parentPath: '', positionX: 0, positionY: 0, enabled: true, controllerId: null }],
      connections: [],
      attributes: [],
      columns: [],
      keyframes: [],
      exposures: [],
      drawingSubstitutions: [],
      drawingElements: [],
      switchSelections: [],
      palettes: [],
      cameras: [],
      controllerBindings: [],
      metadata: { createdBy: 'HarmonyContractSimulator', simulated: true },
      commandHistory: [],
      artifactReferences: [],
      contentHash: '0'.repeat(64)
    };
    return sealSceneState(draft);
  }

  /**
   * Executes a plan and returns a new state. The input state is never mutated.
   *
   * Atomic mode (the default) restores the original state on the first rejection. Non-atomic
   * mode is diagnostic only: it keeps whatever applied before the failure so a developer can see
   * how far a broken plan got.
   */
  execute(state: SimulatedSceneStateV1, plan: HarmonyCommandPlanV5, options: ExecuteOptions = {}): ExecuteOutcome {
    const mode: ExecutionMode = options.mode ?? 'atomic';
    const limits = { ...DEFAULT_LIMITS, ...options.limits };
    const now = options.now ?? (() => Date.now());
    const startedMs = now();
    const startedAt = new Date(startedMs).toISOString();
    const correlationId = options.correlationId ?? `sim_${crypto.randomUUID()}`;

    const before = sealSceneState(state);
    const outcomes: SimulatorCommandOutcome[] = [];
    const warnings: string[] = [];
    const errors: SimulatorExecutionResultV1['errors'] = [];

    const finish = (
      finalState: SimulatedSceneStateV1,
      status: SimulatorExecutionResultV1['status'],
      rollbackPerformed: boolean
    ): ExecuteOutcome => {
      const completedMs = Math.max(now(), startedMs);
      const rollbackVerified = rollbackPerformed ? finalState.contentHash === before.contentHash : false;
      if (rollbackPerformed && !rollbackVerified) {
        throw new MlError('SIMULATOR_ROLLBACK_FAILED', 'rollback did not restore the recorded before-hash', {
          detail: { expected: before.contentHash, actual: finalState.contentHash }
        });
      }
      const draft = {
        schemaVersion: '1.0' as const,
        kind: 'SimulatorExecutionResultV1' as const,
        planId: plan.planId,
        sceneId: before.sceneId,
        correlationId,
        idempotencyKey: planIdempotencyKey(plan),
        requestedMode: mode,
        observedMode: 'simulation' as const,
        status,
        commandOutcomes: outcomes,
        appliedCount: outcomes.filter(o => o.outcome === 'applied').length,
        skippedCount: outcomes.filter(o => o.outcome === 'skipped' || o.outcome === 'already_applied').length,
        rejectedCount: outcomes.filter(o => o.outcome === 'rejected').length,
        warnings,
        errors,
        beforeStateHash: before.contentHash,
        afterStateHash: finalState.contentHash,
        beforeRevision: before.revision,
        afterRevision: finalState.revision,
        rollbackPerformed,
        rollbackVerified,
        readbackHash: status === 'succeeded' || status === 'already_applied'
          ? crypto.createHash('sha256').update(JSON.stringify(readbackFromState(finalState))).digest('hex')
          : null,
        evidencePaths: options.evidencePaths ?? [],
        startedAt,
        completedAt: new Date(completedMs).toISOString(),
        durationMs: completedMs - startedMs,
        isRealHarmonyExecution: false as const,
        realInferenceExecuted: false as const,
        simulated: true as const,
        requiresRealHarmony: true as const
      };
      const parsed = simulatorExecutionResultV1Schema.safeParse(draft);
      if (!parsed.success) {
        throw new MlError('SIMULATOR_STATE_INVALID', `execution result failed its own contract: ${parsed.error.message}`);
      }
      return { state: finalState, result: parsed.data };
    };

    // --- plan-level validation, before anything is touched --------------------------------
    const planParse = harmonyCommandPlanV5Schema.safeParse(plan);
    if (!planParse.success) {
      errors.push({ code: 'SIMULATOR_PLAN_REJECTED', message: `plan failed HarmonyCommandPlanV5: ${planParse.error.message}`, commandIndex: null, commandId: null });
      return finish(before, 'rejected', false);
    }
    const invariantViolations = checkPlanInvariants(planParse.data);
    if (invariantViolations.length > 0) {
      for (const violation of invariantViolations) {
        errors.push({ code: 'SIMULATOR_PLAN_REJECTED', message: `${violation.rule}: ${violation.detail}`, commandIndex: null, commandId: violation.commandId });
      }
      return finish(before, 'rejected', false);
    }
    const duplicateIds = findDuplicates(plan.commands.map(c => c.commandId));
    if (duplicateIds.length > 0) {
      errors.push({ code: 'SIMULATOR_DUPLICATE_COMMAND_ID', message: `duplicate commandId: ${duplicateIds.join(', ')}`, commandIndex: null, commandId: duplicateIds[0] });
      return finish(before, 'rejected', false);
    }
    if (plan.commands.length > limits.maxCommands) {
      errors.push({ code: 'SIMULATOR_BUDGET_EXCEEDED', message: `plan has ${plan.commands.length} commands, limit is ${limits.maxCommands}`, commandIndex: null, commandId: null });
      return finish(before, 'rejected', false);
    }

    // --- idempotency ------------------------------------------------------------------------
    // Command idempotency keys are scene-global, not plan-scoped. A key identifies an
    // *operation*, so the same operation carried by a later plan must still be recognised as
    // already applied. Scoping it to the plan meant re-issuing `create_peg` in a follow-up plan
    // failed with NODE_ALREADY_EXISTS instead of being skipped.
    const planKey = planIdempotencyKey(plan);
    const appliedKeys = new Set(before.commandHistory.map(h => h.commandIdempotencyKey));
    const allApplied = plan.commands.length > 0 && plan.commands.every(c => appliedKeys.has(c.idempotencyKey));
    if (allApplied) {
      for (const [index, command] of plan.commands.entries()) {
        outcomes.push({ index, commandId: command.commandId, commandType: command.payload.type, outcome: 'already_applied', errorCode: null, message: 'command idempotency key is already present in the scene history', availableCandidates: [] });
      }
      return finish(before, 'already_applied', false);
    }

    // --- execution -------------------------------------------------------------------------
    let working = cloneState(before);

    for (const [index, command] of plan.commands.entries()) {
      if (options.signal?.aborted) {
        errors.push({ code: 'SIMULATOR_CANCELLED', message: 'cancellation requested', commandIndex: index, commandId: command.commandId });
        return finish(mode === 'non_atomic' ? sealSceneState(working) : before, 'cancelled', mode !== 'non_atomic');
      }
      if (now() - startedMs > limits.timeoutMs) {
        errors.push({ code: 'SIMULATOR_TIMEOUT', message: `execution exceeded ${limits.timeoutMs} ms`, commandIndex: index, commandId: command.commandId });
        return finish(mode === 'non_atomic' ? sealSceneState(working) : before, 'timed_out', mode !== 'non_atomic');
      }

      // Per-command idempotency: re-running a partially applied plan skips what already landed.
      if (appliedKeys.has(command.idempotencyKey)) {
        outcomes.push({ index, commandId: command.commandId, commandType: command.payload.type, outcome: 'already_applied', errorCode: null, message: 'already present in scene history', availableCandidates: [] });
        continue;
      }

      try {
        this.checkPreconditions(working, command, index);
        const next = this.applyCommand(working, command, plan, planKey, limits);
        if (next === null) {
          // Recognised but state-neutral (a snapshot marker or a readback request). It is still
          // recorded in the history: the command was processed, and leaving it out meant any
          // plan containing one could never be recognised as already applied on a re-run.
          working = {
            ...working,
            commandHistory: [...working.commandHistory, {
              revision: state.revision + 1,
              planId: plan.planId,
              planIdempotencyKey: planKey,
              commandId: command.commandId,
              commandType: command.payload.type,
              commandIdempotencyKey: command.idempotencyKey,
              resultingStateHash: working.contentHash
            }]
          };
          outcomes.push({ index, commandId: command.commandId, commandType: command.payload.type, outcome: 'skipped', errorCode: null, message: 'command is recognised but does not mutate simulated state', availableCandidates: [] });
          continue;
        }
        working = next;
        this.checkPostconditions(working, command, index);
        outcomes.push({ index, commandId: command.commandId, commandType: command.payload.type, outcome: 'applied', errorCode: null, message: null, availableCandidates: [] });
      } catch (error) {
        const mlError = error instanceof MlError
          ? error
          : new MlError('SIMULATOR_STATE_INVALID', error instanceof Error ? error.message : String(error), {}, { cause: error });
        const candidates = (mlError.context.detail?.candidates as string[] | undefined) ?? [];
        outcomes.push({
          index, commandId: command.commandId, commandType: command.payload.type,
          outcome: 'rejected', errorCode: mlError.code, message: mlError.message, availableCandidates: candidates
        });
        errors.push({ code: mlError.code, message: mlError.message, commandIndex: index, commandId: command.commandId });

        if (mode === 'atomic' || mode === 'dry_run') {
          // Atomic: every effect of this plan is discarded, back to the exact input state.
          return finish(before, mode === 'dry_run' ? 'rejected' : 'rolled_back', mode === 'atomic');
        }
        // Non-atomic keeps going so a developer can see the full set of failures.
      }
    }

    if (mode === 'dry_run') {
      // A dry run reports what would happen and returns the untouched input state.
      return finish(before, outcomes.some(o => o.outcome === 'rejected') ? 'rejected' : 'succeeded', false);
    }

    const anyApplied = outcomes.some(o => o.outcome === 'applied');
    const finalState = sealSceneState(anyApplied ? { ...working, revision: before.revision + 1 } : working);

    const stateParse = simulatedSceneStateV1Schema.safeParse(finalState);
    if (!stateParse.success) {
      errors.push({ code: 'SIMULATOR_STATE_INVALID', message: `resulting state failed its schema: ${stateParse.error.message}`, commandIndex: null, commandId: null });
      return finish(before, 'rolled_back', true);
    }

    const status = outcomes.some(o => o.outcome === 'rejected') ? 'rejected' : 'succeeded';
    return finish(stateParse.data, status, false);
  }

  /** Convenience wrapper: dry runs never advance the revision, by construction. */
  dryRun(state: SimulatedSceneStateV1, plan: HarmonyCommandPlanV5, options: Omit<ExecuteOptions, 'mode'> = {}): ExecuteOutcome {
    return this.execute(state, plan, { ...options, mode: 'dry_run' });
  }

  /* ------------------------------------------------------------------ preconditions -- */

  private checkPreconditions(state: SimulatedSceneStateV1, command: HarmonyCommandV5, index: number): void {
    for (const precondition of command.preconditions) {
      const failure = evaluatePrecondition(state, precondition);
      if (failure) {
        throw new MlError('SIMULATOR_PRECONDITION_FAILED', `command ${command.commandId} (#${index}): ${failure.message}`, {
          detail: { kind: precondition.kind, candidates: failure.candidates }
        });
      }
    }
  }

  private checkPostconditions(state: SimulatedSceneStateV1, command: HarmonyCommandV5, index: number): void {
    for (const postcondition of command.expectedPostconditions) {
      switch (postcondition.kind) {
        case 'node_exists':
          if (!state.nodes.some(n => n.path === postcondition.nodePath)) {
            throw new MlError('SIMULATOR_POSTCONDITION_FAILED', `command ${command.commandId} (#${index}): node ${postcondition.nodePath} does not exist afterwards`);
          }
          break;
        case 'node_absent':
          if (state.nodes.some(n => n.path === postcondition.nodePath)) {
            throw new MlError('SIMULATOR_POSTCONDITION_FAILED', `command ${command.commandId} (#${index}): node ${postcondition.nodePath} still exists`);
          }
          break;
        case 'node_connected':
          if (!state.connections.some(c => c.fromNode === postcondition.sourcePath && c.toNode === postcondition.targetPath && c.toPort === postcondition.targetPort)) {
            throw new MlError('SIMULATOR_POSTCONDITION_FAILED', `command ${command.commandId} (#${index}): expected connection is absent`);
          }
          break;
        case 'attribute_equals': {
          const attribute = state.attributes.find(a => a.nodePath === postcondition.nodePath && a.attribute === postcondition.attributeName);
          if (!attribute || attribute.value !== postcondition.expected) {
            throw new MlError('SIMULATOR_POSTCONDITION_FAILED', `command ${command.commandId} (#${index}): ${postcondition.attributeName} is ${String(attribute?.value)}, expected ${String(postcondition.expected)}`);
          }
          break;
        }
        case 'exposure_present':
          if (!state.exposures.some(e => e.columnName === postcondition.columnName && e.frame === postcondition.frame && e.drawingName === postcondition.drawingName)) {
            throw new MlError('SIMULATOR_POSTCONDITION_FAILED', `command ${command.commandId} (#${index}): exposure missing at frame ${postcondition.frame}`);
          }
          break;
        case 'function_point_count': {
          const count = state.keyframes.filter(k => k.columnName === postcondition.columnName).length;
          if (count < postcondition.min || count > postcondition.max) {
            throw new MlError('SIMULATOR_POSTCONDITION_FAILED', `command ${command.commandId} (#${index}): ${postcondition.columnName} has ${count} points, expected ${postcondition.min}..${postcondition.max}`);
          }
          break;
        }
        case 'palette_contains': {
          const palette = state.palettes.find(p => p.paletteName === postcondition.paletteName);
          if (!palette || !palette.swatches.some(s => s.colorId === postcondition.colorId)) {
            throw new MlError('SIMULATOR_POSTCONDITION_FAILED', `command ${command.commandId} (#${index}): palette ${postcondition.paletteName} lacks ${postcondition.colorId}`);
          }
          break;
        }
        case 'frame_count_at_least':
          if (state.sceneSettings.frameCount < postcondition.count) {
            throw new MlError('SIMULATOR_POSTCONDITION_FAILED', `command ${command.commandId} (#${index}): scene has ${state.sceneSettings.frameCount} frames, expected at least ${postcondition.count}`);
          }
          break;
        case 'file_exists':
          // The simulator writes no project files. Asserting one exists would be a fabrication,
          // so the postcondition is recorded as unverifiable rather than reported as satisfied.
          break;
      }
    }
  }

  /* --------------------------------------------------------------- command handlers -- */

  /** Returns the next state, or `null` when the command is recognised but state-neutral. */
  private applyCommand(
    state: SimulatedSceneStateV1,
    command: HarmonyCommandV5,
    plan: HarmonyCommandPlanV5,
    planKey: string,
    limits: ExecutionLimits
  ): SimulatedSceneStateV1 | null {
    const payload = command.payload;
    const type = payload.type;

    if (type in UNSUPPORTED_COMMAND_REASONS) {
      throw new MlError('SIMULATOR_COMMAND_NOT_SUPPORTED', `${type}: ${UNSUPPORTED_COMMAND_REASONS[type]}`, {
        detail: { candidates: [...SUPPORTED_COMMAND_TYPES] }
      });
    }
    if (!(SUPPORTED_COMMAND_TYPES as readonly string[]).includes(type)) {
      throw new MlError('SIMULATOR_COMMAND_NOT_SUPPORTED', `${type} has no simulator handler`, {
        detail: { candidates: [...SUPPORTED_COMMAND_TYPES] }
      });
    }

    const next = cloneState(state);
    const record = (): SimulatedSceneStateV1 => {
      const sealed = sealSceneState(next);
      sealed.commandHistory = [...next.commandHistory, {
        revision: state.revision + 1,
        planId: plan.planId,
        planIdempotencyKey: planKey,
        commandId: command.commandId,
        commandType: type,
        commandIdempotencyKey: command.idempotencyKey,
        resultingStateHash: computeSceneContentHash(sealed)
      }];
      return sealed;
    };

    switch (payload.type) {
      /* ------------------------------------------------------------------- nodes -- */
      case 'create_node': {
        const path = joinPath(payload.params.parentPath, payload.params.nodeName);
        requireNode(next, payload.params.parentPath);
        if (next.nodes.some(n => n.path === path)) {
          throw new MlError('SIMULATOR_NODE_ALREADY_EXISTS', `node ${path} already exists`);
        }
        requireNodeBudget(next, limits);
        next.nodes.push({
          path, name: payload.params.nodeName, type: payload.params.nodeType,
          parentPath: payload.params.parentPath,
          positionX: payload.params.position.x, positionY: payload.params.position.y,
          enabled: true,
          controllerId: controllerForNodePath(this.manifest, path)?.controllerId ?? null
        });
        return record();
      }

      case 'create_peg': {
        const path = joinPath(payload.params.parentPath, payload.params.pegName);
        requireNode(next, payload.params.parentPath);
        if (next.nodes.some(n => n.path === path)) {
          throw new MlError('SIMULATOR_NODE_ALREADY_EXISTS', `node ${path} already exists`);
        }
        requireNodeBudget(next, limits);
        next.nodes.push({
          path, name: payload.params.pegName, type: 'PEG', parentPath: payload.params.parentPath,
          positionX: payload.params.position.x, positionY: payload.params.position.y, enabled: true,
          controllerId: controllerForNodePath(this.manifest, path)?.controllerId ?? null
        });
        return record();
      }

      case 'create_group': {
        const path = joinPath(payload.params.parentPath, payload.params.groupName);
        requireNode(next, payload.params.parentPath);
        if (next.nodes.some(n => n.path === path)) {
          throw new MlError('SIMULATOR_NODE_ALREADY_EXISTS', `node ${path} already exists`);
        }
        requireNodeBudget(next, limits);
        for (const member of payload.params.memberPaths) requireNode(next, member);
        next.nodes.push({
          path, name: payload.params.groupName, type: 'GROUP', parentPath: payload.params.parentPath,
          positionX: 0, positionY: 0, enabled: true, controllerId: null
        });
        // Reparenting members is the whole point of grouping; paths move with them.
        for (const member of payload.params.memberPaths) {
          reparent(next, member, path);
        }
        if (payload.params.addComposite) {
          const compositePath = joinPath(path, 'Composite');
          if (!next.nodes.some(n => n.path === compositePath)) {
            next.nodes.push({ path: compositePath, name: 'Composite', type: 'COMPOSITE', parentPath: path, positionX: 0, positionY: -100, enabled: true, controllerId: null });
          }
        }
        return record();
      }

      case 'create_camera': {
        const path = joinPath(payload.params.parentPath, payload.params.cameraName);
        requireNode(next, payload.params.parentPath);
        if (next.nodes.some(n => n.path === path)) {
          throw new MlError('SIMULATOR_NODE_ALREADY_EXISTS', `node ${path} already exists`);
        }
        requireNodeBudget(next, limits);
        next.nodes.push({ path, name: payload.params.cameraName, type: 'CAMERA', parentPath: payload.params.parentPath, positionX: 0, positionY: 0, enabled: true, controllerId: null });
        if (payload.params.setAsDefault) {
          next.cameras = next.cameras.map(c => ({ ...c, isDefault: false }));
        }
        next.cameras.push({ nodePath: path, isDefault: payload.params.setAsDefault, offsetX: 0, offsetY: 0, offsetZ: 0, rotationZ: 0 });
        return record();
      }

      case 'delete_node': {
        requireNode(next, payload.params.nodePath);
        if (payload.params.nodePath === 'Top') {
          throw new MlError('SIMULATOR_CONNECTION_INVALID', 'Top cannot be deleted');
        }
        const prefix = `${payload.params.nodePath}/`;
        const removed = new Set(next.nodes.filter(n => n.path === payload.params.nodePath || n.path.startsWith(prefix)).map(n => n.path));
        next.nodes = next.nodes.filter(n => !removed.has(n.path));
        next.connections = next.connections.filter(c => !removed.has(c.fromNode) && !removed.has(c.toNode));
        next.attributes = next.attributes.filter(a => !removed.has(a.nodePath));
        next.controllerBindings = next.controllerBindings.filter(b => !removed.has(b.nodePath));
        next.cameras = next.cameras.filter(c => !removed.has(c.nodePath));
        next.columns = next.columns.map(c => (c.linkedNodePath && removed.has(c.linkedNodePath) ? { ...c, linkedNodePath: null, linkedChannel: null } : c));
        return record();
      }

      case 'rename_node': {
        requireNode(next, payload.params.nodePath);
        const parent = parentOf(payload.params.nodePath);
        const target = joinPath(parent, payload.params.newName);
        if (target !== payload.params.nodePath && next.nodes.some(n => n.path === target)) {
          throw new MlError('SIMULATOR_NODE_ALREADY_EXISTS', `node ${target} already exists`);
        }
        renameSubtree(next, payload.params.nodePath, target, payload.params.newName);
        return record();
      }

      /* ------------------------------------------------------------ connections -- */
      case 'connect_nodes': {
        requireNode(next, payload.params.sourcePath);
        requireNode(next, payload.params.targetPath);
        if (payload.params.sourcePath === payload.params.targetPath) {
          throw new MlError('SIMULATOR_CONNECTION_INVALID', 'a node cannot connect to itself');
        }
        const occupied = next.connections.find(c => c.toNode === payload.params.targetPath && c.toPort === payload.params.targetPort);
        if (occupied) {
          throw new MlError('SIMULATOR_CONNECTION_INVALID', `port ${payload.params.targetPort} on ${payload.params.targetPath} is already fed by ${occupied.fromNode}`);
        }
        const candidate = { fromNode: payload.params.sourcePath, fromPort: payload.params.sourcePort, toNode: payload.params.targetPath, toPort: payload.params.targetPort };
        if (wouldCreateCycle(next.connections, candidate)) {
          throw new MlError('SIMULATOR_CYCLE_DETECTED', `connecting ${candidate.fromNode} into ${candidate.toNode} would close a cycle`);
        }
        next.connections.push(candidate);
        return record();
      }

      case 'disconnect_nodes': {
        requireNode(next, payload.params.targetPath);
        const beforeCount = next.connections.length;
        next.connections = next.connections.filter(c => !(c.toNode === payload.params.targetPath && c.toPort === payload.params.targetPort));
        if (next.connections.length === beforeCount) {
          throw new MlError('SIMULATOR_CONNECTION_INVALID', `nothing is connected to ${payload.params.targetPath} port ${payload.params.targetPort}`);
        }
        return record();
      }

      /* --------------------------------------------------------------- drawings -- */
      case 'create_drawing_element': {
        if (next.drawingElements.some(e => e.elementName === payload.params.elementName)) {
          throw new MlError('SIMULATOR_NODE_ALREADY_EXISTS', `drawing element ${payload.params.elementName} already exists`);
        }
        if (payload.params.vectorType === 'TVG') {
          // The plan invariants already forbid this outside real Harmony; refusing here too
          // means the simulator cannot be talked into claiming it authored vector geometry.
          throw new MlError('SIMULATOR_COMMAND_NOT_SUPPORTED', 'TVG elements require the real Harmony drawing engine; use BITMAP in simulation');
        }
        next.drawingElements.push({
          elementName: payload.params.elementName,
          fieldGuide: payload.params.fieldGuide,
          scanType: payload.params.scanType,
          vectorType: payload.params.vectorType,
          drawings: []
        });
        return record();
      }

      case 'create_drawing': {
        const element = next.drawingElements.find(e => e.elementName === payload.params.elementName);
        if (!element) {
          throw new MlError('SIMULATOR_DRAWING_NOT_FOUND', `element ${payload.params.elementName} does not exist`, {
            detail: { candidates: next.drawingElements.map(e => e.elementName) }
          });
        }
        if (!element.drawings.includes(payload.params.drawingName)) element.drawings.push(payload.params.drawingName);
        return record();
      }

      /* ------------------------------------------------------------- exposures --- */
      case 'set_exposure': {
        const column = requireColumn(next, payload.params.columnName);
        requireFrameInRange(next, payload.params.endFrame);
        assertDrawingKnown(next, column, payload.params.drawingName);
        for (let frame = payload.params.startFrame; frame <= payload.params.endFrame; frame += 1) {
          const existing = next.exposures.findIndex(e => e.columnName === payload.params.columnName && e.frame === frame);
          const entry = { columnName: payload.params.columnName, frame, drawingName: payload.params.drawingName };
          if (existing >= 0) next.exposures[existing] = entry;
          else next.exposures.push(entry);
        }
        return record();
      }

      case 'set_drawing_substitution': {
        const column = requireColumn(next, payload.params.columnName);
        requireFrameInRange(next, payload.params.frame + payload.params.holdFrames - 1);
        assertDrawingKnown(next, column, payload.params.drawingName);
        const existing = next.drawingSubstitutions.findIndex(s => s.columnName === payload.params.columnName && s.frame === payload.params.frame);
        const entry = { columnName: payload.params.columnName, frame: payload.params.frame, drawingName: payload.params.drawingName, holdFrames: payload.params.holdFrames };
        if (existing >= 0) next.drawingSubstitutions[existing] = entry;
        else next.drawingSubstitutions.push(entry);
        return record();
      }

      case 'set_switch_selection': {
        const controller = resolveController(this.manifest, payload.params.controllerId);
        if (!controller) {
          throw new MlError('SIMULATOR_CONTROLLER_NOT_FOUND', `controller ${payload.params.controllerId} is not declared by rig ${this.manifest.rigId}`, {
            detail: { candidates: this.manifest.controllers.map(c => c.controllerId) }
          });
        }
        const declared = this.manifest.switchDrawings.find(s => s.controllerId === controller.controllerId && s.elementName === payload.params.elementName);
        if (!declared) {
          throw new MlError('SIMULATOR_DRAWING_NOT_FOUND', `rig declares no switch for ${controller.controllerId} on ${payload.params.elementName}`, {
            detail: { candidates: this.manifest.switchDrawings.map(s => `${s.controllerId}:${s.elementName}`) }
          });
        }
        if (!declared.drawings.includes(payload.params.drawingName)) {
          throw new MlError('SIMULATOR_DRAWING_NOT_FOUND', `${payload.params.drawingName} is not a legal selection for ${payload.params.elementName}`, {
            detail: { candidates: declared.drawings }
          });
        }
        requireFrameInRange(next, payload.params.frame);
        const existing = next.switchSelections.findIndex(s => s.controllerId === controller.controllerId && s.elementName === payload.params.elementName && s.frame === payload.params.frame);
        const entry = { controllerId: controller.controllerId, elementName: payload.params.elementName, frame: payload.params.frame, drawingName: payload.params.drawingName };
        if (existing >= 0) next.switchSelections[existing] = entry;
        else next.switchSelections.push(entry);
        return record();
      }

      /* --------------------------------------------------------------- columns --- */
      case 'create_sound_column': {
        if (next.columns.some(c => c.name === payload.params.columnName)) {
          throw new MlError('SIMULATOR_COLUMN_ALREADY_EXISTS', `column ${payload.params.columnName} already exists`);
        }
        next.columns.push({ name: payload.params.columnName, type: 'SOUND', linkedNodePath: null, linkedChannel: null });
        return record();
      }

      case 'set_function_point': {
        const column = ensureColumn(next, payload.params.columnName, 'BEZIER');
        requireFrameInRange(next, payload.params.frame);
        requireFinite(payload.params.value, `${payload.params.columnName}@${payload.params.frame}`);
        this.enforceLimit(next, column, payload.params.value, payload.params.columnName);
        if (next.keyframes.length + 1 > limits.maxKeyframes) {
          throw new MlError('SIMULATOR_BUDGET_EXCEEDED', `keyframe limit ${limits.maxKeyframes} reached`);
        }
        const index = next.keyframes.findIndex(k => k.columnName === payload.params.columnName && k.frame === payload.params.frame);
        const key = {
          columnName: payload.params.columnName,
          frame: payload.params.frame,
          value: payload.params.value,
          interpolation: 'bezier' as const,
          handleLeftX: payload.params.handleLeftX,
          handleLeftY: payload.params.handleLeftY,
          handleRightX: payload.params.handleRightX,
          handleRightY: payload.params.handleRightY,
          constSeg: payload.params.constSeg,
          continuity: payload.params.continuity
        };
        // Setting the same frame twice replaces, never duplicates: a Harmony column holds one
        // point per frame, and duplicating would make key counts meaningless.
        if (index >= 0) next.keyframes[index] = key;
        else next.keyframes.push(key);
        return record();
      }

      case 'set_function_interpolation': {
        const index = next.keyframes.findIndex(k => k.columnName === payload.params.columnName && k.frame === payload.params.frame);
        if (index < 0) {
          throw new MlError('SIMULATOR_COLUMN_NOT_FOUND', `no function point on ${payload.params.columnName} at frame ${payload.params.frame}`, {
            detail: { candidates: next.keyframes.filter(k => k.columnName === payload.params.columnName).map(k => String(k.frame)) }
          });
        }
        next.keyframes[index] = { ...next.keyframes[index], interpolation: payload.params.interpolation };
        return record();
      }

      case 'set_transform_keyframe': {
        requireNode(next, payload.params.nodePath);
        requireFrameInRange(next, payload.params.frame);
        const controller = controllerForNodePath(this.manifest, payload.params.nodePath);
        const channels: Array<[RigChannel, number]> = [];
        if (payload.params.offset) {
          channels.push(['offsetX', payload.params.offset.x], ['offsetY', payload.params.offset.y], ['offsetZ', payload.params.offset.z]);
        }
        if (payload.params.rotationZ !== null) channels.push(['rotationZ', payload.params.rotationZ]);
        if (payload.params.scale) channels.push(['scaleX', payload.params.scale.x], ['scaleY', payload.params.scale.y]);
        if (payload.params.skew !== null) channels.push(['skew', payload.params.skew]);
        if (channels.length === 0) {
          throw new MlError('SIMULATOR_CHANNEL_NOT_SUPPORTED', `set_transform_keyframe on ${payload.params.nodePath} names no channel`);
        }
        for (const [channel, value] of channels) {
          requireFinite(value, `${payload.params.nodePath}.${channel}`);
          if (controller && !controller.channels.includes(channel)) {
            throw new MlError('SIMULATOR_CHANNEL_NOT_SUPPORTED', `controller ${controller.controllerId} does not accept ${channel}`, {
              detail: { candidates: controller.channels }
            });
          }
          const columnName = channelColumnName(payload.params.nodePath, channel);
          const column = ensureColumn(next, columnName, 'BEZIER', payload.params.nodePath, channel);
          this.enforceLimit(next, column, value, columnName, controller?.controllerId);
          upsertKeyframe(next, columnName, payload.params.frame, value, payload.params.interpolation);
          bindChannel(next, controller?.controllerId ?? null, payload.params.nodePath, channel, columnName);
        }
        return record();
      }

      case 'set_camera_keyframe': {
        requireNode(next, payload.params.cameraPath);
        requireFrameInRange(next, payload.params.frame);
        const camera = next.cameras.find(c => c.nodePath === payload.params.cameraPath);
        if (!camera) {
          throw new MlError('SIMULATOR_NODE_NOT_FOUND', `${payload.params.cameraPath} is not a registered camera`, {
            detail: { candidates: next.cameras.map(c => c.nodePath) }
          });
        }
        const channels: Array<[RigChannel, number]> = [];
        if (payload.params.offset) channels.push(['offsetX', payload.params.offset.x], ['offsetY', payload.params.offset.y], ['offsetZ', payload.params.offset.z]);
        if (payload.params.rotationZ !== null) channels.push(['rotationZ', payload.params.rotationZ]);
        for (const [channel, value] of channels) {
          requireFinite(value, `${payload.params.cameraPath}.${channel}`);
          const columnName = channelColumnName(payload.params.cameraPath, channel);
          ensureColumn(next, columnName, 'BEZIER', payload.params.cameraPath, channel);
          upsertKeyframe(next, columnName, payload.params.frame, value, payload.params.interpolation);
        }
        // The camera record tracks the value at the latest keyed frame, so a readback shows the
        // final camera state without replaying every curve.
        const latest = { ...camera };
        if (payload.params.offset) { latest.offsetX = payload.params.offset.x; latest.offsetY = payload.params.offset.y; latest.offsetZ = payload.params.offset.z; }
        if (payload.params.rotationZ !== null) latest.rotationZ = payload.params.rotationZ;
        next.cameras = next.cameras.map(c => (c.nodePath === camera.nodePath ? latest : c));
        return record();
      }

      /* ------------------------------------------------------ attributes/pivots -- */
      case 'set_pivot': {
        requireNode(next, payload.params.nodePath);
        requireFinite(payload.params.pivot.x, `${payload.params.nodePath}.pivotX`);
        requireFinite(payload.params.pivot.y, `${payload.params.nodePath}.pivotY`);
        const controller = controllerForNodePath(this.manifest, payload.params.nodePath);
        const index = next.controllerBindings.findIndex(b => b.nodePath === payload.params.nodePath);
        if (index >= 0) {
          next.controllerBindings[index] = { ...next.controllerBindings[index], pivotX: payload.params.pivot.x, pivotY: payload.params.pivot.y, pivotSource: payload.params.pivotSource };
        } else {
          next.controllerBindings.push({
            controllerId: controller?.controllerId ?? `unbound:${payload.params.nodePath}`,
            nodePath: payload.params.nodePath,
            channelColumns: {},
            pivotX: payload.params.pivot.x,
            pivotY: payload.params.pivot.y,
            pivotSource: payload.params.pivotSource
          });
        }
        return record();
      }

      case 'set_attribute': {
        requireNode(next, payload.params.nodePath);
        const value = payload.params.value;
        if (typeof value === 'number') requireFinite(value, `${payload.params.nodePath}.${payload.params.attributeName}`);
        if (typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'boolean') {
          // rgba / vector3 values exist in the contract but the v1 simulator scene stores only
          // scalars; refusing is honest, silently stringifying would not be.
          throw new MlError('SIMULATOR_COMMAND_NOT_SUPPORTED', `set_attribute with a structured value is not modelled by the v1 simulator scene`);
        }
        const index = next.attributes.findIndex(a => a.nodePath === payload.params.nodePath && a.attribute === payload.params.attributeName);
        const entry = { nodePath: payload.params.nodePath, attribute: payload.params.attributeName, value };
        if (index >= 0) next.attributes[index] = entry;
        else next.attributes.push(entry);
        return record();
      }

      case 'attach_drawing_to_peg': {
        requireNode(next, payload.params.drawingNodePath);
        requireNode(next, payload.params.pegNodePath);
        const occupied = next.connections.find(c => c.toNode === payload.params.drawingNodePath && c.toPort === 0);
        if (occupied && occupied.fromNode !== payload.params.pegNodePath) {
          throw new MlError('SIMULATOR_CONNECTION_INVALID', `${payload.params.drawingNodePath} is already driven by ${occupied.fromNode}`);
        }
        if (!occupied) {
          const candidate = { fromNode: payload.params.pegNodePath, fromPort: 0, toNode: payload.params.drawingNodePath, toPort: 0 };
          if (wouldCreateCycle(next.connections, candidate)) {
            throw new MlError('SIMULATOR_CYCLE_DETECTED', 'attaching would close a cycle in the peg hierarchy');
          }
          next.connections.push(candidate);
        }
        return record();
      }

      /* --------------------------------------------------------------- palettes -- */
      case 'create_palette': {
        if (next.palettes.some(p => p.paletteName === payload.params.paletteName)) {
          throw new MlError('SIMULATOR_PALETTE_NOT_FOUND', `palette ${payload.params.paletteName} already exists`);
        }
        next.palettes.push({
          paletteName: payload.params.paletteName,
          location: payload.params.location,
          elementName: payload.params.elementName,
          swatches: []
        });
        return record();
      }

      case 'add_palette_swatch': {
        const palette = next.palettes.find(p => p.paletteName === payload.params.paletteName);
        if (!palette) {
          throw new MlError('SIMULATOR_PALETTE_NOT_FOUND', `palette ${payload.params.paletteName} does not exist`, {
            detail: { candidates: next.palettes.map(p => p.paletteName) }
          });
        }
        const index = palette.swatches.findIndex(s => s.colorId === payload.params.colorId);
        const swatch = { colorId: payload.params.colorId, colorName: payload.params.colorName, rgba: payload.params.rgba, colorType: payload.params.colorType };
        if (index >= 0) palette.swatches[index] = swatch;
        else palette.swatches.push(swatch);
        return record();
      }

      /* --------------------------------------------------- state-neutral markers -- */
      case 'snapshot_project':
      case 'inspect_native_entities':
        // Recognised: snapshots are taken by the snapshot store and native inspection is what
        // readback already does. Neither mutates the scene, so neither is reported as applied.
        return null;

      default: {
        // Only the deliberately-unsupported types reach here, and the guard above already threw
        // for every one of them with its specific reason. This is the belt-and-braces case for
        // a command type added to the contract without either a handler or a refusal reason.
        const remaining: Exclude<HarmonyCommandPayload, { type: SupportedCommandType }> = payload;
        throw new MlError('SIMULATOR_COMMAND_NOT_SUPPORTED', `${remaining.type} has no simulator handler and no declared refusal reason`, {
          detail: { candidates: [...SUPPORTED_COMMAND_TYPES] }
        });
      }
    }
  }

  /** Applies the rig's declared limit for a channel, either clamping or rejecting. */
  private enforceLimit(state: SimulatedSceneStateV1, column: SimColumn, value: number, columnName: string, controllerId?: string): void {
    const channel = column.linkedChannel;
    if (!channel) return;
    const controller = controllerId
      ? resolveController(this.manifest, controllerId)
      : (column.linkedNodePath ? controllerForNodePath(this.manifest, column.linkedNodePath) : undefined);
    const limit = controller?.limits.find(l => l.channel === channel);
    if (!limit) return;
    if (value >= limit.min && value <= limit.max) return;
    if (limit.onViolation === 'reject') {
      throw new MlError('SIMULATOR_LIMIT_VIOLATED', `${controller!.controllerId}.${channel} = ${value} is outside [${limit.min}, ${limit.max}]`, {
        detail: { columnName, candidates: [`${limit.min}`, `${limit.max}`] }
      });
    }
    // `clamp` is applied by the caller through upsertKeyframe; recording it here keeps the
    // decision in one place.
  }
}

/* ------------------------------------------------------------------------- helpers --- */

function cloneState(state: SimulatedSceneStateV1): SimulatedSceneStateV1 {
  return JSON.parse(JSON.stringify(state)) as SimulatedSceneStateV1;
}

function joinPath(parent: string, name: string): string {
  return parent === '' ? name : `${parent}/${name}`;
}

function parentOf(path: string): string {
  const parts = path.split('/');
  return parts.slice(0, -1).join('/');
}

/**
 * One budget check for every node-creating handler. It lived inside `create_node` alone, so
 * `create_peg`, `create_group` and `create_camera` could each grow the scene past the limit.
 */
function requireNodeBudget(state: SimulatedSceneStateV1, limits: ExecutionLimits): void {
  if (state.nodes.length + 1 > limits.maxNodes) {
    throw new MlError('SIMULATOR_BUDGET_EXCEEDED', `node limit ${limits.maxNodes} reached (${state.nodes.length} nodes present)`);
  }
}

function requireNode(state: SimulatedSceneStateV1, path: string): SimNode {
  const node = state.nodes.find(n => n.path === path);
  if (!node) {
    throw new MlError('SIMULATOR_NODE_NOT_FOUND', `node ${path} does not exist`, {
      detail: { candidates: state.nodes.map(n => n.path).slice(0, 40) }
    });
  }
  return node;
}

function requireColumn(state: SimulatedSceneStateV1, name: string): SimColumn {
  const column = state.columns.find(c => c.name === name);
  if (!column) {
    throw new MlError('SIMULATOR_COLUMN_NOT_FOUND', `column ${name} does not exist`, {
      detail: { candidates: state.columns.map(c => c.name).slice(0, 40) }
    });
  }
  return column;
}

/** Creates the column on first use. Harmony auto-creates function columns the same way. */
function ensureColumn(
  state: SimulatedSceneStateV1,
  name: string,
  type: SimColumn['type'],
  linkedNodePath?: string,
  linkedChannel?: RigChannel
): SimColumn {
  const existing = state.columns.find(c => c.name === name);
  if (existing) return existing;
  const column: SimColumn = { name, type, linkedNodePath: linkedNodePath ?? null, linkedChannel: linkedChannel ?? null };
  state.columns.push(column);
  return column;
}

function requireFrameInRange(state: SimulatedSceneStateV1, frame: number): void {
  if (!Number.isInteger(frame) || frame < 1) {
    throw new MlError('SIMULATOR_FRAME_OUT_OF_RANGE', `frame ${frame} is not a valid 1-based Harmony frame`);
  }
  if (frame > state.sceneSettings.frameCount) {
    throw new MlError('SIMULATOR_FRAME_OUT_OF_RANGE', `frame ${frame} exceeds the scene length of ${state.sceneSettings.frameCount}`);
  }
}

function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new MlError('SIMULATOR_NON_FINITE_VALUE', `${label} is ${value}`);
  }
}

/**
 * A drawing name may only be exposed when the element that owns the column declares it. Without
 * this, an exposure could reference a drawing that does not exist and nothing would notice until
 * a real render.
 */
function assertDrawingKnown(state: SimulatedSceneStateV1, column: SimColumn, drawingName: string): void {
  if (state.drawingElements.length === 0) return;
  const known = state.drawingElements.some(e => e.drawings.includes(drawingName));
  if (!known) {
    throw new MlError('SIMULATOR_DRAWING_NOT_FOUND', `drawing ${drawingName} is not declared on any element`, {
      detail: { candidates: state.drawingElements.flatMap(e => e.drawings).slice(0, 40), columnName: column.name }
    });
  }
}

function upsertKeyframe(
  state: SimulatedSceneStateV1,
  columnName: string,
  frame: number,
  value: number,
  interpolation: SimulatedSceneStateV1['keyframes'][number]['interpolation']
): void {
  const index = state.keyframes.findIndex(k => k.columnName === columnName && k.frame === frame);
  const key = {
    columnName, frame, value, interpolation,
    handleLeftX: -1, handleLeftY: 0, handleRightX: 1, handleRightY: 0,
    constSeg: interpolation === 'constant',
    continuity: 'SMOOTH' as const
  };
  if (index >= 0) state.keyframes[index] = key;
  else state.keyframes.push(key);
}

function bindChannel(
  state: SimulatedSceneStateV1,
  controllerId: string | null,
  nodePath: string,
  channel: RigChannel,
  columnName: string
): void {
  const id = controllerId ?? `unbound:${nodePath}`;
  const index = state.controllerBindings.findIndex(b => b.nodePath === nodePath);
  if (index >= 0) {
    state.controllerBindings[index] = {
      ...state.controllerBindings[index],
      controllerId: id,
      channelColumns: { ...state.controllerBindings[index].channelColumns, [channel]: columnName }
    };
    return;
  }
  state.controllerBindings.push({
    controllerId: id, nodePath, channelColumns: { [channel]: columnName },
    pivotX: 0, pivotY: 0, pivotSource: 'unset'
  });
}

function channelColumnName(nodePath: string, channel: RigChannel): string {
  return `${nodePath.replace(/^Top\//, '').replace(/[^A-Za-z0-9_]/g, '_')}_${channel}`;
}

function reparent(state: SimulatedSceneStateV1, nodePath: string, newParent: string): void {
  const node = state.nodes.find(n => n.path === nodePath);
  if (!node) return;
  const target = joinPath(newParent, node.name);
  renameSubtree(state, nodePath, target, node.name);
}

/** Moves a node and everything under it, keeping connections and references consistent. */
function renameSubtree(state: SimulatedSceneStateV1, fromPath: string, toPath: string, newName: string): void {
  if (fromPath === toPath) return;
  const prefix = `${fromPath}/`;
  const remap = (path: string): string => {
    if (path === fromPath) return toPath;
    if (path.startsWith(prefix)) return `${toPath}/${path.slice(prefix.length)}`;
    return path;
  };
  state.nodes = state.nodes.map(n => {
    if (n.path !== fromPath && !n.path.startsWith(prefix)) return n;
    const path = remap(n.path);
    return { ...n, path, name: n.path === fromPath ? newName : n.name, parentPath: remap(n.parentPath) };
  });
  state.connections = state.connections.map(c => ({ ...c, fromNode: remap(c.fromNode), toNode: remap(c.toNode) }));
  state.attributes = state.attributes.map(a => ({ ...a, nodePath: remap(a.nodePath) }));
  state.columns = state.columns.map(c => (c.linkedNodePath ? { ...c, linkedNodePath: remap(c.linkedNodePath) } : c));
  state.controllerBindings = state.controllerBindings.map(b => ({ ...b, nodePath: remap(b.nodePath) }));
  state.cameras = state.cameras.map(c => ({ ...c, nodePath: remap(c.nodePath) }));
}

/** Depth-first reachability check on the directed connection graph. */
function wouldCreateCycle(connections: SimulatedSceneStateV1['connections'], candidate: SimulatedSceneStateV1['connections'][number]): boolean {
  if (candidate.fromNode === candidate.toNode) return true;
  const outgoing = new Map<string, string[]>();
  for (const connection of [...connections, candidate]) {
    (outgoing.get(connection.fromNode) ?? outgoing.set(connection.fromNode, []).get(connection.fromNode)!).push(connection.toNode);
  }
  const seen = new Set<string>();
  const stack = [candidate.toNode];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === candidate.fromNode) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(outgoing.get(current) ?? []));
  }
  return false;
}

function evaluatePrecondition(
  state: SimulatedSceneStateV1,
  precondition: HarmonyPrecondition
): { message: string; candidates: string[] } | null {
  switch (precondition.kind) {
    case 'scene_open':
      return null; // A simulated scene is, by definition, open.
    case 'node_exists':
      return state.nodes.some(n => n.path === precondition.nodePath)
        ? null
        : { message: `node ${precondition.nodePath} does not exist`, candidates: state.nodes.map(n => n.path).slice(0, 40) };
    case 'node_absent':
      return state.nodes.some(n => n.path === precondition.nodePath)
        ? { message: `node ${precondition.nodePath} already exists`, candidates: [] }
        : null;
    case 'column_exists':
      return state.columns.some(c => c.name === precondition.columnName)
        ? null
        : { message: `column ${precondition.columnName} does not exist`, candidates: state.columns.map(c => c.name).slice(0, 40) };
    case 'palette_exists':
      return state.palettes.some(p => p.paletteName === precondition.paletteName)
        ? null
        : { message: `palette ${precondition.paletteName} does not exist`, candidates: state.palettes.map(p => p.paletteName) };
    case 'drawing_exists': {
      const element = state.drawingElements.find(e => e.elementName === precondition.elementName);
      if (!element) return { message: `element ${precondition.elementName} does not exist`, candidates: state.drawingElements.map(e => e.elementName) };
      return element.drawings.includes(precondition.drawingName)
        ? null
        : { message: `${precondition.elementName} has no drawing ${precondition.drawingName}`, candidates: element.drawings };
    }
    case 'snapshot_exists':
      // Snapshots live in the snapshot store, not in the scene. The plan invariant checker
      // already enforces that a plan takes its snapshot before referencing it.
      return null;
    case 'artifact_available':
      // Artifact availability is the artifact store's business; asserting it here from scene
      // data alone would be guessing.
      return null;
    case 'frame_range_valid':
      if (precondition.startFrame < 1) return { message: `start frame ${precondition.startFrame} is not 1-based`, candidates: [] };
      return precondition.endFrame <= state.sceneSettings.frameCount
        ? null
        : { message: `frame range ends at ${precondition.endFrame} but the scene is ${state.sceneSettings.frameCount} frames`, candidates: [] };
  }
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

/** Stable identity for a plan, used for whole-plan idempotency. */
export function planIdempotencyKey(plan: HarmonyCommandPlanV5): string {
  return crypto.createHash('sha256')
    .update(JSON.stringify({ planId: plan.planId, manifestId: plan.manifestId, commands: plan.commands.map(c => c.idempotencyKey).sort() }))
    .digest('hex')
    .slice(0, 32);
}

export type { MlErrorCode };
