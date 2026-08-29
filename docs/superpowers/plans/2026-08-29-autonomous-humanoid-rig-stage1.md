# Autonomous Humanoid Rig Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a procedural biped humanoid `.moho` project that scores at least 95/100 and passes native Moho open, save-as, reopen and behavioral-render checks.

**Architecture:** Repair the Python generator one native-format rung at a time. Known-good Moho documents are the schema authority; generated objects are cloned from native templates and populated through focused constructors. A fail-closed acceptance gate validates temporary artifacts in installed Moho before TypeScript promotes them to the requested output path.

**Tech Stack:** Python 3, standard-library `json`/`zipfile`/`subprocess`, Pillow for preview and image comparison, Moho 14 command-line startup scripts, TypeScript, Jest, pytest-style Python tests executed directly or through pytest.

**Spec:** `docs/superpowers/specs/2026-08-29-autonomous-moho-rigger-animator-design.md`

## Global Constraints

- Stage 1 supports one procedural biped humanoid and does not parse or import PSD files.
- `MOHO_EXECUTABLE` may override the default macOS path `/Applications/Moho.app/Contents/MacOS/Moho`.
- Production certification requires real Moho; absence of Moho is a failure, not simulated success.
- No path may serialize approximate JSON directly into a user-delivered `.moho` archive.
- Integer and floating-point token types must match native Moho expectations.
- The requested output path is replaced only after all mandatory gates pass.
- Imports stay at the top of Python and TypeScript modules.
- Every production behavior begins with a failing test and follows red-green-refactor.

---

### Task 1: Native Moho Acceptance Harness

**Files:**
- Create: `pipeline/tools/moho_native_acceptance.py`
- Create: `scripts/moho/roundtrip_save.lua.template`
- Create: `pipeline/tests/test_moho_native_acceptance.py`

**Interfaces:**
- Consumes: an existing `.moho` path, output directory and frame list.
- Produces: `accept_project(project_path: str, evidence_dir: str, frames: list[int]) -> NativeAcceptanceResult`.
- Produces: `NativeAcceptanceResult` with `opened`, `saved`, `reopened`, `rendered_frames`, `errors`, `stdout`, `stderr` and `roundtrip_path`.

- [ ] **Step 1: Write the failing native acceptance test**

```python
def test_accepts_known_good_native_project(tmp_path):
    result = accept_project(
        str(REPO / "fixtures/moho_reference/gramps_rig.moho.bak"),
        str(tmp_path),
        [1],
    )
    assert result.opened is True
    assert result.saved is True
    assert result.reopened is True
    assert len(result.rendered_frames) == 2
    assert result.errors == []
```

- [ ] **Step 2: Run the test and verify RED**

Run: `python3 -m pytest pipeline/tests/test_moho_native_acceptance.py -q`

Expected: collection or import failure because `moho_native_acceptance` does not exist.

- [ ] **Step 3: Add the startup-script template**

```lua
function MohoScript(moho)
    moho:FileSaveAs("__ROUNDTRIP_OUTPUT__")
    print("MCP_ROUNDTRIP_SAVE_OK")
    moho:Quit()
end
```

- [ ] **Step 4: Implement the acceptance result and process runner**

```python
@dataclass
class NativeAcceptanceResult:
    opened: bool
    saved: bool
    reopened: bool
    rendered_frames: list[str]
    errors: list[str]
    stdout: str
    stderr: str
    roundtrip_path: str


def accept_project(project_path: str, evidence_dir: str,
                   frames: list[int]) -> NativeAcceptanceResult:
    source_pngs, source_run = _render_project(project_path, evidence_dir, "source", frames)
    roundtrip_path, save_run = _save_roundtrip(project_path, evidence_dir)
    saved = Path(roundtrip_path).is_file() and "MCP_ROUNDTRIP_SAVE_OK" in save_run.stdout
    roundtrip_pngs, reopen_run = (
        _render_project(roundtrip_path, evidence_dir, "roundtrip", frames)
        if saved else ([], ProcessEvidence.empty())
    )
    errors = _collect_moho_errors(source_run, save_run, reopen_run)
    return NativeAcceptanceResult(
        opened=bool(source_pngs) and not source_run.has_moho_error,
        saved=saved,
        reopened=bool(roundtrip_pngs) and not reopen_run.has_moho_error,
        rendered_frames=source_pngs + roundtrip_pngs,
        errors=errors,
        stdout="\n".join((source_run.stdout, save_run.stdout, reopen_run.stdout)),
        stderr="\n".join((source_run.stderr, save_run.stderr, reopen_run.stderr)),
        roundtrip_path=roundtrip_path,
    )
```

