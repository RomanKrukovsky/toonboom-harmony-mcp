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
  ...auditTools
];

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
          inputSchema: {
            type: 'object',
            properties: Object.keys(t.inputSchema.shape).reduce((acc: any, key) => {
              const shape = t.inputSchema.shape as Record<string, any>;
              const field = shape[key];
              acc[key] = {
                type: 'string', // Значение по умолчанию для сериализации JSON-схемы
                description: field.description || ''
              };
              if (field._def.typeName === 'ZodBoolean') acc[key].type = 'boolean';
              if (field._def.typeName === 'ZodNumber') acc[key].type = 'number';
              if (field._def.typeName === 'ZodArray') {
                acc[key].type = 'array';
                acc[key].items = { type: 'string' };
              }
              if (field._def.typeName === 'ZodEnum') {
                acc[key].type = 'string';
                acc[key].enum = field._def.values;
              }
              return acc;
            }, {}),
            required: Object.keys(t.inputSchema.shape).filter(
              key => !(t.inputSchema.shape as Record<string, any>)[key].isOptional()
            )
          }
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
