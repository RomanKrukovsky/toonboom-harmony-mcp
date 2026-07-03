# Autonomous Series Pipeline

**Autonomous Series Mode is a production accelerator, not a replacement for human creative direction.**

## Purpose

Plan an entire season/series from a single show bible, then run per-episode pipelines.

## Flow

```text
series bible
→ episode ideas
→ episode plan
→ shot list
→ recurring asset library
→ per-episode pipeline
→ review package
```

## Tools

| Tool | Purpose |
|------|---------|
| `harmony.series.create_bible` | Generate series_bible.json |
| `harmony.series.create_episode_ideas` | Generate episode concepts |
| `harmony.series.create_episode_plan` | Build episode plan |
| `harmony.series.create_shot_list` | Generate shots |
| `harmony.series.generate_recurring_asset_library` | Shared assets list |
| `harmony.series.run_episode_pipeline` | Run one episode end-to-end |
| `harmony.series.generate_review_package` | Package results for review |

## Recurring asset library

Every episode shares:

- Character rigs (placeholder until assets supplied)
- Background templates
- Master palettes
- FX presets

The pipeline tracks `recurringAssetsNeeded` so artists know what to produce once and reuse.

## Human checkpoints

The system intentionally returns `requires_human` labels for:

- Final script dialogue
- Voice casting / audio recording
- Character design sign-off
- Background paint approvals
- Final edit decisions

## Scalability

Each episode is independent once the asset library is locked. Running the full season is a loop over `run_episode_pipeline` with shared `seriesBible`.

## Example

```json
{
  "name": "harmony.series.run_episode_pipeline",
  "arguments": {
    "seriesBible": { ... },
    "episodeNumber": 1,
    "durationMinutes": 2,
    "mode": "moonshot"
  }
}
```

## Output

Episode package directory:

```
output/moonshot_xxx/
  series_bible.json
  episode_plan.json
  script.json
  shot_list.json
  character_design_specs.json
  rig_requirements.json
  rig360_plan.json
  rig360_specs.json
  asset_requirements.json
  acting_plans.json
  camera_plans/
    SC_001.camera_plan.json
    ...
  lipsync_plans/
    SC_001.lipsync_plan.json
    ...
  fx_plans/
    SC_001.fx_plan.json
    ...
  render_plan.json
  review_reports/
    scene.review_report.json
    ...
  final_package/
    summary.json
  episode_package.json
  MANIFEST.json
  scene_plans/
    SC_001.scene_plan.json
    ...
  animation_blocking/
    SC_001.acting_plan.json
    ...
```