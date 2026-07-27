/**
 * Real scene state provider backed by the headless Harmony Python bridge
 * (`scripts/python/harmony_bridge.py`, module `ToonBoom.harmony`).
 *
 * Read-only: it issues only `detect`, `inspect_project`, `list_nodes`, `get_node_attrs`,
 * `list_timeline` and `list_drawings`. It never writes to the scene.
 *
 * When the runtime refuses (no license, Harmony not running, module missing) the provider
 * reports the runtime's own message verbatim as the blocking reason instead of degrading
 * to synthetic data.
 */

import { HarmonyPython } from '../../adapters/harmonyPython.js';
import { HarmonyError } from '../../security.js';
import {
  SceneColumn,
  SceneConnection,
  SceneExposure,
  SceneKeyframe,
  SceneNode,
  SceneNodeAttribute
} from '../../schemas/harmonyActionDataset.js';
import { ProviderAvailability, RawSceneState, SceneStateProvider, SceneStateProviderContext } from './index.js';

/** Attribute keywords treated as peg/transformation attributes when classifying operations. */
export const TRANSFORM_ATTRIBUTE_PREFIXES = ['OFFSET', 'POSITION', 'ROTATION', 'SCALE', 'SKEW', 'PIVOT', 'ANGLE'];

export class HarmonyBridgeSceneStateProvider implements SceneStateProvider {
  readonly source = 'harmony_python_bridge' as const;

  /**
   * @param probeScenePath when given, `describe()` asks the bridge to actually open this
   *        scene, so availability reflects the code path `captureFull` will take rather than
   *        the weaker question of whether a Harmony GUI session happens to be running.
   */
  constructor(
    private readonly timeoutMs = 60000,
    private readonly probeScenePath?: string
  ) {}

  async describe(): Promise<ProviderAvailability> {
    try {
      const detect = await HarmonyPython.runCommand(
        'detect',
        this.probeScenePath ? { projectPath: this.probeScenePath } : {},
        this.timeoutMs
      );
      const probeError: string | undefined = detect?.capabilities?.session_probe_error;
      const hasProject = detect?.capabilities?.has_open_project === true;
      return {
        source: this.source,
        available: hasProject && !probeError,
        blockingReason: probeError || (hasProject ? undefined : 'Harmony Python API reports no open_project capability.')
      };
    } catch (error: any) {
      return {
        source: this.source,
        available: false,
        blockingReason: `${error.code ?? 'PYTHON_BRIDGE_FAILED'}: ${error.message}`
      };
    }
  }

  async captureFull(ctx: SceneStateProviderContext): Promise<RawSceneState> {
    const args = { projectPath: ctx.scenePath };
    const warnings: string[] = [];

    const project = await this.call('inspect_project', args);
    const nodeList = await this.call('list_nodes', args);
    const timeline = await this.call('list_timeline', args);
    const drawings = await this.call('list_drawings', args);

    const nodePaths: string[] = Array.isArray(nodeList?.nodes) ? nodeList.nodes.map((n: any) => String(n)) : [];

    const nodes: SceneNode[] = [];
    const nodeAttributes: SceneNodeAttribute[] = [];
    const layerTypeByPath = new Map<string, string>();
    for (const layer of timeline?.layers ?? []) {
      layerTypeByPath.set(String(layer.node_path), String(layer.type ?? 'UNKNOWN'));
    }

    for (const nodePath of nodePaths) {
      const segments = nodePath.split('/').filter(Boolean);
      const name = segments[segments.length - 1] ?? nodePath;
      const parentPath = segments.length > 1 ? segments.slice(0, -1).join('/') : '';

      let attributes: Record<string, unknown> = {};
      try {
        const attrs = await this.call('get_node_attrs', { ...args, nodePath });
        attributes = attrs?.attributes ?? {};
      } catch (error: any) {
        warnings.push(`attributes unavailable for ${nodePath}: ${error.message}`);
      }

      nodes.push({
        path: nodePath,
        name,
        type: layerTypeByPath.get(nodePath) ?? String(attributes['type'] ?? 'UNKNOWN'),
        parentPath,
        // The headless bridge does not expose Node View coordinates; 0 is recorded and the
        // gap is reported rather than guessed.
        positionX: 0,
        positionY: 0,
        enabled: true
      });

      for (const [attribute, value] of Object.entries(attributes)) {
        if (value === null || value === undefined) continue;
        if (typeof value === 'object') continue;
        nodeAttributes.push({
          nodePath,
          attribute,
          value: value as string | number | boolean,
          animated: false
        });
      }
    }

    if (nodes.length > 0) {
      warnings.push('node_view_coordinates_not_read_by_headless_bridge');
    }

    // Keyframes are reported by list_timeline per node attribute. The headless bridge does
    // not expose column objects directly, so one synthetic column per animated attribute is
    // derived and labelled with its real link, rather than inventing Harmony column names.
    const columns: SceneColumn[] = [];
    const keyframes: SceneKeyframe[] = [];
    const seenColumns = new Set<string>();

    for (const layer of timeline?.layers ?? []) {
      const nodePath = String(layer.node_path);
      for (const kf of layer.keyframes ?? []) {
        const attribute = String(kf.attribute);
        const columnName = `${nodePath}::${attribute}`;
        if (!seenColumns.has(columnName)) {
          seenColumns.add(columnName);
          columns.push({
            name: columnName,
            type: 'DERIVED_FROM_ATTRIBUTE',
            linkedNodePath: nodePath,
            linkedAttribute: attribute
          });
        }
        const numeric = Number(kf.value);
        keyframes.push({
          columnName,
          frame: Number(kf.frame),
          value: Number.isFinite(numeric) ? numeric : 0,
          interpolation: 'UNKNOWN'
        });
      }
    }

    if (keyframes.length > 0) {
      warnings.push('keyframe_interpolation_not_read_by_headless_bridge');
    }

    // list_drawings returns the substitution list per READ node, not the per-frame exposure
    // table, so exposures cannot be reconstructed from it without guessing.
    const exposures: SceneExposure[] = [];
    if ((drawings?.drawings ?? []).length > 0) {
      warnings.push('per_frame_exposures_not_read_by_headless_bridge');
    }

    const connections: SceneConnection[] = [];
    warnings.push('node_connections_not_read_by_headless_bridge');

    const info = project?.project_info ?? {};
    return {
      nodes,
      connections,
      nodeAttributes,
      columns,
      keyframes,
      exposures,
      camera: undefined,
      sceneSettings: {
        frameCount: Number(info.num_frames) > 0 ? Number(info.num_frames) : 1,
        currentFrame: Number(info.current_frame) > 0 ? Number(info.current_frame) : 1,
        frameRate: Number(info.frame_rate) > 0 ? Number(info.frame_rate) : 24,
        resolutionX: 1920,
        resolutionY: 1080
      },
      warnings,
      errors: []
    };
  }

  private async call(command: string, args: Record<string, unknown>): Promise<any> {
    const response = await HarmonyPython.runCommand(command, args, this.timeoutMs);
    if (response?.status === 'error' || response?.error === true) {
      throw new HarmonyError(
        'CAPTURE_STATE_PROVIDER_UNAVAILABLE',
        `Harmony bridge command "${command}" failed: ${response?.message ?? 'unknown error'}`,
        { command, details: response?.details }
      );
    }
    return response;
  }
}

/** True when an attribute keyword denotes a peg/transformation channel. */
export function isTransformAttribute(attribute: string): boolean {
  const head = attribute.split('.')[0]?.toUpperCase() ?? '';
  return TRANSFORM_ATTRIBUTE_PREFIXES.some(prefix => head.startsWith(prefix));
}
