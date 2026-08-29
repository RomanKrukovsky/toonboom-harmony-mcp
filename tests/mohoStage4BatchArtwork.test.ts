import { mohoStage4ArtworkBatchTools } from '../src/tools/mohoStage4ArtworkBatchTools.js';

describe('mohoStage4ArtworkBatchTools', () => {
  it('should contain the inspect_psd tool', () => {
    const tool = mohoStage4ArtworkBatchTools.find(t => t.name === 'moho.assets.inspect_psd');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Parse multi-layer PSD files');
  });

  it('should contain the import_psd_character tool', () => {
    const tool = mohoStage4ArtworkBatchTools.find(t => t.name === 'moho.assets.import_psd_character');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('automated joint inpainting');
  });

  it('should contain the relink tool', () => {
    const tool = mohoStage4ArtworkBatchTools.find(t => t.name === 'moho.assets.relink');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('project-relative paths');
  });

  it('should contain the compile_from_artwork tool', () => {
    const tool = mohoStage4ArtworkBatchTools.find(t => t.name === 'moho.rig.compile_from_artwork');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('extensible body plans');
  });

  it('should contain the batch_produce tool', () => {
    const tool = mohoStage4ArtworkBatchTools.find(t => t.name === 'moho.scene.batch_produce');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Batch produce scenes');
  });
});
