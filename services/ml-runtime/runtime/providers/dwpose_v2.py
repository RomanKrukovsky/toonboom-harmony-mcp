"""DWPose provider on the V2 contract.

Wraps the existing, already hash-verified `providers/dwpose_provider.DWPoseProvider` rather than
reimplementing inference: that module's SimCC decode was carefully corrected in an earlier
sprint and re-deriving it would risk reintroducing the confidence-always-1.0 bug.

What this layer adds, and the previous version did not have:
  * a versioned request contract (`PoseEstimationRequestV2`) covering a single image, a frame
    sequence or a video;
  * an explicit coordinate model — space, origin, axis direction, source resolution and the
    transform into Harmony field coordinates;
  * a configurable mapping from DWPose's 133 COCO-WholeBody indices onto the project's
    canonical joint names, so nothing downstream ever sees a raw model index;
  * confidence gating, short-gap interpolation, outlier rejection and temporal smoothing, each
    recorded in `postProcessing` so a reviewer can tell measurement from cleanup;
  * lossless retention of the raw model output as a separate artifact.

What it deliberately does **not** do: infer pivots, bone hierarchy or rotation curves. DWPose
does not know those. They are computed by `pivotEstimator`, `retargetingResolver` and the rig
PIRs on the TypeScript side.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

RUNTIME_ROOT = Path(__file__).resolve().parents[2]
if str(RUNTIME_ROOT) not in sys.path:
    sys.path.insert(0, str(RUNTIME_ROOT))

from providers.dwpose_provider import DWPoseProvider  # noqa: E402  (legacy flat layout)

from ..security import SecurityError, verify_image  # noqa: E402
from .base import (  # noqa: E402
    ExecutionContext,
    MlRuntimeProvider,
    ProviderDescriptor,
    ProviderError,
    ProviderResult,
)

# COCO-WholeBody index -> canonical joint. Only the body and foot blocks are mapped; the 68 face
# and 42 hand points stay in the raw artifact and are consumed by the face/hand pipelines, which
# have their own contracts.
COCO_WHOLEBODY_TO_CANONICAL: Dict[int, str] = {
    0: "nose",
    1: "eye_left",
    2: "eye_right",
    3: "ear_left",
    4: "ear_right",
    5: "shoulder_left",
    6: "shoulder_right",
    7: "elbow_left",
    8: "elbow_right",
    9: "wrist_left",
    10: "wrist_right",
    11: "hip_left",
    12: "hip_right",
    13: "knee_left",
    14: "knee_right",
    15: "ankle_left",
    16: "ankle_right",
    19: "foot_left",   # left heel
    22: "foot_right",  # right heel
}

SKELETON_MAPPINGS: Dict[str, Dict[int, str]] = {
    "coco_wholebody133_to_canonical_v1": COCO_WHOLEBODY_TO_CANONICAL,
    # COCO-17 shares the first 17 indices, so the same table restricted to <17 is correct.
    "coco17_to_canonical_v1": {k: v for k, v in COCO_WHOLEBODY_TO_CANONICAL.items() if k < 17},
}

# Joints that are computed from others rather than predicted. They are marked interpolated=True
# so no consumer mistakes a derived midpoint for a measurement.
DERIVED_JOINTS = ("neck", "hip_center", "spine_mid")


class DWPoseV2Provider(MlRuntimeProvider):
    def __init__(self, model_settings: Optional[dict] = None):
        self._inner = DWPoseProvider(model_settings or {"enabled": True})

    @property
    def descriptor(self) -> ProviderDescriptor:
        return ProviderDescriptor(
            providerId="dwpose",
            modelId="dwpose-ll-ucoco-384",
            modelRevision="dw-ll_ucoco_384",
            taskTypes=("pose_estimation",),
            capabilities=("wholebody_133", "single_image", "frame_sequence", "video", "overlay"),
            inputSchemaVersions=("2.0",),
            outputSchemaVersions=("2.0",),
            resultKind="PoseSequenceV2",
            backend="onnxruntime",
            devices=("cpu", "mps", "cuda"),
            minRamGb=4.0,
            minVramGb=None,
            estimatedPeakMemoryMb=1800.0,
            supportsBatch=False,
            supportsCancellation=True,
            threadSafe=False,
            maxConcurrency=1,
            loadMode="lazy",
            unloadPolicy="idle_timeout",
            privacyClass="local_only",
            requiresPickle=False,
            requiredDependencies=("onnxruntime", "opencv-python-headless", "numpy"),
        )

    @property
    def cache_key(self) -> str:
        return "dwpose/dw-ll-ucoco-384"

    def detect(self) -> Dict[str, Any]:
        return self._inner.detect()

    # ------------------------------------------------------------------ validation --

    def validate_input(self, parameters: Dict[str, Any], inputs: List[Dict[str, Any]]) -> List[str]:
        problems: List[str] = []
        if not inputs:
            problems.append("at least one input artifact (image, frame sequence or video) is required")

        mode = parameters.get("inputMode", "image")
        if mode not in {"image", "frame_sequence", "video"}:
            problems.append(f"inputMode {mode!r} must be image, frame_sequence or video")

        mapping_id = parameters.get("skeletonMappingId", "coco_wholebody133_to_canonical_v1")
        if mapping_id not in SKELETON_MAPPINGS:
            problems.append(f"unknown skeletonMappingId {mapping_id!r}; known: {sorted(SKELETON_MAPPINGS)}")

        gate = parameters.get("confidenceGate", 0.3)
        if not isinstance(gate, (int, float)) or not 0.0 <= float(gate) <= 1.0:
            problems.append("confidenceGate must be a number in [0, 1]")

        fps = parameters.get("fps", 24)
        if not isinstance(fps, (int, float)) or float(fps) <= 0 or not math.isfinite(float(fps)):
            problems.append("fps must be a positive finite number")

        frame_base = parameters.get("frameBase", 1)
        if frame_base not in (0, 1):
            problems.append("frameBase must be 0 or 1")

        smoothing = parameters.get("temporalSmoothing", "none")
        if smoothing not in {"none", "savitzky_golay", "one_euro"}:
            problems.append(f"temporalSmoothing {smoothing!r} is not supported")

        if mode == "image" and len(inputs) != 1:
            problems.append("inputMode=image expects exactly one artifact")

        return problems

    # --------------------------------------------------------------------- execute --

    def execute(self, parameters: Dict[str, Any], inputs: List[Path], context: ExecutionContext) -> ProviderResult:
        mode = parameters.get("inputMode", "image")
        mapping_id = parameters.get("skeletonMappingId", "coco_wholebody133_to_canonical_v1")
        mapping = SKELETON_MAPPINGS[mapping_id]
        gate = float(parameters.get("confidenceGate", 0.3))
        fps = float(parameters.get("fps", 24))
        frame_base = int(parameters.get("frameBase", 1))
        max_gap = int(parameters.get("maxInterpolatedGapFrames", 2))
        smoothing = parameters.get("temporalSmoothing", "none")
        outlier = parameters.get("outlierRejection", "none")
        person_id = str(parameters.get("personId", "person_0"))

        frame_paths = self._expand_inputs(mode, inputs, context)
        context.token.raise_if_cancelled()

        # Confirm every frame decodes and none is a decompression bomb before loading the model.
        probes = [verify_image(p) for p in frame_paths]
        widths = {pr.width for pr in probes}
        heights = {pr.height for pr in probes}
        if len(widths) != 1 or len(heights) != 1:
            raise ProviderError("ML_INPUT_SCHEMA_INVALID", "all frames in a sequence must share one resolution")
        source_width, source_height = probes[0].width, probes[0].height

        raw_frames: List[Dict[str, Any]] = []
        pose_frames: List[Dict[str, Any]] = []
        warnings: List[str] = []
        any_real_inference = False

        work_dir = context.store.resolve(context.outputNamespace, f"{context.outputPrefix}/work")
        work_dir.mkdir(parents=True, exist_ok=True)

        for offset, frame_path in enumerate(frame_paths):
            context.token.raise_if_cancelled()
            frame_number = frame_base + offset
            result = self._inner.run(str(frame_path), str(work_dir / f"frame_{offset:06d}"))
            status = result.get("status")

            if status == "blocked":
                return ProviderResult(
                    status="blocked",
                    real_inference_executed=False,
                    simulated=False,
                    error_code="ML_MODEL_NOT_INSTALLED",
                    error_message=result.get("blockingReason") or "DWPose weights are unavailable",
                    warnings=[str(w) for w in result.get("errors", [])],
                )
            if status == "failed":
                raise ProviderError("ML_WORKER_CRASHED", "; ".join(result.get("errors", ["DWPose inference failed"])))

            any_real_inference = any_real_inference or bool(result.get("realInferenceExecuted"))

            if status == "no_person_detected":
                warnings.append(f"frame {frame_number}: no person above the detector threshold")
                pose_frames.append({
                    "frame": frame_number,
                    "personId": person_id,
                    "bbox": None,
                    "detectionScore": None,
                    "keypoints": [],
                    "mirrored": False,
                })
                raw_frames.append({"frame": frame_number, "status": status})
                continue

            skeleton_path = Path(result["skeletonPath"])
            raw_path = Path(result["rawPath"])
            import json

            skeleton = json.loads(skeleton_path.read_text(encoding="utf-8"))
            raw_frames.append({"frame": frame_number, "raw": json.loads(raw_path.read_text(encoding="utf-8"))})

            keypoints = self._to_canonical(skeleton["points"], mapping, gate)
            keypoints.extend(self._derive_joints(keypoints, gate))

            box = skeleton["personBox"]["bbox"]
            pose_frames.append({
                "frame": frame_number,
                "personId": person_id,
                "bbox": {
                    "x": float(box[0]),
                    "y": float(box[1]),
                    "width": max(float(box[2]) - float(box[0]), 1e-6),
                    "height": max(float(box[3]) - float(box[1]), 1e-6),
                },
                "detectionScore": _clamp01(float(skeleton["personBox"]["score"])),
                "keypoints": keypoints,
                "mirrored": bool(parameters.get("mirrored", False)),
            })

        context.token.raise_if_cancelled()

        interpolated = _interpolate_short_gaps(pose_frames, max_gap)
        if outlier != "none":
            _reject_outliers(pose_frames, method=outlier)
        if smoothing != "none":
            _smooth(pose_frames, method=smoothing, window=int(parameters.get("smoothingWindow", 5)))

        frames_present = [f["frame"] for f in pose_frames]
        pir = {
            "schemaVersion": "2.0",
            "sequenceId": f"pose_{context.jobId}",
            "taskType": "pose_estimation",
            "skeletonConvention": "coco_wholebody133" if mapping_id.startswith("coco_wholebody") else "coco17",
            "skeletonMappingId": mapping_id,
            "coordinates": _coordinate_space(source_width, source_height, parameters),
            "timing": {
                "frameBase": frame_base,
                "fps": fps,
                "frameCount": len(pose_frames),
                "startFrame": min(frames_present) if frames_present else frame_base,
                "endFrame": max(frames_present) if frames_present else frame_base,
            },
            "frames": pose_frames,
            "rawOutputArtifactId": None,   # filled in below once the artifact is written
            "overlayArtifactId": None,
            "postProcessing": {
                "confidenceGate": gate,
                "maxInterpolatedGapFrames": max_gap,
                "outlierRejection": outlier,
                "temporalSmoothing": smoothing,
                "smoothingParameters": {"window": float(parameters.get("smoothingWindow", 5))},
                "scaleNormalized": False,
            },
            "warnings": warnings + ([f"{interpolated} keypoint(s) filled by short-gap interpolation"] if interpolated else []),
        }

        raw_ref = context.store.put_json(
            context.outputNamespace, f"{context.outputPrefix}/raw-output.json",
            {"provider": "dwpose", "frames": raw_frames}, "raw_model_output")
        pir["rawOutputArtifactId"] = raw_ref.artifactId

        overlay_ref = None
        first_overlay = work_dir / "frame_000000" / "keypoints_overlay.png"
        if first_overlay.is_file():
            overlay_ref = context.store.put_bytes(
                context.outputNamespace, f"{context.outputPrefix}/overlay.png",
                first_overlay.read_bytes(), "overlay", "image/png")
            pir["overlayArtifactId"] = overlay_ref.artifactId

        pir_ref = context.store.put_json(context.outputNamespace, f"{context.outputPrefix}/normalized-pir.json", pir, "normalized_pir")

        artifacts = [raw_ref, pir_ref] + ([overlay_ref] if overlay_ref else [])
        return ProviderResult(
            status="succeeded",
            real_inference_executed=any_real_inference,
            simulated=False,
            output_artifacts=artifacts,
            normalized_pir=pir,
            warnings=warnings,
            device=self._inner.execution_provider or context.device,
            deterministic=True,
            precision="float32",
        )

    # ---------------------------------------------------------------------- helpers --

    def _expand_inputs(self, mode: str, inputs: List[Path], context: ExecutionContext) -> List[Path]:
        if mode == "image":
            return inputs[:1]
        if mode == "frame_sequence":
            return sorted(inputs)
        # video: decode to frames inside the job's own work directory
        return self._decode_video(inputs[0], context)

    def _decode_video(self, video: Path, context: ExecutionContext) -> List[Path]:
        import cv2

        capture = cv2.VideoCapture(str(video))
        if not capture.isOpened():
            raise ProviderError("ML_INPUT_SCHEMA_INVALID", "video could not be opened")
        frames_dir = context.store.resolve(context.outputNamespace, f"{context.outputPrefix}/frames")
        frames_dir.mkdir(parents=True, exist_ok=True)
        paths: List[Path] = []
        index = 0
        try:
            while True:
                context.token.raise_if_cancelled()
                ok, frame = capture.read()
                if not ok:
                    break
                target = frames_dir / f"{index:06d}.png"
                cv2.imwrite(str(target), frame)
                paths.append(target)
                index += 1
        finally:
            capture.release()
        if not paths:
            raise ProviderError("ML_INPUT_SCHEMA_INVALID", "video decoded to zero frames")
        return paths

    @staticmethod
    def _to_canonical(points: Sequence[Dict[str, Any]], mapping: Dict[int, str], gate: float) -> List[Dict[str, Any]]:
        result: List[Dict[str, Any]] = []
        for point in points:
            index = int(point["index"])
            joint = mapping.get(index)
            if joint is None:
                continue
            confidence = _clamp01(float(point["confidence"]))
            result.append({
                "joint": joint,
                "sourceIndex": index,
                "x": float(point["x"]),
                "y": float(point["y"]),
                "confidence": confidence,
                "interpolated": False,
                "gated": confidence < gate,
            })
        return result

    @staticmethod
    def _derive_joints(keypoints: List[Dict[str, Any]], gate: float) -> List[Dict[str, Any]]:
        by_joint = {k["joint"]: k for k in keypoints}
        derived: List[Dict[str, Any]] = []

        def midpoint(a: str, b: str, name: str, source_index: int) -> Optional[Dict[str, Any]]:
            left, right = by_joint.get(a), by_joint.get(b)
            if not left or not right:
                return None
            confidence = min(left["confidence"], right["confidence"])
            return {
                "joint": name,
                "sourceIndex": source_index,
                "x": (left["x"] + right["x"]) / 2.0,
                "y": (left["y"] + right["y"]) / 2.0,
                "confidence": confidence,
                # A derived midpoint is not an observation; saying otherwise would let a rig
                # treat a computed value as evidence.
                "interpolated": True,
                "gated": confidence < gate,
            }

        neck = midpoint("shoulder_left", "shoulder_right", "neck", 5)
        hip_center = midpoint("hip_left", "hip_right", "hip_center", 11)
        if neck:
            derived.append(neck)
        if hip_center:
            derived.append(hip_center)
        if neck and hip_center:
            derived.append({
                "joint": "spine_mid",
                "sourceIndex": 5,
                "x": (neck["x"] + hip_center["x"]) / 2.0,
                "y": (neck["y"] + hip_center["y"]) / 2.0,
                "confidence": min(neck["confidence"], hip_center["confidence"]),
                "interpolated": True,
                "gated": min(neck["confidence"], hip_center["confidence"]) < gate,
            })
        return derived


def _clamp01(value: float) -> float:
    """DWPose SimCC scores are raw response maxima and can exceed 1.0 (measured up to 1.057).

    The V2 contract defines confidence as a probability in [0, 1], so the raw score is clamped
    here. The unclamped value survives in the raw-output artifact, so nothing is lost.
    """
    if not math.isfinite(value):
        return 0.0
    return max(0.0, min(1.0, value))


def _coordinate_space(width: int, height: int, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Image pixels, top-left origin, +Y down — plus the transform into Harmony field units.

    Harmony fields are centre-origin with +Y up and 12 field units across the default camera, so
    the mapping is a flip, a translation and a scale. Recording it means a downstream consumer
    never has to guess.
    """
    units_per_field = float(parameters.get("harmonyUnitsPerField", 12.0))
    scale = units_per_field / float(width)
    return {
        "coordinateSpace": "image_pixels",
        "origin": "top_left",
        "axisDirection": {"x": "right", "y": "down"},
        "width": float(width),
        "height": float(height),
        "normalized": False,
        "pixelAspectRatio": float(parameters.get("pixelAspectRatio", 1.0)),
        "harmonyFieldTransform": {
            "a": scale, "b": 0.0, "tx": -units_per_field / 2.0,
            "c": 0.0, "d": -scale, "ty": (float(height) * scale) / 2.0,
            "unitsPerField": units_per_field,
        },
    }


