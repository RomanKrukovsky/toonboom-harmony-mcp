/**
 * MCP tools for Harmony Action Recorder v1.
 *
 * Every tool here has a real backend in `src/services/harmonyActionRecorder`. The recorder is
 * read-only with respect to scene content, so none of these tools requires destructive
 * confirmation; they create only their own evidence artifacts.
 */

import { z } from 'zod';
import path from 'path';
import { HarmonyError } from '../security.js';
import { getRecorder } from '../services/harmonyActionRecorder/index.js';
import { loadRecorderConfig } from '../services/harmonyActionRecorder/config.js';
import { SceneStateProvider } from '../services/sceneStateCapture/index.js';
import { FixtureSceneStateProvider } from '../services/sceneStateCapture/fixtureProvider.js';
import { HarmonyBridgeSceneStateProvider } from '../services/sceneStateCapture/harmonyBridgeProvider.js';
import { rawEventSignalSchema } from '../schemas/harmonyActionDataset.js';

const providerModeSchema = z
  .enum(['auto', 'harmony_python_bridge', 'fixture'])
  .describe(
    'Which scene-state provider to read with. "fixture" is offline test data and is labelled as such in every artifact.'
  );

/**
 * Build the requested provider.
 * `auto` prefers the real Harmony bridge and falls back to fixtures only when the caller
 * supplied them — it never silently substitutes fake data for a real read.
 */
export function buildProvider(
  mode: z.infer<typeof providerModeSchema>,
  fixtureStatePaths?: string[],
  scenePath?: string
): SceneStateProvider {
  if (mode === 'fixture') {
    if (!fixtureStatePaths || fixtureStatePaths.length === 0) {
      throw new HarmonyError('INVALID_INPUT', 'provider "fixture" requires fixtureStatePaths.');
    }
    return new FixtureSceneStateProvider({ statePaths: fixtureStatePaths.map(p => path.resolve(p)) });
  }
  if (mode === 'harmony_python_bridge') {
    return new HarmonyBridgeSceneStateProvider(60000, scenePath);
  }
  if (fixtureStatePaths && fixtureStatePaths.length > 0) {
    return new FixtureSceneStateProvider({ statePaths: fixtureStatePaths.map(p => path.resolve(p)) });
  }
  return new HarmonyBridgeSceneStateProvider(60000, scenePath);
}

