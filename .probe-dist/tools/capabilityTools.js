import { z } from 'zod';
import { CapabilityRegistry } from '../services/capabilityRegistry/index.js';
import { createStandardExecutionResult } from '../schemas/executionResult.js';
import { defineTool } from './defineTool.js';
export const capabilityTools = [
    defineTool({
        name: 'harmony.capabilities.detect',
        description: 'Detect installed Harmony version, available backends (Python, CLI, Control Center), and supported operations.',
        inputSchema: z.object({}),
        handler: async () => {
            const reg = new CapabilityRegistry();
            const caps = await reg.detectCapabilities();
            return createStandardExecutionResult({
                isRealHarmonyExecution: caps.isHarmonyInstalled,
                status: caps.isHarmonyInstalled ? 'success' : 'simulation_success',
                details: caps
            });
        }
    }),
    defineTool({
        name: 'harmony.capabilities.probe',
        description: 'Probe specific Harmony project path to check project version, session availability, and drawing access.',
        inputSchema: z.object({
            projectPath: z.string().describe('Path to Harmony .xstage project file')
        }),
        handler: async (args) => {
            const reg = new CapabilityRegistry();
            const caps = await reg.detectCapabilities();
            return createStandardExecutionResult({
                isRealHarmonyExecution: caps.isHarmonyInstalled,
                status: caps.isHarmonyInstalled ? 'success' : 'simulation_success',
                details: {
                    projectPath: args.projectPath,
                    caps
                }
            });
        }
    }),
    defineTool({
        name: 'harmony.capabilities.verify_operation',
        description: 'Verify capability status for a target operation (verified, experimental, simulated, unsupported).',
        inputSchema: z.object({
            operation: z.string().describe('Operation name, e.g. import_image_as_drawing, create_master_controllers')
        }),
        handler: async (args) => {
            const reg = new CapabilityRegistry();
            const status = reg.getOperationStatus(args.operation);
            return createStandardExecutionResult({
                status: 'success',
                details: {
                    operation: args.operation,
                    capabilityStatus: status
                }
            });
        }
    }),
    defineTool({
        name: 'harmony.capabilities.get_matrix',
        description: 'Return full capability matrix of Harmony MCP Server.',
        inputSchema: z.object({}),
        handler: async () => {
            const reg = new CapabilityRegistry();
            const caps = await reg.detectCapabilities();
            return createStandardExecutionResult({
                status: 'success',
                details: { matrix: caps.matrix }
            });
        }
    })
];
