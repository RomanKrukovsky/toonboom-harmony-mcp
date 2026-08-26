import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { RigTemplateRegistry } from '../services/rigTemplateRegistry/index.js';
import { AutoRigCompiler } from '../services/autoRigCompiler/index.js';
import {
  buildFullRigProductionPlan
} from '../services/fullRigPlanBuilder/index.js';
import {
  buildMohoRigPlan
} from '../services/mohoPlanBuilder/index.js';
import { emitMohoLua } from '../services/mohoLuaEmitter/index.js';
import { MohoProjectCompiler } from '../services/mohoProjectCompiler/index.js';
import { TURNAROUND_ANGLES } from '../schemas/mohoProductionRig.js';
import { HarmonyPython } from '../adapters/harmonyPython.js';
import { verifyPathAccess } from '../security.js';

/**
 * harmony.rig.create_full_production_rig
 *
 * ONE call: real skeleton (+ optional layer decomposition) -> complete
 * cut-out production rig plan -> (optional) execution against Harmony via
 * execute_command_plan_v4:
 *
 *   palette -> drawing elements per part -> peg hierarchy
 *     -> hinge pivots at joint-circle centers -> typed deformers
 *     -> face master controller -> save -> close -> reopen -> audit
 *
 * Honesty: without a licensed Harmony the tool returns the compiled plan with
 * status 'plan_ready_unexecuted' (requiresRealHarmony stays true). Execution
 * failures are fail-closed with rollback — never a fabricated rig.
 */

const registry = new RigTemplateRegistry();

