import { describe, it, expect } from '@jest/globals';
import { mohoActingBridgeTools } from '../src/tools/mohoActingBridgeTools.js';

const toolByName = (name: string) => {
  const tool = mohoActingBridgeTools.find(t => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
};

const callHandler = async (name: string, args: any): Promise<any> => {
  const tool = toolByName(name);
  return tool.handler(args as never);
};

describe('mohoActingBridgeTools — registry', () => {
  it('exposes 4 MCP tools', () => {
    expect(mohoActingBridgeTools.length).toBe(4);
  });

  it('all tool names are namespaced under moho.acting', () => {
    for (const t of mohoActingBridgeTools) {
      expect(t.name.startsWith('moho.acting.')).toBe(true);
    }
  });

  it('all tools declare Zod inputSchema', () => {
    for (const t of mohoActingBridgeTools) {
      expect(t.inputSchema).toBeDefined();
    }
  });
});

describe('moho.acting.generate', () => {
  it('happy path: humanoid talk + gesture', async () => {
    const result = await callHandler('moho.acting.generate', {
      characters: [
        {
          characterId: 'speaker',
          rigType: 'humanoid_2leg',
          fps: 24,
          actions: [
            { type: 'talk', frames: [25, 60], text: 'Hello world', emotion: 'happy' },
            { type: 'gesture', frames: [60, 72], gestureName: 'wave' }
          ]
        }
      ]
    });
    expect(result.status).toBe('success');
    expect(result.output.boneKeys.length).toBeGreaterThan(0);
    expect(result.output.switchKeys.length).toBeGreaterThan(0);
    expect(result.output.smartBoneActions.length).toBeGreaterThan(0);
    expect(result.output.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic — same input -> same fingerprint', async () => {
    const args = {
      characters: [
        {
          characterId: 'a',
          rigType: 'humanoid_2leg' as const,
          actions: [{ type: 'talk' as const, frames: [1, 24] as [number, number], text: 'foo' }]
        }
      ]
    };
    const a = await callHandler('moho.acting.generate', args);
    const b = await callHandler('moho.acting.generate', args);
    expect(a.output.fingerprint).toBe(b.output.fingerprint);
  });

  it('rejects empty characters array via Zod (direct schema parse)', () => {
    const tool = toolByName('moho.acting.generate');
    const result = tool.inputSchema.safeParse({ characters: [] });
    expect(result.success).toBe(false);
  });

  it('rejects unknown rigType via Zod (direct schema parse)', () => {
    const tool = toolByName('moho.acting.generate');
    const result = tool.inputSchema.safeParse({
      characters: [
        { characterId: 'x', rigType: 'octopus_8leg', actions: [] }
      ]
    });
    expect(result.success).toBe(false);
  });

  it('accepts all 4 documented rig types via Zod (direct schema parse)', () => {
    const tool = toolByName('moho.acting.generate');
    for (const rigType of ['humanoid_2leg', 'quadruped', 'creature', 'mechanical']) {
      const result = tool.inputSchema.safeParse({
        characters: [{ characterId: 'c', rigType, actions: [] }]
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('moho.acting.synthesize_dialogue', () => {
  it('returns phonemeKeyframes + actingTracks for a single utterance', async () => {
    const result = await callHandler('moho.acting.synthesize_dialogue', {
      speaker: 'narrator',
      text: 'Welcome to the show',
      startFrame: 1,
      endFrame: 60,
      emotion: 'happy',
      fps: 24
    });
    expect(result.status).toBe('success');
    expect(result.performance.phonemeKeyframes.length).toBeGreaterThan(0);
    expect(result.performance.actingTracks.length).toBeGreaterThan(0);
    expect(result.performance.summary.totalWords).toBe(4);
  });

  it('emits Rest phoneme at startFrame-2 and endFrame', async () => {
    const result = await callHandler('moho.acting.synthesize_dialogue', {
      speaker: 'narrator',
      text: 'Hi',
      startFrame: 10,
      endFrame: 20,
      fps: 24
    });
    const rest = result.performance.phonemeKeyframes.filter((p: { phoneme: string }) => p.phoneme === 'Rest');
    expect(rest[0].frame).toBeLessThanOrEqual(10);
    expect(rest[rest.length - 1].frame).toBe(20);
  });
});

describe('moho.acting.merge_into_pir', () => {
  it('merges acting output into existing PIR and returns deterministic arrays', async () => {
    const existing = {
      boneKeys: [
        {
          boneId: 0,
          boneName: 'A__speaker',
          channel: 'rotation' as const,
          frame: 100,
          value: 1,
          interpolation: 'ease_in_out' as const
        }
      ],
      switchKeys: [
        {
          switchLayerName: 'Existing',
          frame: 50,
          choice: 'X',
          interpolation: 'step' as const
        }
      ],
      smartBoneActions: [
        {
          actionName: 'ExistingAction',
          targetBone: 't',
          frame: 200,
          angleDeg: 1,
          scaleX: 1,
          scaleY: 1
        }
      ],
      fxKeys: [{ type: 'existing', target: 't', frame: 75, value: 1 }]
    };
    const bridge = await callHandler('moho.acting.generate', {
      characters: [
        {
          characterId: 'speaker',
          rigType: 'humanoid_2leg',
          actions: [{ type: 'gesture', frames: [10, 30], gestureName: 'wave' }]
        }
      ]
    });
    const result = await callHandler('moho.acting.merge_into_pir', {
      pir: existing,
      bridge: bridge.output
    });
    expect(result.status).toBe('success');
    expect(result.mergedPir.boneKeys.length).toBeGreaterThan(0);
    expect(result.mergedPir.switchKeys.length).toBeGreaterThan(0);
    expect(result.mergedPir.smartBoneActions.length).toBeGreaterThan(0);
    expect(result.bridgeFingerprint).toBe(bridge.output.fingerprint);
  });
});

describe('moho.acting.list_capabilities', () => {
  it('returns the capability registry', async () => {
    const result = await callHandler('moho.acting.list_capabilities', {});
    expect(result.status).toBe('success');
    expect(result.capabilities.actionTypes).toContain('talk');
    expect(result.capabilities.actionTypes).toContain('gesture');
    expect(result.capabilities.rigTypes).toContain('humanoid_2leg');
    expect(result.capabilities.emotions).toContain('happy');
    expect(result.capabilities.gestures).toContain('wave');
    expect(result.capabilities.phonemeSet).toContain('Rest');
    expect(result.capabilities.supportedRigTypesForDialogue).toEqual(['humanoid_2leg']);
  });
});
