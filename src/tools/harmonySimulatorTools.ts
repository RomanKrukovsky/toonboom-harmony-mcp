import { z } from 'zod';
import crypto from 'crypto';
import { HarmonyContractSimulator, SUPPORTED_COMMAND_TYPES, UNSUPPORTED_COMMAND_REASONS } from '../services/harmonyContractSimulator/index.js';
import { HarmonySnapshotStore } from '../services/harmonySnapshotStore/index.js';
import { RigCompatibilityValidator } from '../services/rigCompatibilityValidator/index.js';
import { runStructuralOfflineQa } from '../services/structuralOfflineQa/index.js';
import { diffScenes } from '../services/harmonySceneDiff/index.js';
import { loadRigFixture, loadRigFixtureRaw, listRigFixtures, buildInitialScene } from '../services/rigFixtureLoader/index.js';
import { harmonyCommandPlanV5Schema } from '../schemas/harmonyCommandPlanV5.js';
import { readbackFromState, simulatedSceneStateV1Schema, type SimulatedSceneStateV1 } from '../schemas/simulatedSceneStateV1.js';
import { MlError } from '../errors/mlErrorRegistry.js';

/**
 * MCP surface for the Harmony contract simulator.
 *
 * These tools are additive: no existing tool name changes. Every one of them operates on a
 * *simulated* scene and none can report Harmony execution — the result schemas carry
 * `isRealHarmonyExecution: false` as a literal, so the field cannot be set to true anywhere.
 *
 * Mutating tools accept `correlationId`, `idempotencyKey`, `timeoutMs` and `dryRun`. Cancellation
 * is expressed as a `cancelToken`: a caller registers a token, and any in-flight execution that
 * sees it aborted rolls back.
 */

const store = new HarmonySnapshotStore();
const validator = new RigCompatibilityValidator();

/**
 * Cancellation tokens, keyed by the id a caller supplies. MCP tool calls are separate
 * invocations, so a token has to outlive one call for cancellation to mean anything.
 */
const cancelTokens = new Map<string, AbortController>();

function tokenFor(id: string | undefined): AbortSignal | undefined {
  if (!id) return undefined;
  if (!cancelTokens.has(id)) cancelTokens.set(id, new AbortController());
  return cancelTokens.get(id)!.signal;
}

/** Loads a scene the caller identified either inline or by scene id + revision. */
function resolveScene(input: { sceneState?: unknown; sceneId?: string; revision?: number }): SimulatedSceneStateV1 {
  if (input.sceneState !== undefined) {
    const parsed = simulatedSceneStateV1Schema.safeParse(input.sceneState);
    if (!parsed.success) throw new MlError('SIMULATOR_STATE_INVALID', `sceneState failed its schema: ${parsed.error.message}`);
    return parsed.data;
  }
  if (input.sceneId === undefined) {
    throw new MlError('SIMULATOR_STATE_INVALID', 'supply either sceneState or sceneId (+ optional revision)');
  }
  const revisions = store.listRevisions(input.sceneId);
  if (revisions.length === 0) throw new MlError('SNAPSHOT_NOT_FOUND', `no stored revisions for scene ${input.sceneId}`);
  const revision = input.revision ?? revisions[revisions.length - 1].revision;
  return store.loadSnapshot(input.sceneId, revision).state;
}

const sceneSelector = {
  sceneState: z.unknown().optional(),
  sceneId: z.string().optional(),
  revision: z.number().int().nonnegative().optional()
};

const mutatingOptions = {
  correlationId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  cancelToken: z.string().optional(),
  dryRun: z.boolean().optional()
};

