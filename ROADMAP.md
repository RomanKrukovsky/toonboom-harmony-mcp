# ROADMAP — Factory of One Show

This project is **not** a universal AI animator. The realistic ceiling is an
automated factory for **one frozen show**: approved characters, rigs, style,
and shot types. It handles lipsync, inbetweens, technical animation, camera,
assembly, QA, and retakes, but artistic staging stays the weakest link and
always needs a human approver.

## Hard non-goals

- Fully autonomous acting, key poses, comedic/dramatic timing from scratch.
- Universal support for arbitrary characters / rigs / styles without topology setup.
- Frame-by-frame vectorization matching a professional human animator.
- Guaranteed complex scenes (fights, crowds, extreme angles, body transforms).
- Learning Claude "as an animator" by watching YouTube.
- Running without a licensed Toon Boom Harmony Premium.
- Error-free visual QA — the LLM will miss artistic defects.
- Replacing 100 animators on arbitrary projects.

## The factory pipeline

```
script
  → ShotManifest            (LLM director, bounded by ShowBible)
  → PerformancePIR          (deterministic ShotManifestCompiler)
  → HarmonyCommandPlan V4   (RetargetingResolver + HarmonyCommandBuilder)
  → editable Harmony scene  (real .xstage, real Python API)
  → render + QA             (ffprobe + critic + retake engine)
  → Action Recorder         (before/after + retake notes → dataset)
```

The LLM is only allowed to make directorial decisions **inside the ShowBible
family**. Anything not declared is a hard QA rejection, not a guess.

## ShowBible family (machine-readable production standard)

| Document                | Schema                                        | Purpose |
|-------------------------|-----------------------------------------------|---------|
| `show_bible.json`       | `src/schemas/showBible.ts` `showBibleSchema`  | Top-level lock: fps, resolution, style, lighting, deformation allow-list, refs to the other 5 |
| `character_bible.json`  | `characterBibleSchema`                        | Per-character turnaround + controller map with stable IDs + mouth shapes + expressions + gesture library |
| `camera_rules.json`     | `cameraRulesSchema`                           | Allowed shot sizes / moves / safe margins / forbidden moves |
| `motion_grammar.json`   | `motionGrammarSchema`                         | Allowed gestures / emotions / pose library refs / timing rules |
| `palette_manifest.json` | `paletteManifestSchema`                       | Locked palette colours with stable `colourId`, 8-digit RGBA |
| `qa_thresholds.json`    | `qaThresholdsSchema`                          | Numeric QA gates for the Retake Engine |

Every document carries `provenance.approver` + `approvedAt`. The ShowBible is
the single source of truth that bounds the LLM.

## Shot compiler contracts

- `ShotManifest` (`src/schemas/shotManifest.ts`) — staging + timing + beats +
  provenance. Each beat references stable IDs from the ShowBible.
- `crossReferenceShotManifest()` — deterministic gate that rejects unknown
  shot sizes, camera moves, emotions, and characters.
- `ShotManifestCompiler` (`src/services/shotManifestCompiler/`) — compiles a
  ShotManifest into a `PerformancePIR`, placing keys only on declared beat
  boundaries. Deterministic: same manifest → same `performanceId` (SHA-256).
- `PerformancePIR` (`src/schemas/performancePir.ts`) — extended additively
  with `shotManifestRef`, `staging`, `timing`, `beatFrameMap` so the factory
  compiler can carry context through the pipeline without a side-channel.
- `HarmonyCommandPlan V4` (`src/schemas/harmonyCommandPlanV4.ts`) — the
  whitelist-only command plan executed against real Harmony.

## Week-1 smoke gate

`tests/integration/week1SmokeGate.test.ts` enforces the exact roadmap sequence:

```
launch Harmony
  → open a real .xstage
  → read scene structure
  → create a node + keyframe
  → save
  → close
  → reopen
  → verify the edit survived
  → render 24 frames
  → ffprobe validation
```

Three explicit terminal statuses:

- **PASSED** — every step executed against real Harmony and verified.
- **SKIPPED** — Harmony not installed on this host. Non-blocking in CI unless
  `HARMONY_SMOKE_REQUIRE=1`. On the dedicated Harmony Worker, set
  `HARMONY_SMOKE_REQUIRE=1` to promote SKIPPED into FAILED.
- **FAILED** — Harmony was detected but a step broke. Hard regression.

Report: `output/week1_smoke/week1_smoke_report.json` (with `stepTrace`).

Run it: `npm run test:week1`

## Minimal kit (from the plan)

```
1 official Harmony Premium
1 dedicated Harmony Worker host
1 original character
1 production rig (.xstage + .tpl + palettes + controller map)
1 simple location
30 self-shot motion videos
50–100 self-recorded dialogue takes
10 golden shots
30–50 recorded retakes
1 Harmony Pipeline TD (part-time)
1 senior cut-out animator (part-time, for approvals)
written rights for every created asset
```

The biggest mistake is to start by hunting for a giant free dataset. The
project needs a **small, legally clean, internally consistent** package built
around one rig and one show — not someone else's volume.

## Procurement order

- **Week 1** — activate trial / student Premium, install official Toon Boom
  Learn `.xstage` fixtures, set up the Harmony Worker, pass the Week-1 smoke
  gate against a real `.xstage`.
- **Week 2** — create one original character + ShowBible; run a paid micro-test
  with 3 riggers and pick one; record 20 motion videos + 50 dialogue takes.
- **Week 3** — receive head + torso + arms + controllers + mouth chart; build
  the controller map; implement retargeting for head, shoulders, elbows, wrists.
- **Week 4** — order 3 golden shots; run the MCP end-to-end; collect human
  retakes via Action Recorder.
- **Months 2–3** — grow to 10 golden + 30–50 derived shots; add lipsync,
  motion grammar, QA, RetakePatch, reopen verification, batch render. Only
  then expand the character/location library.

## Asset licensing

Every external file gets an `asset_license.json`:

```json
{
  "assetId": "character_main_rig_v1",
  "creator": "Name",
  "source": "commission",
  "license": "exclusive commercial assignment",
  "commercialUse": true,
  "modificationAllowed": true,
  "datasetUseAllowed": true,
  "redistributionAllowed": false,
  "contractPath": "legal/contracts/rig_character_main.pdf"
}
```

Never use `NC`-licensed material in the commercial core. `CC BY` needs
attribution; `CC BY-SA` may force derivative-share-alike obligations. The
ShowBible's `forbiddenSources` field lists anything the LLM must avoid.

## Autonomy ramp

1. Human approves every shot.
2. Human approves only complex shots.
3. Human approves only whole episodes.
4. Practical autonomy criterion: **≥ 90–95 % of shots pass without manual
   Harmony file edits**.