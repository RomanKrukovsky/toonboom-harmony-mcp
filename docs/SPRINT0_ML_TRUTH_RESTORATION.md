# Sprint 0 — ML Truth Restoration

Date: 2026-07-27
Scope: remove fabricated ML results and restore one genuinely working perception path.
Machine-readable status: [`docs/capability_registry.json`](capability_registry.json).

---

## Why this instead of the shot factory

The session brief preferred building an autonomous conversational-shot golden path, *unless the
audit found a more fundamental blocker*. It did. The perception layer that a shot factory would
sit on was fabricating results and self-certifying them as `verified_real`. Industrialising that
would have produced a system whose every downstream artifact inherited a false premise.

---

## Defects found, verified, and fixed

### 1. Per-keypoint confidence was mathematically pinned to 1.0

`services/ml-runtime/providers/dwpose_provider.py` computed:

```python
x_conf = np.max(np.exp(simcc_x[0] - np.max(simcc_x[0], axis=1, keepdims=True)), axis=1)
```

Subtracting the row maximum makes the largest element `0`, so `exp(...)` is `1`, and the maximum
over the row is **always exactly 1.0**. This is an incomplete softmax — the division by the sum
was missing.

Consequence: all 133 whole-body keypoints were reported with `confidence: 1.0` and
`visible: true` on every image, regardless of content. The commit that introduced this
(`be69a5c`, *"verified real DWPose ONNX vertical slice"*) verified the pipeline against a bug
that made every keypoint look perfectly confident.

**Measured on `fixtures/character.png` with the real model:**

| | before | after |
|---|---|---|
| decode | incomplete softmax | mmpose `get_simcc_maximum` (raw response max) |
| min / max / mean | 1.0 / 1.0 / 1.0 | 0.0941 / 1.0390 / 0.7044 |
| unique values across 133 keypoints | **1** | **133** |
| keypoints "visible" at 0.3 | **133 / 133** | 107 / 133 |

**A normalized softmax would have been the wrong fix.** SimCC spreads its response over 576/768
bins, so softmax collapses every score to ~0.003 and marks 0/133 keypoints visible. This was
measured against the real model before choosing the decode; the rejected alternative is recorded
in the evidence bundle.

### 2. Top-level confidence was a hardcoded constant

```python
"confidence": 0.9 if len(formatted_points) > 10 else 0.4
```

The point count is always 133, so this always returned `0.9`. It is now the mean of the measured
per-keypoint scores.

### 3. Pose ran without person detection

DWPose is a **top-down** model: it expects a person crop. The provider resized the entire image to
288×384 and ran pose on it, so it emitted a full skeleton for whatever the frame happened to
contain. `yolox_l.onnx` (216 MB) had already been downloaded but was **never loaded**.

Now: YOLOX detects people → highest-scoring box → aspect-preserving affine crop → pose → keypoints
mapped back through the inverse affine. When no person is found the provider returns
`no_person_detected` instead of a skeleton.

On the fixture YOLOX reports one person at score **0.954**.

### 4. Weight integrity was decorative

`scripts/ml/download-dwpose.py` declared expected SHA-256 values, computed the real digest,
printed it, and **never compared them**. The declared constants matched neither file, so a
substituted weight would have been accepted silently. The declared values are now the verified
real ones and a mismatch exits non-zero.

### 5. The weight manifest was machine-specific

`manifest.json` stored absolute paths (`/Users/romanmolodyko/...`), so the ML stack resolved on
exactly one workstation. Paths are now relative to the manifest and resolved next to the package.
Verified by running `detect()` from `/tmp`: `installed_verified`.

### 6. `perceive_video()` returned a bounding-box mannequin as `verified_real`

`services/reconstruction-core/reconstruction_core/perception.py` used MOG2 background subtraction
to find the largest moving contour, took its bounding rect, and placed 13 "joints" at **fixed
ratios of that box**:

```python
"LEFT_WRIST": point(.14, .58), "RIGHT_WRIST": point(.86, .58), ...
```

These encode the box, not the body — raising an arm does not move the wrist. `confidence` came
from the contour fill ratio, not from any per-joint detection. The manifest nevertheless declared
`status: "verified_real"`, `verified: true`.