export const harmonySimulatorTools = [
  {
    name: 'harmony.simulator.list_rigs',
    description: 'Перечисляет доступные rig-фикстуры и поддерживаемые/неподдерживаемые типы команд симулятора.',
    inputSchema: z.object({}),
    handler: async () => ({
      rigs: listRigFixtures(),
      supportedCommandTypes: [...SUPPORTED_COMMAND_TYPES],
      unsupportedCommandTypes: Object.entries(UNSUPPORTED_COMMAND_REASONS).map(([type, reason]) => ({ type, reason })),
      observedExecutionMode: 'simulation',
      isRealHarmonyExecution: false
    })
  },
  {
    name: 'harmony.simulator.validate_rig',
    description: 'Проверяет RigManifestV1 (схема + структурные инварианты) и, при наличии плана, совместимость рига с ним. План с критической несовместимостью не должен исполняться.',
    inputSchema: z.object({
      rigId: z.string().optional(),
      rigManifest: z.unknown().optional(),
      commandPlan: z.unknown().optional()
    }),
    handler: async (args: { rigId?: string; rigManifest?: unknown; commandPlan?: unknown }) => {
      const manifest = args.rigManifest ?? (args.rigId ? loadRigFixtureRaw(args.rigId) : undefined);
      if (manifest === undefined) throw new MlError('RIG_MANIFEST_INVALID', 'supply either rigId or rigManifest');
      if (args.commandPlan === undefined) {
        const { manifest: parsed, findings } = validator.validateManifest(manifest);
        return {
          manifestValid: parsed !== null && findings.every(f => f.severity !== 'error'),
          findings,
          controllerCount: parsed?.controllers.length ?? 0
        };
      }
      const plan = harmonyCommandPlanV5Schema.safeParse(args.commandPlan);
      if (!plan.success) throw new MlError('HARMONY_PLAN_INVALID', `commandPlan failed HarmonyCommandPlanV5: ${plan.error.message}`);
      return validator.validate(manifest, plan.data);
    }
  },
  {
    name: 'harmony.simulator.create_scene',
    description: 'Создаёт начальную симулированную сцену из рига, исполняя детерминированный bootstrap-план.',
    inputSchema: z.object({
      rigId: z.string(),
      sceneId: z.string(),
      frameCount: z.number().int().positive().optional()
    }),
    handler: async (args: { rigId: string; sceneId: string; frameCount?: number }) => {
      const manifest = loadRigFixture(args.rigId);
      const { state, plan } = buildInitialScene(manifest, args.sceneId, { frameCount: args.frameCount });
      return {
        state,
        bootstrapCommandCount: plan.commands.length,
        observedExecutionMode: 'simulation',
        isRealHarmonyExecution: false
      };
    }
  },
  {
    name: 'harmony.simulator.execute_plan',
    description: 'Исполняет HarmonyCommandPlanV5 против симулированной сцены. По умолчанию атомарно: ошибка любой команды откатывает состояние целиком.',
    inputSchema: z.object({
      rigId: z.string(),
      commandPlan: z.unknown(),
      atomic: z.boolean().optional(),
      ...sceneSelector,
      ...mutatingOptions
    }),
    handler: async (args: {
      rigId: string; commandPlan: unknown; atomic?: boolean;
      sceneState?: unknown; sceneId?: string; revision?: number;
      correlationId?: string; idempotencyKey?: string; timeoutMs?: number; cancelToken?: string; dryRun?: boolean;
    }) => {
      const manifest = loadRigFixture(args.rigId);
      const plan = harmonyCommandPlanV5Schema.safeParse(args.commandPlan);
      if (!plan.success) throw new MlError('HARMONY_PLAN_INVALID', `commandPlan failed HarmonyCommandPlanV5: ${plan.error.message}`);

      // The compatibility gate runs first. A plan the rig cannot receive never executes.
      const compatibility = validator.validate(manifest, plan.data);
      if (!compatibility.compatible) {
        return { executed: false, compatibility, result: null, state: null, observedExecutionMode: 'simulation', isRealHarmonyExecution: false };
      }

      const scene = resolveScene(args);
      const simulator = new HarmonyContractSimulator(manifest);
      const { state, result } = simulator.execute(scene, plan.data, {
        mode: args.dryRun ? 'dry_run' : (args.atomic === false ? 'non_atomic' : 'atomic'),
        correlationId: args.correlationId,
        signal: tokenFor(args.cancelToken),
        limits: args.timeoutMs ? { timeoutMs: args.timeoutMs } : undefined
      });
      return { executed: true, compatibility, result, state, observedExecutionMode: 'simulation', isRealHarmonyExecution: false };
    }
  },
  {
    name: 'harmony.simulator.dry_run',
    description: 'Пробное исполнение: возвращает структурный diff предполагаемых изменений, не меняя сохранённое состояние и не увеличивая ревизию.',
    inputSchema: z.object({
      rigId: z.string(),
      commandPlan: z.unknown(),
      ...sceneSelector,
      correlationId: z.string().optional()
    }),
    handler: async (args: { rigId: string; commandPlan: unknown; sceneState?: unknown; sceneId?: string; revision?: number; correlationId?: string }) => {
      const manifest = loadRigFixture(args.rigId);
      const plan = harmonyCommandPlanV5Schema.safeParse(args.commandPlan);
      if (!plan.success) throw new MlError('HARMONY_PLAN_INVALID', `commandPlan failed HarmonyCommandPlanV5: ${plan.error.message}`);

      const scene = resolveScene(args);
      const simulator = new HarmonyContractSimulator(manifest);
      // The diff is produced by a real non-atomic application onto a throwaway copy, then the
      // dry-run result is taken from the untouched scene. Predicting the diff any other way
      // would be a second implementation that could disagree with the first.
      const probe = simulator.execute(scene, plan.data, { mode: 'non_atomic', correlationId: args.correlationId, now: () => 0 });
      const dry = simulator.dryRun(scene, plan.data, { correlationId: args.correlationId });
      return {
        result: dry.result,
        diff: diffScenes(scene, probe.state),
        stateUnchanged: dry.state.contentHash === scene.contentHash && dry.state.revision === scene.revision,
        observedExecutionMode: 'simulation',
        isRealHarmonyExecution: false
      };
    }
  },
  {
    name: 'harmony.simulator.readback',
    description: 'Нормализованный readback сцены: сравним напрямую, не зависит от порядка ключей JSON и временных путей.',
    inputSchema: z.object(sceneSelector),
    handler: async (args: { sceneState?: unknown; sceneId?: string; revision?: number }) => {
      const scene = resolveScene(args);
      const readback = readbackFromState(scene);
      return {
        readback,
        readbackHash: crypto.createHash('sha256').update(JSON.stringify(readback)).digest('hex'),
        observedExecutionMode: 'simulation',
        isRealHarmonyExecution: false
      };
    }
  },
  {
    name: 'harmony.simulator.save_snapshot',
    description: 'Атомарно сохраняет снапшот сцены (временный файл + rename) с контрольной суммой.',
    inputSchema: z.object({ sceneState: z.unknown(), producer: z.string().optional(), correlationId: z.string().optional() }),
    handler: async (args: { sceneState: unknown; producer?: string }) => {
      const scene = resolveScene({ sceneState: args.sceneState });
      const manifest = store.saveSnapshot(scene, { producer: args.producer });
      return { manifest, observedExecutionMode: 'simulation', isRealHarmonyExecution: false };
    }
  },
  {
    name: 'harmony.simulator.load_snapshot',
    description: 'Загружает снапшот с диска с проверкой контрольной суммы и content hash. Повреждённый снапшот не загружается как валидный.',
    inputSchema: z.object({ sceneId: z.string(), revision: z.number().int().nonnegative() }),
    handler: async (args: { sceneId: string; revision: number }) => {
      const { manifest, state } = store.loadSnapshot(args.sceneId, args.revision);
      return { manifest, state, observedExecutionMode: 'simulation', isRealHarmonyExecution: false };
    }
  },
  {
    name: 'harmony.simulator.list_revisions',
    description: 'Список сохранённых ревизий сцены.',
    inputSchema: z.object({ sceneId: z.string() }),
    handler: async (args: { sceneId: string }) => ({ revisions: store.listRevisions(args.sceneId) })
  },
  {
    name: 'harmony.simulator.compare_revisions',
    description: 'Сравнивает две сохранённые ревизии сцены и возвращает структурный diff.',
    inputSchema: z.object({
      sceneId: z.string(),
      from: z.number().int().nonnegative(),
      to: z.number().int().nonnegative(),
      tolerance: z.number().nonnegative().optional()
    }),
    handler: async (args: { sceneId: string; from: number; to: number; tolerance?: number }) => {
      const summary = store.compareRevisions(args.sceneId, args.from, args.to);
      const before = store.loadSnapshot(args.sceneId, args.from).state;
      const after = store.loadSnapshot(args.sceneId, args.to).state;
      return { summary, diff: diffScenes(before, after, { tolerance: args.tolerance }) };
    }
  },
  {
    name: 'harmony.simulator.rollback',
    description: 'Возвращает состояние сцены на указанную ревизию. История не удаляется, поэтому откат сам по себе обратим.',
    inputSchema: z.object({ sceneId: z.string(), revision: z.number().int().nonnegative(), correlationId: z.string().optional() }),
    handler: async (args: { sceneId: string; revision: number }) => {
      const state = store.rollbackToRevision(args.sceneId, args.revision);
      return { state, restoredRevision: args.revision, observedExecutionMode: 'simulation', isRealHarmonyExecution: false };
    }
  },
  {
    name: 'harmony.simulator.structural_qa',
    description: 'Структурный offline QA. Это НЕ визуальный и не художественный критик: он проверяет граф, ключи, лимиты и диапазоны, и ничего не видит.',
    inputSchema: z.object({
      rigId: z.string(),
      ...sceneSelector,
      thresholds: z.record(z.number()).optional()
    }),
    handler: async (args: { rigId: string; sceneState?: unknown; sceneId?: string; revision?: number; thresholds?: Record<string, number> }) => {
      const manifest = loadRigFixture(args.rigId);
      const scene = resolveScene(args);
      return runStructuralOfflineQa(scene, manifest, args.thresholds ?? {});
    }
  },
  {
    name: 'harmony.simulator.cancel',
    description: 'Помечает cancellation token отменённым. Исполнение, увидевшее отменённый токен, откатывается в атомарном режиме.',
    inputSchema: z.object({ cancelToken: z.string() }),
    handler: async (args: { cancelToken: string }) => {
      const controller = cancelTokens.get(args.cancelToken) ?? new AbortController();
      cancelTokens.set(args.cancelToken, controller);
      controller.abort();
      return { cancelToken: args.cancelToken, cancelled: true };
    }
  },
  {
    name: 'harmony.simulator.get_evidence',
    description: 'Возвращает статус доказательной базы round-trip: какие артефакты созданы, их SHA-256 и уровень верификации.',
    inputSchema: z.object({ runId: z.string().optional() }),
    handler: async (args: { runId?: string }) => {
      const { readEvidenceIndex } = await import('../services/harmonySimulatorEvidence/index.js');
      return readEvidenceIndex(args.runId);
    }
  }
];
