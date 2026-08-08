import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { systemTools } from './tools/systemTools.js';
import { controlCenterTools } from './tools/controlCenterTools.js';
import { sceneTools } from './tools/sceneTools.js';
import { renderTools } from './tools/renderTools.js';
import { assetTools } from './tools/assetTools.js';
import { workflowTools } from './tools/workflowTools.js';
import { nodeTools } from './tools/nodeTools.js';
import { timelineTools } from './tools/timelineTools.js';
import { drawingTools } from './tools/drawingTools.js';
import { paletteTools } from './tools/paletteTools.js';
import { rigTools } from './tools/rigTools.js';
import { lipsyncTools } from './tools/lipsyncTools.js';
import { bridgeTools } from './tools/bridgeTools.js';
import { blenderTools } from './tools/blenderTools.js';
import { productionTools } from './tools/productionTools.js';
import { auditTools } from './tools/auditTools.js';
import { uiOperatorTools } from './tools/uiOperatorTools.js';
import { autopilotTools } from './tools/autopilotTools.js';
import { templateTools } from './tools/templateTools.js';
import { sceneAssemblyTools } from './tools/sceneAssemblyTools.js';
import { commercialWorkflowTools } from './tools/commercialWorkflowTools.js';
import { plannerTools } from './tools/plannerTools.js';
import { studioTools } from './tools/studioTools.js';
import { animationBlockingTools } from './tools/animationBlockingTools.js';
import { onePromptTools } from './tools/onePromptTools.js';
import { seriesTools } from './tools/seriesTools.js';
import { characterGenerationTools } from './tools/characterGenerationTools.js';
import { rig360GenerationTools } from './tools/rig360GenerationTools.js';
import { actingTools } from './tools/actingTools.js';
import { episodeAssemblyTools } from './tools/episodeAssemblyTools.js';
import { qualityDirectorTools } from './tools/qualityDirectorTools.js';
import { promptToSceneTools } from './tools/promptToSceneTools.js';
import { reviewLoopTools } from './tools/reviewLoopTools.js';
import { reconstructionTools } from './tools/reconstructionTools.js';
import { aiStudioTools } from './tools/aiStudioTools.js';
import { retargetingTools } from './tools/retargetingTools.js';
import { factoryFoundationTools } from './tools/factoryFoundationTools.js';
import { factoryCompilerTools } from './tools/factoryCompilerTools.js';
import { harmonyNativePhase2Tools } from './tools/harmonyNativePhase2Tools.js';
import { mlTools } from './tools/mlTools.js';

import { capabilityTools } from './tools/capabilityTools.js';
import { autonomousStudioTools } from './tools/autonomousStudioTools.js';
import { creativeTools } from './tools/creativeTools.js';
import { scriptTools } from './tools/scriptTools.js';
import { storyboardTools } from './tools/storyboardTools.js';
import { assetRegistryTools } from './tools/assetRegistryTools.js';
import { styleTools } from './tools/styleTools.js';
import { riggingEngineTools } from './tools/riggingEngineTools.js';
import { actingEngineTools } from './tools/actingEngineTools.js';
import { audioEngineTools } from './tools/audioEngineTools.js';
import { layoutCameraTools } from './tools/layoutCameraTools.js';
import { fxCompositingTools } from './tools/fxCompositingTools.js';
import { renderFarmTools } from './tools/renderFarmTools.js';
import { qualityEngineTools } from './tools/qualityEngineTools.js';
import { modelRouterTools } from './tools/modelRouterTools.js';
import { productionMemoryTools } from './tools/productionMemoryTools.js';
import { approvalTools } from './tools/approvalTools.js';
import { legalTools } from './tools/legalTools.js';
import { systemHealthTools } from './tools/systemHealthTools.js';
import { vectorizationTools } from './tools/vectorizationTools.js';
import { studioPackageTools } from './tools/studioPackageTools.js';
import { harmonyActionRecorderTools } from './tools/harmonyActionRecorderTools.js';

import { resources } from './resources.js';
import { prompts } from './prompts.js';
import { HarmonyError } from './security.js';
import { activeHost, HOST_ENV_VAR } from './hostProfile.js';
// Импортируется статически намеренно: registry.ts тянет только toolNames.ts
// (карту имён без зависимостей) и НЕ тянет IPC-клиент или конфиг Moho,
// поэтому ленивость Moho-моста сохраняется. Проверено запуском: сломанный
// mohoTools.js не мешает старту в режиме harmony.
import { MohoToolError } from './moho/registry.js';
import type { TypedTool } from './tools/defineTool.js';
import type { z } from 'zod';

