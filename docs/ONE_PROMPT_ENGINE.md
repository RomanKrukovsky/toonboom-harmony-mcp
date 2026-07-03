# One-Prompt Engine

**Honest tagline:** *From one prompt to an editable Toon Boom Harmony production package.*

## What it does

`harmony.oneprompt.*` tools accept a single creative prompt and turn it into the full planning layer required to produce a Harmony scene/episode:

```
1 prompt
→ analysis (genre, tone, characters, setting, duration)
→ series_bible.json
→ episode_plan.json
→ script.json
→ shot_list.json
→ character_design_specs.json
→ rig360_specs.json (placeholder until assets supplied)
→ rig_requirements.json
→ rig360_plan.json
→ asset_requirements.json
→ acting_plans.json
→ lipsync_plans/*.lipsync_plan.json
→ camera_plans/*.camera_plan.json
→ fx_plans/*.fx_plan.json
→ scene_plans/*.scene_plan.json
→ render_plan.json
→ review_reports/*.review_report.json
→ final_package/summary.json
→ episode_package.json + MANIFEST.json
```

## What it does NOT do

- It does **not** generate final Pixar-quality video.
- It does **not** produce final drawn character assets unless an image-generation backend is wired in.
- It does **not** bypass the need for real Toon Boom Harmony for final scene assembly.

Instead, it creates a **structured, editable, auditable production plan** that humans and Harmony can consume.

## Honesty classification

Every result carries an `origin` / `whatWasReal` log with one of:

- `planned` — production metadata generated
- `placeholder` — structure created, assets missing
- `requires_external_model` — needs image/audio generation backend
- `requires_real_harmony` — needs installed Toon Boom Harmony
- `requires_human` — creative decision needed
- `assembled` — files written to disk
- `simulated` — dry-run / preview only
- `generated` — produced by an AI backend (only when backend is present)

## Main tools

| Tool | Purpose |
|------|---------|
| `harmony.oneprompt.analyze` | Parse a prompt into structured analysis |
| `harmony.oneprompt.generate_production_package` | Generate the whole package |
| `harmony.oneprompt.run_to_preview_episode` | Full pipeline to preview-ready package |
| `harmony.oneprompt.run_to_final_package` | Full pipeline + review loop |
| `harmony.oneprompt.generate_scene_plans` | Convert episode plan into Autopilot scene plans |
| `harmony.oneprompt.generate_character_specs` | Generate character design specs |
| `harmony.oneprompt.generate_asset_requirements` | Collect all asset requirements |
| `harmony.oneprompt.generate_rig360_specs` | Generate placeholder 360 rig specs |

## Supporting tool layers

- **Character:** `harmony.character.generate_spec`, `generate_turnaround_requirements`, `generate_expression_sheet_requirements`, `generate_mouth_chart_requirements`, `generate_hand_pose_requirements`, `generate_layered_asset_plan`
- **Rig360:** `harmony.rig360.generate_spec`, `generate_turnaround_plan`, `generate_layered_asset_plan`, `generate_master_controller_plan`, `generate_deformer_plan`, `generate_face_control_plan`, `generate_body_turn_plan`, `build_from_assets`, `build_placeholder_rig`, `validate_full_rig`, `generate_test_turn_animation`
- **Simple Rig:** `harmony.rig.generate_spec`, `harmony.rig.build_from_assets`
- **Acting:** `harmony.acting.analyze_dialogue`, `generate_emotional_beats`, `generate_pose_beats`, `generate_micro_actions`, `generate_gesture_plan`, `generate_eye_blink_plan`, `generate_head_motion_plan`, `generate_body_language_plan`, `apply_rough_acting`, `validate_acting_readability`
- **Lipsync:** `harmony.lipsync.generate_plan`, `apply_to_scene`
- **Quality:** `harmony.quality.review_preview`, `review_scene_plan`, `review_acting_plan`, `review_rig`, `generate_fix_list`, `score_scene`, `score_episode`
- **Assembly:** `harmony.assembly.build_scene_plans`, `generate_render_plan`

## Iteration loop

`run_to_preview_episode` runs a lightweight fix loop:

```
create → review → fix → review again → score
```

Controlled by `.env`:

```bash
HARMONY_ONEPROMPT_MAX_ITERATIONS=5
HARMONY_ONEPROMPT_TARGET_SCORE=85
HARMONY_ONEPROMPT_STOP_IF_NO_IMPROVEMENT=true
HARMONY_ONEPROMPT_REQUIRE_HUMAN_FINAL=true
```

The default loop adjusts scene durations to reach the target score. In `hybrid`/`real` mode it can also trigger re-renders via Harmony Autopilot.

## Example prompt

```text
Сделай 2-минутную пилотную серию про нервного студента и безумного профессора в научной лаборатории. Стиль — высококачественная 2D/3D-hybrid телевизионная анимация, выразительная актёрка, динамичная камера, комедийный sci-fi тон.
```

## Commercial positioning

> **One prompt. Full production plan. Editable Toon Boom scenes.**

This is the anti-"one disposable MP4" offering: instead of a single generated video, you get a reusable, versioned Harmony production that an animation team can finish.