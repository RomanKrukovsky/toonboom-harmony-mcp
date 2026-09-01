# Moho Commercial Demo

A reproducible, frozen bundle that demonstrates the **Moho animation factory** end-to-end on a single 3-second scene: one humanoid character (`Speaker`) idle → talking → waving, on a static camera, rendered at 1920x1080 @ 24fps.

The bundle is the *minimum viable show*: a `scene_plan.json`, a 5-color locked palette, one humanoid_2leg character with 7 controllers and 12 Preston Blair mouth shapes, and a minimal camera/motion/QA policy. Nothing here depends on external assets — every reference is local and the schema shapes match the MCP server's Zod validators.

## What this demo does

When you point the MCP server at this bundle and run the factory pipeline, it:

1. Loads `scene_plan.json` (72 frames, 24fps, 1 character, static camera).
2. Resolves the show bible at `show_bible/moho_show_bible.json` and validates every cross-reference (palette, camera rules, motion grammar, QA thresholds, character bible, asset license).
3. Confirms the only allowed rig type is `humanoid_2leg` and the only character is `speaker`.
4. Emits a build plan (`build_rig.lua`) that constructs the rig from the reference humanoid_2leg template.
5. Runs QA against `qa_thresholds.json` and reports silhouette quality, lipsync drift, continuity, palette delta, bone-angle tolerance.
6. Generates a `time_savings.json` ledger comparing automated build time vs. manual estimate.

## How to run

Three commands from the repo root (`Documents/toon-boom-harmony-mcp/`):

```bash
# 1. Validate the bundle (Python acceptance check)
python3 examples/commercial-demo/scripts/demo_acceptance.py

# 2. Build the MCP server and run the moho_factory test suite
./examples/commercial-demo/scripts/run_demo.sh

# 3. In opencode, point at this bundle and ask:
#    "Run moho.factory.run_show_bible on examples/commercial-demo"
```

## What success looks like

- `demo_acceptance.py` prints `OK: commercial-demo bundle passes acceptance checks.`
- `run_demo.sh` finishes with `Demo ready. Connect opencode to this directory and ask for moho.factory.run_show_bible`.
- `demo_output/output/manifest.json` lists 7 show-bible files with non-empty SHA hashes.
- `demo_output/output/qa_report.json` reports lipsync drift under 80 ms and silhouette quality ≥ 0.7 for the talk action.
- `demo_output/output/time_savings.json` reports non-zero savings on the 72-frame scene.

## Honest limitations

- **No real assets shipped.** `assets/backgrounds/office.png`, `assets/audio/hello.wav`, and `assets/rigs/speaker.moho` are placeholders. The factory will validate the JSON plan end-to-end but cannot render a final video without real audio + a real `.moho` rig + a real Moho host. The `templates/` and `assets/` READMEs explain where to drop replacements.
- **Lua is emitted, not executed.** `output/build_rig.lua` is generated but only runs inside a real Moho scripting host. No `.mp4` is produced by this demo.
- **No lip-sync analysis** without `hello.wav`. The talk action will pass through with no phoneme events; the QA report will flag this rather than guess.
- **Frozen show bible.** All approvers are `demo-*` and dates are 2026-01-01. Do not promote this bundle to production without swapping provenance.
- **No proprietary rig data.** The bundle references the reference humanoid_2leg rig shipped with the MCP server. Custom rigs require updating `character_speaker.json → rigPath` and the templates folder.

## File map

```
examples/commercial-demo/
├── README.md                       # this file
├── scene_plan.json                 # the demo's production plan
├── assets/README.md                # placeholder asset guide
├── templates/README.md             # reference-rig explanation
├── show_bible/
│   ├── moho_show_bible.json        # top-level show bible
│   ├── character_speaker.json      # humanoid_2leg character (7 controllers, 12 mouth shapes)
│   ├── palette.json                # 5-color locked palette
│   ├── camera_rules.json           # 3 shot sizes, 3 moves, perspective FoV 45
│   ├── motion_grammar.json         # one general_dialogue rule
│   ├── qa_thresholds.json          # default thresholds
│   └── asset_license.json          # commercial demo license
├── scripts/
│   ├── run_demo.sh                 # builds + tests
│   └── demo_acceptance.py          # schema + cross-ref checks
└── demo_output/
    └── README.md                   # what the factory emits here
```