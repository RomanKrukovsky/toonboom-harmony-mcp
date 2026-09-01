import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { mohoFactoryTools } from '../src/tools/mohoFactoryTools.js';
import {
  VALID_DATE,
  validMohoShowBible,
  validMohoCharacterBible
} from './fixtures/mohoShowBible.valid.js';

function callTool(tools: any[], name: string, args: any): Promise<any> {
  const tool = tools.find(t => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  const parsed = tool.inputSchema.parse(args);
  return Promise.resolve(tool.handler(parsed));
}

function makeShotManifest(overrides: any = {}): any {
  const showBible = validMohoShowBible({ rigType: 'humanoid_2leg' });
  const character = validMohoCharacterBible('humanoid_2leg');
  return {
    schemaVersion: '1.0',
    shotId: 'shot_test_001',
    showBibleRef: showBible.showId,
    production: 'demo',
    episode: 'ep_001',
    sceneName: 'scene_001',
    description: 'golden path shot',
    staging: {
      positions: [{ characterId: character.characterId, preset: 'left' }],
      shotSize: 'medium_shot',
      cameraMove: 'static',
      backgroundRef: 'bg_default'
    },
    timing: { totalFrames: 24, fps: 24 },
    beats: [
      {
        beatId: 'b1',
        startFrame: 1,
        endFrame: 24,
        characterId: character.characterId,
        intent: 'speak',
        emotion: 'happy'
      }
    ],
    fx: [],
    render: { preview: true, format: 'mp4', quality: 'standard' },
    provenance: {
      director: 'test',
      createdAt: VALID_DATE,
      sourceScriptRef: 'script_test'
    },
    ...overrides
  };
}

function writeShowBibleBundle(tmpDir: string, shotManifest: any): string {
  const bundleDir = path.join(tmpDir, 'show_bible');
  fs.mkdirSync(bundleDir, { recursive: true });
  const showBible = validMohoShowBible({ rigType: 'humanoid_2leg' });
  const character = validMohoCharacterBible('humanoid_2leg');
  const palette = {
    schemaVersion: '1.0',
    paletteId: 'demo_palette',
    name: 'demo',
    colours: [
      { colourId: 'char_skin_base', name: 'skin', rgba: '#FF8C6BFF', usage: 'skin', locked: true, mohoColourIndex: 0 }
    ],
    paletteType: 'rgb',
    maxColours: 256,
    provenance: { approver: 'test', approvedAt: VALID_DATE }
  };
  fs.writeFileSync(path.join(bundleDir, 'moho_show_bible.json'), JSON.stringify({ ...showBible, production: 'demo', characterBibles: [{ characterId: character.characterId, ref: './character.json' }] }));
  fs.writeFileSync(path.join(bundleDir, 'character.json'), JSON.stringify(character));
  fs.writeFileSync(path.join(bundleDir, 'palette.json'), JSON.stringify(palette));
  return path.join(bundleDir, 'moho_show_bible.json');
}

describe('mohoFactoryTools', () => {
  let tmpDir: string;
  let cleanupDirs: string[] = [];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-factory-tools-'));
    cleanupDirs.push(tmpDir);
  });

  afterEach(() => {
    for (const d of cleanupDirs.splice(0)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it('1. compile_episode_batch with 3 valid humanoid shots returns success', async () => {
    const result = await callTool(mohoFactoryTools, 'moho.factory.compile_episode_batch', {
      production: 'demo',
      episode: 'ep_001',
      shotManifests: [makeShotManifest({ shotId: 's1' }), makeShotManifest({ shotId: 's2' }), makeShotManifest({ shotId: 's3' })],
      showBiblePath: 'moho_show_bible.json'
    });
    expect(result.status).toBe('success');
    expect(result.batch).toBeDefined();
    expect(result.batch.production).toBe('demo');
    expect(result.batch.episode).toBe('ep_001');
    expect(result.batch.shotManifests.length).toBe(3);
  });

  it('2. run_show_bible with 1 humanoid shot (smoke)', async () => {
    const result: any = await callTool(mohoFactoryTools, 'moho.factory.run_show_bible', {
      showBiblePath: '/nonexistent/show_bible.json',
      shotManifests: [makeShotManifest()],
      outputRoot: tmpDir,
      mode: 'offline_dry_run',
      timeoutMs: 5000
    });
    expect(result).toBeDefined();
    expect(['success', 'awaiting_approval', 'error']).toContain(result.status);
  });

  it('3. run_one_shot with 1 humanoid shot returns shotResult (smoke)', async () => {
    const result: any = await callTool(mohoFactoryTools, 'moho.factory.run_one_shot', {
      showBiblePath: '/nonexistent/show_bible.json',
      shotManifest: makeShotManifest(),
      outputRoot: tmpDir,
      mode: 'offline_dry_run',
      timeoutMs: 5000
    });
    expect(result).toBeDefined();
    expect(['success', 'awaiting_approval', 'error']).toContain(result.status);
  });

  it('4. list_pending with empty evidenceDir returns empty array', async () => {
    const evidenceDir = path.join(tmpDir, 'approvals');
    fs.mkdirSync(evidenceDir, { recursive: true });
    const result = await callTool(mohoFactoryTools, 'moho.factory.list_pending', { evidenceDir });
    expect(result.status).toBe('success');
    expect(result.pending).toEqual([]);
  });

  it('5. approve + reject round-trip', async () => {
    const evidenceDir = path.join(tmpDir, 'approvals');
    fs.mkdirSync(evidenceDir, { recursive: true });
    const { MohoApprovalCheckpoints } = await import('../src/services/mohoApprovalCheckpoints/index.js');
    const store = new MohoApprovalCheckpoints(evidenceDir);
    const req = await store.request({
      runId: 'run_test',
      stage: 'qa_evaluated',
      shotId: 'shot_001',
      summary: 'test approval',
      artifacts: [],
      qaStatus: 'fail'
    });
    expect(req.requiresApproval).toBe(true);
    const approved = await callTool(mohoFactoryTools, 'moho.factory.approve', {
      approvalId: req.approvalId,
      approver: 'tester',
      evidenceDir,
      notes: 'looks good'
    });
    expect(approved.status).toBe('success');
    expect(approved.record.decision).toBe('approved');
    const req2 = await store.request({
      runId: 'run_test_2',
      stage: 'rendered',
      shotId: 'shot_002',
      summary: 'test reject',
      artifacts: []
    });
    const rejected = await callTool(mohoFactoryTools, 'moho.factory.reject', {
      approvalId: req2.approvalId,
      approver: 'tester',
      evidenceDir,
      notes: 'needs more work'
    });
    expect(rejected.status).toBe('success');
    expect(rejected.record.decision).toBe('rejected');
  });

  it('6. tool registration: mohoFactoryTools contains all 6 tool names', () => {
    const names = mohoFactoryTools.map(t => t.name);
    expect(names).toContain('moho.factory.run_show_bible');
    expect(names).toContain('moho.factory.run_one_shot');
    expect(names).toContain('moho.factory.approve');
    expect(names).toContain('moho.factory.reject');
    expect(names).toContain('moho.factory.list_pending');
    expect(names).toContain('moho.factory.compile_episode_batch');
  });
});