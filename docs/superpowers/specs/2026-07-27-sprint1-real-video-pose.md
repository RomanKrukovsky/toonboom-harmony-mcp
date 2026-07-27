# Sprint 1: real 2D animation to VideoPoseSequence

## Scope

This vertical slice proves one narrow claim from Sprint 1:

`published 2D cartoon clip -> YOLOX + DWPose per-frame inference -> VideoPoseSequence -> decodable overlay -> measured articulated motion -> evidence bundle`

Face, speech, retargeting and Harmony execution are not part of this slice.

## Input

- Pixabay video 130787, “Boy Walking Cartoon Character”.
- Creator: GreenScreenFX.
- Five-second H.264 excerpt, 1920×1080, 30000/1001 fps.
- The source page labels the clip as 2D animation and offers it under the Pixabay Content
  License. The tracked source manifest keeps the source URL, creator, license and both
  source and fixture SHA-256 hashes.
- The source is stored locally as `fixtures/video/cartoon_character_motion.mp4`. Stock
  video fixtures remain gitignored because they may not be redistributed as standalone
  files.

## Output and acceptance

The real provider must produce the strict `VideoPoseSequence` contract and these physical
artifacts:

- `input-manifest.json`
- `raw-keypoints.jsonl`
- `smoothed-keypoints.jsonl`
- `tracking-metrics.json`
- `confidence-report.json`
- `keypoints-overlay.mp4`
- representative PNG frames
- `execution-report.json`
- `cartoon-motion-metrics.json`
- `source-provenance.json`
- `hashes.json`

Acceptance requires:

- `realInferenceExecuted: true`;
- detection rate greater than 0.8;
- at least five matched limb/root frames;
- one wrist-to-shoulder or ankle-to-hip motion amplitude greater than 40 source pixels
  and 5% of median detector-box height;
- the root movement standard deviation smaller than the relative limb amplitude;
- non-constant measured confidence;
- overlay decodes with `ffprobe`;
- every evidence file except `hashes.json` has a verified SHA-256 entry;
- no absolute local path appears in the bundle.

## Truth and limitations

This run uses real YOLOX and DWPose ONNX weights already present locally. It proves real
model execution on one published 2D cartoon clip, not production licensing. DWPose remains
an experimental fallback because the COCO-WholeBody training-data licensing concern is
unresolved. RTMPose remains the required production-default follow-up.

The v1 identity method is single-subject IoU plus pose similarity and reports
`isTracking: false`. The result does not prove multi-character tracking, occlusion
robustness, face/hand quality, retargeting, or Harmony execution.

No commit or push is part of this work.
