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
export class KitsuIngest {
    cfg;
    headers = {};
    constructor(cfg) {
        this.cfg = cfg;
        if (cfg.token) {
            this.headers['Authorization'] = `Bearer ${cfg.token}`;
        }
        this.headers['Accept'] = 'application/json';
    }
    /** Authenticate with Kitsu's http://<host>/api/auth/login if no token supplied. */
    async ensureAuth() {
        if (this.cfg.token)
            return;
        if (!this.cfg.email || !this.cfg.password) {
            throw new Error('KITSU_AUTH_MISSING: no token and no email/password provided');
        }
        const res = await fetch(`${this.cfg.baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: this.cfg.email, password: this.cfg.password })
        });
        if (!res.ok) {
            throw new Error(`KITSU_AUTH_FAILED: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        if (!data.access_token) {
            throw new Error('KITSU_AUTH_FAILED: no access_token in response');
        }
        this.headers['Authorization'] = `Bearer ${data.access_token}`;
    }
    /**
     * Ingest all shots of an episode as scene_plan objects.
     * Kitsu entity reference: project -> episode -> sequences -> shots.
     */
    async ingestEpisode(production, episode) {
        await this.ensureAuth();
        const warnings = [];
        const plans = [];
        const unsupported = [];
        const shotsUrl = `${this.cfg.baseUrl}/api/shots?episode_name=${encodeURIComponent(episode)}&project_name=${encodeURIComponent(production)}`;
        const shotsRes = await fetch(shotsUrl, { headers: this.headers });
        if (!shotsRes.ok) {
            throw new Error(`KITSU_QUERY_FAILED: ${shotsRes.status} ${shotsRes.statusText}`);
        }
        const shotsJson = await shotsRes.json();
        if (!Array.isArray(shotsJson)) {
            throw new Error('KITSU_QUERY_FAILED: unexpected response shape (expected array of shots)');
        }
        for (const shot of shotsJson) {
            const plan = {
                schemaVersion: '1.0',
                production,
                episode,
                sceneName: shot.name,
                durationFrames: shot.nb_frames,
                fps: shot.data?.fps,
                resolution: shot.data?.resolution,
                characters: [],
                background: undefined,
                camera: undefined,
                effects: [],
                render: { preview: true, format: 'png', quality: 'preview' }
            };
            // Casting → characters / background
            if (Array.isArray(shot.entities)) {
                for (const cast of shot.entities) {
                    if (!cast.name)
                        continue;
                    const t = cast.entity_type.toLowerCase();
                    if (t === 'character' || t === 'rig' || t === 'char') {
                        plan.characters.push({
                            name: cast.name,
                            rig: cast.name,
                            positionPreset: 'center'
                        });
                    }
                    else if (t === 'background' || t === 'bg' || t === 'environment' || t === 'set') {
                        plan.background = {
                            file: cast.file_name || '<pending>',
                            layerName: cast.name
                        };
                    }
                    else if (t === 'camera' || t === 'cam') {
                        plan.camera = { preset: cast.name || 'static' };
                    }
                    else {
                        // Unknown casting type — record a warning, don't drop the shot.
                        warnings.push(`Shot ${shot.name}: unhandled entity_type "${cast.entity_type}" (${cast.name})`);
                    }
                }
            }
            // If the shot has no frames metadata, we can't compute duration — still emit
            // the plan, executor will prompt the user.
            if (!plan.durationFrames) {
                unsupported.push({ sceneName: shot.name, reason: 'no nb_frames metadata' });
            }
            plans.push(plan);
        }
        return { source: 'kitsu', project: production, episode, plans, warnings, unsupported };
    }
}