The implementation must invoke Moho with argument arrays, render the source,
generate a temporary startup Lua script with an escaped save-as path, invoke
`Moho source.moho script.lua`, then render the saved copy. Success requires
non-empty PNG files and no `Error (` line in either stream.

- [ ] **Step 5: Add the corrupt-file failure test**

```python
def test_rejects_corrupt_project_even_when_moho_returns_zero(tmp_path):
    bad = tmp_path / "bad.moho"
    bad.write_bytes(b"not a moho archive")
    result = accept_project(str(bad), str(tmp_path / "evidence"), [1])
    assert result.opened is False
    assert result.saved is False
    assert result.errors
```

- [ ] **Step 6: Run acceptance tests and verify GREEN**

Run: `python3 -m pytest pipeline/tests/test_moho_native_acceptance.py -q`

Expected: two passing tests when Moho is installed.

- [ ] **Step 7: Commit**

```bash
git add pipeline/tools/moho_native_acceptance.py scripts/moho/roundtrip_save.lua.template pipeline/tests/test_moho_native_acceptance.py
git commit -m "test(moho): add native save and reopen acceptance gate"
```

### Task 2: Native MeshLayer Factory

**Files:**
- Create: `pipeline/moho/native_factory.py`
- Modify: `pipeline/moho/emit.py`
- Modify: `pipeline/examples/bisect_vector.py`
- Create: `pipeline/tests/test_native_mesh_factory.py`

**Interfaces:**
- Consumes: `geometry_raw`, layer name, parent bone and UUID source.
- Produces: `NativeMohoFactory.mesh_layer(name: str, mesh: dict, parent_bone: int) -> dict`.
- Produces: `NativeMohoFactory.bone_layer(name: str, bones: list[dict], children: list[dict]) -> dict`.

- [ ] **Step 1: Write a failing real-Moho test for one vector shape**

```python
def test_one_generated_mesh_opens_and_renders_in_moho(tmp_path):
    rig = make_single_circle_rig()
    out = tmp_path / "circle.moho"
    emit(rig, str(out))
    result = accept_project(str(out), str(tmp_path / "evidence"), [1])
    assert result.opened is True
    assert result.rendered_frames
```

- [ ] **Step 2: Verify RED against the current MeshLayer emitter**

Run: `python3 -m pytest pipeline/tests/test_native_mesh_factory.py::test_one_generated_mesh_opens_and_renders_in_moho -q`

Expected: failure with Moho `Error (108): Unable to load document (corrupt)`.

- [ ] **Step 3: Add native template extraction**

```python
class NativeMohoFactory:
    def __init__(self, reference_path: Path) -> None:
        self.reference_path = reference_path
        self.document = load_native_document(reference_path)
        self.bone_layer_template = find_first_layer(self.document, "BoneLayer")
        self.mesh_layer_template = find_first_layer(self.document, "MeshLayer")

    def mesh_layer(self, name: str, mesh: dict, parent_bone: int) -> dict:
        layer = copy.deepcopy(self.mesh_layer_template)
        layer["name"] = name
        layer["uuid"] = str(uuid.uuid4())
        layer["parent_bone"] = parent_bone
        layer["mesh"] = normalize_native_mesh(mesh)
        return layer
```

- [ ] **Step 4: Add a differential diagnostic for generated geometry**