Now: the proxy is **opt-in**. The default call returns `blocked` with a blocking reason. With
`allow_silhouette_proxy=True` it runs but is labelled `silhouette_proxy_only`,
`verified: false`, `realInferenceExecuted: false`, `requiresHumanReview: true`, and carries
`jointDerivation: "fixed_ratios_of_motion_bounding_box"`.

### 7. AnimeInbet fabricated output paths

`generate_inbetweens()` returned an `InbetweenPIR` listing
`/tmp/animeinbet_output/inbetween_0001.png` … with a hardcoded `confidence: 0.95`. Those files
were never written by anything. It now returns `not_implemented` with
`realInferenceExecuted: false` and no PIR, so a caller cannot mistake it for generated frames.

---

## Corrections to the preliminary audit

Two claims in the brief did **not** reproduce:

- **"Фиктивные SHA-256"** — the hashes *in the manifest* are genuine. I recomputed both:
  `yolox_l.onnx` = `7860ae79…` (216,746,733 bytes), `dw-ll_ucoco_384.onnx` = `724f4ff2…`
  (134,399,116 bytes). Both match. The real integrity defect was in the *downloader* (§4).
- **"Векторизация создаёт ломаные полигоны"** — `stroke_extractor.py` in the working tree
  implements Zhang-Suen thinning for centerline extraction plus cubic Bezier fitting. It is not
  polygon tracing. Its fit is a tangent heuristic rather than a least-squares Schneider fit, so
  curve fidelity is unmeasured — recorded as `unaudited`, not as broken.

## Fixture finding

`fixtures/character.png` is a 512×512 **photograph of an astronaut** (STS-93 mission patch
visible) — the standard scikit-image `astronaut` sample, not an animation character. Any
capability described as validated for stylised animation line art via this fixture is unproven.

---

## Verification

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 |
| `npm test` | exit 0 — 55 suites passed, 1 skipped; 408 passed, 7 skipped |
| `.venv-ml/bin/python -m pytest services/ml-runtime/tests -q` | **7 passed** (incl. real ONNX inference) |
| `.venv-reconstruction/bin/python -m pytest services/reconstruction-core/tests -q` | 44 passed, 1 skipped* |

\* excluding `test_api_auth_ratelimit.py`, which fails to import for lack of `httpx` in that venv.
Pre-existing: that file is untracked prior work and the gap is environmental.

### Tests added

`services/ml-runtime/tests/test_dwpose_decode.py`:

- `test_previous_formula_was_identically_one` — keeps the defect documented and detectable.
- `test_decode_produces_varying_scores` — scores must not be constant.
- `test_decode_locations_use_split_ratio` — SimCC bin → pixel mapping.
- `test_non_positive_response_scores_zero`
- `test_disabled_provider_blocks_honestly`
- `test_missing_image_is_reported_not_faked`
- `test_real_inference_confidence_is_not_constant` — real YOLOX + DWPose against the fixture;
  asserts detection ran, confidence varies, and not every keypoint is visible. Skips honestly
  when weights are absent.

One existing test was changed: `test_perception_vertical.py` asserted
`result["status"] == "verified_real"` for the mannequin. It now asserts the blocked default and
the `silhouette_proxy_only` opt-in. This is a deliberate contract change, not a weakening — the
old assertion locked in a false claim.

---

## Evidence

- `docs/evidence/sprint0-pose/before_after_confidence.json` — measured before/after, the rejected
  softmax alternative, and SHA-256 of each produced artifact.
- `docs/evidence/sprint0-pose/execution_report.json`
- `output/dwpose_sprint0/keypoints_overlay.png` — detection box plus visible keypoints.

---

## What is still not true

- `perceive_video()` has **no** anatomical pose model wired in. It is blocked, not fixed.
  Connecting `DWPoseProvider` per-frame is the next step.
- The pose path is validated on **one photograph**. No video, no temporal stability, no
  multi-person tracking, no animation line art.
- No Harmony execution: `open_project` still raises `RuntimeError: Invalid license`.
- No shot factory, no render, no QA loop, no retakes.
