"""
Sprint 1 — real per-frame video pose tracking.

Pipeline:
    video -> bounded frame decode -> YOLOX person detection -> single-person identity
    association -> DWPose inference per analyzed frame -> coordinates mapped back into
    source-video space -> measured confidence -> jitter measurement -> smoothing chosen
    by that measurement -> VideoPoseSequence -> physical artifacts.

Honesty rules:
  * Nothing runs unless the real weights are present; otherwise `blocked` with
    realInferenceExecuted=False.
  * Identity across frames is IoU + pose similarity on a single person. It is reported as
    `identityMethod`, with `isTracking=False`. It is not multi-object tracking.
  * Missing keypoints are never replaced with body-proportion guesses. They are dropped, or
    held for a bounded number of frames and flagged `interpolated=True`.
  * Low-confidence keypoints are not smoothed as though they were reliable.
  * The filter is selected by measuring candidates on the actual data, not by preference.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

_HERE = Path(__file__).resolve().parent
if str(_HERE.parent) not in sys.path:
    sys.path.insert(0, str(_HERE.parent))

from providers.dwpose_provider import DWPoseProvider, WEIGHTS_DIR  # noqa: E402
from pipelines.video_pose_schema import (  # noqa: E402
    DetectorBox,
    JitterMetrics,
    Keypoint,
    SmoothingReport,
    VideoPoseFrame,
    VideoPoseSequence,
)

MAX_FRAMES_DEFAULT = 600
LOW_CONFIDENCE_THRESHOLD = 0.3
MAX_HOLD_FRAMES = 3
IOU_MATCH_THRESHOLD = 0.3


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _iou(a: Tuple[float, float, float, float], b: Tuple[float, float, float, float]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    inter_w = max(0.0, min(ax2, bx2) - max(ax1, bx1))
    inter_h = max(0.0, min(ay2, by2) - max(ay1, by1))
    inter = inter_w * inter_h
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def _pose_similarity(prev: np.ndarray, curr: np.ndarray, scale: float) -> float:
    """Mean normalized distance between two keypoint sets, converted to a 0..1 similarity."""
    if prev is None or curr is None or scale <= 0:
        return 0.0
    distance = np.linalg.norm(prev - curr, axis=1).mean()
    return float(max(0.0, 1.0 - distance / scale))


class OneEuroFilter:
    """
    One Euro Filter (Casiez et al.). Low lag at speed, strong smoothing at rest — the
    behaviour wanted for pose, and simple enough to explain in a review.
    """

    def __init__(self, freq: float, min_cutoff: float = 1.0, beta: float = 0.007, d_cutoff: float = 1.0):
        self.freq = max(freq, 1e-6)
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        self._x_prev: Optional[float] = None
        self._dx_prev: float = 0.0

    @staticmethod
    def _alpha(cutoff: float, freq: float) -> float:
        tau = 1.0 / (2.0 * math.pi * cutoff)
        te = 1.0 / freq
        return 1.0 / (1.0 + tau / te)

    def __call__(self, value: float) -> float:
        if self._x_prev is None:
            self._x_prev = value
            return value
        dx = (value - self._x_prev) * self.freq
        a_d = self._alpha(self.d_cutoff, self.freq)
        dx_hat = a_d * dx + (1 - a_d) * self._dx_prev
        cutoff = self.min_cutoff + self.beta * abs(dx_hat)
        a = self._alpha(cutoff, self.freq)
        x_hat = a * value + (1 - a) * self._x_prev
        self._x_prev, self._dx_prev = x_hat, dx_hat
        return x_hat


class EmaFilter:
    def __init__(self, alpha: float = 0.5):
        self.alpha = alpha
        self._prev: Optional[float] = None

    def __call__(self, value: float) -> float:
        if self._prev is None:
            self._prev = value
            return value
        self._prev = self.alpha * value + (1 - self.alpha) * self._prev
        return self._prev


def measure_jitter(
    frames: List[VideoPoseFrame], use_smoothed: bool, confidence_threshold: float
) -> JitterMetrics:
    """
    Frame-to-frame displacement of keypoints that were confidently observed in both frames.

    Low-confidence points are excluded so the metric reflects tracking stability rather than
    noise from points the model never localized.
    """
    displacements: List[float] = []
    for prev_frame, curr_frame in zip(frames, frames[1:]):
        prev_map = {k.index: k for k in prev_frame.keypoints}
        for curr in curr_frame.keypoints:
            prev = prev_map.get(curr.index)
            if prev is None:
                continue
            if not (prev.observed and curr.observed):
                continue
            if prev.confidence < confidence_threshold or curr.confidence < confidence_threshold:
                continue
            if use_smoothed:
                if prev.smoothedX is None or curr.smoothedX is None:
                    continue
                px, py, cx, cy = prev.smoothedX, prev.smoothedY, curr.smoothedX, curr.smoothedY
            else:
                px, py, cx, cy = prev.x, prev.y, curr.x, curr.y
            displacements.append(float(math.hypot(cx - px, cy - py)))

    if not displacements:
        return JitterMetrics(
            medianPixelsPerFrame=0.0, meanPixelsPerFrame=0.0, p95PixelsPerFrame=0.0, sampleCount=0
        )
    arr = np.array(displacements)
    return JitterMetrics(
        medianPixelsPerFrame=float(np.median(arr)),
        meanPixelsPerFrame=float(arr.mean()),
        p95PixelsPerFrame=float(np.percentile(arr, 95)),
        sampleCount=int(arr.size),
    )


def _apply_filter(frames: List[VideoPoseFrame], fps: float, kind: str, threshold: float) -> Tuple[int, int]:
    """Populate smoothedX/smoothedY in place. Returns (smoothed_count, skipped_low_conf)."""
    filters: Dict[Tuple[int, str], Any] = {}
    smoothed = 0
    skipped = 0

    def make(axis_key: Tuple[int, str]):
        if kind == "one_euro":
            return OneEuroFilter(freq=fps)
        if kind == "ema":
            return EmaFilter(alpha=0.5)
        raise ValueError(f"unknown filter {kind}")

    for frame in frames:
        for kp in frame.keypoints:
            if not kp.observed or kp.confidence < threshold:
                # Deliberately left unsmoothed: filtering an unreliable point would give it
                # the appearance of a stable measurement.
                kp.smoothedX, kp.smoothedY = None, None
                skipped += 1
                continue
            for axis, value in (("x", kp.x), ("y", kp.y)):
                key = (kp.index, axis)
                if key not in filters:
                    filters[key] = make(key)
            kp.smoothedX = float(filters[(kp.index, "x")](kp.x))
            kp.smoothedY = float(filters[(kp.index, "y")](kp.y))
            smoothed += 1
    return smoothed, skipped


def _reset_smoothing(frames: List[VideoPoseFrame]) -> None:
    for frame in frames:
        for kp in frame.keypoints:
            kp.smoothedX, kp.smoothedY = None, None


def track_video_pose(
    video_path: str,
    output_dir: str,
    frame_stride: int = 1,
    max_frames: int = MAX_FRAMES_DEFAULT,
    confidence_threshold: float = LOW_CONFIDENCE_THRESHOLD,
    device: str = "cpu",
) -> Dict[str, Any]:
    """
    Run the real pose pipeline over a video and write evidence artifacts.

    Returns a result dict. When weights are missing it returns `blocked` with
    realInferenceExecuted=False rather than producing anything.
    """
    provider = DWPoseProvider({"enabled": True, "device": device})
    state = provider.detect()
    if state["status"] != "installed_verified":
        return {
            "status": "blocked",
            "realInferenceExecuted": False,
            "blockingReason": f"DWPose/YOLOX weights unavailable: {state}",
        }

    source = Path(video_path)
    if not source.exists():
        return {
            "status": "blocked",
            "realInferenceExecuted": False,
            "blockingReason": f"Video not found: {video_path}",
        }

    capture = cv2.VideoCapture(str(source))
    if not capture.isOpened():
        return {
            "status": "blocked",
            "realInferenceExecuted": False,
            "blockingReason": f"OpenCV could not decode: {video_path}",
        }

    fps = float(capture.get(cv2.CAP_PROP_FPS) or 24.0)
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))

    provider.load_model()

    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    frames_dir = out_dir / "representative-frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    frames: List[VideoPoseFrame] = []
    overlay_images: List[np.ndarray] = []
    warnings: List[str] = []

    prev_box: Optional[Tuple[float, float, float, float]] = None
    prev_points: Optional[np.ndarray] = None
    identity_switches = 0
    frame_index = -1
    analyzed = 0
    hold_counters: Dict[int, int] = {}
    last_good: Dict[int, Tuple[float, float, float]] = {}

    while analyzed < max_frames:
        ok, image = capture.read()
        if not ok:
            break
        frame_index += 1
        if frame_index % frame_stride != 0:
            continue

        started = time.perf_counter()
        people = provider.detect_people(image)
        frame_warnings: List[str] = []

        record = VideoPoseFrame(
            frameIndex=frame_index,
            timestampSeconds=frame_index / fps if fps > 0 else 0.0,
            sourceWidth=width,
            sourceHeight=height,
        )

        if not people:
            record.warnings.append("no_person_detected")
            record.inferenceDurationMs = (time.perf_counter() - started) * 1000.0
            frames.append(record)
            overlay_images.append(image.copy())
            analyzed += 1
            continue

        # Single-person identity association: prefer the detection that overlaps the
        # previous box, falling back to the strongest detection.
        chosen = max(people, key=lambda p: p["score"])
        if prev_box is not None:
            scored = [(p, _iou(prev_box, tuple(p["bbox"]))) for p in people]
            best, best_iou = max(scored, key=lambda item: item[1])
            if best_iou >= IOU_MATCH_THRESHOLD:
                chosen = best
            else:
                identity_switches += 1
                frame_warnings.append(f"identity_reassigned_low_iou_{best_iou:.2f}")

        box = tuple(chosen["bbox"])
        keypoints_xy, scores = provider.estimate_pose(image, box)

        if prev_points is not None:
            diag = math.hypot(box[2] - box[0], box[3] - box[1])
            similarity = _pose_similarity(prev_points, keypoints_xy, diag)
            if similarity < 0.2:
                frame_warnings.append(f"low_pose_similarity_{similarity:.2f}")

        kp_models: List[Keypoint] = []
        for idx in range(keypoints_xy.shape[0]):
            x, y = float(keypoints_xy[idx][0]), float(keypoints_xy[idx][1])
            confidence = float(scores[idx])
            observed = confidence >= confidence_threshold

            interpolated = False
            if not observed:
                # Bounded hold: reuse the last confident value for a few frames, marked as
                # interpolated. Never a body-proportion guess.
                held = last_good.get(idx)
                counter = hold_counters.get(idx, 0)
                if held is not None and counter < MAX_HOLD_FRAMES:
                    x, y = held[0], held[1]
                    interpolated = True
                    observed = True
                    hold_counters[idx] = counter + 1
                else:
                    hold_counters[idx] = counter + 1
            else:
                hold_counters[idx] = 0
                last_good[idx] = (x, y, confidence)

            kp_models.append(
                Keypoint(
                    index=idx,
                    x=x,
                    y=y,
                    confidence=confidence,
                    observed=observed,
                    interpolated=interpolated,
                )
            )

        record.detectorBox = DetectorBox(
            x1=box[0], y1=box[1], x2=box[2], y2=box[3], score=float(chosen["score"])
        )
        record.detectorConfidence = float(chosen["score"])
        record.selectedPersonId = "person_0"
        record.keypoints = kp_models
        record.visibleKeypointCount = sum(1 for k in kp_models if k.observed and not k.interpolated)
        record.inferenceDurationMs = (time.perf_counter() - started) * 1000.0
        record.warnings = frame_warnings

        frames.append(record)
        prev_box, prev_points = box, keypoints_xy

        overlay = image.copy()
        cv2.rectangle(overlay, (int(box[0]), int(box[1])), (int(box[2]), int(box[3])), (255, 128, 0), 2)
        for kp in kp_models:
            if not kp.observed:
                continue
            colour = (0, 200, 255) if kp.interpolated else (0, 255, 0)
            cv2.circle(overlay, (int(kp.x), int(kp.y)), 3, colour, -1)
        overlay_images.append(overlay)
        analyzed += 1

    capture.release()

    if analyzed == 0:
        return {
            "status": "blocked",
            "realInferenceExecuted": False,
            "blockingReason": "No frames could be decoded from the video.",
        }

    # ---- jitter measured BEFORE any smoothing, then the filter chosen by measurement ----
    jitter_before = measure_jitter(frames, use_smoothed=False, confidence_threshold=confidence_threshold)

    candidates: Dict[str, float] = {}
    for candidate in ("one_euro", "ema"):
        _reset_smoothing(frames)
        _apply_filter(frames, fps, candidate, confidence_threshold)
        candidates[candidate] = measure_jitter(
            frames, use_smoothed=True, confidence_threshold=confidence_threshold
        ).medianPixelsPerFrame

    chosen_filter = min(candidates, key=lambda name: candidates[name])
    _reset_smoothing(frames)
    smoothed_count, skipped_count = _apply_filter(frames, fps, chosen_filter, confidence_threshold)
    jitter_after = measure_jitter(frames, use_smoothed=True, confidence_threshold=confidence_threshold)

    reduction = 0.0
    if jitter_before.medianPixelsPerFrame > 0:
        reduction = (
            (jitter_before.medianPixelsPerFrame - jitter_after.medianPixelsPerFrame)
            / jitter_before.medianPixelsPerFrame
            * 100.0
        )

    interpolated_count = sum(1 for f in frames for k in f.keypoints if k.interpolated)
    frames_with = sum(1 for f in frames if f.detectorBox is not None)

    smoothing = SmoothingReport(
        filterApplied=chosen_filter,
        chosenBy="lowest median jitter among candidates measured on this sequence",
        candidatesMeasured=candidates,
        jitterBefore=jitter_before,
        jitterAfter=jitter_after,
        jitterReductionPercent=reduction,
        confidenceThreshold=confidence_threshold,
        maxHoldFrames=MAX_HOLD_FRAMES,
        smoothedKeypointCount=smoothed_count,
        skippedLowConfidenceCount=skipped_count,
        interpolatedKeypointCount=interpolated_count,
    )

    assert provider.manifest is not None
    try:
        relative_source = source.resolve().relative_to(Path.cwd()).as_posix()
    except ValueError:
        relative_source = source.name
        warnings.append("source video lies outside the repository; only its name is recorded")

    sequence = VideoPoseSequence(
        sourceVideo=relative_source,
        sourceVideoSha256=sha256_file(source),
        sourceWidth=width,
        sourceHeight=height,
        fps=fps,
        totalFrames=total_frames,
        analyzedFrames=analyzed,
        frameStride=frame_stride,
        realInferenceExecuted=True,
        detectorModel="yolox_l",
        poseModel="dw-ll_ucoco_384",
        detectorModelSha256=provider.manifest["yolox"]["sha256"],
        poseModelSha256=provider.manifest["dwpose"]["sha256"],
        identitySwitchCount=identity_switches,
        framesWithDetection=frames_with,
        framesWithoutDetection=analyzed - frames_with,
        detectionRate=frames_with / analyzed if analyzed else 0.0,
        smoothing=smoothing,
        warnings=warnings,
        requiresHumanReview=frames_with < analyzed,
    )

    artifacts = _write_artifacts(out_dir, frames_dir, sequence, frames, overlay_images, fps)

    return {
        "status": "success",
        "realInferenceExecuted": True,
        "analyzedFrames": analyzed,
        "framesWithDetection": frames_with,
        "detectionRate": sequence.detectionRate,
        "identitySwitchCount": identity_switches,
        "jitterBefore": jitter_before.model_dump(),
        "jitterAfter": jitter_after.model_dump(),
        "filterApplied": chosen_filter,
        "filterCandidates": candidates,
        "outputDir": out_dir.as_posix(),
        **artifacts,
    }


def _write_artifacts(
    out_dir: Path,
    frames_dir: Path,
    sequence: VideoPoseSequence,
    frames: List[VideoPoseFrame],
    overlays: List[np.ndarray],
    fps: float,
) -> Dict[str, Any]:
    raw_path = out_dir / "raw-keypoints.jsonl"
    smooth_path = out_dir / "smoothed-keypoints.jsonl"
    with raw_path.open("w", encoding="utf-8") as raw_f, smooth_path.open("w", encoding="utf-8") as sm_f:
        for frame in frames:
            raw_f.write(
                json.dumps(
                    {
                        "frameIndex": frame.frameIndex,
                        "timestampSeconds": frame.timestampSeconds,
                        "detectorBox": frame.detectorBox.model_dump() if frame.detectorBox else None,
                        "visibleKeypointCount": frame.visibleKeypointCount,
                        "inferenceDurationMs": frame.inferenceDurationMs,
                        "warnings": frame.warnings,
                        "keypoints": [
                            {
                                "index": k.index,
                                "x": k.x,
                                "y": k.y,
                                "confidence": k.confidence,
                                "observed": k.observed,
                                "interpolated": k.interpolated,
                            }
                            for k in frame.keypoints
                        ],
                    }
                )
                + "\n"
            )
            sm_f.write(
                json.dumps(
                    {
                        "frameIndex": frame.frameIndex,
                        "keypoints": [
                            {
                                "index": k.index,
                                "smoothedX": k.smoothedX,
                                "smoothedY": k.smoothedY,
                                "confidence": k.confidence,
                                "smoothed": k.smoothedX is not None,
                                "interpolated": k.interpolated,
                            }
                            for k in frame.keypoints
                        ],
                    }
                )
                + "\n"
            )

    (out_dir / "input-manifest.json").write_text(
        json.dumps(
            {
                "sourceVideo": sequence.sourceVideo,
                "sourceVideoSha256": sequence.sourceVideoSha256,
                "sourceWidth": sequence.sourceWidth,
                "sourceHeight": sequence.sourceHeight,
                "fps": sequence.fps,
                "totalFrames": sequence.totalFrames,
                "analyzedFrames": sequence.analyzedFrames,
                "frameStride": sequence.frameStride,
                "detectorModel": sequence.detectorModel,
                "detectorModelSha256": sequence.detectorModelSha256,
                "poseModel": sequence.poseModel,
                "poseModelSha256": sequence.poseModelSha256,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    (out_dir / "tracking-metrics.json").write_text(
        json.dumps(sequence.model_dump(), indent=2), encoding="utf-8"
    )

    all_conf = [k.confidence for f in frames for k in f.keypoints]
    conf_arr = np.array(all_conf) if all_conf else np.array([0.0])
    (out_dir / "confidence-report.json").write_text(
        json.dumps(
            {
                "keypointSamples": int(conf_arr.size),
                "min": float(conf_arr.min()),
                "max": float(conf_arr.max()),
                "mean": float(conf_arr.mean()),
                "median": float(np.median(conf_arr)),
                "uniqueValues": int(np.unique(conf_arr).size),
                "isConstant": bool(np.unique(conf_arr).size <= 1),
                "histogram": {
                    "0.0-0.3": int((conf_arr < 0.3).sum()),
                    "0.3-0.6": int(((conf_arr >= 0.3) & (conf_arr < 0.6)).sum()),
                    "0.6-0.9": int(((conf_arr >= 0.6) & (conf_arr < 0.9)).sum()),
                    "0.9+": int((conf_arr >= 0.9).sum()),
                },
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    # Representative frames: first, middle, last analyzed frame with a detection.
    written_frames: List[str] = []
    detected_idx = [i for i, f in enumerate(frames) if f.detectorBox is not None]
    picks = sorted({detected_idx[0], detected_idx[len(detected_idx) // 2], detected_idx[-1]}) if detected_idx else []
    for i in picks:
        target = frames_dir / f"frame_{frames[i].frameIndex:06d}.png"
        cv2.imwrite(str(target), overlays[i])
        written_frames.append(target.relative_to(out_dir).as_posix())

    video_result = _write_overlay_video(out_dir, overlays, fps)

    execution_report = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "realInferenceExecuted": True,
        "analyzedFrames": sequence.analyzedFrames,
        "detectionRate": sequence.detectionRate,
        "filterApplied": sequence.smoothing.filterApplied if sequence.smoothing else None,
        "overlayVideo": video_result,
        "representativeFrames": written_frames,
    }
    (out_dir / "execution-report.json").write_text(json.dumps(execution_report, indent=2), encoding="utf-8")

    hashes = {}
    for path in sorted(out_dir.rglob("*")):
        if path.is_file() and path.name != "hashes.json":
            hashes[path.relative_to(out_dir).as_posix()] = sha256_file(path)
    (out_dir / "hashes.json").write_text(json.dumps(hashes, indent=2), encoding="utf-8")

    return {"overlayVideo": video_result, "representativeFrames": written_frames, "artifactHashes": hashes}


def _write_overlay_video(out_dir: Path, overlays: List[np.ndarray], fps: float) -> Dict[str, Any]:
    """
    Write the overlay video and verify it actually decodes with ffprobe.

    If no usable encoder exists, a PNG sequence is written instead and the video is
    honestly reported as blocked. A non-decodable file is deleted rather than left behind.
    """
    if not overlays:
        return {"status": "blocked", "reason": "no frames to encode"}

    target = out_dir / "keypoints-overlay.mp4"
    height, width = overlays[0].shape[:2]
    writer = cv2.VideoWriter(str(target), cv2.VideoWriter_fourcc(*"mp4v"), max(fps, 1.0), (width, height))
    if writer.isOpened():
        for image in overlays:
            writer.write(image)
        writer.release()

    probe = _ffprobe(target)
    if probe.get("decodable"):
        return {"status": "ok", "path": target.name, **probe}

    if target.exists():
        target.unlink()
    seq_dir = out_dir / "overlay-frames"
    seq_dir.mkdir(parents=True, exist_ok=True)
    for i, image in enumerate(overlays):
        cv2.imwrite(str(seq_dir / f"overlay_{i:06d}.png"), image)
    return {
        "status": "blocked",
        "reason": probe.get("error", "encoder unavailable or output not decodable"),
        "pngSequenceDir": seq_dir.relative_to(out_dir).as_posix(),
        "pngFrameCount": len(overlays),
    }


def _ffprobe(path: Path) -> Dict[str, Any]:
    if not path.exists() or path.stat().st_size == 0:
        return {"decodable": False, "error": "file missing or empty"}
    try:
        proc = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=codec_name,width,height,nb_read_packets",
                "-count_packets", "-of", "json", str(path),
            ],
            capture_output=True, text=True, timeout=120,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        return {"decodable": False, "error": f"ffprobe unavailable: {exc}"}

    if proc.returncode != 0:
        return {"decodable": False, "error": proc.stderr.strip()[:400]}
    try:
        streams = json.loads(proc.stdout).get("streams", [])
    except json.JSONDecodeError:
        return {"decodable": False, "error": "ffprobe returned unparsable output"}
    if not streams:
        return {"decodable": False, "error": "no video stream"}
    stream = streams[0]
    packets = int(stream.get("nb_read_packets", 0))
    return {
        "decodable": packets > 0,
        "codec": stream.get("codec_name"),
        "width": stream.get("width"),
        "height": stream.get("height"),
        "decodedPackets": packets,
        "sizeBytes": path.stat().st_size,
    }