The test must compare point, curve and shape key sets and value types against a
known-good native MeshLayer. It must print the first mismatching JSON path when
the real-Moho test fails.

- [ ] **Step 5: Route mesh emission through the factory**

Change `_part_layer` so `part.type == "mesh"` calls
`factory.mesh_layer(part.name, part.geometry_raw, parent_bone_index)`.
Pass a single factory instance from `build_doc` to recursive layer creation.

- [ ] **Step 6: Verify GREEN for skeleton and one-mesh rungs**

Run: `python3 -m pytest pipeline/tests/test_native_mesh_factory.py pipeline/tests/test_moho_format.py -q`

Expected: both the skeleton-only and one-mesh projects open and render.

- [ ] **Step 7: Commit**

```bash
git add pipeline/moho/native_factory.py pipeline/moho/emit.py pipeline/examples/bisect_vector.py pipeline/tests/test_native_mesh_factory.py
git commit -m "fix(moho): emit native vector mesh layers"
```

### Task 3: Native Bindings and Switch Layers

**Files:**
- Modify: `pipeline/moho/native_factory.py`
- Modify: `pipeline/moho/emit.py`
- Create: `pipeline/tests/test_native_switch_binding.py`

**Interfaces:**
- Produces: `NativeMohoFactory.switch_layer(name: str, children: list[dict], switch_channel: dict) -> dict`.
- Produces: `bind_mesh_points(mesh: dict, bone_index: int) -> dict`.

- [ ] **Step 1: Write failing binding and switch tests**

```python
def test_bound_mesh_moves_between_diagnostic_frames(tmp_path):
    out = build_bound_arm_fixture(tmp_path)
    result = accept_project(str(out), str(tmp_path / "evidence"), [1, 12])
    assert result.opened is True
    assert image_difference(result.rendered_frames[0], result.rendered_frames[1]) > 0.02


def test_native_switch_renders_two_distinct_states(tmp_path):
    out = build_two_state_switch_fixture(tmp_path)
    result = accept_project(str(out), str(tmp_path / "evidence"), [1, 2])
    assert result.reopened is True
    assert image_difference(result.rendered_frames[-2], result.rendered_frames[-1]) > 0.02
```

- [ ] **Step 2: Verify RED**

Run: `python3 -m pytest pipeline/tests/test_native_switch_binding.py -q`

Expected: current generated switch fails to open or both renders are identical.

- [ ] **Step 3: Implement point binding**

Normalize every point parent to an integer bone index and preserve native
`curves`, `color`, `color_strength`, curvature and animated-position channels.

- [ ] **Step 4: Implement native SwitchLayer construction**

Clone the root SwitchLayer from `fixtures/moho_reference/mouth_switch.moho`,
replace its children, UUID, name and `switch_keys`, and preserve all other native
fields and number types.

- [ ] **Step 5: Verify GREEN and round-trip retention**

Run: `python3 -m pytest pipeline/tests/test_native_switch_binding.py -q`

Expected: both tests pass before and after Moho save-as.

- [ ] **Step 6: Commit**

```bash
git add pipeline/moho/native_factory.py pipeline/moho/emit.py pipeline/tests/test_native_switch_binding.py
git commit -m "feat(moho): add native bindings and vector switches"
```

### Task 4: IK and Smart Action Channels

**Files:**
- Modify: `pipeline/moho/native_factory.py`
- Modify: `pipeline/moho/emit.py`
- Modify: `pipeline/riggen/modules.py`
- Create: `pipeline/tests/test_native_ik_actions.py`

**Interfaces:**
- Produces native bone target, constraint and `ik_lock` channels.
- Produces paired dial `anim_angle.actions` and switch `switch_keys.actions` with a shared action name.

- [ ] **Step 1: Write failing IK behavior test**

```python
def test_leg_ik_target_changes_knee_but_holds_foot(tmp_path):
    out, manifest = build_ik_leg_fixture(tmp_path)
    result = accept_project(str(out), str(tmp_path / "evidence"), [1, 12])
    assert result.opened is True
    assert endpoint_error(result.rendered_frames, manifest["footProbe"]) <= 3.0
    assert knee_region_difference(result.rendered_frames) > 0.02
```

