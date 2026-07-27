/**
 * Harmony Action Recorder configuration.
 *
 * Every limit exists to stop a long animator session from producing an unbounded artifact,
 * and to stop a huge scene from being fully re-snapshotted on every notifier signal.
 */

import path from 'path';
import { config as harmonyConfig, getProjectRoot } from '../../config.js';
import { HarmonyError } from '../../security.js';

export interface RecorderCaptureCategories {
  nodes: boolean;
  connections: boolean;
  nodeAttributes: boolean;
  columns: boolean;
  keyframes: boolean;
  exposures: boolean;
  camera: boolean;
}

export interface HarmonyRecorderConfig {
  /** Root of immutable per-session evidence directories. */
  artifactRoot: string;
  /** Quiet period after the last notifier signal before dirty entities are re-read. */
  debounceMs: number;
  maxNodes: number;
  maxColumns: number;
  maxKeyframes: number;
  maxEvents: number;
  /** Scene files must live under one of these roots. Empty means "use config.allowedRoots". */
  allowedSceneRoots: string[];
  /** Replace absolute scene paths with hashes in exported dataset entries. */
  redactScenePaths: boolean;
  /** Additional substrings that must never appear in an exported dataset entry. */
  redactPatterns: string[];
  categories: RecorderCaptureCategories;
}

function intFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function boolFromEnv(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  return raw === 'true';
}

function listFromEnv(key: string): string[] {
  const raw = process.env[key];
  if (!raw) return [];
  return raw
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);
}

export function loadRecorderConfig(overrides: Partial<HarmonyRecorderConfig> = {}): HarmonyRecorderConfig {
  const categories: RecorderCaptureCategories = {
    nodes: boolFromEnv('HARMONY_CAPTURE_CATEGORY_NODES', true),
    connections: boolFromEnv('HARMONY_CAPTURE_CATEGORY_CONNECTIONS', true),
    nodeAttributes: boolFromEnv('HARMONY_CAPTURE_CATEGORY_NODE_ATTRIBUTES', true),
    columns: boolFromEnv('HARMONY_CAPTURE_CATEGORY_COLUMNS', true),
    keyframes: boolFromEnv('HARMONY_CAPTURE_CATEGORY_KEYFRAMES', true),
    exposures: boolFromEnv('HARMONY_CAPTURE_CATEGORY_EXPOSURES', true),
    camera: boolFromEnv('HARMONY_CAPTURE_CATEGORY_CAMERA', true),
    ...(overrides.categories ?? {})
  };

  const base: HarmonyRecorderConfig = {
    artifactRoot: path.resolve(
      process.env.HARMONY_CAPTURE_ARTIFACT_ROOT ||
        path.join(getProjectRoot(), 'artifacts', 'harmony-captures')
    ),
    debounceMs: intFromEnv('HARMONY_CAPTURE_DEBOUNCE_MS', 750),
    maxNodes: intFromEnv('HARMONY_CAPTURE_MAX_NODES', 5000),
    maxColumns: intFromEnv('HARMONY_CAPTURE_MAX_COLUMNS', 5000),
    maxKeyframes: intFromEnv('HARMONY_CAPTURE_MAX_KEYFRAMES', 100000),
    maxEvents: intFromEnv('HARMONY_CAPTURE_MAX_EVENTS', 50000),
    allowedSceneRoots: listFromEnv('HARMONY_CAPTURE_ALLOWED_SCENE_ROOTS'),
    redactScenePaths: boolFromEnv('HARMONY_CAPTURE_REDACT_SCENE_PATHS', true),
    redactPatterns: listFromEnv('HARMONY_CAPTURE_REDACT_PATTERNS'),
    categories
  };

  return { ...base, ...overrides, categories };
}

/**
 * Canonical-resolve a scene path and require it to sit under an allowed root.
 * Falls back to the server-wide allowlist when no recorder-specific roots are configured.
 */
export function resolveAllowedScenePath(scenePath: string, cfg: HarmonyRecorderConfig): string {
  const resolved = path.resolve(scenePath);
  const roots = (cfg.allowedSceneRoots.length > 0 ? cfg.allowedSceneRoots : harmonyConfig.allowedRoots).map(root =>
    path.resolve(root)
  );

  const permitted = roots.some(root => {
    const relative = path.relative(root, resolved);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });

  if (!permitted) {
    throw new HarmonyError(
      'CAPTURE_SCENE_ROOT_NOT_ALLOWED',
      `Scene path is outside every allowed capture root.`,
      { allowedRoots: roots }
    );
  }

  return resolved;
}
