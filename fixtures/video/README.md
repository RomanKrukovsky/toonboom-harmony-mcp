# Video fixtures for Sprint 1 pose tracking

The Sprint 1 acceptance test is **blocked** until a real clip is placed here. Nothing in
this repository substitutes for it: synthetic footage and static images cannot demonstrate
that a wrist moves relative to a shoulder over time, which is the whole claim under test.

## What to add

Place a short clip at:

```
fixtures/video/arm_raise.mp4
```

Or point the tests at another path:

```bash
export HARMONY_POSE_TEST_VIDEO=/absolute/path/to/your/clip.mp4
```

### Requirements

| Property | Requirement | Why |
|---|---|---|
| Content | **One person raising an arm** from beside the body to at least shoulder height, then lowering it | The acceptance metric is wrist displacement relative to the shoulder |
| Duration | 2–6 seconds | Enough frames for jitter statistics; short enough for CPU inference |
| Frame rate | 24–30 fps | Temporal filtering assumes roughly this range |
| Resolution | 640×480 minimum, 1280×720 preferred | YOLOX needs enough pixels to detect the person |
| Framing | Upper body or full body visible, person occupying ≥ 25% of frame height | Top-down pose needs a usable person crop |
| People | Exactly one | v1 is single-person; multi-person is a recorded capability gap |
| Codec | H.264 / MPEG-4 in MP4, decodable by `ffprobe` | Verified before use |
| Lighting | Even, person clearly separated from background | Avoids detector dropout |

### Verify it before relying on it

```bash
ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=codec_name,width,height,nb_read_packets -of default=noprint_wrappers=1 fixtures/video/arm_raise.mp4
```

Then run the acceptance test:

```bash
.venv-ml/bin/python -m pytest services/ml-runtime/tests/test_video_pose.py -q
```

## Privacy

The clip is used only for local inference. No frame is uploaded anywhere. If it shows a real
person, treat it as personal data: keep it out of commits. `fixtures/video/*.mp4` is
gitignored for that reason — only this README is tracked.

## Why no fixture ships with the repository

Searched on 2026-07-27 and found nothing usable:

- All 71 `.mp4` files under `output/` are fabricated placeholders — 17-byte ASCII files
  containing `MOCK_VIDEO_STREAM` or 34-byte `SIMULATED_VIDEO_STREAM_PLACEHOLDER`. **Zero**
  are decodable, including one named `SC_TEST_REAL_preview.mp4`.
- No OpenCV sample videos are installed in any virtualenv.
- The only real clip bundled with a dependency is
  `skimage/data/no_time_for_that_tiny.gif` at 14×25 px — far too small for pose estimation.

Rather than fabricate footage, the pipeline is built and mechanism-tested, and the
biomechanical acceptance test reports `blocked` with these instructions.
