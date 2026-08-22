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
export declare const CURRENT = "1.1.0";
export declare const MIN_SUPPORTED = "1.0.0";
export declare const MAX_SUPPORTED = "1.1.x";
export interface ProtocolCompatibilityReport {
    bridgeVersion: string;
    pluginVersion: string | null;
    compatible: boolean;
    reason: string;
    recommendedAction: string;
}
export declare function negotiate(pluginVersion: string | null | undefined): ProtocolCompatibilityReport;
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
export declare function standardCapabilities(): CapabilitySet["features"];