const harmonyTools = [
  ...harmonyActionRecorderTools,
  ...vectorizationTools,
  ...studioPackageTools,
  ...systemTools,
  ...controlCenterTools,
  ...sceneTools,
  ...renderTools,
  ...assetTools,
  ...workflowTools,
  ...nodeTools,
  ...timelineTools,
  ...drawingTools,
  ...paletteTools,
  ...rigTools,
  ...lipsyncTools,
  ...bridgeTools,
  ...blenderTools,
  ...productionTools,
  ...auditTools,
  ...uiOperatorTools,
  ...autopilotTools,
  ...templateTools,
  ...sceneAssemblyTools,
  ...commercialWorkflowTools,
  ...plannerTools,
  ...studioTools,
  ...animationBlockingTools,
  ...onePromptTools,
  ...seriesTools,
  ...characterGenerationTools,
  ...rig360GenerationTools,
  ...actingTools,
  ...episodeAssemblyTools,
  ...qualityDirectorTools,
  ...promptToSceneTools,
  ...reviewLoopTools,
  ...reconstructionTools,
  ...aiStudioTools,
  ...retargetingTools,
  ...factoryFoundationTools,
  ...factoryCompilerTools,
  ...harmonyNativePhase2Tools,
  ...mlTools,
  ...capabilityTools,
  ...autonomousStudioTools,
  ...creativeTools,
  ...scriptTools,
  ...storyboardTools,
  ...assetRegistryTools,
  ...styleTools,
  ...riggingEngineTools,
  ...actingEngineTools,
  ...audioEngineTools,
  ...layoutCameraTools,
  ...fxCompositingTools,
  ...renderFarmTools,
  ...qualityEngineTools,
  ...modelRouterTools,
  ...productionMemoryTools,
  ...approvalTools,
  ...legalTools,
  ...systemHealthTools
];

/**
 * Набор тулов активного хоста.
 *
 * Сервер обслуживает два пакета анимации, но НИКОГДА оба сразу: 561 тул
 * Harmony и 59 тулов Moho вместе дают 620 описаний, которые уходят в контекст
 * модели при каждом запуске и ухудшают выбор тула. Человек работает либо в
 * Moho, либо в Harmony, поэтому активный хост фиксируется на старте
 * переменной ANIM_HOST (см. src/hostProfile.ts).
 *
 * Moho-мост подключается ЛЕНИВО, динамическим import внутри ветки: его модули
 * создают IPC-клиент и читают собственный конфиг, и при ANIM_HOST=harmony
 * этого не должно происходить вовсе. Поэтому функция асинхронная — статический
 * импорт затащил бы Moho в каждый запуск Harmony-сервера.
 */
async function resolveActiveTools(): Promise<TypedTool<z.ZodTypeAny>[]> {
  const host = activeHost();
  if (host === 'harmony') return harmonyTools as unknown as TypedTool<z.ZodTypeAny>[];

  const { buildMohoTools } = await import('./moho/mohoTools.js');
  return buildMohoTools();
}

function zodFieldToJsonSchema(schema: any): any {
  const description = schema.description;
  const typeName = schema?._def?.typeName;
  if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
    return { ...zodFieldToJsonSchema(schema._def.innerType), ...(description ? { description } : {}) };
  }
  if (typeName === 'ZodDefault') {
    return {
      ...zodFieldToJsonSchema(schema._def.innerType),
      default: schema._def.defaultValue(),
      ...(description ? { description } : {})
    };
  }
  if (typeName === 'ZodEffects') {
    return { ...zodFieldToJsonSchema(schema._def.schema), ...(description ? { description } : {}) };
  }
  if (typeName === 'ZodString') return { type: 'string', ...(description ? { description } : {}) };
  if (typeName === 'ZodNumber') return { type: 'number', ...(description ? { description } : {}) };
  if (typeName === 'ZodBoolean') return { type: 'boolean', ...(description ? { description } : {}) };
  if (typeName === 'ZodEnum') return { type: 'string', enum: schema._def.values, ...(description ? { description } : {}) };
  if (typeName === 'ZodLiteral') return { const: schema._def.value, ...(description ? { description } : {}) };
  if (typeName === 'ZodArray') return { type: 'array', items: zodFieldToJsonSchema(schema._def.type), ...(description ? { description } : {}) };
  if (typeName === 'ZodUnion' || typeName === 'ZodDiscriminatedUnion') {
    const options: any[] = Array.from(schema._def.options?.values?.() ?? schema._def.options ?? []);
    return { anyOf: options.map((opt: any) => zodFieldToJsonSchema(opt)), ...(description ? { description } : {}) };
  }
  if (typeName === 'ZodRecord') {
    return {
      type: 'object',
      additionalProperties: schema._def.valueType ? zodFieldToJsonSchema(schema._def.valueType) : true,
      ...(description ? { description } : {})
    };
  }
  if (typeName === 'ZodAny' || typeName === 'ZodUnknown') {
    // Без ограничения типа: {} принимает любое значение (честнее, чем 'string').
    return { ...(description ? { description } : {}) };
  }
  if (typeName === 'ZodNull') return { type: 'null', ...(description ? { description } : {}) };
  if (typeName === 'ZodObject') {
    const shape = schema.shape as Record<string, any>;
    return {
      type: 'object',
      properties: Object.fromEntries(Object.entries(shape).map(([key, value]) => [key, zodFieldToJsonSchema(value)])),
      required: Object.keys(shape).filter(key => !shape[key].isOptional()),
      additionalProperties: false,
      ...(description ? { description } : {})
    };
  }
  return { type: 'string', ...(description ? { description } : {}) };
}

