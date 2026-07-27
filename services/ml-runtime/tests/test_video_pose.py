"""
Sprint 1 — video pose tracking tests.

Two tiers, deliberately separated so neither can be mistaken for the other:

  * MECHANISM tests run against a clip built by moving a synthetic camera over a reference
    image. They prove the plumbing: real per-frame inference,
    coordinate mapping back into video space, identity association, measured confidence,
    smoothing, determinism, portable paths. The subject does not move, so these tests can
    never prove biomechanical motion and never claim to.

  * The ACCEPTANCE test needs a real published 2D cartoon clip with articulated character
    motion. Without it the test reports blocked with the exact fixture requirements — it
    is never satisfied by synthetic footage or a static image.

See fixtures/video/README.md.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = RUNTIME_ROOT.parent.parent
sys.path.insert(0, str(RUNTIME_ROOT))

from pipelines.video_pose import (  # noqa: E402
    OneEuroFilter,
    measure_jitter,
    track_video_pose,
)
from pipelines.cartoon_motion_metrics import measure_cartoon_motion  # noqa: E402
from pipelines.video_pose_schema import KEYPOINT_INDEX, VideoPoseSequence  # noqa: E402
from providers.dwpose_provider import WEIGHTS_DIR  # noqa: E402

WEIGHTS_PRESENT = (WEIGHTS_DIR / "dw-ll_ucoco_384.onnx").exists() and (
    WEIGHTS_DIR / "yolox_l.onnx"
).exists()

MECHANISM_CLIP = REPO_ROOT / "output" / "video-pose-sprint1-mechanism" / "mechanism_camera_move.mp4"
ACCEPTANCE_VIDEO = Path(
    os.environ.get(
        "HARMONY_POSE_TEST_VIDEO",
        REPO_ROOT / "fixtures" / "video" / "cartoon_character_motion.mp4",
    )
)

ACCEPTANCE_INSTRUCTIONS = (
    "Sprint 1 acceptance is BLOCKED: no real published 2D cartoon clip is present.\n"
    f"Place a 2-6s clip with articulated character motion at: {ACCEPTANCE_VIDEO}\n"
    "or set HARMONY_POSE_TEST_VIDEO to its absolute path.\n"
    "Requirements are in fixtures/video/README.md. Generated footage and static images are "
    "NOT accepted: they cannot demonstrate measured limb motion relative to the torso."
)


def _build_mechanism_clip() -> Path:
    """Synthetic CAMERA motion over a real photograph. Not a substitute for real footage."""
    if MECHANISM_CLIP.exists():
        return MECHANISM_CLIP
    source = REPO_ROOT / "fixtures" / "character.png"
    if not source.exists():
        pytest.skip("fixtures/character.png missing")
    image = cv2.imread(str(source))
    height, width = image.shape[:2]
    MECHANISM_CLIP.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(MECHANISM_CLIP), cv2.VideoWriter_fourcc(*"mp4v"), 24.0, (384, 384))
    assert writer.isOpened()
    total = 48
    for i in range(total):
        t = i / (total - 1)
        zoom = 1.0 - 0.18 * np.sin(np.pi * t)
        cw, ch = int(width * zoom), int(height * zoom)
        cx = int((width - cw) * (0.5 + 0.22 * np.sin(2 * np.pi * t)))
        cy = int((height - ch) * (0.5 + 0.10 * np.sin(np.pi * t)))
        writer.write(cv2.resize(image[cy : cy + ch, cx : cx + cw], (384, 384)))
    writer.release()
    return MECHANISM_CLIP


@pytest.fixture(scope="module")
def mechanism_run(tmp_path_factory):
    if not WEIGHTS_PRESENT:
        pytest.skip("DWPose/YOLOX weights not downloaded")
    clip = _build_mechanism_clip()
    out = tmp_path_factory.mktemp("mech")
    result = track_video_pose(str(clip), str(out), frame_stride=2, max_frames=24)
    if result["status"] != "success":
        pytest.fail(f"mechanism run failed: {result}")
    return result, out


# --------------------------------------------------------------------- 7: weights gate


def test_missing_weights_blocks_honestly(tmp_path, monkeypatch):
    """Test 7 — absence of weights returns blocked and realInferenceExecuted=False."""
    import pipelines.video_pose as vp

    class NoWeights:
        def __init__(self, *_a, **_k):
            pass

        def detect(self):
            return {"status": "weights_missing", "realInferenceExecuted": False}

    monkeypatch.setattr(vp, "DWPoseProvider", NoWeights)
    result = vp.track_video_pose("anything.mp4", str(tmp_path))
    assert result["status"] == "blocked"
    assert result["realInferenceExecuted"] is False
    assert "weights" in result["blockingReason"].lower()


def test_undecodable_video_blocks(tmp_path):
    if not WEIGHTS_PRESENT:
        pytest.skip("weights not downloaded")
    fake = tmp_path / "fake.mp4"
    fake.write_text("MOCK_VIDEO_STREAM")  # exactly what output/ is full of
    result = track_video_pose(str(fake), str(tmp_path / "out"))
    assert result["status"] == "blocked"
    assert result["realInferenceExecuted"] is False


# ------------------------------------------------- 1,2,3: real inference on real frames


def test_provider_runs_on_real_frames(mechanism_run):
    """Test 1 — DWPoseProvider is invoked per frame and reports real execution."""
    result, out = mechanism_run
    assert result["realInferenceExecuted"] is True
    assert result["analyzedFrames"] > 1
    assert result["framesWithDetection"] >= 1
    assert result["detectionRate"] > 0.0

    raw_lines = (out / "raw-keypoints.jsonl").read_text().strip().splitlines()
    assert len(raw_lines) == result["analyzedFrames"]
    first = json.loads(raw_lines[0])
    assert len(first["keypoints"]) == 133
    assert first["inferenceDurationMs"] > 0.0


def test_confidence_is_not_constant(mechanism_run):
    """Test 2 — the Sprint 0 defect must not return through this path."""
    _, out = mechanism_run
    report = json.loads((out / "confidence-report.json").read_text())
    assert report["isConstant"] is False
    assert report["uniqueValues"] > 10
    assert report["min"] < report["max"]
    assert not (report["min"] == 1.0 and report["max"] == 1.0)


def test_coordinates_are_in_source_video_space(mechanism_run):
    """Test 3 — keypoints map back into the original frame, not the 288x384 crop."""
    result, out = mechanism_run
    manifest = json.loads((out / "input-manifest.json").read_text())
    width, height = manifest["sourceWidth"], manifest["sourceHeight"]

    inside = total = 0
    for line in (out / "raw-keypoints.jsonl").read_text().strip().splitlines():
        frame = json.loads(line)
        if frame["detectorBox"] is None:
            continue
        box = frame["detectorBox"]
        assert 0 <= box["x1"] < box["x2"] <= width + 1
        assert 0 <= box["y1"] < box["y2"] <= height + 1
        for kp in frame["keypoints"]:
            if not kp["observed"]:
                continue
            total += 1
            if -width <= kp["x"] <= 2 * width and -height <= kp["y"] <= 2 * height:
                inside += 1
    assert total > 0
    # Coordinates must be in frame-space; crop-space values would cluster under 288x384.
    assert inside / total > 0.95


# ---------------------------------------------------------------- 5,6: smoothing rules


def test_smoothing_reduces_jitter_without_destroying_motion(mechanism_run):
    """Test 5 — measured jitter falls, and large real motion survives the filter."""
    result, out = mechanism_run
    metrics = json.loads((out / "tracking-metrics.json").read_text())
    smoothing = metrics["smoothing"]

    before = smoothing["jitterBefore"]["medianPixelsPerFrame"]
    after = smoothing["jitterAfter"]["medianPixelsPerFrame"]
    assert before > 0
    assert after < before, "smoothing must reduce median jitter"
    assert smoothing["filterApplied"] in smoothing["candidatesMeasured"]
    # The filter was chosen by measurement, not preference.
    assert smoothing["candidatesMeasured"][smoothing["filterApplied"]] == min(
        smoothing["candidatesMeasured"].values()
    )

    # Large motion must survive: total travel of a smoothed keypoint stays comparable to raw.
    raw = [json.loads(l) for l in (out / "raw-keypoints.jsonl").read_text().strip().splitlines()]
    sm = [json.loads(l) for l in (out / "smoothed-keypoints.jsonl").read_text().strip().splitlines()]
    idx = KEYPOINT_INDEX["nose"]

    def travel(frames, xk, yk):
        pts = []
        for f in frames:
            kp = next((k for k in f["keypoints"] if k["index"] == idx), None)
            if kp and kp.get(xk) is not None:
                pts.append((kp[xk], kp[yk]))
        return sum(
            float(np.hypot(b[0] - a[0], b[1] - a[1])) for a, b in zip(pts, pts[1:])
        )

    raw_travel = travel(raw, "x", "y")
    sm_travel = travel(sm, "smoothedX", "smoothedY")
    assert raw_travel > 0
    assert sm_travel > 0.5 * raw_travel, "filter flattened the real movement"


def test_low_confidence_points_are_not_disguised_as_reliable(mechanism_run):
    """Test 6 — low-confidence keypoints are neither smoothed nor silently promoted."""
    result, out = mechanism_run
    metrics = json.loads((out / "tracking-metrics.json").read_text())
    threshold = metrics["smoothing"]["confidenceThreshold"]

    raw = {}
    for line in (out / "raw-keypoints.jsonl").read_text().strip().splitlines():
        frame = json.loads(line)
        raw[frame["frameIndex"]] = {k["index"]: k for k in frame["keypoints"]}

    checked = 0
    for line in (out / "smoothed-keypoints.jsonl").read_text().strip().splitlines():
        frame = json.loads(line)
        for kp in frame["keypoints"]:
            source = raw[frame["frameIndex"]][kp["index"]]
            if source["confidence"] < threshold and not source["interpolated"]:
                assert kp["smoothedX"] is None, "low-confidence point must not be smoothed"
                assert kp["smoothed"] is False
                checked += 1
    assert checked > 0, "expected at least one low-confidence keypoint in the sequence"

    # Held points must be explicitly flagged, never presented as fresh measurements.
    for line in (out / "raw-keypoints.jsonl").read_text().strip().splitlines():
        for kp in json.loads(line)["keypoints"]:
            if kp["interpolated"]:
                assert kp["observed"] is True
                assert kp["confidence"] < threshold


# ------------------------------------------------------------ 9,10: determinism, paths


def test_repeat_run_is_deterministic(tmp_path):
    """Test 9 — same input yields the same structural result within numeric tolerance."""
    if not WEIGHTS_PRESENT:
        pytest.skip("weights not downloaded")
    clip = _build_mechanism_clip()
    a = track_video_pose(str(clip), str(tmp_path / "a"), frame_stride=6, max_frames=8)
    b = track_video_pose(str(clip), str(tmp_path / "b"), frame_stride=6, max_frames=8)
    assert a["status"] == b["status"] == "success"
    assert a["analyzedFrames"] == b["analyzedFrames"]
    assert a["framesWithDetection"] == b["framesWithDetection"]
    assert a["filterApplied"] == b["filterApplied"]

    fa = [json.loads(l) for l in (tmp_path / "a" / "raw-keypoints.jsonl").read_text().strip().splitlines()]
    fb = [json.loads(l) for l in (tmp_path / "b" / "raw-keypoints.jsonl").read_text().strip().splitlines()]
    assert len(fa) == len(fb)
    for x, y in zip(fa, fb):
        assert x["frameIndex"] == y["frameIndex"]
        for kx, ky in zip(x["keypoints"], y["keypoints"]):
            assert kx["index"] == ky["index"]
            assert kx["x"] == pytest.approx(ky["x"], abs=1e-4)
            assert kx["y"] == pytest.approx(ky["y"], abs=1e-4)
            assert kx["confidence"] == pytest.approx(ky["confidence"], abs=1e-5)


def test_artifact_paths_are_relative_and_portable(mechanism_run):
    """Test 10 — no absolute machine paths leak into artifacts or the manifest."""
    _, out = mechanism_run
    home = str(Path.home())
    for name in (
        "input-manifest.json",
        "tracking-metrics.json",
        "confidence-report.json",
        "execution-report.json",
        "hashes.json",
    ):
        text = (out / name).read_text()
        assert home not in text, f"{name} leaks an absolute home path"
        assert "/Users/" not in text, f"{name} leaks an absolute user path"

    metrics = json.loads((out / "tracking-metrics.json").read_text())
    assert not Path(metrics["sourceVideo"]).is_absolute()

    hashes = json.loads((out / "hashes.json").read_text())
    assert hashes, "hashes.json must not be empty"
    for key in hashes:
        assert not Path(key).is_absolute()
        assert (out / key).exists()


def test_sequence_validates_against_schema(mechanism_run):
    _, out = mechanism_run
    metrics = json.loads((out / "tracking-metrics.json").read_text())
    sequence = VideoPoseSequence.model_validate(metrics)
    assert sequence.realInferenceExecuted is True
    assert sequence.providerTier == "experimental_fallback"
    assert sequence.commercialUseApproved is False
    assert "COCO-WholeBody" in sequence.productionBlockingReason
    # Heuristic association must never advertise itself as tracking.
    assert sequence.isTracking is False
    assert "multi_person_tracking" in sequence.notCaptured


def test_overlay_video_decodes_or_is_reported_blocked(mechanism_run):
    _, out = mechanism_run
    report = json.loads((out / "execution-report.json").read_text())
    overlay = report["overlayVideo"]
    if overlay["status"] == "ok":
        target = out / overlay["path"]
        assert target.exists() and target.stat().st_size > 1000
        proc = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
             "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", str(target)],
            capture_output=True, text=True, timeout=120,
        )
        assert proc.returncode == 0
        assert int(proc.stdout.strip()) > 0, "overlay video must really decode"
    else:
        # Honest fallback: PNG sequence on disk, video explicitly blocked.
        assert overlay["status"] == "blocked"
        assert "reason" in overlay
        assert (out / overlay["pngSequenceDir"]).is_dir()


def test_one_euro_filter_is_stable_and_tracks_steps():
    f = OneEuroFilter(freq=24.0)
    for _ in range(30):
        f(100.0)
    assert f(100.0) == pytest.approx(100.0, abs=1e-6)
    for _ in range(40):
        out = f(200.0)
    assert out == pytest.approx(200.0, rel=0.05), "filter must converge to a sustained step"


# ------------------------------------------------------------------- 4: acceptance


@pytest.mark.skipif(not WEIGHTS_PRESENT, reason="DWPose/YOLOX weights not downloaded")
def test_limb_moves_relative_to_torso_on_real_2d_animation(tmp_path):
    """
    Test 4 — THE acceptance test.

    Requires a real published 2D cartoon animation. It asserts the property a
    bounding-box mannequin or translated still can never satisfy: a limb moves relative
    to its shoulder or hip.
    """
    if not ACCEPTANCE_VIDEO.exists():
        pytest.skip(ACCEPTANCE_INSTRUCTIONS)

    result = track_video_pose(str(ACCEPTANCE_VIDEO), str(tmp_path / "acceptance"), frame_stride=1)
    assert result["status"] == "success", result
    assert result["realInferenceExecuted"] is True
    assert result["detectionRate"] > 0.8, "person must be detected in most frames"

    frames = [
        json.loads(l)
        for l in (tmp_path / "acceptance" / "smoothed-keypoints.jsonl").read_text().strip().splitlines()
    ]

    raw_frames = [
        json.loads(l)
        for l in (tmp_path / "acceptance" / "raw-keypoints.jsonl").read_text().strip().splitlines()
    ]
    metrics = measure_cartoon_motion(frames, raw_frames)
    assert metrics["accepted"] is True, metrics
    results = metrics["limbs"]
    best = metrics["bestLimb"]

    # Articulated motion moves at least one limb substantially relative to its torso joint.
    assert best["relativeMotionAmplitude"] > 40.0, (
        f"no limb moved relative to the torso: {results}"
    )
    assert best["rootStdDev"] < best["relativeMotionAmplitude"], (
        f"root moved as much as the limb; this is global motion, not articulation: {results}"
    )

    (tmp_path / "acceptance" / "cartoon-motion-metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )
