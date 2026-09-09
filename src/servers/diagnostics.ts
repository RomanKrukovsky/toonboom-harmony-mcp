import fs from 'fs';
import { z } from 'zod';
import { config } from '../config.js';
import { MohoRenderManager } from '../services/mohoRenderManager/index.js';
import type { McpTool } from './server.js';

export function diagnosticTool(engine: 'moho' | 'harmony'): McpTool {
  return {
    name: `${engine}.system.status`,
    description: 'Report executable discovery and isolated storage. Discovery does not verify a license, scene execution or production readiness.',
    inputSchema: z.object({}).strict(),
    handler: async () => {
      const executable = engine === 'moho' ? MohoRenderManager.detectMohoExecutable() : config.harmonyBin;
      return {
        engine, executable: executable || null,
        installed: Boolean(executable && fs.existsSync(executable)),
        runtimeVerification: 'not_executed', productionCertified: false,
        factoryRoot: process.env.MCP_FACTORY_ROOT ?? null,
        outputRoot: process.env.MCP_OUTPUT_ROOT ?? null,
        profile: process.env.MCP_TOOL_PROFILE ?? 'production'
      };
    }
  };
}
