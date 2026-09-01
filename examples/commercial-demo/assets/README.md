# Assets

This directory holds binary assets referenced by `scene_plan.json` and the show bible.

## Placeholders for the commercial demo

| Path | Referenced by | Status |
|------|---------------|--------|
| `assets/backgrounds/office.png` | `scene_plan.json → background.file` | Replace with a real 1920x1080 office background |
| `assets/audio/hello.wav` | `scene_plan.json → characters[0].actions[1].audio` | Replace with a real short line of dialogue |
| `assets/rigs/speaker.moho` | `character_speaker.json → rigPath` | Replace with a real Moho rig, or use the bundled reference humanoid_2leg rig template |

## Notes

- The demo will **not run end-to-end** until real files replace these placeholders. The `moho.factory.run_show_bible` step will fail at the asset resolution stage if files are missing.
- For a fully reproducible demo, generate or commission real assets that match the locked 5-color palette in `show_bible/palette.json`.
- Keep asset paths relative to this `examples/commercial-demo/` directory so the references stay valid when the bundle is copied.