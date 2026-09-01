# Demo Output

After `moho.factory.run_show_bible` (or `moho.show_bible.scaffold` + `moho.scene_plan.compile`) runs against this bundle, the following artifacts land here.

## Expected artifacts

| File | Producer | Description |
|------|----------|-------------|
| `output/manifest.json` | `moho.factory.run_show_bible` | Cross-reference manifest showing which show-bible files were resolved, their SHA hashes, and the resolved scene_plan. Used for traceability and reproducibility. |
| `output/build_rig.lua` | `moho.factory.build_rig` (would run inside Moho) | Lua script the Moho scripting host executes to construct the rig from the humanoid_2leg reference template and bind the 7 controllers. Generated locally by the factory; not executed unless Moho is running. |
| `output/qa_report.json` | `moho.factory.qa` | QA report comparing the produced animation against `qa_thresholds.json`. Lists silhouette quality, lipsync drift, continuity deltas, palette delta, bone-angle tolerance violations, and items still requiring human approval. |
| `output/time_savings.json` | `moho.factory.time_savings` | Time-savings ledger comparing estimated manual production hours vs. automated build time. Per-scene breakdown plus totals for the demo (72-frame scene) and a 10-scene projection. |

## What success looks like

- `manifest.json` lists all 7 show-bible files with non-empty hashes and the `speaker` character resolved.
- `build_rig.lua` exists and references the 7 controllers (`HEAD_ROT`, `BODY_TRANSLATE`, `LEFT_ARM_ROT`, `RIGHT_ARM_ROT`, `MOUTH_DIAL`, `EYE_BLINK`, `NECK_TURN`).
- `qa_report.json` reports `lipsyncDriftMs < 80` for the talk action (frames 25–60) and `silhouetteQuality >= 0.7`.
- `time_savings.json` shows non-zero savings for the 72-frame scene.

## What is NOT produced here

- No `.mp4` is rendered. This demo targets the **factory + QA pipeline**; rendering happens in a real Moho host.
- No lip-sync audio analysis is done unless `assets/audio/hello.wav` exists and the analyzer is registered.
- No keyframes are written to a live Moho scene. The factory emits Lua; Moho must consume it.