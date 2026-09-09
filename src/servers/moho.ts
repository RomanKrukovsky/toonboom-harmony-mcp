import { mohoProductionV3Tools } from '../tools/mohoProductionV3Tools.js';
import { mohoShowBibleTools } from '../tools/mohoShowBibleTools.js';
import { mohoCharacterAssetPackTools } from '../tools/mohoCharacterAssetPackTools.js';
import {
  mohoActionSolveCombatTool,
  mohoRigSynthesizeTurnaroundTool
} from '../tools/combatAndTurnaroundTools.js';
import { mohoAutomationExpansionTools } from '../tools/mohoAutomationExpansionTools.js';
import { diagnosticTool } from './diagnostics.js';
import { serveEngine } from './server.js';

const profile = process.env.MCP_TOOL_PROFILE ?? 'production';
if (!['production', 'compatibility'].includes(profile)) throw new Error(`Unsupported Moho profile: ${profile}`);
// v3 names are retained: existing clients do not need a synthetic rename layer.
await serveEngine('moho', [
  diagnosticTool('moho'),
  ...mohoProductionV3Tools,
  ...mohoShowBibleTools,
  ...mohoCharacterAssetPackTools,
  mohoActionSolveCombatTool,
  mohoRigSynthesizeTurnaroundTool,
  ...mohoAutomationExpansionTools
], profile);
