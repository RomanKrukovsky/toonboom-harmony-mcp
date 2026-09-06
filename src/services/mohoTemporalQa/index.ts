import {
  mohoTemporalQaInputSchema,
  mohoTemporalQaReportSchema,
  type MohoTemporalQaInput,
  type MohoTemporalQaReport
} from '../../schemas/mohoTemporalQa.js';

function sortedByFrame<T extends { frame: number }>(values: T[]): T[] {
  return [...values].sort((left, right) => left.frame - right.frame);
}

function issue(passed: boolean, message: string): string[] {
  return passed ? [] : [message];
}

export async function evaluateMohoTemporalQa(input: MohoTemporalQaInput): Promise<MohoTemporalQaReport> {
  const data = mohoTemporalQaInputSchema.parse(input);

  let maxSlidePx = 0;
  for (const contact of data.plantedContacts) {
    const samples = sortedByFrame(contact.samples);
    const origin = samples[0];
    for (const sample of samples.slice(1)) {
      maxSlidePx = Math.max(maxSlidePx, Math.hypot(sample.x - origin.x, sample.y - origin.y));
    }
  }
  const footSlidingPassed = maxSlidePx <= 1;

  let maxDeviationRatio = 0;
  for (const limb of data.limbTracks) {
    for (const sample of limb.samples) {
      maxDeviationRatio = Math.max(
        maxDeviationRatio,
        Math.abs(sample.lengthPx - limb.expectedLengthPx) / limb.expectedLengthPx
      );
    }
  }
  const limbLengthPassed = maxDeviationRatio <= 0.1;

  let maxDeltaPerFrame = 0;
  let controllerContinuityPassed = true;
  const controllerLimits = { rotation: 45, translation: 50, scale: 0.25 } as const;
  for (const track of data.controllerTracks) {
    const keys = sortedByFrame(track.keys);
    for (let index = 1; index < keys.length; index += 1) {
      const frameGap = Math.max(1, keys[index].frame - keys[index - 1].frame);
      const delta = Math.abs(keys[index].value - keys[index - 1].value) / frameGap;
      maxDeltaPerFrame = Math.max(maxDeltaPerFrame, delta);
      if (delta > controllerLimits[track.channel]) controllerContinuityPassed = false;
    }
  }

  let maxVelocityPerFrame = 0;
  let cameraContinuityPassed = true;
  const cameraKeys = sortedByFrame(data.cameraKeys);
  for (let index = 1; index < cameraKeys.length; index += 1) {
    const previous = cameraKeys[index - 1];
    const current = cameraKeys[index];
    const frameGap = Math.max(1, current.frame - previous.frame);
    const positionVelocity = Math.hypot(current.xPixels - previous.xPixels, current.yPixels - previous.yPixels) / frameGap;
    const zoomVelocity = Math.abs(current.zoom - previous.zoom) / frameGap;
    const rotationVelocity = Math.abs(current.rotationDeg - previous.rotationDeg) / frameGap;
    maxVelocityPerFrame = Math.max(maxVelocityPerFrame, positionVelocity);
    if (positionVelocity > 100 || zoomVelocity > 0.1 || rotationVelocity > 10) cameraContinuityPassed = false;
  }

  let longestFrozenFrames = 0;
  const renderSamples = sortedByFrame(data.renderSamples);
  let frozenStart = renderSamples[0]?.frame ?? 0;
  for (let index = 1; index < renderSamples.length; index += 1) {
    if (renderSamples[index].sha256 !== renderSamples[index - 1].sha256) {
      frozenStart = renderSamples[index].frame;
      continue;
    }
    longestFrozenFrames = Math.max(longestFrozenFrames, renderSamples[index].frame - frozenStart);
  }
  const frozenHoldsPassed = longestFrozenFrames < 12;

  const maxDriftFrames = Math.max(
    0,
    ...data.lipsyncPairs.map(pair => Math.abs(pair.actualFrame - pair.expectedFrame))
  );
  const lipsyncPassed = maxDriftFrames <= 2;

  let minimumChangeGapFrames = data.durationFrames;
  let switchStabilityPassed = true;
  for (const track of data.switchTracks) {
    const keys = sortedByFrame(track.keys);
    for (let index = 1; index < keys.length; index += 1) {
      if (keys[index].choice === keys[index - 1].choice) continue;
      const gap = keys[index].frame - keys[index - 1].frame;
      minimumChangeGapFrames = Math.min(minimumChangeGapFrames, gap);
      if (gap < 2) switchStabilityPassed = false;
    }
  }
  if (data.switchTracks.length === 0) minimumChangeGapFrames = 0;

  const collisionsPassed = data.collisions.length === 0;
  const checksPassed = [
    footSlidingPassed,
    limbLengthPassed,
    controllerContinuityPassed,
    cameraContinuityPassed,
    frozenHoldsPassed,
    lipsyncPassed,
    switchStabilityPassed,
    collisionsPassed
  ];

  return mohoTemporalQaReportSchema.parse({
    schemaVersion: '1.0',
    passed: checksPassed.every(Boolean),
    footSliding: { passed: footSlidingPassed, maxSlidePx, issues: issue(footSlidingPassed, `Planted controller moved ${maxSlidePx.toFixed(3)} px.`) },
    limbLength: { passed: limbLengthPassed, maxDeviationRatio, issues: issue(limbLengthPassed, `Limb length deviation reached ${(maxDeviationRatio * 100).toFixed(2)}%.`) },
    controllerContinuity: { passed: controllerContinuityPassed, maxDeltaPerFrame, issues: issue(controllerContinuityPassed, 'Controller velocity exceeded its channel limit.') },
    cameraContinuity: { passed: cameraContinuityPassed, maxVelocityPerFrame, issues: issue(cameraContinuityPassed, 'Camera velocity or zoom/rotation delta exceeded its limit.') },
    frozenHolds: { passed: frozenHoldsPassed, longestFrozenFrames, issues: issue(frozenHoldsPassed, `Rendered image remained unchanged for ${longestFrozenFrames} frames.`) },
    lipsync: { passed: lipsyncPassed, maxDriftFrames, issues: issue(lipsyncPassed, `Lip-sync drift reached ${maxDriftFrames} frames.`) },
    switchStability: { passed: switchStabilityPassed, minimumChangeGapFrames, issues: issue(switchStabilityPassed, `Switch changed again after ${minimumChangeGapFrames} frame(s).`) },
    collisions: { passed: collisionsPassed, count: data.collisions.length, issues: data.collisions.map(collision => `${collision.firstPartId} collides with ${collision.secondPartId} at frame ${collision.frame}.`) }
  });
}