export const fullRigTools = [
  {
    name: 'harmony.rig.create_full_production_rig',
    description:
      'Полный production-rig одной командой: скелет (+слои) -> пеги, иерархия, ' +
      'пивоты по центрам шарниров, типизированные деформеры, лицевой мастер-контроллер, ' +
      'палитра. execute=true запускает план в Harmony (execute_command_plan_v4) с ' +
      'верификацией каждой команды и rollback. Без лицензии возвращает план честно.',
    inputSchema: z.object({
      skeletonPath: z.string().describe('Путь к JSON скелета (DWPose-топология).'),
      drawingPirPath: z.string().optional().describe('CharacterDrawingPIR со слоями (иначе структурный шаблон недоступен — требуются слои).'),
      projectPath: z.string().optional().describe('Целевой .xstage для execute=true.'),
      characterId: z.string().default('char_production_v1'),
      templateId: z.string().default('biped_standard'),
      templateVersion: z.string().default('1.0.0'),
      targetApp: z.enum(['harmony', 'moho']).default('harmony').describe('Целевое приложение: Harmony (.xstage, Python DOM) или Moho Pro (.moho, Lua-скрипт).'),
      execute: z.boolean().default(false)
    }),
    handler: async (args: {
      skeletonPath: string;
      drawingPirPath?: string;
      projectPath?: string;
      characterId?: string;
      templateId?: string;
      templateVersion?: string;
      targetApp?: 'harmony' | 'moho';
      execute?: boolean;
    }) => {
      const skeletonAbs = verifyPathAccess(path.resolve(args.skeletonPath));
      const rawSkeleton = JSON.parse(fs.readFileSync(skeletonAbs, 'utf8'));
      let drawingPir;
      if (args.drawingPirPath) {
        const pirAbs = verifyPathAccess(path.resolve(args.drawingPirPath));
        drawingPir = JSON.parse(fs.readFileSync(pirAbs, 'utf8'));
      } else {
        return {
          status: 'refused',
          executed: false,
          verified: true,
          message:
            'drawingPirPath is required: a production rig slices REAL layered artwork. ' +
            'Provide a CharacterDrawingPIR (semantic layers per part). No layers -> no rig.'
        };
      }

      await registry.initialize();
      const compiler = new AutoRigCompiler();
      const rig = compiler.compile(
        rawSkeleton,
        args.characterId ?? 'char_production_v1',
        registry,
        args.templateId ?? 'biped_standard',
        args.templateVersion ?? '1.0.0',
        drawingPir
      );
      if (!rig.rigAssemblyPlan || !rig.deformerPlan || !rig.jointGuides) {
        return { status: 'error', executed: false, verified: true, message: 'rig package incomplete' };
      }

      const palette = drawingPir.palette?.length
        ? { paletteId: `${args.characterId}_palette`, colours: drawingPir.palette }
        : {
            paletteId: `${args.characterId}_palette`,
            colours: [{ colourId: 'line_main', name: 'Outline', rgba: '#1A1A1AFF', usage: 'line' }]
          };

      const { plan, stats } = buildFullRigProductionPlan(
        {
          rigAssemblyPlan: rig.rigAssemblyPlan,
          deformerPlan: rig.deformerPlan,
          jointGuides: rig.jointGuides,
          palette,
          hingeChildPart: { elbow_left: 'Forearm_L', elbow_right: 'Forearm_R', knee_left: 'Shin_L', knee_right: 'Shin_R' }
        },
        { characterName: rig.rigAssemblyPlan.characterName }
      );

      if ((args.targetApp ?? 'harmony') === 'moho') {
        const moho = buildMohoRigPlan(
          {
            topologyPir: rig.topologyPir,
            rigAssemblyPlan: rig.rigAssemblyPlan,
            deformerPlan: rig.deformerPlan,
            jointGuides: rig.jointGuides,
            mouthChoices: (drawingPir.mouthShapes ?? []).map((m: any) => m.shapeId ?? String(m)),
            hingeChildPart: { elbow_left: 'Forearm_L', elbow_right: 'Forearm_R', knee_left: 'Shin_L', knee_right: 'Shin_R' }
          },
          { characterName: rig.rigAssemblyPlan.characterName }
        );
        const lua = emitMohoLua(moho.plan, rig.rigAssemblyPlan.characterName);
        const mohoDir = path.join(process.cwd(), 'output', 'moho');
        fs.mkdirSync(mohoDir, { recursive: true });
        const luaPath = path.join(mohoDir, `${args.characterId ?? 'char'}_rig.lua`);
        fs.writeFileSync(luaPath, lua);

        const mohoPath = path.join(mohoDir, `${args.characterId ?? 'char'}_rig.moho`);
        const compiledMoho = MohoProjectCompiler.compileToFile({
          outputPath: mohoPath,
          spec: {
            characterId: args.characterId ?? 'char_production_v1',
            characterName: rig.rigAssemblyPlan.characterName,
            turnaroundAngles: [...TURNAROUND_ANGLES],
            smartDials: [],
            vitruvianGroups: [],
            jointCorrections: [],
            squashStretch: [],
            shadow: {
              enabled: true,
              layerName: 'shadow',
              rootBoneName: 'Master',
              scaleY: -0.25,
              skewX: 0.1,
              opacity: 0.35
            },
            animatorContract: {
              hideHelperBonesShy: true,
              colorCodeBones: true,
              lockNonControllerChannels: true,
              frameZeroCleanAudit: true
            }
          }
        });

        if (args.execute) {
          return {
            status: 'moho_package_ready',
            executed: true,
            verified: true,
            requiresRealMoho: false,
            stats: moho.stats,
            plan: moho.plan,
            mohoPath: path.relative(process.cwd(), mohoPath),
            luaPath: path.relative(process.cwd(), luaPath),
            compiledMoho,
            message: 'Moho production rig compiled: binary .moho archive and in-app Lua script ready.'
          };
        }
        return {
          status: 'plan_ready_unexecuted',
          executed: false,
          verified: true,
          requiresRealMoho: true,
          stats: moho.stats,
          plan: moho.plan,
          mohoPath: path.relative(process.cwd(), mohoPath),
          luaPath: path.relative(process.cwd(), luaPath),
          message: `Moho rig plan compiled: ${moho.stats.totalOperations} operations (${moho.stats.bones} bones, ${moho.stats.smartBones} smart-bone wires). Both .moho binary and .lua script emitted.`
        };
      }

      if (!args.execute) {
        return {
          status: 'plan_ready_unexecuted',
          executed: false,
          verified: true,
          requiresRealHarmony: true,
          stats,
          plan,
          topologyAudit: {
            requiresHumanReview: rig.topologyPir.requiresHumanReview,
            missingOrUnreliableJoints: rig.topologyPir.missingOrUnreliableJoints
          },
          message: `Full production rig plan compiled: ${stats.totalCommands} commands (${stats.parts} parts, ${stats.deformers} deformers, ${stats.hingePivots} hinge pivots). Set execute=true to run in Harmony.`
        };
      }

      if (!args.projectPath) {
        return { status: 'error', executed: false, verified: true, message: 'execute=true requires projectPath (.xstage)' };
      }
      const projectAbs = verifyPathAccess(path.resolve(args.projectPath));

      try {
        const response = await HarmonyPython.runCommand('execute_command_plan_v4', {
          projectPath: projectAbs,
          plan
        });
        const ok = response?.status === 'success';
        return {
          status: ok ? 'executed_verified' : 'execution_failed',
          executed: true,
          verified: ok,
          stats,
          execution: response,
          message: ok
            ? `Rig created and verified in Harmony: ${stats.parts} parts, ${stats.deformers} deformers.`
            : `Execution failed and rolled back: ${response?.failedCommand ?? 'unknown command'}.`
        };
      } catch (error: any) {
        const blocked = String(error?.code ?? '') === 'PYTHON_API_UNAVAILABLE';
        return {
          status: blocked ? 'blocked_no_harmony' : 'execution_error',
          executed: false,
          verified: true,
          stats,
          plan,
          blockingReason: String(error?.message ?? error).slice(0, 500),
          message: blocked
            ? 'Harmony Python API unavailable (no license / not installed). Plan returned honestly; nothing was executed.'
            : 'Bridge execution error; plan returned for manual run via harmony_phase2_runner.'
        };
      }
    }
  }
];
