import fs from 'fs';
import os from 'os';
import path from 'path';
import { z } from 'zod';

import { harmonyActionRecorderTools, buildProvider } from '../src/tools/harmonyActionRecorderTools.js';
import { HarmonyActionRecorder, setRecorder } from '../src/services/harmonyActionRecorder/index.js';
import { loadRecorderConfig } from '../src/services/harmonyActionRecorder/config.js';
import { FixtureSceneStateProvider } from '../src/services/sceneStateCapture/fixtureProvider.js';
import { HarmonyBridgeSceneStateProvider } from '../src/services/sceneStateCapture/harmonyBridgeProvider.js';

const SCENE_PATH = path.resolve(process.cwd(), 'fixtures/harmony-captures/offline_scene.xstage');
const BEFORE_FIXTURE = path.resolve(process.cwd(), 'fixtures/harmony-captures/scene-before.json');
const AFTER_FIXTURE = path.resolve(process.cwd(), 'fixtures/harmony-captures/scene-after.json');

const EXPECTED_TOOL_NAMES = [
  'harmony.capture.start',
  'harmony.capture.record_instruction',
  'harmony.capture.snapshot',
  'harmony.capture.status',
  'harmony.capture.stop',
  'harmony.capture.approve',
  'harmony.capture.reject',
  'harmony.capture.export_dataset_entry',
  'harmony.capture.compare_sessions'
];

function tool(name: string) {
  const found = harmonyActionRecorderTools.find(t => t.name === name);
  if (!found) throw new Error(`tool not registered: ${name}`);
  return found;
}

/** Invoke a tool the way the MCP server does: validate arguments, then call the handler. */
async function callTool(name: string, args: unknown) {
  const target = tool(name);
  const parsed = target.inputSchema.safeParse(args);
  if (!parsed.success) throw new Error(`invalid args for ${name}: ${parsed.error.message}`);
  return target.handler(parsed.data as any);
}

