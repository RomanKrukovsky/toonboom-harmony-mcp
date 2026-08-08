/**
 * IPC protocol versioning and migration policy.
 *
 * The wire protocol is `protocol_version`. Reads and writes use the exact
 * numeric string. Compatibility rules:
 *
 *   MAJOR: incompatible. Bridge refuses to negotiate.
 *   MINOR: additive. Older bridge can read newer plugin responses (plugin fills
 *          missing array elements with keep-alive defaults).
 *   PATCH: identical wire format.
 *
 * `CURRENT` is the version this bridge advertises. `MIN_SUPPORTED` is the
 * lowest version the bridge still understands (older plugins are refused with
 * `version_incompatible`). `MAX_SUPPORTED` is the highest version the bridge
 * understands (newer plugins are warned but forwarded).
 */

export const CURRENT = "1.1.0";
export const MIN_SUPPORTED = "1.0.0";
export const MAX_SUPPORTED = "1.1.x";

export interface ProtocolCompatibilityReport {
  bridgeVersion: string;
  pluginVersion: string | null;
  compatible: boolean;
  reason: string;
  recommendedAction: string;
}

function cmp(a: string, b: string): number {
  const [am, an, ap] = a.split(".").map((s) => parseInt(s, 10));
  const [bm, bn, bp] = b.split(".").map((s) => parseInt(s, 10));
  if (am !== bm) return am - bm;
  if (an !== bn) return an - bn;
  if ((ap ?? 0) !== (bp ?? 0)) return (ap ?? 0) - (bp ?? 0);
  return 0;
}

export function negotiate(pluginVersion: string | null | undefined): ProtocolCompatibilityReport {
  const version = pluginVersion ?? "0.0.0";
  if (!version || version === "0.0.0") {
    return {
      bridgeVersion: CURRENT,
      pluginVersion: version,
      compatible: false,
      reason: "Plugin did not advertise a protocol version.",
      recommendedAction: "Update the Moho plugin to advertise protocolVersion in handshake.",
    };
  }
  if (cmp(version, MIN_SUPPORTED) < 0) {
    return {
      bridgeVersion: CURRENT,
      pluginVersion: version,
      compatible: false,
      reason: `Plugin protocol ${version} is older than the minimum supported ${MIN_SUPPORTED}.`,
      recommendedAction: `Upgrade the Moho plugin.`,
    };
  }
  if (cmp(version.split(".").slice(0, 2).join(".") + ".0", MAX_SUPPORTED.split(".").slice(0, 2).join(".") + ".0") > 0) {
    return {
      bridgeVersion: CURRENT,
      pluginVersion: version,
      compatible: true,
      reason: `Plugin protocol ${version} is ahead of bridge ${CURRENT}. Forward-compatible with potential unknown fields.`,
      recommendedAction: `Consider upgrading bridge to ${version} when stable.`,
    };
  }
  return {
    bridgeVersion: CURRENT,
    pluginVersion: version,
    compatible: true,
    reason: `Protocol ${version} is within supported window [${MIN_SUPPORTED}, ${MAX_SUPPORTED}].`,
    recommendedAction: "Proceed.",
  };
}

/**
 * Capability flags negotiated at handshake. The plugin reports concrete Moho
 * features it can serve. The bridge exposes them as resource/mcp capability.
 */
export interface CapabilitySet {
  mohoVersion: string;
  pluginVersion: string;
  protocolVersion: string;
  features: Array<{
    id: string;
    status: "available" | "experimental" | "unsupported";
    description: string;
  }>;
}

export function standardCapabilities(): CapabilitySet["features"] {
  return [
    { id: "document.getInfo", status: "available", description: "Read document metadata." },
    { id: "document.getLayers", status: "available", description: "Enumerate top-level layers." },
    { id: "document.setFrame", status: "available", description: "Set current timeline frame." },
    { id: "document.screenshot", status: "available", description: "Render to PNG (requires ENABLE_SCREENSHOTS=true)." },
    { id: "layer.*", status: "available", description: "Layer inspection and transform." },
    { id: "bone.*", status: "available", description: "Bone inspection and transform." },
    { id: "animation.*", status: "available", description: "Keyframe get/set/delete." },
    { id: "mesh.*", status: "available", description: "Mesh points and shapes." },
    { id: "batch.execute", status: "available", description: "Group multiple ops in one IPC round-trip." },
    { id: "workflow.characterRigAssistant", status: "experimental", description: "Rig scaffolding (depends on Moho API verification)." },
    { id: "workflow.smartBone", status: "experimental", description: "Smart bone creation." },
    { id: "workflow.lipSync", status: "experimental", description: "Phoneme-driven keyframes." },
    { id: "workflow.duplicateLayerTree", status: "experimental", description: "Deep layer tree duplication." },
    { id: "workflow.batchRender", status: "experimental", description: "Render queue with retry." },
    { id: "workflow.projectDiagnostics", status: "available", description: "Project health scan." },
  ];
}
