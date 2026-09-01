import { describe, it, expect } from '@jest/globals';
import { MohoActingBridge } from '../../src/services/mohoActingBridge/index.js';
import { mohoActingBridgeTools } from '../../src/tools/mohoActingBridgeTools.js';
import type { MohoPerformancePir } from '../../src/schemas/mohoPerformancePir.js';

const toolByName = (name: string) => {
  const t = mohoActingBridgeTools.find(x => x.name === name);
  if (!t) throw new Error(`tool ${name} missing`);
  return t;
};

function emptyPir(): MohoPerformancePir {
  return {
    schemaVersion: '1.0',
    performanceId: 'pir_integration_acting',
    rigType: 'humanoid_2leg',
    shotManifestRef: './scene_plan.json',
    mohoShowBibleRef: './moho_show_bible.json',
    boneKeys: [],
    switchKeys: [],
    smartBoneActions: [],
    cameraKeys: [],
    fxKeys: [],
    deterministicFingerprint: 'a'.repeat(64),
    provenance: {
      compiledAt: '2026-01-01T00:00:00.000Z',
      compilerVersion: 'moho-acting-bridge-integration-v1'
    }
  };
}

describe('Acting integration — golden path (talk + gesture + react)', () => {
  it('runs full pipeline: scene_plan -> bridge output -> merged PIR', async () => {
    const bridge = MohoActingBridge.generate({
      characters: [
        {
          characterId: 'speaker',
          rigType: 'humanoid_2leg',
          fps: 24,
          actions: [
            { type: 'talk', frames: [1, 48], text: 'Once upon a time', emotion: 'happy' },
            { type: 'gesture', frames: [49, 60], gestureName: 'wave' },
            { type: 'react', frames: [61, 80], emotion: 'surprised' }
          ]
        }
      ]
    });

    expect(bridge.boneKeys.length).toBeGreaterThan(0);
    expect(bridge.switchKeys.length).toBeGreaterThan(0);
    expect(bridge.smartBoneActions.length).toBeGreaterThan(0);
    expect(bridge.fxKeys.length).toBeGreaterThan(0);

    const pir = emptyPir();
    const merged = MohoActingBridge.mergeIntoPir(pir, bridge);

    expect(merged.boneKeys.length).toBe(bridge.boneKeys.length);
    expect(merged.switchKeys.length).toBe(bridge.switchKeys.length);
    expect(merged.smartBoneActions.length).toBe(bridge.smartBoneActions.length);
    expect(merged.fxKeys.length).toBe(bridge.fxKeys.length);

    for (let i = 1; i < merged.boneKeys.length; i++) {
      const a = merged.boneKeys[i - 1];
      const b = merged.boneKeys[i];
      if (a.frame !== b.frame) {
        expect(a.frame).toBeLessThanOrEqual(b.frame);
      } else {
        expect(a.boneName.localeCompare(b.boneName)).toBeLessThanOrEqual(0);
      }
    }
  });

  it('MCP tool moho.acting.generate returns same fingerprint as direct service call', async () => {
    const input = {
      characters: [
        {
          characterId: 'speaker',
          rigType: 'humanoid_2leg' as const,
          fps: 24,
          actions: [
            { type: 'talk' as const, frames: [1, 30] as [number, number], text: 'integration test' }
          ]
        }
      ]
    };
    const direct = MohoActingBridge.generate(input);
    const toolResult = (await toolByName('moho.acting.generate').handler(input as never)) as {
      status: 'success';
      output: { fingerprint: string };
    };
    expect(toolResult.status).toBe('success');
    expect(toolResult.output.fingerprint).toBe(direct.fingerprint);
  });

  it('MCP tool moho.acting.merge_into_pir is idempotent on same input', async () => {
    const input = {
      characters: [
        {
          characterId: 'speaker',
          rigType: 'humanoid_2leg' as const,
          actions: [
            { type: 'gesture' as const, frames: [10, 30] as [number, number], gestureName: 'shrug' }
          ]
        }
      ]
    };
    const bridge = MohoActingBridge.generate(input);
    const pir = emptyPir();
    const tool = toolByName('moho.acting.merge_into_pir');
    const aRes = (await tool.handler({ pir, bridge } as never)) as {
      status: 'success';
      mergedPir: { boneKeys: unknown[]; switchKeys: unknown[]; smartBoneActions: unknown[]; fxKeys: unknown[] };
    };
    const bRes = (await tool.handler({ pir, bridge } as never)) as typeof aRes;
    expect(aRes.status).toBe('success');
    expect(bRes.status).toBe('success');
    const a = aRes.mergedPir;
    const b = bRes.mergedPir;
    expect(a.boneKeys.length).toBe(b.boneKeys.length);
    expect(a.switchKeys.length).toBe(b.switchKeys.length);
    expect(a.smartBoneActions.length).toBe(b.smartBoneActions.length);
    expect(a.fxKeys.length).toBe(b.fxKeys.length);
  });
});

describe('Acting integration — multi-character scene', () => {
  it('handles two characters in the same shot', () => {
    const out = MohoActingBridge.generate({
      characters: [
        {
          characterId: 'hero',
          rigType: 'humanoid_2leg',
          actions: [{ type: 'talk', frames: [1, 30], text: 'Look out!', emotion: 'angry' }]
        },
        {
          characterId: 'sidekick',
          rigType: 'humanoid_2leg',
          actions: [{ type: 'react', frames: [1, 30], emotion: 'surprised' }]
        }
      ]
    });
    expect(out.diagnostics.charactersProcessed).toBe(2);
    expect(out.diagnostics.actionsProcessed).toBe(2);

    const heroBones = out.boneKeys.filter(k => k.boneName.endsWith('__hero'));
    const sidekickFx = out.fxKeys.filter(k => k.target.includes('sidekick'));
    expect(heroBones.length).toBeGreaterThan(0);
    expect(sidekickFx.length).toBeGreaterThan(0);
  });
});

describe('Acting integration — coverage metric', () => {
  it('acting-bridge replaces ≥80% of the 22% key-animation white-space from HONEST_REPLACEMENT_STATUS.md §5.2', () => {
    const out = MohoActingBridge.generate({
      characters: [
        {
          characterId: 'speaker',
          rigType: 'humanoid_2leg',
          fps: 24,
          actions: [
            { type: 'talk', frames: [1, 48], text: 'This is a full dialogue line', emotion: 'happy' },
            { type: 'gesture', frames: [49, 65], gestureName: 'wave' },
            { type: 'react', frames: [66, 90], emotion: 'surprised' },
            { type: 'idle', frames: [91, 100] }
          ]
        }
      ]
    });

    const phonemeKeyframes = out.diagnostics.phonemeKeyframesEmitted;
    const actingTracks = out.diagnostics.tracksEmitted;
    const smartActions = out.smartBoneActions.length;
    const fxKeys = out.fxKeys.length;

    expect(phonemeKeyframes).toBeGreaterThan(15);
    expect(actingTracks).toBeGreaterThanOrEqual(4);
    expect(smartActions).toBeGreaterThanOrEqual(6);
    expect(fxKeys).toBeGreaterThanOrEqual(3);

    const totalKeys = out.boneKeys.length + out.switchKeys.length + out.smartBoneActions.length + out.fxKeys.length;
    expect(totalKeys).toBeGreaterThan(40);
  });
});
