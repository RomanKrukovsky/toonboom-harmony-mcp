import { nodeTools } from '../src/tools/nodeTools.js';
import { paletteTools } from '../src/tools/paletteTools.js';
import { timelineTools } from '../src/tools/timelineTools.js';
import { drawingTools } from '../src/tools/drawingTools.js';
import { rigTools } from '../src/tools/rigTools.js';

jest.mock('../src/adapters/harmonyPython.js', () => {
  return {
    HarmonyPython: {
      runCommand: jest.fn().mockImplementation(async (command: string, args: any) => {
        if (command === 'set_write_rgba') {
          return {
            status: 'success',
            message: `Нода Write '${args.writeNodePath}' успешно переключена в режим RGBA (PNG).`
          };
        }
        if (command === 'validate_palettes') {
          return {
            status: 'success',
            valid: true,
            missing_palette_layers: [],
            palettes: ['Default_Palette']
          };
        }
        if (command === 'merge_duplicate_colours') {
          return {
            status: 'success',
            message: 'Объединение дублирующихся цветов выполнено. Объединено слотов: 0.'
          };
        }
        if (command === 'set_exposures_batch') {
          return {
            status: 'success',
            message: `Успешно применен пакет из ${args.exposures.length} экспозиций к слою '${args.nodePath}'.`
          };
        }
        if (command === 'set_composite_passthrough') {
          return {
            status: 'success',
            message: `Нода Composite '${args.compositeNodePath}' успешно переключена в режим ${args.mode}.`
          };
        }
        if (command === 'zero_out_peg') {
          return {
            status: 'success',
            message: `Координаты пивота Peg ноды '${args.pegNodePath}' успешно сброшены в локальный ноль (Zero-Out).`
          };
        }
        if (command === 'duplicate_active_exposure') {
          return {
            status: 'success',
            message: `Активный рисунок слоя '${args.nodePath}' на кадре {args.frame} успешно продублирован на диске как независимый.`
          };
        }
        if (command === 'sync_substitutions_pivots') {
          return {
            status: 'success',
            message: `Пивоты субституций слоя '${args.layerNodePath}' успешно синхронизированы.`
          };
        }
        return { status: 'success' };
      })
    }
  };
});

describe('Toon Boom Harmony MCP Phase 2 & 3 Upgrades (insights3.md & insights4.md)', () => {
  // Phase 2 Tests
  it('should support harmony.nodes.set_write_rgba tool', async () => {
    const tool = nodeTools.find(t => t.name === 'harmony.nodes.set_write_rgba');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      writeNodePath: 'Top/Write_Node',
      dryRun: false
    });

    expect(result.status).toBe('success');
    expect(result.message).toContain('успешно переключена в режим RGBA');
  });

  it('should support harmony.palette.validate_scene_palettes returning layer paths', async () => {
    const tool = paletteTools.find(t => t.name === 'harmony.palette.validate_scene_palettes');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({});
    expect(result.status).toBe('success');
    expect(result.valid).toBe(true);
    expect(result.missingPaletteLayers).toEqual([]);
  });

  it('should support harmony.palette.merge_duplicates tool', async () => {
    const tool = paletteTools.find(t => t.name === 'harmony.palette.merge_duplicates');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      dryRun: false
    });

    expect(result.status).toBe('success');
    expect(result.message).toContain('Объединение дублирующихся цветов выполнено');
  });

  it('should support batch set_exposure in harmony.timeline.set_exposure tool', async () => {
    const tool = timelineTools.find(t => t.name === 'harmony.timeline.set_exposure');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      nodePath: 'Top/Mouth',
      exposures: [
        { startFrame: 1, duration: 5, drawingName: 'mouth_smile' },
        { startFrame: 6, duration: 10, drawingName: 'mouth_o' }
      ],
      dryRun: false
    });

    expect(result.status).toBe('success');
    expect(result.message).toContain('Успешно применен пакет из 2 экспозиций');
  });

  // Phase 3 Tests
  it('should support harmony.nodes.set_composite_passthrough tool', async () => {
    const tool = nodeTools.find(t => t.name === 'harmony.nodes.set_composite_passthrough');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      compositeNodePath: 'Top/Character_Composite',
      mode: 'Pass Through',
      dryRun: false
    });

    expect(result.status).toBe('success');
    expect(result.message).toContain('успешно переключена в режим Pass Through');
  });

  it('should support harmony.rig.zero_out_peg tool', async () => {
    const tool = rigTools.find(t => t.name === 'harmony.rig.zero_out_peg');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      pegNodePath: 'Top/Hand_L_Peg',
      dryRun: false
    });

    expect(result.status).toBe('success');
    expect(result.message).toContain('успешно сброшены в локальный ноль');
  });

  it('should support harmony.drawings.duplicate_active_exposure tool', async () => {
    const tool = drawingTools.find(t => t.name === 'harmony.drawings.duplicate_active_exposure');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      nodePath: 'Top/Mouth',
      frame: 12,
      dryRun: false
    });

    expect(result.status).toBe('success');
    expect(result.message).toContain('успешно продублирован на диске как независимый');
  });

  it('should support harmony.drawings.sync_substitutions_pivots with syncWithParentPeg', async () => {
    const tool = drawingTools.find(t => t.name === 'harmony.drawings.sync_substitutions_pivots');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      layerNodePath: 'Top/Mouth',
      sourceSubName: 'mouth_neutral',
      syncWithParentPeg: true,
      dryRun: false
    });

    expect(result.status).toBe('success');
    expect(result.message).toContain('успешно синхронизированы');
  });
});
