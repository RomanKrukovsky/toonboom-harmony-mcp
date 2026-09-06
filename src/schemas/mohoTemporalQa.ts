import { z } from 'zod';

const scalarKeySchema = z.object({
  frame: z.number().int().nonnegative(),
  value: z.number().finite()
}).strict();

export const mohoTemporalQaInputSchema = z.object({
  durationFrames: z.number().int().positive(),
  controllerTracks: z.array(z.object({
    controllerId: z.string().min(1),
    channel: z.enum(['rotation', 'translation', 'scale']),
    keys: z.array(scalarKeySchema).min(1)
  }).strict()),
  limbTracks: z.array(z.object({
    limbId: z.string().min(1),
    expectedLengthPx: z.number().positive(),
    samples: z.array(z.object({
      frame: z.number().int().nonnegative(),
      lengthPx: z.number().nonnegative()
    }).strict()).min(1)
  }).strict()),
  plantedContacts: z.array(z.object({
    controllerId: z.string().min(1),
    fromFrame: z.number().int().nonnegative(),
    toFrame: z.number().int().nonnegative(),
    samples: z.array(z.object({
      frame: z.number().int().nonnegative(),
      x: z.number().finite(),
      y: z.number().finite()
    }).strict()).min(2)
  }).strict()),
  cameraKeys: z.array(z.object({
    frame: z.number().int().nonnegative(),
    xPixels: z.number().finite(),
    yPixels: z.number().finite(),
    zoom: z.number().positive(),
    rotationDeg: z.number().finite()
  }).strict()),
  switchTracks: z.array(z.object({
    switchId: z.string().min(1),
    keys: z.array(z.object({
      frame: z.number().int().nonnegative(),
      choice: z.string().min(1)
    }).strict()).min(1)
  }).strict()),
  lipsyncPairs: z.array(z.object({
    expectedFrame: z.number().int().nonnegative(),
    actualFrame: z.number().int().nonnegative()
  }).strict()),
  renderSamples: z.array(z.object({
    frame: z.number().int().nonnegative(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/)
  }).strict()),
  collisions: z.array(z.object({
    frame: z.number().int().nonnegative(),
    firstPartId: z.string().min(1),
    secondPartId: z.string().min(1)
  }).strict())
}).strict();

const checkSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.string())
}).strict();

export const mohoTemporalQaReportSchema = z.object({
  schemaVersion: z.literal('1.0'),
  passed: z.boolean(),
  footSliding: checkSchema.extend({ maxSlidePx: z.number().nonnegative() }).strict(),
  limbLength: checkSchema.extend({ maxDeviationRatio: z.number().nonnegative() }).strict(),
  controllerContinuity: checkSchema.extend({ maxDeltaPerFrame: z.number().nonnegative() }).strict(),
  cameraContinuity: checkSchema.extend({ maxVelocityPerFrame: z.number().nonnegative() }).strict(),
  frozenHolds: checkSchema.extend({ longestFrozenFrames: z.number().int().nonnegative() }).strict(),
  lipsync: checkSchema.extend({ maxDriftFrames: z.number().int().nonnegative() }).strict(),
  switchStability: checkSchema.extend({ minimumChangeGapFrames: z.number().int().nonnegative() }).strict(),
  collisions: checkSchema.extend({ count: z.number().int().nonnegative() }).strict()
}).strict();

export type MohoTemporalQaInput = z.infer<typeof mohoTemporalQaInputSchema>;
export type MohoTemporalQaReport = z.infer<typeof mohoTemporalQaReportSchema>;
