# Templates

This directory is intentionally empty.

The commercial demo uses the **reference rig `humanoid_2leg`** (declared by `show_bible/moho_show_bible.json → allowedRigTypes: ["humanoid_2leg"]`). No custom Moho template is required for the demo to demonstrate the pipeline:

- The `moho.factory.run_show_bible` tool builds the rig from the reference humanoid_2leg template bundled with the MCP server.
- The 7 controllers, 2 switch layers, 12 Preston Blair mouth shapes, and 3 expressions in `show_bible/character_speaker.json` map cleanly to the reference rig's bone layout.
- Camera setup uses the perspective rig type declared in `scene_plan.json → camera.mohoCameraRigType`.

## When to add a template

Drop a `.tpl` (or `.moho`) file into this directory only if you need to:

- Override the default humanoid_2leg reference rig (different proportions, extra limbs, custom mesh).
- Lock a different camera rig (orthographic, two-point perspective, etc.) as the project default.
- Pre-bake a scene template with the office background and speaker rig already in place for faster iteration.

If you do add a template, update the `rigPath` in `character_speaker.json` and the `mohoProjectTemplate` field in `scene_plan.json` to point at it.