import { ScenePlanAdapter } from '../src/adapters/scenePlan/index.js';
import { uiAutomation } from '../src/adapters/uiAutomation/index.js';
import { VisualStateEngine } from '../src/adapters/visualState/index.js';

describe('Тестирование Harmony Autopilot', () => {
  beforeEach(() => {
    uiAutomation.clearSimulatedState();
  });

  const mockPlan = {
    production: "TestProd",
    episode: "EP101",
    sceneName: "SC001",
    resolution: { width: 1920, height: 1080 },
    fps: 24,
    durationFrames: 192,
    workspaceTemplate: "default_scene_template",
    background: {
      file: "bg.png",
      layerName: "BG_Layer"
    },
    characters: [
      {
        name: "Hero",
        rig: "hero.tpl",
        positionPreset: "center"
      }
    ],
    camera: {
      preset: "slow_push_in"
    },
    render: {
      preview: true,
      format: "mp4"
    }
  };

  test('должно валидировать и генерировать план выполнения', () => {
    const execPlan = ScenePlanAdapter.generateExecutionPlan(mockPlan);
    expect(execPlan).toBeDefined();
    expect(execPlan.sceneName).toBe('SC001');
    expect(execPlan.steps.length).toBeGreaterThan(0);
    
    const hasOpenStep = execPlan.steps.some(s => s.id === 'open_harmony');
    const hasCreateStep = execPlan.steps.some(s => s.id === 'create_scene');
    const hasBgStep = execPlan.steps.some(s => s.id === 'import_background');
    const hasRigStep = execPlan.steps.some(s => s.id === 'import_rig_hero');

    expect(hasOpenStep).toBe(true);
    expect(hasCreateStep).toBe(true);
    expect(hasBgStep).toBe(true);
    expect(hasRigStep).toBe(true);
  });

  test('симулятор UI-автоматизации должен правильно менять состояние', async () => {
    const activeWin = await uiAutomation.getActiveWindow();
    expect(activeWin.title).toContain('Simulation');

    const checkBefore = await uiAutomation.verifyState('scene_open');
    expect(checkBefore.status).toBe('failed');

    await uiAutomation.typeText('test_scene.xstage');
    const checkAfter = await uiAutomation.verifyState('scene_open');
    expect(checkAfter.status).toBe('passed');
  });

  test('движок visual state должен распознавать открытую сцену', async () => {
    uiAutomation.setSimulatedSceneOpen(true);
    const state = await VisualStateEngine.detectState();
    expect(state.sceneOpen).toBe(true);
    expect(state.detectedPanels).toContain('Timeline');
  });
});