describe('Harmony Action Recorder MCP tool contracts', () => {
  let artifactRoot: string;

  beforeEach(() => {
    artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harmony-capture-tools-'));
    setRecorder(new HarmonyActionRecorder(loadRecorderConfig({ artifactRoot, debounceMs: 0 })));
  });

  afterEach(() => {
    setRecorder(undefined);
    fs.rmSync(artifactRoot, { recursive: true, force: true });
  });

  it('registers exactly the nine documented tools', () => {
    expect(harmonyActionRecorderTools.map(t => t.name).sort()).toEqual([...EXPECTED_TOOL_NAMES].sort());
  });

  it('gives every tool a Zod object schema, a description and a real handler', () => {
    for (const registered of harmonyActionRecorderTools) {
      expect(registered.inputSchema).toBeInstanceOf(z.ZodObject);
      expect(typeof registered.handler).toBe('function');
      expect(registered.description.length).toBeGreaterThan(30);
    }
  });

  it('rejects malformed arguments before reaching the handler', () => {
    expect(tool('harmony.capture.start').inputSchema.safeParse({}).success).toBe(false);
    expect(tool('harmony.capture.record_instruction').inputSchema.safeParse({ sessionId: 'x' }).success).toBe(false);
    expect(
      tool('harmony.capture.record_instruction').inputSchema.safeParse({ sessionId: 'x', text: '' }).success
    ).toBe(false);
    expect(tool('harmony.capture.start').inputSchema.safeParse({ scenePath: SCENE_PATH, sessionId: '../evil' }).success).toBe(
      false
    );
    expect(tool('harmony.capture.compare_sessions').inputSchema.safeParse({ sessionIdA: 'a' }).success).toBe(false);
  });

  it('drives a full capture through the tool surface', async () => {
    const started: any = await callTool('harmony.capture.start', {
      scenePath: SCENE_PATH,
      sessionId: 'tool-session',
      provider: 'fixture',
      fixtureStatePaths: [BEFORE_FIXTURE, AFTER_FIXTURE]
    });
    expect(started.status).toBe('success');
    expect(started.sessionId).toBe('tool-session');
    expect(started.stateProvider).toBe('fixture');
    expect(started.notifierStatus).toBe('not_attached');
    expect(started.notCaptured).toContain('palettes');

    const instruction: any = await callTool('harmony.capture.record_instruction', {
      sessionId: 'tool-session',
      text: 'Soften the right-arm anticipation and move the accent from frame 12 to frame 18.',
      language: 'en'
    });
    expect(instruction.status).toBe('success');

    const snapshot: any = await callTool('harmony.capture.snapshot', {
      sessionId: 'tool-session',
      force: true,
      notifierEvents: [{ signal: 'columnValuesChanged', targets: ['Arm_R-P_ROTATION'] }]
    });
    expect(snapshot.eventsIngested).toBe(1);
    expect(fs.existsSync(snapshot.file)).toBe(true);

    const status: any = await callTool('harmony.capture.status', { sessionId: 'tool-session' });
    expect(status.sessionStatus).toBe('recording');
    expect(status.live).toBe(true);

    const stopped: any = await callTool('harmony.capture.stop', { sessionId: 'tool-session' });
    expect(stopped.status).toBe('success');
    expect(stopped.sessionStatus).toBe('stopped');
    expect(stopped.operationCount).toBeGreaterThan(0);
    expect(stopped.renderStatus).toBe('not_executed');

    const approved: any = await callTool('harmony.capture.approve', {
      sessionId: 'tool-session',
      reviewer: 'lead',
      note: 'accent reads better'
    });
    expect(approved.decision).toBe('approved');
    expect(approved.patchHash).toBe(stopped.patchHash);

    const exported: any = await callTool('harmony.capture.export_dataset_entry', {
      sessionId: 'tool-session',
      includeRejected: false
    });
    expect(exported.decision).toBe('approved');
    expect(exported.operationCount).toBe(stopped.operationCount);
    expect(exported.interpretationLimits.length).toBeGreaterThan(0);
  });

  it('records a rejection through the tool surface without touching the patch', async () => {
    await callTool('harmony.capture.start', {
      scenePath: SCENE_PATH,
      sessionId: 'reject-session',
      provider: 'fixture',
      fixtureStatePaths: [BEFORE_FIXTURE, AFTER_FIXTURE]
    });
    await callTool('harmony.capture.record_instruction', { sessionId: 'reject-session', text: 'try something' });
    const stopped: any = await callTool('harmony.capture.stop', { sessionId: 'reject-session' });

    const rejected: any = await callTool('harmony.capture.reject', {
      sessionId: 'reject-session',
      note: 'timing got worse'
    });
    expect(rejected.decision).toBe('rejected');
    expect(rejected.patchHash).toBe(stopped.patchHash);
  });

  it('lists sessions when no sessionId is given', async () => {
    await callTool('harmony.capture.start', {
      scenePath: SCENE_PATH,
      sessionId: 'list-session',
      provider: 'fixture',
      fixtureStatePaths: [BEFORE_FIXTURE, AFTER_FIXTURE]
    });
    await callTool('harmony.capture.stop', { sessionId: 'list-session' });

    const listed: any = await callTool('harmony.capture.status', {});
    expect(listed.sessions.map((s: any) => s.sessionId)).toContain('list-session');
  });

  it('compares two sessions through the tool surface', async () => {
    for (const sessionId of ['cmp-a', 'cmp-b']) {
      await callTool('harmony.capture.start', {
        scenePath: SCENE_PATH,
        sessionId,
        provider: 'fixture',
        fixtureStatePaths: [BEFORE_FIXTURE, AFTER_FIXTURE]
      });
      await callTool('harmony.capture.stop', { sessionId });
    }

    const comparison: any = await callTool('harmony.capture.compare_sessions', {
      sessionIdA: 'cmp-a',
      sessionIdB: 'cmp-b'
    });
    expect(comparison.sameScene).toBe(true);
    expect(comparison.identicalPatch).toBe(true);
  });

  it('surfaces a structured error for an unknown session', async () => {
    await expect(callTool('harmony.capture.status', { sessionId: 'does-not-exist' })).rejects.toMatchObject({
      code: 'CAPTURE_SESSION_NOT_FOUND'
    });
  });

  describe('provider selection', () => {
    it('never substitutes fixtures for a requested real read', () => {
      expect(buildProvider('harmony_python_bridge')).toBeInstanceOf(HarmonyBridgeSceneStateProvider);
      expect(buildProvider('auto')).toBeInstanceOf(HarmonyBridgeSceneStateProvider);
    });

    it('requires explicit fixture paths for fixture mode', () => {
      expect(() => buildProvider('fixture')).toThrow(/fixtureStatePaths/);
      expect(buildProvider('fixture', [BEFORE_FIXTURE])).toBeInstanceOf(FixtureSceneStateProvider);
    });
  });
});