- [ ] **Step 2: Write failing Smart Action test**

```python
def test_dial_changes_switch_after_native_roundtrip(tmp_path):
    out = build_dial_switch_fixture(tmp_path)
    result = accept_project(str(out), str(tmp_path / "evidence"), [1, 12])
    assert result.saved is True
    roundtrip = extract_from_file(result.roundtrip_path)
    assert any(link.dial_action_name == "Head Switch" for link in roundtrip.dial_links)
```

- [ ] **Step 3: Verify RED**

Run: `python3 -m pytest pipeline/tests/test_native_ik_actions.py -q`

Expected: missing behavior or action link after round-trip.

- [ ] **Step 4: Implement IK channels from native bone templates**

Set `target_bone.val` and `anim_parent.val` to floats, keep `parent` as an
integer, and preserve native `Val`/`Bool` channel metadata and interpolation.

- [ ] **Step 5: Implement paired Smart Action construction**

Add `make_smart_action(name, dial_when, dial_val, target_when, target_val,
target_type) -> tuple[dict, dict]`. Both returned action records must share the
same `name`; one is attached to the dial and one to the target channel.

- [ ] **Step 6: Verify GREEN**

Run: `python3 -m pytest pipeline/tests/test_native_ik_actions.py -q`

Expected: IK and Smart Action tests pass through save-as and reopen.

- [ ] **Step 7: Commit**

```bash
git add pipeline/moho/native_factory.py pipeline/moho/emit.py pipeline/riggen/modules.py pipeline/tests/test_native_ik_actions.py
git commit -m "feat(moho): add native IK and smart actions"
```

### Task 5: Complete Procedural Humanoid and Diagnostic Animation

**Files:**
- Modify: `pipeline/riggen/master_character_compiler.py`
- Modify: `pipeline/riggen/vector_shapes.py`
- Create: `pipeline/riggen/humanoid_manifest.py`
- Create: `pipeline/tests/test_production_humanoid.py`

**Interfaces:**
- Produces: `compile_master_character(name: str, gender: str, skin_rgb: tuple[float, float, float], hair_rgb: tuple[float, float, float], shirt_rgb: tuple[float, float, float], pants_rgb: tuple[float, float, float], shoes_rgb: tuple[float, float, float], out_path: str, canvas_w: int, canvas_h: int) -> str` using only native factory output.
- Produces: `build_humanoid_manifest(rig: Rig) -> dict` with expected bones, switches, actions, controls and diagnostic frames.

- [ ] **Step 1: Write the failing full-rig structural test**

```python
def test_full_humanoid_has_required_production_controls(tmp_path):
    out = compile_master_character(name="Stage1Hero", out_path=str(tmp_path / "hero.moho"))
    rig = extract_from_file(out)
    required = {"Root", "Body", "Head", "Target Leg L", "Target Leg R",
                "Head Switch", "Mouth Switch"}
    assert required <= {bone.id for bone in rig.bones}
    switches = {part.name: part for part in rig.walk_parts() if part.type == "switch"}
    assert len(switches["Head"].switch_states) == 8
    assert len(switches["Mouth"].switch_states) >= 6
    assert len(switches["Eyes"].switch_states) >= 4
    assert len(switches["Hands"].switch_states) >= 4
```

- [ ] **Step 2: Write the failing diagnostic animation test**

```python
def test_full_humanoid_diagnostic_frames_are_visually_distinct(tmp_path):
    out = compile_master_character(name="Stage1Hero", out_path=str(tmp_path / "hero.moho"))
    result = accept_project(out, str(tmp_path / "evidence"), [1, 12, 24, 36])
    assert result.reopened is True
    assert all_adjacent_frames_differ(result.rendered_frames, minimum_ratio=0.01)
```

- [ ] **Step 3: Verify RED**

Run: `python3 -m pytest pipeline/tests/test_production_humanoid.py -q`

