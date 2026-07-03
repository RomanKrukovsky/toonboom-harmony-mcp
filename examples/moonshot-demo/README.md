# Moonshot Demo

This demo runs the full One-Prompt Animation Production Engine from a single creative prompt.

## Run

```bash
npm run build
cd examples/moonshot-demo
./run_demo.sh
```

Or directly:

```bash
node examples/moonshot-demo/run_demo.js
```

## What it does

1. Parses one prompt into structured production intelligence.
2. Generates:
   - `series_bible.json`
   - `episode_plan.json`
   - `script.json`
   - `shot_list.json`
   - `character_design_specs.json`
   - `rig360_specs.json` (placeholder until real assets are supplied)
   - `asset_requirements.json`
   - `acting_plans.json`
   - `lipsync_plans/` (placeholder phoneme timing)
   - `camera_plans.json`
   - `fx_plans.json`
   - `scene_plans/*.scene_plan.json`
   - `render_plan.json`
   - `review_reports/`
   - `final_package/summary.json`
   - `episode_package.json`
   - `MANIFEST.json`

3. Runs a lightweight quality review / fix loop.
4. Returns an honest summary of what was generated, simulated, planned, and what still requires real assets or Harmony.

## Honesty notes

- No real Toon Boom Harmony scene is opened unless you run in `hybrid` or `real` mode with assets.
- Character drawings, backgrounds, audio, and mouth charts are placeholders or requirements — not generated images/audio.
- The output is an **editable production package** ready for artists, animators, and Harmony.
