# Autonomous Moho Rigger and Animator — Design Specification

## Purpose

The MCP server must automate the repeatable technical work of a professional
2D Moho rigger and animator. A human remains the director: they describe the
character, performance and scene, then accept or reject the result. The system
must never claim success when Moho cannot open, save, animate or render the
delivered project.

## Program Structure

The product is split into four independently testable stages:

1. Procedural humanoid rigging without PSD input.
2. Autonomous animation of the certified humanoid rig from a text brief.
3. Visual quality control, automatic correction and repeated render passes.
4. Additional body plans, imported artwork and batch scene production.

This implementation cycle covers stage 1 only. Stage 2 starts only after the
stage-1 rig reaches at least 95 points in the acceptance score defined below.

## Stage-1 Scope

### Included

- One standard biped humanoid body plan.
- Procedurally generated native vector artwork.
- Connected body, arm, leg, neck, head and face bone hierarchy.
- Bone-to-geometry binding and stable joint deformation.
- Arm and leg IK targets and constraints.
- Eight-direction head switch.
- Mouth phoneme switch, eye state switch and hand-pose switch.
- Smart Actions for head direction, mouth selection and elbow/knee correction.
- Animator-facing controls, hidden helper bones and a clean frame zero.
- A diagnostic animation containing a walk step, head turn, blink and speech
  mouth changes.
- Native Moho open, save-as, reopen and render acceptance checks.
- MCP result containing the readiness score and evidence for every passed gate.

### Excluded

- PSD parsing or PSD layer import.
- Non-humanoid creatures and quadrupeds.
- Shot-specific acting, camera direction and final scene animation.
- Automatic replacement of human art direction or final aesthetic approval.

## Architecture Decision

The primary approach is to repair the existing Python document generator. Real
Moho files are the schema authority and source of known-good object templates.
The compiler must not invent approximate JSON structures.

The current skeleton-only document is the first known-good rung: it opens and
renders in Moho 14.4. The current first failing rung is a generated MeshLayer.
Development therefore proceeds by a native-format ladder:

1. Skeleton-only document.
2. One unbound vector MeshLayer.
3. Point- and layer-bound vector geometry.
4. SwitchLayer with native vector children.
5. IK targets and constraints.
6. Smart Action channels.
7. Complete humanoid hierarchy.
8. Diagnostic animation.

Every rung must open and render in real Moho before the next rung is added.

## Components

### Native Schema Factory

A focused Python module constructs BoneLayer, MeshLayer, SwitchLayer, channels,
bones, points, curves and shapes from known-good templates. It preserves Moho's
integer-versus-float requirements and rejects unsupported or unknown variants.

### Procedural Humanoid Compiler

The compiler converts a typed humanoid rig specification into bones, vector
geometry, bindings, switches and Smart Actions. It produces a temporary `.moho`
archive and a machine-readable manifest describing all expected controls,
layers, actions and diagnostic frames.

### Native Moho Acceptance Gate

The gate uses installed Moho in two ways:

1. Headless render verifies that the document opens and creates real output.
2. An official command-line startup Lua script calls `FileSaveAs`, quits Moho,
   then the saved copy is reopened and rendered again.

The startup script is validation infrastructure only. Project construction
remains in the Python generator.

### Production Readiness Scorer

The scorer consumes the manifest, structural inspection, Moho logs and rendered
frames. It returns a score, individual gate results and evidence paths. A score
cannot be raised by a mocked or software-only preview when a real Moho check is
required.

### MCP Orchestration

The TypeScript service invokes the compiler and acceptance gate, returns the
score and promotes the temporary artifact to the requested output path only
after all mandatory gates pass. It returns a failed result with the precise
failed rung when validation fails.

## Data Flow

1. MCP receives a humanoid character specification.
2. The specification is validated and normalized.
3. The procedural compiler generates a rig manifest and temporary `.moho`.
4. Structural checks compare the document with the manifest.
5. Moho opens and renders the temporary file.
6. Moho saves a native round-trip copy through the startup Lua validator.
7. Moho reopens and renders the saved copy at diagnostic frames.
8. The scorer evaluates structure, behavior and renders.
9. At 95 points or more, with all mandatory gates passed, the artifact is
   atomically moved to the requested output path.
10. Otherwise, the temporary artifact and logs remain as diagnostic evidence
    and the MCP call returns failure.

## Failure Rules

- No fallback may write approximate JSON or a raw JSON buffer as `.moho`.
- Moho process exit code zero is not success unless expected output exists.
- Missing Moho, missing Python dependencies or missing native templates are
  explicit failures for production certification.
- The requested output path is not overwritten until the new artifact passes.
- Save-as round-trip failure blocks delivery even when the initial file renders.
- Unsupported rig features fail with a named capability error instead of being
  silently ignored.

## Readiness Score

| Capability | Points | Mandatory |
|---|---:|:---:|
| Open, save-as, reopen without Moho errors | 15 | Yes |
| Complete visible procedural vector figure | 15 | Yes |
| Connected skeleton and geometry binding | 15 | Yes |
| Working arm and leg IK | 10 | No |
| Head, mouth, eye and hand switches | 15 | No |
| Head, mouth and joint-correction Smart Actions | 15 | No |
| Clean animator controls and frame zero | 5 | No |
| Diagnostic walk, head, blink and mouth animation | 5 | No |
| Real rendered-frame validation without Moho errors | 5 | Yes |

Stage 1 is complete only when the score is at least 95 and every mandatory gate
passes. The remaining five points represent human, character-specific visual
polish rather than a missing technical capability.

## Test Strategy

### Format Ladder Tests

Each native-format rung has a dedicated generated fixture and a real-Moho test.
The test must first fail on the current invalid representation, then pass only
after the native structure is corrected.

### Structural Tests

Tests compare the generated document against the manifest: bone parents,
bindings, layer hierarchy, switch state names, control constraints, action
channels and diagnostic keys.

### Behavioral Render Tests

Diagnostic frames must differ in the expected regions:

- Leg and body silhouette changes during the walk step.
- Head render changes when the head dial changes.
- Eye pixels change on the blink frame.
- Mouth pixels change across at least three phoneme frames.
- IK target movement changes the corresponding limb while the foot or hand
  endpoint remains within tolerance.

### Round-Trip Test

The generated file is opened and saved under a new name by Moho, then reopened
and rendered. The round-trip copy must retain the expected bones, switches,
actions and diagnostic keys.

### Regression Suite

All Moho Jest tests, Python pipeline tests, TypeScript type checking and the
project build run before stage-1 completion. Existing unrelated Harmony
integration failures are reported separately and do not count as Moho success.

## Later Stages

After stage 1 reaches 95 points, stage 2 will define animation planning,
blocking, spline passes, lip sync, facial performance, secondary motion and
camera behavior on the certified rig. Stage 3 will add iterative visual repair.
Stage 4 will add new body plans, PSD import and batch production.
