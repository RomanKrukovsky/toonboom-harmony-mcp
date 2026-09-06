import { evaluateMohoTemporalQa } from '../src/services/mohoTemporalQa/index.js';

function healthyInput() {
  return {
    durationFrames: 24,
    controllerTracks: [{
      controllerId: 'root', channel: 'translation' as const,
      keys: [{ frame: 0, value: 0 }, { frame: 12, value: 20 }, { frame: 23, value: 30 }]
    }],
    limbTracks: [{
      limbId: 'arm', expectedLengthPx: 100,
      samples: [{ frame: 0, lengthPx: 100 }, { frame: 12, lengthPx: 102 }, { frame: 23, lengthPx: 99 }]
    }],
    plantedContacts: [{
      controllerId: 'foot', fromFrame: 4, toFrame: 10,
      samples: [{ frame: 4, x: 10, y: 20 }, { frame: 10, x: 10.4, y: 20.2 }]
    }],
    cameraKeys: [
      { frame: 0, xPixels: 0, yPixels: 0, zoom: 1, rotationDeg: 0 },
      { frame: 23, xPixels: 100, yPixels: 0, zoom: 1.1, rotationDeg: 2 }
    ],
    switchTracks: [{ switchId: 'mouth', keys: [{ frame: 2, choice: 'A' }, { frame: 8, choice: 'B' }] }],
    lipsyncPairs: [{ expectedFrame: 8, actualFrame: 9 }],
    renderSamples: [
      { frame: 0, sha256: 'a'.repeat(64) },
      { frame: 6, sha256: 'b'.repeat(64) },
      { frame: 12, sha256: 'c'.repeat(64) }
    ],
    collisions: [] as Array<{ frame: number; firstPartId: string; secondPartId: string }>
  };
}

describe('Moho temporal QA', () => {
  it('passes stable production motion', async () => {
    const report = await evaluateMohoTemporalQa(healthyInput());

    expect(report.passed).toBe(true);
    expect(report.controllerContinuity.passed).toBe(true);
    expect(report.lipsync.maxDriftFrames).toBeLessThanOrEqual(2);
  });

  it('detects all eight temporal defect categories', async () => {
    const input = healthyInput();
    input.plantedContacts[0].samples[1] = { frame: 10, x: 18, y: 20 };
    input.limbTracks[0].samples[1].lengthPx = 145;
    input.controllerTracks[0].keys[1].value = 900;
    input.cameraKeys[1].xPixels = 20_000;
    input.switchTracks[0].keys = [
      { frame: 2, choice: 'A' }, { frame: 3, choice: 'B' }, { frame: 4, choice: 'A' }
    ];
    input.lipsyncPairs[0].actualFrame = 13;
    input.renderSamples = [
      { frame: 0, sha256: 'a'.repeat(64) },
      { frame: 6, sha256: 'a'.repeat(64) },
      { frame: 12, sha256: 'a'.repeat(64) },
      { frame: 18, sha256: 'a'.repeat(64) }
    ];
    input.collisions = [{ frame: 12, firstPartId: 'hand', secondPartId: 'face' }];

    const report = await evaluateMohoTemporalQa(input);

    expect(report.passed).toBe(false);
    expect(report.footSliding.passed).toBe(false);
    expect(report.limbLength.passed).toBe(false);
    expect(report.controllerContinuity.passed).toBe(false);
    expect(report.cameraContinuity.passed).toBe(false);
    expect(report.frozenHolds.passed).toBe(false);
    expect(report.lipsync.passed).toBe(false);
    expect(report.switchStability.passed).toBe(false);
    expect(report.collisions.passed).toBe(false);
  });
});
