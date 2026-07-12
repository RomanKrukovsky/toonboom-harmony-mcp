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
import { harmonyNativePhase2Tools } from './tools/harmonyNativePhase2Tools.js';
import { mlTools } from './tools/mlTools.js';

import { resources } from './resources.js';
import { prompts } from './prompts.js';
import { HarmonyError } from './security.js';

const allTools = [
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
  ...harmonyNativePhase2Tools,
  ...mlTools
];

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
        tools: allTools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: zodFieldToJsonSchema(t.inputSchema)
        }))
      };
    });

    // 2. Вызов конкретного инструмента (Call Tool)
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = allTools.find(t => t.name === request.params.name);
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

        const result = await tool.handler(parsedArgs.data);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error: any) {
        const isHarmonyErr = error instanceof HarmonyError;
        const errObj = {
          error: true,
          code: isHarmonyErr ? error.code : 'UNKNOWN_ERROR',
          message: error.message || 'Произошла непредвиденная ошибка.',
          details: isHarmonyErr ? error.details : undefined
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
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP-сервер Toon Boom Harmony запущен по каналу stdio');
  }
}

const server = new HarmonyMcpServer();
server.run().catch((error) => {
  console.error('Критическая ошибка запуска MCP-сервера:', error);
  process.exit(1);
});
