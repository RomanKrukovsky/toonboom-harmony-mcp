# ShowBible fixture — "Polygon Show" (structural)

Committed, deterministic input family for offline compiler verification
(`production.shot_factory`). Mirrors the family validated by
`tests/factoryEndToEnd.test.ts`.

Contents:

| File | Role |
|---|---|
| `show_bible.json` | Top-level lock (fps, resolution, style, refs) |
| `palette_manifest.json` | Locked palette with stable `colourId`s |
| `character_bible_mira.json` | One character + controller map |
| `camera_rules.json` | Allowed shot sizes / moves |
| `motion_grammar.json` | Allowed gestures / emotions / timing |
| `qa_thresholds.json` | Numeric QA gates |
| `legal/mira_license.json` + `legal/mira_contract.md` | Licence manifest + unsigned contract stub |

Honesty notes:

- `rigPath` / `templatePath` are forward references. The production rig does
  **not** exist yet; no `.xstage`/`.tpl` is committed under this directory.
- `creator: "unassigned_placeholder"` — no rigger has been commissioned.
- The contract stub is explicitly unsigned. Replace it before any production
  use (ROADMAP §Procurement order, Week 2).

These documents are consumed read-only by
`scripts/run_shot_factory_golden_path.mjs`, which compiles
ShotManifest → PerformancePIR → RetargetingPlan → HarmonyCommandPlan V4 and
records the evidence bundle in `docs/evidence/shot-factory-golden-path/`.
