# Sprint 1 Real 2D Animation Pose Implementation Plan

**Goal:** Produce and verify one real published 2D-cartoon `VideoPoseSequence` evidence
bundle without claiming production licensing, retargeting, or Harmony execution.

**Architecture:** Keep the existing YOLOX+DWPose pipeline and strict Python schema. Add a
pure articulated-motion metric, a reproducible evidence CLI, source provenance and hash
verification. Promote only the real-model verification level.

**Tech stack:** Python 3.11, Pydantic 2, OpenCV, ONNX Runtime, pytest, ffprobe, JSON/JSONL,
SHA-256.

## Constraints

- Never fabricate confidence, weights, media, output files, or `real` status.
- Missing weights or undecodable media returns `blocked` and
  `realInferenceExecuted: false`.
- Store portable relative paths only; never store machine-specific absolute paths.
- Preserve unrelated dirty-worktree changes.
- Do not commit or push.

## Task 1: articulated-motion metric

- Add `services/ml-runtime/pipelines/cartoon_motion_metrics.py`.
- Add a real-input test using `fixtures/video/cartoon_character_motion.mp4`.
- Measure wrists relative to shoulders and ankles relative to hips.
- Require at least five matched frames, more than 40 px motion, more than 5% of median
  detector-box height, and root movement smaller than relative limb motion.
- Do not invent missing points.

## Task 2: reproducible evidence runner

- Add `scripts/ml/run_video_pose_acceptance.py`.
- A missing source must return a machine-readable blocked report, exit 2, and
  `realInferenceExecuted: false`.
- A successful run must write `cartoon-motion-metrics.json`, source provenance, all normal
  pose artifacts and SHA-256 hashes, then verify the hashes.

## Task 3: real fixture and evidence

- Use the published Pixabay asset 130787 from GreenScreenFX.
- Track source and fixture hashes in
  `fixtures/video/cartoon_character_motion.source.json`.
- Keep the MP4 ignored; document deterministic download, trim and verification.
- Run:

```bash
.venv-ml/bin/python scripts/ml/run_video_pose_acceptance.py \
  --video fixtures/video/cartoon_character_motion.mp4 \
  --output-dir docs/evidence/sprint1-video-pose-real \
  --source-page https://pixabay.com/videos/boy-walking-cartoon-character-130787/ \
  --license-url https://pixabay.com/service/license-summary/ \
  --creator GreenScreenFX \
  --title "Boy Walking Cartoon Character" \
  --download-url https://cdn.pixabay.com/video/2022/09/10/130787-748398315_large.mp4
```

## Task 4: capability registry

- Update only the video-pose portion of `perception.video_to_retarget`.
- Reference physical evidence, measured articulation, model hashes, overlay decode result
  and explicit DWPose licensing risk.
- Keep production blocked until a commercially approved provider replaces the
  experimental fallback.

## Task 5: verification

- Run focused video tests, the full TypeScript and Python suites, build and typecheck.
- Verify registry, evidence hashes, overlay decoding and path portability.
- Repeat the hermetic checks from a clean source snapshot.
- Report exact exit codes, real-model scope, limitations and next Sprint 1 slice.
