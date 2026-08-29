import path from 'path';
import { mohoStage4ArtworkBatchTools } from '../src/tools/mohoStage4ArtworkBatchTools.js';


describe('mohoStage4ArtworkBatchTools', () => {
  it('inspects the real PSD fixture through the MCP boundary', async () => {
    const tool = mohoStage4ArtworkBatchTools.find(item => item.name === 'moho.assets.inspect_psd');
    expect(tool).toBeDefined();
    const result = await (tool as any).handler({
      file_path: path.resolve(__dirname, '../fixtures/moho_reference/gramps.psd')
    });

    expect(result.is_psd_format).toBe(true);
    expect(result.layers.map((layer: any) => layer.name).sort()).toEqual(
      ['Head', 'LArm', 'LLeg', 'RArm', 'RLeg', 'Torso']
    );
  });

  it('requires a destination for artwork rig compilation', () => {
    const tool = mohoStage4ArtworkBatchTools.find(item => item.name === 'moho.rig.compile_from_artwork');
    expect(tool).toBeDefined();
    const parsed = (tool as any).inputSchema.safeParse({
      psd_data: {},
      body_plan: 'adult_neutral',
      body_params: {}
    });

    expect(parsed.success).toBe(false);
  });

  it('exposes honest PSD, relink, compile and batch operations', () => {
    const descriptions = new Map(
      mohoStage4ArtworkBatchTools.map(tool => [tool.name, tool.description])
    );
    expect(descriptions.get('moho.assets.import_psd_character')).toContain('real PSD layers');
    expect(descriptions.get('moho.assets.relink')).toContain('recertify');
    expect(descriptions.get('moho.rig.compile_from_artwork')).toContain('natively certify');
    expect(descriptions.get('moho.scene.batch_produce')).toContain('natively certify');
  });
});