Expected: current project is corrupt or lacks hand switches and diagnostic behavior.

- [ ] **Step 4: Complete vector body geometry**

Generate head, torso, upper/lower arms, hands, thighs, shins and feet as native
MeshLayers. Provide overlap around elbows, knees, shoulders and hips so no
background gap appears across diagnostic poses.

- [ ] **Step 5: Complete switches and controls**

Add eight head states, at least six mouth states, four eye states and four hand
states. Add visible zero-strength dial/target controls and mark deformation
helpers hidden and shy.

- [ ] **Step 6: Add diagnostic keys**

Frames 1, 12, 24 and 36 must exercise neutral, walk/IK, head/blink and mouth
states. Keep frame zero free of non-setup keys.

- [ ] **Step 7: Verify GREEN in real Moho**

Run: `python3 -m pytest pipeline/tests/test_production_humanoid.py -q`

Expected: structural and behavioral tests pass before and after save-as.

- [ ] **Step 8: Commit**

```bash
git add pipeline/riggen/master_character_compiler.py pipeline/riggen/vector_shapes.py pipeline/riggen/humanoid_manifest.py pipeline/tests/test_production_humanoid.py
git commit -m "feat(moho): compile production humanoid rig"
```

### Task 6: Production Readiness Scorer

**Files:**
- Create: `pipeline/tools/moho_readiness.py`
- Create: `pipeline/tests/test_moho_readiness.py`

**Interfaces:**
- Produces: `score_project(project_path: str, manifest_path: str, evidence_dir: str) -> ReadinessReport`.
- `ReadinessReport` contains `score`, `certified`, `mandatory_passed`, `gates`, `evidence` and `errors`.

- [ ] **Step 1: Write failing score tests**

```python
def test_known_good_humanoid_scores_at_least_95(tmp_path):
    project, manifest = build_stage1_humanoid(tmp_path)
    report = score_project(project, manifest, str(tmp_path / "evidence"))
    assert report.mandatory_passed is True
    assert report.score >= 95
    assert report.certified is True


def test_renderable_template_without_production_features_is_not_certified(tmp_path):
    report = score_project(str(GRAMPS), str(MINIMAL_MANIFEST), str(tmp_path))
    assert report.score < 95
    assert report.certified is False
```

- [ ] **Step 2: Verify RED**

Run: `python3 -m pytest pipeline/tests/test_moho_readiness.py -q`

Expected: import failure because the scorer does not exist.

- [ ] **Step 3: Implement exact scoring weights**

Implement the nine categories and weights from the specification. Mandatory
open/save/reopen, visible figure, connected binding and real render gates must
all pass. A missing mandatory gate forces `certified=False` regardless of score.

- [ ] **Step 4: Write JSON evidence**

Save `readiness-report.json`, Moho stdout/stderr, round-trip `.moho`, rendered
frames and structural manifest comparison under `evidence_dir`.

- [ ] **Step 5: Verify GREEN**

Run: `python3 -m pytest pipeline/tests/test_moho_readiness.py -q`

Expected: full humanoid certified; minimal template rejected.

- [ ] **Step 6: Commit**

```bash
git add pipeline/tools/moho_readiness.py pipeline/tests/test_moho_readiness.py
git commit -m "feat(moho): score production rig readiness"
```

### Task 7: Fail-Closed MCP Integration

**Files:**
- Create: `src/services/mohoProductionRigCompiler/index.ts`
- Modify: `src/tools/mohoAdvancedRigTools.ts`
- Modify: `src/services/mohoStudioMasterRigGenerator/index.ts`
- Create: `tests/mohoProductionRigCompiler.test.ts`
- Modify: `tests/integration/mohoRealProjectRoundTrip.test.ts`

**Interfaces:**
- Produces: `MohoProductionRigCompiler.compile(input: ProductionRigInput): ProductionRigResult`.
- `ProductionRigResult` contains `status`, `outputPath`, `score`, `certified`, `gates`, `evidenceDirectory` and `errors`.

- [ ] **Step 1: Write failing TypeScript service test**

