# VERIFIED TOOL MATRIX & STATUS REPORT

## Strict Status Classifications
- **unit_verified**: Isolated unit logic verified by Jest test suite.
- **offline_verified**: Command plan or schema generated offline without DCC.
- **experimental_unverified**: File writer or template builder requiring live validation.
- **not_executed**: Operation requires licensed live Harmony execution which has not completed.
- **not_implemented**: Feature planned but no production implementation exists yet.

## Component Verification Matrix

| Component / Feature | Exact Status Classification |
|---|---|
| PIR schema | `unit_verified` |
| procedural acting curves | `unit_verified` |
| rig command plan | `offline_verified` |
| .xstage writer | `experimental_unverified` |
| Harmony rig creation | `not_executed` |
| Harmony render | `not_executed` |
| visual QA | `not_implemented` |
| automated visual repair | `not_implemented` |

## MCP Tool Matrix

| MCP Tool Name | Status Classification | Execution Mode |
|---|---|---|
| `harmony.capabilities.detect` | `unit_verified` | Python Probe |
| `harmony.capabilities.probe` | `experimental_unverified` | Python Session Probe |
| `harmony.studio.run_production` | `offline_verified` | Orchestrator |
| `harmony.studio.resume_production` | `offline_verified` | Orchestrator |
| `harmony.creative.generate_series_bible` | `unit_verified` | Creative Director |
| `harmony.script.generate_screenplay` | `unit_verified` | Writing Room |
| `harmony.storyboard.generate_shot_list` | `unit_verified` | Storyboard Director |
| `harmony.assets.import` | `experimental_unverified` | Asset Registry |
| `harmony.rig.generate_cutout` | `not_executed` | Rig Engine |
| `harmony.animation.generate_blocking` | `not_executed` | Acting Engine |
| `harmony.audio.generate_lipsync` | `unit_verified` | Audio Engine |
| `harmony.camera.generate_push_in` | `not_executed` | Camera Engine |
| `harmony.render.preview` | `not_executed` | Render Engine |
| `harmony.quality.review_scene` | `not_implemented` | Quality Director |
| `harmony.system.health_check` | `unit_verified` | Health Engine |
