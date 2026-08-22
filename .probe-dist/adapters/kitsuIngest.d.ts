/**
 * Kitsu ingest adapter — reads tasks/shots from a Kitsu REST API
 * and emits scene_plan.json objects for Harmony Autopilot MCP.
 *
 * Kitsu (CGWire) — open-source production tracking.
 * API docs: https://kitsudoc.cgwire.com/ (availability unconfirmed 2026-07-03;
 * this adapter is written defensively and returns a structured error if the
 * Kitsu instance is unreachable).
 *
 * Mapping summary:
 *   Kitsu Production   -> scene_plan.production
 *   Kitsu Episode      -> scene_plan.episode  (entity_type=Episode])
 *   Kitsu Sequence     -> grouped under episode (optional)
 *   Kitsu Shot         -> scene_plan.sceneName (entity_type=Shot, one scene_plan per shot)
 *   Shot.frame_in/out  -> durationFrames  (if exposure differs, computed by executor)
 *   Task assignments   -> ignored for now; we ingest shots only
 *   Casting (assets linked to shot) -> scene_plan.characters / background (if asset_type detected)
 *
 * This adapter NEVER writes back to Kitsu by default. Status writeback is a
 * separate explicit tool (harmony.planner.kitsu_writeback) to keep ingest
 * read-only and safe.
 */
export interface KitsuConfig {
    baseUrl: string;
    token?: string;
    email?: string;
    password?: string;
}
export interface KitsuIngestResult {
    source: 'kitsu';
    project: string;
    episode: string;
    plans: any[];
    warnings: string[];
    unsupported: {
        sceneName: string;
        reason: string;
    }[];
}
export declare class KitsuIngest {
    private cfg;
    private headers;
    constructor(cfg: KitsuConfig);
    /** Authenticate with Kitsu's http://<host>/api/auth/login if no token supplied. */
    ensureAuth(): Promise<void>;
    /**
     * Ingest all shots of an episode as scene_plan objects.
     * Kitsu entity reference: project -> episode -> sequences -> shots.
     */
    ingestEpisode(production: string, episode: string): Promise<KitsuIngestResult>;
}
