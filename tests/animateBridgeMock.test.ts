import { AnimateBridge } from '../src/adapters/animate/bridge.js';
import { animateConfig } from '../src/config.js';

describe('AnimateBridge Mock Execution', () => {
  let bridge: AnimateBridge;
  const originalMode = animateConfig.bridgeMode;

  beforeAll(() => {
    animateConfig.bridgeMode = 'mock';
    bridge = AnimateBridge.getInstance();
    bridge.resetMockState();
  });

  afterAll(() => {
    animateConfig.bridgeMode = originalMode;
  });

  it('reports system status and version in mock mode', async () => {
    const status = await bridge.executeCommand('system_status');
    expect(status.success).toBe(true);
    expect(status.backendIdentity).toBe('adobe_animate');
    expect(status.result.version).toContain('Mock');

    const ping = await bridge.executeCommand('ping');
    expect(ping.success).toBe(true);
    expect(ping.result.pong).toBe(true);
  });

  it('creates and inspects documents', async () => {
    const created = await bridge.executeCommand('create_document', {
      width: 1920,
      height: 1080,
      frameRate: 24,
      name: 'Episode1.fla'
    });
    expect(created.success).toBe(true);
    expect(created.result.width).toBe(1920);
    expect(created.result.height).toBe(1080);
    expect(created.result.frameRate).toBe(24);

    const inspected = await bridge.executeCommand('inspect_document');
    expect(inspected.success).toBe(true);
    expect(inspected.result.name).toBe('Episode1.fla');
    expect(inspected.result.layers.length).toBeGreaterThan(0);
  });

  it('creates timeline layers and keyframes', async () => {
    const layer = await bridge.executeCommand('create_layer', { name: 'Characters' });
    expect(layer.success).toBe(true);
    expect(layer.result.name).toBe('Characters');

    const layersList = await bridge.executeCommand('list_layers');
    expect(layersList.success).toBe(true);
    expect(layersList.result.layers.some((l: any) => l.name === 'Characters')).toBe(true);

    const kf = await bridge.executeCommand('insert_keyframe', { frame: 24 });
    expect(kf.success).toBe(true);
    expect(kf.result.frame).toBe(24);
  });

  it('creates library symbols and places items on stage', async () => {
    const symbol = await bridge.executeCommand('create_symbol', {
      name: 'Hero_Rig',
      type: 'movie clip'
    });
    expect(symbol.success).toBe(true);
    expect(symbol.result.name).toBe('Hero_Rig');

    const lib = await bridge.executeCommand('list_library_items');
    expect(lib.success).toBe(true);
    expect(lib.result.items.some((it: any) => it.name === 'Hero_Rig')).toBe(true);
  });

  it('creates vector shapes and text elements', async () => {
    const shape = await bridge.executeCommand('create_shape', {
      shapeType: 'rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      fillColor: '#00FF00'
    });
    expect(shape.success).toBe(true);
    expect(shape.result.shapeType).toBe('rectangle');

    const text = await bridge.executeCommand('create_text', {
      text: 'Title Screen',
      fontSize: 48,
      fillColor: '#FFFFFF'
    });
    expect(text.success).toBe(true);
    expect(text.result.text).toBe('Title Screen');
  });

  it('creates tweens and handles export commands', async () => {
    const tween = await bridge.executeCommand('create_tween', {
      tweenType: 'classic',
      startFrame: 0,
      endFrame: 24
    });
    expect(tween.success).toBe(true);
    expect(tween.result.tweenType).toBe('classic');

    const img = await bridge.executeCommand('export_image', {
      uri: 'file:///tmp/preview.png',
      currentFrameOnly: true
    });
    expect(img.success).toBe(true);
    expect(img.result.exportedUri).toBe('file:///tmp/preview.png');
  });
});