```typescript
it('does not promote an uncertified Moho project', () => {
  const result = MohoProductionRigCompiler.compile({
    characterName: 'Stage1Hero',
    outputPath,
    evidenceDirectory,
    minimumScore: 101
  });
  expect(result.status).toBe('failed');
  expect(fs.existsSync(outputPath)).toBe(false);
});
```

- [ ] **Step 2: Write failing real-Moho certification test**

```typescript
it('promotes a humanoid only after native certification', () => {
  const result = MohoProductionRigCompiler.compile({
    characterName: 'Stage1Hero',
    outputPath,
    evidenceDirectory,
    minimumScore: 95
  });
  expect(result.status).toBe('certified');
  expect(result.score).toBeGreaterThanOrEqual(95);
  expect(fs.existsSync(result.outputPath)).toBe(true);
});
```

- [ ] **Step 3: Verify RED**

Run: `npm test -- --runInBand tests/mohoProductionRigCompiler.test.ts`

Expected: import failure because the service does not exist.

- [ ] **Step 4: Implement Python invocation and atomic promotion**

Invoke a fixed Python entry point with argument arrays, parse one JSON result,
validate it with Zod, and rename the certified temporary artifact to the output
path. Do not use inline Python source strings.

- [ ] **Step 5: Expose the MCP tool**

Add `moho.rig.compile_certified_humanoid` with `characterName`, `outputPath`,
`evidenceDirectory` and optional color/body proportions. Return the readiness
report directly; do not wrap a failed result in top-level `success`.

- [ ] **Step 6: Verify GREEN**

Run: `npm test -- --runInBand tests/mohoProductionRigCompiler.test.ts tests/integration/mohoRealProjectRoundTrip.test.ts`

Expected: fail-closed and certified paths both pass.

- [ ] **Step 7: Commit**

```bash
git add src/services/mohoProductionRigCompiler/index.ts src/tools/mohoAdvancedRigTools.ts src/services/mohoStudioMasterRigGenerator/index.ts tests/mohoProductionRigCompiler.test.ts tests/integration/mohoRealProjectRoundTrip.test.ts
git commit -m "feat(mcp): deliver certified humanoid rigs"
```

### Task 8: Stage-1 Verification and Readiness Reassessment

**Files:**
- Modify: `docs/capability_registry.json`
- Create: `docs/evidence/moho-stage1-humanoid/readiness-report.json`
- Create: `docs/evidence/moho-stage1-humanoid/README.md`

**Interfaces:**
- Consumes all previous tasks.
- Produces a reproducible evidence package and honest capability status.

- [ ] **Step 1: Run all Python pipeline tests**

Run: `python3 -m pytest pipeline/tests -q`

Expected: all tests pass; real-Moho tests run when Moho is installed.

- [ ] **Step 2: Run all Moho Jest tests**

Run: `npm test -- --runInBand --testPathPattern='tests/(moho|integration/moho)'`

Expected: all Moho suites pass.

- [ ] **Step 3: Run TypeScript and build checks**

Run: `npm run typecheck && npm run build && git diff --check`

Expected: exit code zero for every command.

- [ ] **Step 4: Generate the certified evidence artifact**

Run the new compiler for `Stage1Hero`, save the `.moho`, round-trip copy,
diagnostic renders, manifest, logs and readiness report under
`docs/evidence/moho-stage1-humanoid/`.

- [ ] **Step 5: Inspect control renders**

Confirm the neutral, walk/IK, head/blink and mouth frames are non-empty and
visibly distinct. Record dimensions and SHA-256 values in the evidence README.

- [ ] **Step 6: Update the capability registry honestly**

Mark procedural humanoid rigging as `verified` only if the report is at least
95 and all mandatory gates pass. Otherwise retain `implemented_unverified` and
record the exact failed gate.

- [ ] **Step 7: Commit**

```bash
git add docs/capability_registry.json docs/evidence/moho-stage1-humanoid
git commit -m "docs: verify stage one humanoid rig capability"
```
