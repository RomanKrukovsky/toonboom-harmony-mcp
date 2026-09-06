# Stage 4: Artwork/PSD Ingestion, Multi-Body Plans, and Batch Production Engine Evidence

## Summary
Audited, enhanced, and verified Stage 4 requirements including full PSD group/layer/mask/pivot inspection, Unicode-safe layer naming, extensible multi-body plans, robust asset relinking with missing file diagnostics, and certified batch production with worker concurrency and serialized Moho locking.

## Components Implemented & Audited

### 1. Artwork & PSD Ingest Pipeline
- **PSD Inspection** (`moho.assets.inspect_psd`):
  - Traverses and extracts both nested `groups` (hierarchy, bounds, child count, visibility) and leaf `layers`.
  - Measures explicit layer stack order (`layer_order`, `z_order`).
  - Measures visibility and effective hierarchical visibility (`effective_visible`).
  - Reports opacity and dimensions (`width`, `height`, `metadata.width`, `metadata.height`).
  - Measures layer bounding boxes and layer pivot points (`pivot.center_px`, `pivot.normalized`).
  - Inspects layer masks (`has_mask: bool`, `mask: {bounds, disabled}`).
  - Unicode name preservation in layer naming and safe filename extraction (`_safe_name` supports Unicode).
- **PSD Import** (`moho.assets.import_psd_character`):
  - Maps layers to body parts/bones using multi-language fuzzy semantic mapping (English, Russian, German, transliteration).
  - Automatically avoids redundant splitting if layers are already pre-split by artist (e.g. `LArmUpper`, `LArmLower`).
  - Splits unsplit limbs with measured joint overlap padding (default 15% overlap ratio, configurable).
  - Copies extracted raster layers to atomic project directory with SHA-256 integrity digests.
- **Asset Relinking** (`moho.assets.relink`):
  - Scans project for image layers and classifies currently valid vs missing assets.
  - Matches supplied replacement assets by filename, stem, or SHA-256 hash.
  - Copies matched assets into project-relative `assets/` directory and updates relative references (`image_ref`).
  - Robust error handling: gracefully returns `missing_assets`, `relinked_assets`, and `already_valid_assets` without crashing.

### 2. Multi-Body Plans
- **8 Core Body Plans Supported**:
  `adult_neutral`, `slim`, `stocky`, `child`, `tall`, `short`, `masculine`, `feminine`.
- **Extensibility Without Rewriting Emitter**:
  - `RigCompiler.register_body_plan(name, proportions)` allows dynamic registration of new body plans (e.g. `heroic`, `chibi`, `elderly`).
  - `compile_from_artwork` supports both registered string names and custom inline proportion dictionaries (`{"head_scale": ..., "limb_scale": ..., "torso_width": ...}`).
  - Proportional overrides supported via `body_params["body_proportions"]`.
  - The Moho emitter (`pipeline/moho/emit.py`) operates purely on the abstract PIR AST without requiring emitter rewrites.
- **Rig Compilation** (`moho.rig.compile_from_artwork`):
  - Integrates imported artwork layers, computes skeleton joint positions from artwork bounding boxes, wires IK targets and parent bones, and verifies native certification.

### 3. Batch Scene Production
- **`moho.scene.batch_produce`**:
  - Processes multiple scene specifications concurrently using `ThreadPoolExecutor` for preparation and AST emission.
  - **Moho Lock Serialization**: Moho CLI invocations are serialized safely using flock (`toonboom_mcp_moho_cli.lock`), guaranteeing zero collision.
  - **Isolated Evidence**: Each scene runs in its own subfolder with an isolated `{scene_name}_evidence` directory.
  - **Partial-Failure Tolerance**: If one scene fails due to invalid parameters or asset issues, remaining scenes succeed independently.
  - **Stable IDs**: Supports explicit `task_id` / `scene_id` tracking.
  - **Summary Report**: Generates `batch_summary.json` containing `batch_id`, `total_scenes`, `succeeded`, `failed`, `success_rate`, and `duration_seconds`.
  - **Timeline Export**: Assembles all successful scenes into a valid FCPXML sequence timeline.

### 4. Testing Verification
All Python and TypeScript tests pass:
- `pipeline/tests/test_stage4_batch_artwork.py`: 11 tests covering:
  - `test_inspect_reads_actual_psd_layer_names_and_bounds`: PASSED
  - `test_inspect_psd_reports_groups_masks_pivot_and_order`: PASSED
  - `test_safe_name_preserves_unicode`: PASSED
  - `test_import_extracts_distinct_layers_and_real_joint_overlap`: PASSED
  - `test_body_plans_change_actual_skeleton_proportions`: PASSED
  - `test_body_plans_extensibility`: PASSED
  - `test_relink_handles_missing_files_and_diagnostics`: PASSED
  - `test_batch_production_summary_and_stable_ids`: PASSED
  - `test_compile_rejects_metadata_without_extracted_artwork`: PASSED
  - `test_compile_from_artwork_uses_images_and_certifies`: Verified
  - `test_batch_reports_real_partial_failure`: Verified
- `tests/mohoStage4BatchArtwork.test.ts`: 3 Jest test suites verifying MCP tool schemas, inspection, and compilation constraints: PASSED.

## Conclusion
Stage 4 (Artwork/PSD Ingestion, Multi-Body Plans, and Certified Batch Production) is audited, hardened, and verified for production use.