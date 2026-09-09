import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { CountryballsWritersRoom } from '../../src/countryballs/writersRoom/writersRoom.js';
import { CountryballsDirectorEngine } from '../../src/countryballs/director/directorEngine.js';
import { AnimateCountryballsCompiler } from '../../src/countryballs/compiler/animateCompiler.js';
import { UniversalCountryballsDccAdapter } from '../../src/countryballs/compiler/universalDccAdapter.js';
import { DEFAULT_COUNTRYBALLS_SERIES_BIBLE } from '../../src/countryballs/seriesBible/defaultBible.js';

describe('Adobe Animate & Universal DCC Compiler', () => {
  it('generates valid Adobe Animate JSFL script with symbols, layers and keyframes', () => {
    const room = new CountryballsWritersRoom(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
    const screenplay = room.produceScreenplay({ topic: 'Cardboard rocket' });
    const director = new CountryballsDirectorEngine(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
    const ir = director.directEpisode(screenplay);

    const tempDir = path.join(os.tmpdir(), `test_countryballs_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const compiler = new AnimateCountryballsCompiler(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
    const result = compiler.compileToJsfl(ir, tempDir);

    expect(result.jsflScript).toContain('fl.createDocument');
    expect(result.jsflScript).toContain('Char_Poland_Body');
    expect(result.jsflScript).toContain('Char_Poland_Eyes');
    expect(result.jsflScript).toContain('timeline.addNewLayer');
    expect(result.jsflScript).toContain('doc.saveAs');
    expect(result.totalKeyframesGenerated).toBeGreaterThan(10);
    expect(result.totalLayersCreated).toBeGreaterThanOrEqual(7);

    // Test Universal DCC Adapter
    const adapter = new UniversalCountryballsDccAdapter(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
    const compilePkg = adapter.compile(ir, tempDir, 'animate');

    expect(compilePkg.backend).toBe('animate');
    expect(fs.existsSync(compilePkg.primaryScriptPath)).toBe(true);

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
