import { sceneTools } from '../tools/sceneTools.js';
import { reconstructionTools } from '../tools/reconstructionTools.js';
import { harmonyNativePhase2Tools } from '../tools/harmonyNativePhase2Tools.js';
import { harmonyActionRecorderTools } from '../tools/harmonyActionRecorderTools.js';
import {
  harmonyActionSolveCombatTool,
  harmonyRig360SynthesizeTurnaroundTool
} from '../tools/combatAndTurnaroundTools.js';
import { diagnosticTool } from './diagnostics.js';
import { selectTools, serveEngine } from './server.js';

const profile = process.env.MCP_TOOL_PROFILE ?? 'production';
if (!['production', 'advanced'].includes(profile)) throw new Error(`Unsupported Harmony profile: ${profile}`);
const production = [
  diagnosticTool('harmony'),
  ...harmonyNativePhase2Tools,
  ...selectTools(sceneTools, [
    'harmony.scene.open_project',
    'harmony.scene.inspect',
    'harmony.scene.list_nodes',
    'harmony.scene.save'
  ]),
  ...selectTools(reconstructionTools, [
    'harmony.reconstruct.health',
    'harmony.reconstruct.apply_manifest',
    'harmony.reconstruct.get_job',
    'harmony.reconstruct.cancel_job',
    'harmony.reconstruct.get_problem_frames'
  ]),
  ...harmonyActionRecorderTools,
  harmonyActionSolveCombatTool,
  harmonyRig360SynthesizeTurnaroundTool
];

await serveEngine('harmony', profile === 'production' ? production : [
  diagnosticTool('harmony'),
  ...sceneTools,
  ...reconstructionTools,
  ...harmonyNativePhase2Tools,
  ...harmonyActionRecorderTools,
  harmonyActionSolveCombatTool,
  harmonyRig360SynthesizeTurnaroundTool
], profile);
