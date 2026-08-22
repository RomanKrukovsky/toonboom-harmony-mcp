import { z } from 'zod';
import { createStandardExecutionResult } from '../schemas/executionResult.js';
import { RenderOutputValidator } from '../adapters/renderValidator/index.js';
import { defineTool } from './defineTool.js';
export const renderFarmTools = [
    defineTool({
        name: 'harmony.render.preview',
        description: 'Сгенерировать быстрый preview-рендер сцены.',
        inputSchema: z.object({ projectPath: z.string(), frame: z.number().default(1), outputPath: z.string().optional() }),
        handler: async (args) => {
            const out = args.outputPath || `${args.projectPath}_preview.mp4`;
            return createStandardExecutionResult({
                status: 'simulation_success',
                simulated: true,
                placeholder: true,
                details: { projectPath: args.projectPath, outputPath: out }
            });
        }
    }),
    defineTool({
        name: 'harmony.render.final',
        description: 'Запустить финальный рендер сцены в полном качестве.',
        inputSchema: z.object({ projectPath: z.string(), outputPath: z.string() }),
        handler: async (args) => {
            return createStandardExecutionResult({
                status: 'simulation_success',
                simulated: true,
                placeholder: true,
                details: { projectPath: args.projectPath, outputPath: args.outputPath }
            });
        }
    }),
    defineTool({
        name: 'harmony.render.sequence',
        description: 'Отрендерить последовательность кадров (PNG/EXR sequence).',
        inputSchema: z.object({ projectPath: z.string(), outputDir: z.string() }),
        handler: async (args) => {
            return createStandardExecutionResult({
                status: 'simulation_success',
                simulated: true,
                placeholder: true,
                details: { projectPath: args.projectPath, outputDir: args.outputDir }
            });
        }
    }),
    defineTool({
        name: 'harmony.render.enqueue',
        description: 'Поставить сцену в очередь распределенной рендер-фермы (Deadline/OpenCue).',
        inputSchema: z.object({ projectPath: z.string(), priority: z.number().default(50) }),
        handler: async (args) => {
            return createStandardExecutionResult({
                simulated: true,
                placeholder: true,
                details: { jobId: `job_${Date.now()}`, projectPath: args.projectPath, priority: args.priority }
            });
        }
    }),
    defineTool({
        name: 'harmony.render.status',
        description: 'Получить статус задачи рендеринга.',
        inputSchema: z.object({ jobId: z.string() }),
        handler: async (args) => {
            return createStandardExecutionResult({
                simulated: true,
                placeholder: true,
                details: { jobId: args.jobId, progress: 100, status: 'completed' }
            });
        }
    }),
    defineTool({
        name: 'harmony.render.cancel',
        description: 'Отменить рендеринг.',
        inputSchema: z.object({ jobId: z.string() }),
        handler: async (args) => {
            return createStandardExecutionResult({
                simulated: true,
                placeholder: true,
                details: { jobId: args.jobId, cancelled: true }
            });
        }
    }),
    defineTool({
        name: 'harmony.render.retry',
        description: 'Повторить упавшую задачу рендеринга.',
        inputSchema: z.object({ jobId: z.string() }),
        handler: async (args) => {
            return createStandardExecutionResult({
                simulated: true,
                placeholder: true,
                details: { jobId: args.jobId, retried: true }
            });
        }
    }),
    defineTool({
        name: 'harmony.render.validate_output',
        description: 'Проверить валидность сгенерированного видеофайла или последовательности кадров.',
        inputSchema: z.object({ filePath: z.string() }),
        handler: async (args) => {
            const validator = new RenderOutputValidator();
            const res = validator.validate(args.filePath, 'harmony_cli');
            return createStandardExecutionResult({
                status: res.fileExists && res.fileSizeBytes > 0 ? 'success' : 'failed',
                details: res
            });
        }
    }),
    defineTool({
        name: 'harmony.render.build_delivery',
        description: 'Собрать финальный пакет материалов для сдачи заказчику (Delivery Package).',
        inputSchema: z.object({ packageDir: z.string() }),
        handler: async (args) => {
            return createStandardExecutionResult({
                simulated: true,
                placeholder: true,
                details: { deliveryZipPath: `${args.packageDir}/delivery/final_episode_delivery.zip` }
            });
        }
    })
];
