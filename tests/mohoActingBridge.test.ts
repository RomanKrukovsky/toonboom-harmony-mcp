import { describe, it, expect } from '@jest/globals';
import {
  MohoActingBridge,
  MOHO_ACTING_BRIDGE_SCHEMA_VERSION,
  type MohoActingBridgeInput,
  type MohoActingBridgeOutput
} from '../src/services/mohoActingBridge/index.js';

const BASE_HUMANOID: MohoActingBridgeInput = {
  characters: [
    {
      characterId: 'speaker',
      rigType: 'humanoid_2leg',
      fps: 24,
      actions: [
        {
          type: 'talk',
          frames: [25, 60],
          text: 'Hello world',
          emotion: 'happy'
        },
        {
          type: 'gesture',
          frames: [60, 72],
          gestureName: 'wave'
        }
      ]
    }
  ]
};

describe('MohoActingBridge — basic invariants', () => {
  it('exports stable schema version', () => {
    expect(MOHO_ACTING_BRIDGE_SCHEMA_VERSION).toBe('1.0');
  });

  it('generates bone + switch + smartBone + fx keys for humanoid talk', () => {
    const out: MohoActingBridgeOutput = MohoActingBridge.generate(BASE_HUMANOID);
    expect(out.boneKeys.length).toBeGreaterThan(0);
    expect(out.switchKeys.length).toBeGreaterThan(0);
    expect(out.smartBoneActions.length).toBeGreaterThan(0);
    expect(out.diagnostics.charactersProcessed).toBe(1);
    expect(out.diagnostics.actionsProcessed).toBe(2);
    expect(out.diagnostics.phonemeKeyframesEmitted).toBeGreaterThan(0);
  });

  it('emits fingerprinted output (SHA-256, 64 hex)', () => {
    const out = MohoActingBridge.generate(BASE_HUMANOID);
    expect(out.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic — same input -> same fingerprint', () => {
    const a = MohoActingBridge.generate(BASE_HUMANOID);
    const b = MohoActingBridge.generate(BASE_HUMANOID);
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.boneKeys.length).toBe(b.boneKeys.length);
    expect(a.switchKeys.length).toBe(b.switchKeys.length);
    expect(a.smartBoneActions.length).toBe(b.smartBoneActions.length);
  });

  it('zero characters -> empty arrays + zero counters', () => {
    const out = MohoActingBridge.generate({ characters: [] });
    expect(out.boneKeys).toEqual([]);
    expect(out.switchKeys).toEqual([]);
    expect(out.smartBoneActions).toEqual([]);
    expect(out.fxKeys).toEqual([]);
    expect(out.diagnostics.actionsProcessed).toBe(0);
    expect(out.diagnostics.phonemeKeyframesEmitted).toBe(0);
  });
});

describe('MohoActingBridge — talk action phonemes', () => {
  it('emits Rest phoneme at start-2 and end frames', () => {
    const out = MohoActingBridge.generate(BASE_HUMANOID);
    const mouthRests = out.switchKeys.filter(
      k => k.switchLayerName === 'Mouth' && k.choice === 'Rest'
    );
    expect(mouthRests.length).toBeGreaterThanOrEqual(2);
  });

  it('emits all keyframes inside the [startFrame, endFrame] window', () => {
    const out = MohoActingBridge.generate(BASE_HUMANOID);
    const mouthKeys = out.switchKeys.filter(k => k.switchLayerName === 'Mouth');
    for (const k of mouthKeys) {
      expect(k.frame).toBeGreaterThanOrEqual(25 - 2);
      expect(k.frame).toBeLessThanOrEqual(60);
    }
  });

  it('every keyframe has a recognised Preston-Blair phoneme', () => {
    const valid = new Set([
      'Rest',
      'A_I',
      'E',
      'O',
      'U',
      'F_V',
      'L',
      'W_Q',
      'M_B_P',
      'Smile'
    ]);
    const out = MohoActingBridge.generate(BASE_HUMANOID);
    for (const k of out.switchKeys) {
      if (k.switchLayerName !== 'Mouth') continue;
      expect(valid.has(k.choice)).toBe(true);
    }
  });
});

describe('MohoActingBridge — gesture library', () => {
  it('"wave" gesture produces 3 smart-bone keys (rest, peak, return)', () => {
    const out = MohoActingBridge.generate({
      characters: [
        {
          characterId: 'speaker',
          rigType: 'humanoid_2leg',
          actions: [
            { type: 'gesture', frames: [60, 72], gestureName: 'wave' }
          ]
        }
      ]
    });
    const waveKeys = out.smartBoneActions.filter(k => k.actionName.includes('wave'));
    expect(waveKeys.length).toBe(3);
    expect(waveKeys[0].frame).toBe(60);
    expect(waveKeys[1].frame).toBe(66);
    expect(waveKeys[2].frame).toBe(72);
  });

  it('unknown gesture is skipped and recorded in diagnostics.notes', () => {
    const out = MohoActingBridge.generate({
      characters: [
        {
          characterId: 'speaker',
          rigType: 'humanoid_2leg',
          actions: [
            { type: 'gesture', frames: [10, 20], gestureName: 'fancy_dance' }
          ]
        }
      ]
    });
    const note = out.diagnostics.notes.find(n => n.includes('Unknown gesture'));
    expect(note).toBeDefined();
  });

  it('every recognised gesture produces keys on every documented type', () => {
    const gestures = ['wave', 'shrug', 'point', 'nod', 'head_shake', 'lean_in'];
    for (const g of gestures) {
      const out = MohoActingBridge.generate({
        characters: [
          {
            characterId: 'speaker',
            rigType: 'humanoid_2leg',
            actions: [{ type: 'gesture', frames: [10, 30], gestureName: g }]
          }
        ]
      });
      const action = out.smartBoneActions.find(a => a.actionName.includes(g));
      expect(action).toBeDefined();
    }
  });
});

