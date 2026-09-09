import { animateTools } from '../tools/animateTools.js';
import { diagnosticTool } from './diagnostics.js';
import { selectTools, serveEngine } from './server.js';

const profile = process.env.MCP_TOOL_PROFILE ?? 'production';
if (!['production', 'advanced'].includes(profile)) {
  throw new Error(`Unsupported Animate profile: ${profile}`);
}

const coreToolNames = [
  'animate_system_status',
  'animate_get_version',
  'animate_get_capabilities',
  'animate_ping',
  'animate_get_active_document',
  'animate_create_document',
  'animate_open_document',
  'animate_inspect_document',
  'animate_save_document',
  'animate_save_as_document',
  'animate_close_document',
  'animate_create_layer',
  'animate_list_layers',
  'animate_insert_keyframe',
  'animate_list_library_items',
  'animate_create_symbol',
  'animate_add_library_item_to_stage',
  'animate_create_shape',
  'animate_create_text',
  'animate_create_tween',
  'animate_import_audio',
  'animate_place_audio',
  'animate_export_image',
  'animate_export_video'
];

const production = [
  diagnosticTool('animate'),
  ...selectTools(animateTools, coreToolNames)
];

await serveEngine(
  'animate',
  profile === 'production' ? production : [diagnosticTool('animate'), ...animateTools],
  profile
);
