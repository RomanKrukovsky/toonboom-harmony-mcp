import { animateTools } from '../src/tools/animateTools.js';
import { animateConfig } from '../src/config.js';

describe('Animate MCP Tools Catalog', () => {
  const originalMode = animateConfig.bridgeMode;

  beforeAll(() => {
    animateConfig.bridgeMode = 'mock';
  });

  afterAll(() => {
    animateConfig.bridgeMode = originalMode;
  });

  it('contains expected structured tools with schemas', () => {
    expect(animateTools.length).toBeGreaterThan(30);

    for (const tool of animateTools) {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(typeof tool.handler).toBe('function');
    }
  });

  it('executes animate_system_status tool handler', async () => {
    const statusTool = animateTools.find(t => t.name === 'animate_system_status');
    expect(statusTool).toBeDefined();
    const res: any = await (statusTool!.handler as (args: any) => Promise<any>)({});
    expect(res).toBeDefined();
    expect(res.bridgeMode).toBeDefined();
  });

  it('executes animate_get_capabilities tool handler', async () => {
    const capTool = animateTools.find(t => t.name === 'animate_get_capabilities');
    expect(capTool).toBeDefined();
    const res: any = await (capTool!.handler as (args: any) => Promise<any>)({});
    expect(res.backend).toBe('adobe_animate');
    expect(res.capabilities.document_management).toBe('available');
    expect(res.capabilities.timeline_layers).toBe('available');
  });

  it('executes animate_create_document and animate_inspect_document handlers', async () => {
    const createTool = animateTools.find(t => t.name === 'animate_create_document');
    expect(createTool).toBeDefined();
    const created: any = await (createTool!.handler as (args: any) => Promise<any>)({ width: 1280, height: 720, frameRate: 30 });
    expect(created.width).toBe(1280);
    expect(created.height).toBe(720);

    const inspectTool = animateTools.find(t => t.name === 'animate_inspect_document');
    expect(inspectTool).toBeDefined();
    const inspected: any = await (inspectTool!.handler as (args: any) => Promise<any>)({});
    expect(inspected.width).toBe(1280);
  });

  it('executes animate_create_layer and animate_create_shape handlers', async () => {
    const layerTool = animateTools.find(t => t.name === 'animate_create_layer');
    expect(layerTool).toBeDefined();
    const lyr: any = await (layerTool!.handler as (args: any) => Promise<any>)({ name: 'VectorArt', layerType: 'normal' });
    expect(lyr.name).toBe('VectorArt');

    const shapeTool = animateTools.find(t => t.name === 'animate_create_shape');
    expect(shapeTool).toBeDefined();
    const shp: any = await (shapeTool!.handler as (args: any) => Promise<any>)({
      shapeType: 'oval',
      x: 50,
      y: 50,
      width: 80,
      height: 80,
      fillColor: '#FF0000'
    });
    expect(shp.shapeType).toBe('oval');
  });
});