class HarmonyMcpServer {
  private server: Server;

  /**
   * Тулы активного хоста. Заполняется в run() до подключения транспорта:
   * набор Moho грузится динамическим import, а конструктор синхронный.
   */
  private tools: TypedTool<z.ZodTypeAny>[] = [];

  constructor() {
    this.server = new Server(
      {
        name: 'toonboom-harmony-mcp',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // 1. Получение списка доступных инструментов (Tools)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: zodFieldToJsonSchema(t.inputSchema)
        }))
      };
    });

    // 2. Вызов конкретного инструмента (Call Tool)
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = this.tools.find(t => t.name === request.params.name);
      if (!tool) {
        return {
          content: [{ type: 'text', text: `Инструмент не найден: ${request.params.name}` }],
          isError: true
        };
      }

      try {
        const parsedArgs = tool.inputSchema.safeParse(request.params.arguments);
        if (!parsedArgs.success) {
          return {
            content: [{ type: 'text', text: `Некорректные параметры вызова: ${parsedArgs.error.message}` }],
            isError: true
          };
        }

        // Each tool carries its own inferred arg type, so across the whole
        // registry `handler`'s parameter narrows to `never`. Dispatch is
        // inherently dynamic: the payload was just validated against this
        // tool's own inputSchema by safeParse above, so it matches by
        // construction.
        const result = await (tool.handler as (args: unknown) => Promise<unknown>)(parsedArgs.data);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error: any) {
        // Код и детали умеют нести оба типа ошибок: HarmonyError и MohoToolError
        // (последний восстанавливается из ответа Moho-тула, см. src/moho/registry.ts).
        // Проверять только HarmonyError означало бы терять код ошибки Moho —
        // клиент получал бы UNKNOWN_ERROR вместо, например, таймаута IPC, и по
        // ответу нельзя было бы отличить «Moho не отвечает» от настоящего сбоя.
        const typed = error instanceof HarmonyError || error instanceof MohoToolError;
        const errObj = {
          error: true,
          code: typed ? error.code : 'UNKNOWN_ERROR',
          message: error.message || 'Произошла непредвиденная ошибка.',
          details: typed ? error.details : undefined
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(errObj, null, 2)
            }
          ],
          isError: true
        };
      }
    });

    // 3. Получение списка доступных ресурсов (Resources)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: resources.map(r => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType
        }))
      };
    });

    // 4. Чтение содержимого ресурса
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const resource = resources.find(r => r.uri === request.params.uri);
      if (!resource) {
        throw new Error(`Ресурс не найден: ${request.params.uri}`);
      }

      const content = await resource.read();
      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: content
          }
        ]
      };
    });

    // 5. Получение списка шаблонов подсказок (Prompts)
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: prompts.map(p => ({
          name: p.name,
          description: p.description,
          arguments: p.arguments
        }))
      };
    });

    // 6. Получение текста конкретной подсказки
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const prompt = prompts.find(p => p.name === request.params.name);
      if (!prompt) {
        throw new Error(`Шаблон подсказки не найден: ${request.params.name}`);
      }

      const compiledMessages = prompt.messages(request.params.arguments || {});
      return {
        messages: compiledMessages
      };
    });
  }

  async run() {
    // Набор тулов выбирается ДО подключения транспорта: клиент запрашивает
    // список сразу после рукопожатия, и пустой список означал бы сервер без
    // единого тула.
    this.tools = await resolveActiveTools();

    const host = activeHost();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Логи только в stderr: stdout занят каналом JSON-RPC, любая посторонняя
    // запись туда ломает протокол.
    console.error(
      `MCP-сервер запущен по каналу stdio: хост ${host} (${HOST_ENV_VAR}), тулов ${this.tools.length}`
    );
  }
}

const server = new HarmonyMcpServer();
server.run().catch((error) => {
  console.error('Критическая ошибка запуска MCP-сервера:', error);
  process.exit(1);
});