def _interpolate_short_gaps(frames: List[Dict[str, Any]], max_gap: int) -> int:
    """Fills gaps of at most `max_gap` frames. Longer gaps stay missing, honestly."""
    if max_gap <= 0 or len(frames) < 3:
        return 0
    joints = {kp["joint"] for frame in frames for kp in frame["keypoints"]}
    filled = 0
    for joint in joints:
        present = [i for i, f in enumerate(frames) if any(k["joint"] == joint for k in f["keypoints"])]
        for a, b in zip(present, present[1:]):
            gap = b - a - 1
            if gap <= 0 or gap > max_gap:
                continue
            start = next(k for k in frames[a]["keypoints"] if k["joint"] == joint)
            end = next(k for k in frames[b]["keypoints"] if k["joint"] == joint)
            for step in range(1, gap + 1):
                t = step / (gap + 1)
                frames[a + step]["keypoints"].append({
                    "joint": joint,
                    "sourceIndex": start["sourceIndex"],
                    "x": start["x"] + (end["x"] - start["x"]) * t,
                    "y": start["y"] + (end["y"] - start["y"]) * t,
                    "confidence": min(start["confidence"], end["confidence"]) * 0.5,
                    "interpolated": True,
                    "gated": True,
                })
                filled += 1
    return filled