describe('MohoActingBridge — react / look_at / walk / idle', () => {
  it('react with happy emotion emits 3 fxKeys with positive value', () => {
    const out = MohoActingBridge.generate({
      characters: [
        {
          characterId: 'speaker',
          rigType: 'humanoid_2leg',
          actions: [
            { type: 'react', frames: [40, 60], emotion: 'happy' }
          ]
        }
      ]
    });
    const reactKeys = out.fxKeys.filter(k => k.type === 'react_emotion');
    expect(reactKeys.length).toBe(3);
    expect(reactKeys[1].value).toBeGreaterThan(0);
  });

  it('look_at emits 2 fxKeys (start, end)', () => {
    const out = MohoActingBridge.generate({
      characters: [
        {
          characterId: 'speaker',
          rigType: 'humanoid_2leg',
          actions: [{ type: 'look_at', frames: [10, 30] }]
        }
      ]
    });
    const lookKeys = out.fxKeys.filter(k => k.type === 'look_at');
    expect(lookKeys.length).toBe(2);
  });

  it('walk emits 3 fxKeys (start, mid, end)', () => {
    const out = MohoActingBridge.generate({
      characters: [
        {
          characterId: 'speaker',
          rigType: 'humanoid_2leg',
          actions: [{ type: 'walk', frames: [10, 40] }]
        }
      ]
    });
    const walkKeys = out.fxKeys.filter(k => k.type === 'walk_cycle');
    expect(walkKeys.length).toBe(3);
  });

  it('idle emits 2 rest bone keys (start, end) on Root', () => {
    const out = MohoActingBridge.generate({
      characters: [
        {
          characterId: 'speaker',
          rigType: 'humanoid_2leg',
          actions: [{ type: 'idle', frames: [1, 24] }]
        }
      ]
    });
    const rootKeys = out.boneKeys.filter(k => k.boneName === 'Root__speaker');
    expect(rootKeys.length).toBe(2);
    expect(rootKeys[0].frame).toBe(1);
    expect(rootKeys[1].frame).toBe(24);
  });
});

describe('MohoActingBridge — rig-type fall-backs', () => {
  it('quadruped talk emits stepped fall-back (3 mouth switches) instead of full dialogue tracks', () => {
    const out = MohoActingBridge.generate({
      characters: [
        {
          characterId: 'dog',
          rigType: 'quadruped',
          actions: [{ type: 'talk', frames: [10, 30], text: 'woof' }]
        }
      ]
    });
    const note = out.diagnostics.notes.find(n => n.includes('quadruped') && n.includes('fall-back'));
    expect(note).toBeDefined();
    const mouth = out.switchKeys.filter(k => k.switchLayerName === 'Mouth');
    expect(mouth.length).toBe(3);
  });

  it('mechanical rig skips phoneme synthesis but still emits squash/stretch smart actions', () => {
    const out = MohoActingBridge.generate({
      characters: [
        {
          characterId: 'robot',
          rigType: 'mechanical',
          actions: [{ type: 'idle', frames: [1, 50] }]
        }
      ]
    });
    expect(out.smartBoneActions.length).toBeGreaterThan(0);
    const note = out.diagnostics.notes.find(n => n.includes('mechanical'));
    expect(note).toBeDefined();
  });
});

describe('MohoActingBridge — mergeIntoPir', () => {
  it('merges acting output into existing PIR arrays and sorts by frame', () => {
    const existing = {
      boneKeys: [
        {
          boneId: 99,
          boneName: 'A__speaker',
          channel: 'rotation' as const,
          frame: 100,
          value: 1,
          interpolation: 'ease_in_out' as const
        }
      ],
      switchKeys: [
        {
          switchLayerName: 'ExistingSwitch',
          frame: 50,
          choice: 'X',
          interpolation: 'step' as const
        }
      ],
      smartBoneActions: [
        {
          actionName: 'Existing',
          targetBone: 't',
          frame: 200,
          angleDeg: 1,
          scaleX: 1,
          scaleY: 1
        }
      ],
      fxKeys: [
        { type: 'existing', target: 't', frame: 75, value: 1 }
      ]
    };
    const out = MohoActingBridge.generate(BASE_HUMANOID);
    const merged = MohoActingBridge.mergeIntoPir(existing, out);
    expect(merged.boneKeys.length).toBeGreaterThan(existing.boneKeys.length);
    expect(merged.switchKeys.length).toBeGreaterThan(existing.switchKeys.length);

    for (let i = 1; i < merged.boneKeys.length; i++) {
      const a = merged.boneKeys[i - 1];
      const b = merged.boneKeys[i];
      if (a.frame === b.frame) {
        expect(a.boneName.localeCompare(b.boneName)).toBeLessThanOrEqual(0);
      } else {
        expect(a.frame).toBeLessThanOrEqual(b.frame);
      }
    }
  });
});

describe('MohoActingBridge — emotion safety', () => {
  it('unknown emotion falls back to neutral without throwing', () => {
    const out = MohoActingBridge.generate({
      characters: [
        {
          characterId: 'speaker',
          rigType: 'humanoid_2leg',
          actions: [
            { type: 'react', frames: [10, 20], emotion: 'mayhem' as never }
          ]
        }
      ]
    });
    const reactKeys = out.fxKeys.filter(k => k.type === 'react_emotion');
    expect(reactKeys.length).toBe(3);
    expect(reactKeys[1].value).toBe(0);
  });
});
