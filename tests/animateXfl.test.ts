import fs from 'fs';
import path from 'path';
import { AnimateXflInspector } from '../src/adapters/animate/xflInspector.js';

describe('AnimateXflInspector', () => {
  const tempDir = path.join(process.cwd(), 'output', 'test_xfl_temp');

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('inspects synthetic XFL DOMDocument.xml metadata', () => {
    const xflFolder = path.join(tempDir, 'project.xfl');
    fs.mkdirSync(xflFolder, { recursive: true });

    const domXml = `<?xml version="1.0" encoding="UTF-8"?>
<DOMDocument xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" width="1920" height="1080" frameRate="24" backgroundColor="#FFFFFF">
  <timelines>
    <DOMTimeline name="Scene 1">
      <layers>
        <DOMLayer name="Background" color="#4F80FF"/>
        <DOMLayer name="Animation" color="#FF4F4F"/>
      </layers>
    </DOMTimeline>
  </timelines>
</DOMDocument>`;

    fs.writeFileSync(path.join(xflFolder, 'DOMDocument.xml'), domXml, 'utf-8');

    const meta = AnimateXflInspector.inspect(xflFolder);
    expect(meta.width).toBe(1920);
    expect(meta.height).toBe(1080);
    expect(meta.frameRate).toBe(24);
    expect(meta.backgroundColor).toBe('#FFFFFF');
    expect(meta.scenes).toEqual(['Scene 1']);
    expect(meta.layerNames).toEqual(['Background', 'Animation']);
  });

  it('diffs two XFL metadata states correctly', () => {
    const metaA = {
      width: 1920,
      height: 1080,
      frameRate: 24,
      scenes: ['Scene 1'],
      layerNames: ['Layer 1'],
      libraryItems: ['Symbol 1']
    };

    const metaB = {
      width: 1280,
      height: 720,
      frameRate: 30,
      scenes: ['Scene 1', 'Scene 2'],
      layerNames: ['Layer 1', 'Layer 2'],
      libraryItems: ['Symbol 1', 'Symbol 2']
    };

    const diff = AnimateXflInspector.diff(metaA, metaB);
    expect(diff.dimensionChanged).toBe(true);
    expect(diff.frameRateChanged).toBe(true);
    expect(diff.scenesAdded).toEqual(['Scene 2']);
    expect(diff.layersAdded).toEqual(['Layer 2']);
    expect(diff.itemsAdded).toEqual(['Symbol 2']);
  });

  it('creates safe backups of project documents', () => {
    const srcDoc = path.join(tempDir, 'test_to_backup.fla');
    fs.writeFileSync(srcDoc, 'dummy fla content', 'utf-8');

    const backupDir = path.join(tempDir, 'backups');
    const backupPath = AnimateXflInspector.createBackup(srcDoc, backupDir);

    expect(fs.existsSync(backupPath)).toBe(true);
    expect(fs.readFileSync(backupPath, 'utf-8')).toBe('dummy fla content');
  });
});