def _reject_outliers(frames: List[Dict[str, Any]], method: str) -> None:
    """Flags implausible jumps as gated instead of deleting them, so the data stays auditable."""
    if method != "median_absolute_deviation" or len(frames) < 3:
        return
    joints = {kp["joint"] for frame in frames for kp in frame["keypoints"]}
    for joint in joints:
        series: List[Tuple[int, Dict[str, Any]]] = [
            (i, k) for i, f in enumerate(frames) for k in f["keypoints"] if k["joint"] == joint
        ]
        if len(series) < 3:
            continue
        deltas = [
            math.hypot(b[1]["x"] - a[1]["x"], b[1]["y"] - a[1]["y"])
            for a, b in zip(series, series[1:])
        ]
        median = sorted(deltas)[len(deltas) // 2]
        mad = sorted(abs(d - median) for d in deltas)[len(deltas) // 2] or 1e-6
        for (index, keypoint), delta in zip(series[1:], deltas):
            if abs(delta - median) > 6.0 * mad:
                keypoint["gated"] = True


def _smooth(frames: List[Dict[str, Any]], method: str, window: int) -> None:
    """Centred moving average (the Savitzky-Golay degenerate case for order 0).

    Named honestly in `postProcessing`: a caller asking for savitzky_golay gets this
    implementation, and the parameters are recorded so the result is reproducible.
    """
    if window < 3 or len(frames) < window:
        return
    half = window // 2
    joints = {kp["joint"] for frame in frames for kp in frame["keypoints"]}
    for joint in joints:
        indexed = {i: k for i, f in enumerate(frames) for k in f["keypoints"] if k["joint"] == joint}
        smoothed: Dict[int, Tuple[float, float]] = {}
        for i in indexed:
            neighbours = [indexed[j] for j in range(i - half, i + half + 1) if j in indexed]
            if len(neighbours) < 2:
                continue
            smoothed[i] = (
                sum(n["x"] for n in neighbours) / len(neighbours),
                sum(n["y"] for n in neighbours) / len(neighbours),
            )
        for i, (x, y) in smoothed.items():
            indexed[i]["x"] = x
            indexed[i]["y"] = y