export const harmonyActionRecorderTools = [
  {
    name: 'harmony.capture.start',
    description:
      'Starts a Harmony Action Recorder session: captures the "before" scene state, creates an immutable evidence directory and begins the append-only event log. Read-only with respect to the scene.',
    inputSchema: z.object({
      scenePath: z.string().describe('Absolute path to the Harmony scene (.xstage) to observe.'),
      sceneId: z.string().optional().describe('Stable scene identifier. Defaults to the scene file base name.'),
      sessionId: z
        .string()
        .regex(/^[A-Za-z0-9._-]+$/)
        .optional()
        .describe('Explicit session id. Must not already exist.'),
      provider: providerModeSchema.default('auto'),
      fixtureStatePaths: z
        .array(z.string())
        .optional()
        .describe('Ordered offline scene-state JSON files, used when provider is "fixture".'),
      debounceMs: z.number().int().positive().max(60000).optional(),
      captureNotes: z.string().max(2000).optional()
    }),
    handler: async (args: {
      scenePath: string;
      sceneId?: string;
      sessionId?: string;
      provider: 'auto' | 'harmony_python_bridge' | 'fixture';
      fixtureStatePaths?: string[];
      debounceMs?: number;
      captureNotes?: string;
    }) => {
      const provider = buildProvider(args.provider, args.fixtureStatePaths, args.scenePath);
      const result = await getRecorder().start({
        scenePath: args.scenePath,
        sceneId: args.sceneId,
        sessionId: args.sessionId,
        provider,
        captureNotes: args.captureNotes,
        configOverrides: args.debounceMs ? { debounceMs: args.debounceMs } : undefined
      });

      return {
        status: 'success',
        sessionId: result.session.sessionId,
        observedExecutionMode: result.observedExecutionMode,
        beforeStateHash: result.beforeStateHash,
        evidenceDir: result.evidenceDir,
        notifierStatus: result.notifierStatus,
        notifierBlockingReason: result.notifierBlockingReason,
        stateProvider: result.session.source,
        providerAvailable: result.providerAvailable,
        providerBlockingReason: result.providerBlockingReason,
        notCaptured: result.session.notCaptured
      };
    }
  },

  {
    name: 'harmony.capture.record_instruction',
    description:
      'Records the animator task description for a running session. This text is the only source of artistic intent in the exported dataset entry.',
    inputSchema: z.object({
      sessionId: z.string(),
      text: z.string().min(1).max(4000).describe('The task in the animator\'s own words.'),
      language: z.string().max(16).optional(),
      author: z.string().max(200).optional(),
      tags: z.array(z.string().max(64)).max(32).optional(),
      externalDemoRef: z.string().max(1000).optional().describe('Pointer to an external demo recording. Not ingested in v1.'),
      transcriptRef: z.string().max(1000).optional().describe('Pointer to an external transcript. v1 runs no speech recognition.')
    }),
    handler: async (args: {
      sessionId: string;
      text: string;
      language?: string;
      author?: string;
      tags?: string[];
      externalDemoRef?: string;
      transcriptRef?: string;
    }) => {
      const instruction = getRecorder().recordInstruction(args);
      return { status: 'success', sessionId: args.sessionId, recordedAt: instruction.recordedAt, instruction };
    }
  },

  {
    name: 'harmony.capture.snapshot',
    description:
      'Flushes the debounced dirty-entity queue and stores an intermediate normalized scene state for a running session.',
    inputSchema: z.object({
      sessionId: z.string(),
      force: z.boolean().default(false).describe('Snapshot even when no entity was reported dirty.'),
      notifierEvents: z
        .array(
          z.object({
            signal: rawEventSignalSchema,
            targets: z.array(z.string()).default([]),
            timestamp: z.string().datetime().optional()
          })
        )
        .optional()
        .describe('SceneChangeNotifier signals observed since the last call. Signals only mark entities dirty.')
    }),
    handler: async (args: {
      sessionId: string;
      force: boolean;
      notifierEvents?: Array<{ signal: any; targets: string[]; timestamp?: string }>;
    }) => {
      const recorder = getRecorder();
      let ingested = 0;
      if (args.notifierEvents && args.notifierEvents.length > 0) {
        ingested = recorder.ingestNotifierEvents(args.sessionId, args.notifierEvents).accepted;
      }
      const snapshot = await recorder.snapshot(args.sessionId, { force: args.force });
      return { status: 'success', sessionId: args.sessionId, eventsIngested: ingested, ...snapshot };
    }
  },

  {
    name: 'harmony.capture.status',
    description:
      'Reports the true status of a capture session. A session left "recording" by a crashed process is reported and persisted as "interrupted".',
    inputSchema: z.object({
      sessionId: z.string().optional().describe('Omit to list every session in the artifact store.')
    }),
    handler: async (args: { sessionId?: string }) => {
      const recorder = getRecorder();
      if (!args.sessionId) {
        return { status: 'success', artifactRoot: recorder.artifactRoot, sessions: recorder.listSessions() };
      }
      const info = recorder.status(args.sessionId);
      return {
        status: 'success',
        sessionId: args.sessionId,
        sessionStatus: info.session.status,
        live: info.live,
        pendingDirty: info.pendingDirty,
        debounceRemainingMs: info.debounceRemainingMs,
        eventCount: info.eventCount,
        truncatedTailBytes: info.truncatedTailBytes,
        artifactsPresent: info.artifactsPresent,
        requiresHumanReview: info.session.requiresHumanReview,
        warnings: info.session.warnings,
        errors: info.session.errors
      };
    }
  },

  {
    name: 'harmony.capture.stop',
    description:
      'Stops a session: waits for the debounce queue to settle, captures the "after" state, computes the deterministic semantic scene patch and the inverse patch, and writes the immutable artifacts.',
    inputSchema: z.object({
      sessionId: z.string(),
      renderStatus: z
        .enum(['not_executed', 'blocked'])
        .default('not_executed')
        .describe('The recorder never renders; this records why no render exists.'),
      renderBlockingReason: z.string().max(2000).optional()
    }),
    handler: async (args: {
      sessionId: string;
      renderStatus: 'not_executed' | 'blocked';
      renderBlockingReason?: string;
    }) => {
      const result = await getRecorder().stop(args.sessionId, {
        renderStatus: args.renderStatus,
        renderBlockingReason: args.renderBlockingReason
      });

      return {
        status: 'success',
        sessionId: args.sessionId,
        sessionStatus: result.session.status,
        patchHash: result.patch.deterministicHash,
        beforeStateHash: result.patch.beforeStateHash,
        afterStateHash: result.patch.afterStateHash,
        operationCount: result.summary.operationCount,
        operationCounts: result.patch.summary.operationCounts,
        originCounts: result.summary.originCounts,
        nodesChanged: result.summary.nodesChanged,
        columnsChanged: result.summary.columnsChanged,
        framesTouched: result.summary.framesTouched,
        fullyReversible: result.patch.fullyReversible,
        requiresHumanReview: result.patch.requiresHumanReview,
        renderStatus: result.executionReport.renderStatus,
        realHarmonyStatus: result.executionReport.realHarmonyStatus,
        warnings: result.patch.warnings,
        artifacts: result.artifacts
      };
    }
  },

  {
    name: 'harmony.capture.approve',
    description:
      'Records an immutable "approved" decision for a stopped session. The scene patch is never modified by this call.',
    inputSchema: z.object({
      sessionId: z.string(),
      reviewer: z.string().max(200).optional(),
      note: z.string().max(4000).optional(),
      qualityTags: z.array(z.string().max(64)).max(32).optional()
    }),
    handler: async (args: { sessionId: string; reviewer?: string; note?: string; qualityTags?: string[] }) => {
      const { approval, session } = getRecorder().decide({ ...args, decision: 'approved' });
      return {
        status: 'success',
        sessionId: args.sessionId,
        decision: approval.decision,
        decidedAt: approval.decidedAt,
        patchHash: approval.patchHash,
        sessionStatus: session.status
      };
    }
  },

  {
    name: 'harmony.capture.reject',
    description:
      'Records an immutable "rejected" decision for a stopped session. The scene patch is never modified by this call.',
    inputSchema: z.object({
      sessionId: z.string(),
      reviewer: z.string().max(200).optional(),
      note: z.string().max(4000).optional(),
      qualityTags: z.array(z.string().max(64)).max(32).optional()
    }),
    handler: async (args: { sessionId: string; reviewer?: string; note?: string; qualityTags?: string[] }) => {
      const { approval, session } = getRecorder().decide({ ...args, decision: 'rejected' });
      return {
        status: 'success',
        sessionId: args.sessionId,
        decision: approval.decision,
        decidedAt: approval.decidedAt,
        patchHash: approval.patchHash,
        sessionStatus: session.status
      };
    }
  },

  {
    name: 'harmony.capture.export_dataset_entry',
    description:
      'Exports a decided session as a HarmonyActionDatasetEntry: instruction, before/after state references, normalized operations, inverse operations, approval, provenance and usage restrictions.',
    inputSchema: z.object({
      sessionId: z.string(),
      includeRejected: z.boolean().default(false).describe('Export a rejected session as a negative example.')
    }),
    handler: async (args: { sessionId: string; includeRejected: boolean }) => {
      const entry = getRecorder().exportDatasetEntry(args.sessionId, { includeRejected: args.includeRejected });
      return {
        status: 'success',
        sessionId: args.sessionId,
        entryId: entry.entryId,
        entryHash: entry.deterministicHash,
        decision: entry.approval.decision,
        operationCount: entry.operations.length,
        originCounts: entry.provenance.originCounts,
        renderStatus: entry.renderStatus,
        interpretationLimits: entry.usageRestrictions.interpretationLimits,
        entry
      };
    }
  },

  {
    name: 'harmony.capture.compare_sessions',
    description:
      'Compares the scene patches of two finished sessions: whether they touched the same scene, whether the patches are identical, and which operations are unique to each.',
    inputSchema: z.object({
      sessionIdA: z.string(),
      sessionIdB: z.string()
    }),
    handler: async (args: { sessionIdA: string; sessionIdB: string }) => {
      const comparison = getRecorder().compareSessions(args.sessionIdA, args.sessionIdB);
      return { status: 'success', ...comparison };
    }
  }
];

/** Effective recorder configuration, exposed for diagnostics and tests. */
export function describeRecorderConfig() {
  return loadRecorderConfig();
}
