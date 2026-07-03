# Moonshot Mode

Moonshot mode is the most ambitious operating mode of Harmony Autopilot MCP. It attempts the full pipeline from **one prompt to an episode preview package**, while being completely honest about what is real and what is simulated.

## Modes

`.env`:

```bash
HARMONY_ENGINE_MODE=moonshot
```

Available modes:

| Mode | Behavior |
|------|----------|
| `real` | Only real Harmony operations |
| `simulation` | Demo/test without Harmony |
| `hybrid` | Real operations + placeholders for missing parts |
| `moonshot` | Full one-prompt attempt with honest reporting |

## Moonshot pipeline

```text
prompt
→ analysis
→ series bible
→ episode plan
→ script.json
→ shot list
→ character specs
→ rig360 specs / simple rig specs (placeholder)
→ asset requirements
→ acting plans
→ lipsync plans (placeholder)
→ camera/FX plans
→ scene_plan.json per scene
→ quality review
→ fix loop
→ preview package
```

In `hybrid` and `real` modes the pipeline also attempts to invoke `harmony.autopilot.run_scene_plan` for each scene plan.

## Fallback chain

If a step cannot be executed directly, Moonshot uses the nearest working fallback:

```text
real execution → generated asset → template → placeholder → manual checkpoint
```

## Output truth

A Moonshot run always returns a `truth` string, e.g.:

> "Moonshot production package generated. 2 placeholder rig(s). Preview assembled in moonshot mode. Autopilot not attempted (simulation/moonshot mode). Real Harmony execution requires assets and installed Toon Boom Harmony."

In `hybrid` mode the truth reports how many scenes Autopilot attempted/completed.

## Production package layout

```text
series_bible.json
episode_plan.json
script.json
shot_list.json
asset_requirements.json
character_design_specs.json
rig_requirements.json
rig360_plan.json
rig360_specs.json
scene_plans/*.scene_plan.json
animation_blocking/*.acting_plan.json
camera_plans/*.camera_plan.json
lipsync_plans/*.lipsync_plan.json
fx_plans/*.fx_plan.json
render_plan.json
review_reports/*.review_report.json
final_package/summary.json
episode_package.json
MANIFEST.json
```

## What is "real" vs "planned"

- `planned` — JSON plans and specs generated.
- `placeholder` — rig structure created without drawn assets.
- `requires_external_model` — needs image/audio generation backend.
- `requires_real_harmony` — needs running Toon Boom Harmony.
- `assembled` — files written to disk.

## Usage

### Programmatic demo

```bash
npm run build
node examples/moonshot-demo/run_demo.js
```

### MCP server

```bash
npx ts-node src/index.ts
```

Then call:

```json
{
  "name": "harmony.oneprompt.run_to_preview_episode",
  "arguments": {
    "prompt": "...",
    "targetDurationMinutes": 2,
    "mode": "moonshot"
  }
}
```

### Hybrid / real mode

```json
{
  "name": "harmony.oneprompt.run_to_preview_episode",
  "arguments": {
    "prompt": "...",
    "mode": "hybrid",
    "outputDir": "/path/to/output"
  }
}
```

In `hybrid` mode each scene plan is passed to `harmony.autopilot.run_scene_plan` with `dryRun=true`. In `real` mode it runs for real (requires Harmony installation).

## Limitations

- No built-in image/audio generation backend. Character/background assets and dialogue audio must be supplied or generated externally.
- Lipsync plans are placeholder phoneme timing until real audio + mouth chart assets are provided.
- Real Harmony scene assembly requires Harmony installation and Control Center.
- Acting plans are rough blocking, not final keyframes.
- Autopilot scene assembly is best-effort; complex scenes may pause for human confirmation.

## Why Moonshot is different from Sora/Seedance

| | Video AI | Moonshot Mode |
|---|---|---|
| Output | MP4 | Editable Harmony scenes + plans |
| Reusability | None | Full production package |
| Team handoff | Hard | Native Harmony format |
| Asset ownership | Black box | Transparent JSON specs |
| Iteration | Regenerate whole clip | Edit scene_plan.json and re-run |

## Sales line

> **Editable AI animation generation for Toon Boom Harmony.**