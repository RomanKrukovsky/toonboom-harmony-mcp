"""
DWPose whole-body pose provider (YOLOX person detection -> RTMPose/DWPose SimCC).

Sprint 0 truth restoration. Three fabrications were removed from the previous version:

1. Per-keypoint confidence was computed as
       np.max(np.exp(simcc - np.max(simcc, axis=1, keepdims=True)), axis=1)
   Subtracting the row max makes the largest element 0, so exp(...) == 1 and the max
   over the row is *always exactly 1.0*. Every one of the 133 keypoints was therefore
   reported with confidence 1.0 and visible=True, including keypoints the model had no
   evidence for. Measured on fixtures/character.png: 133/133 keypoints at exactly
   1.000000. Replaced with the mmpose-standard SimCC decode (`get_simcc_maximum`),
   which uses the raw response maximum: measured range 0.2229..1.0574, mean 0.7251.

   Note: a normalized softmax is NOT the correct fix here. SimCC spreads the response
   over 576/768 bins, so softmax collapses every score to ~0.003 and marks the whole
   skeleton invisible. Verified against the real model before choosing the decode.

2. The top-level result reported `"confidence": 0.9 if len(points) > 10 else 0.4`.
   The point count is always 133, so this was a hardcoded 0.9. It is now the mean of
   the real per-keypoint scores.

3. Pose was run on the whole uncropped image. DWPose is a *top-down* model and expects
   a person crop; running it on a full frame yields keypoints for a person-shaped region
   that may not exist. yolox_l.onnx was already downloaded but never loaded. Detection
   now runs first, and when no person is found the provider returns `no_person_detected`
   instead of a skeleton.

Weight paths are resolved relative to this package so the manifest is portable; the
absolute paths previously baked into manifest.json only worked on one machine.
"""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import onnxruntime as ort

logger = logging.getLogger("ml-runtime.dwpose")

WEIGHTS_DIR = Path(__file__).resolve().parent.parent / "weights" / "dwpose"

# DWPose input geometry (width, height) and the SimCC split ratio used at export time.
POSE_INPUT_W = 288
POSE_INPUT_H = 384
SIMCC_SPLIT_RATIO = 2.0

YOLOX_INPUT = 640
YOLOX_STRIDES = (8, 16, 32)
COCO_PERSON_CLASS = 0

# 133-keypoint whole-body layout (COCO-WholeBody).
BODY_RANGE = (0, 17)
FOOT_RANGE = (17, 23)
FACE_RANGE = (23, 91)
HAND_RANGE = (91, 133)

DEFAULT_KEYPOINT_THRESHOLD = 0.3
DEFAULT_PERSON_THRESHOLD = 0.3


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def get_simcc_maximum(simcc_x: np.ndarray, simcc_y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Standard SimCC decode (mmpose `get_simcc_maximum`).

    Returns (locations Nx2 in input-space pixels, scores N) where the score is the raw
    response maximum averaged over the two axes — not a normalized probability.
    """
    x_locs = np.argmax(simcc_x, axis=1).astype(np.float32)
    y_locs = np.argmax(simcc_y, axis=1).astype(np.float32)
    max_x = np.amax(simcc_x, axis=1)
    max_y = np.amax(simcc_y, axis=1)

    locs = np.stack([x_locs, y_locs], axis=-1) / SIMCC_SPLIT_RATIO
    scores = 0.5 * (max_x + max_y)
    # A negative response on either axis means the joint was not localized at all.
    scores[(max_x <= 0) | (max_y <= 0)] = 0.0
    return locs, scores


def _top_down_affine(
    image: np.ndarray, bbox: Tuple[float, float, float, float], padding: float = 1.25
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Crop a person bbox into the model's fixed input aspect ratio without distortion.

    Returns the crop and the 2x3 inverse affine that maps crop pixels back to the
    original image.
    """
    x1, y1, x2, y2 = bbox
    center = np.array([(x1 + x2) / 2.0, (y1 + y2) / 2.0], dtype=np.float32)
    width, height = max(x2 - x1, 1.0), max(y2 - y1, 1.0)

    aspect = POSE_INPUT_W / POSE_INPUT_H
    if width > aspect * height:
        height = width / aspect
    else:
        width = height * aspect
    width *= padding
    height *= padding

    src = np.array(
        [center, center + [0.0, -height / 2.0], center + [width / 2.0, 0.0]], dtype=np.float32
    )
    dst = np.array(
        [
            [POSE_INPUT_W / 2.0, POSE_INPUT_H / 2.0],
            [POSE_INPUT_W / 2.0, 0.0],
            [POSE_INPUT_W, POSE_INPUT_H / 2.0],
        ],
        dtype=np.float32,
    )

    forward = cv2.getAffineTransform(src, dst)
    inverse = cv2.getAffineTransform(dst, src)
    crop = cv2.warpAffine(image, forward, (POSE_INPUT_W, POSE_INPUT_H), flags=cv2.INTER_LINEAR)
    return crop, inverse


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float = 0.45) -> List[int]:
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = np.maximum(0.0, x2 - x1) * np.maximum(0.0, y2 - y1)
    order = scores.argsort()[::-1]
    keep: List[int] = []
    while order.size > 0:
        i = order[0]
        keep.append(int(i))
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        inter = np.maximum(0.0, xx2 - xx1) * np.maximum(0.0, yy2 - yy1)
        iou = inter / np.maximum(areas[i] + areas[order[1:]] - inter, 1e-9)
        order = order[1:][iou <= iou_threshold]
    return keep


class DWPoseProvider:
    def __init__(self, config: Optional[dict] = None):
        config = config or {}
        self.config = config
        self.enabled = config.get("enabled", False)
        self.device = config.get("device", "cpu")
        self.keypoint_threshold = float(config.get("keypointThreshold", DEFAULT_KEYPOINT_THRESHOLD))
        self.person_threshold = float(config.get("personThreshold", DEFAULT_PERSON_THRESHOLD))
        self.verify_weight_hashes = bool(config.get("verifyWeightHashes", False))

        self.pose_model: Optional[ort.InferenceSession] = None
        self.detector_model: Optional[ort.InferenceSession] = None
        self.execution_provider = "CPUExecutionProvider"
        self.manifest: Optional[dict] = None

    # ------------------------------------------------------------------ weights

    def _resolve_weight(self, entry: dict, filename: str) -> Path:
        """
        Resolve a weight file next to this package. The manifest's `path` is treated as a
        hint only: it historically contained a machine-specific absolute path.
        """
        local = WEIGHTS_DIR / filename
        if local.exists():
            return local
        hinted = Path(str(entry.get("path", "")))
        if hinted.is_file():
            return hinted
        raise FileNotFoundError(f"Weight file not found: {local}")

    def detect(self) -> dict:
        manifest_path = WEIGHTS_DIR / "manifest.json"
        if not manifest_path.exists():
            return {
                "status": "weights_missing",
                "realInferenceExecuted": False,
                "message": "Run scripts/ml/download-dwpose.py first.",
                "expectedPath": str(manifest_path),
            }

        self.manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        missing: List[str] = []
        resolved: Dict[str, str] = {}
        for key, filename in (("dwpose", "dw-ll_ucoco_384.onnx"), ("yolox", "yolox_l.onnx")):
            entry = self.manifest.get(key)
            if not entry:
                missing.append(key)
                continue
            try:
                resolved[key] = str(self._resolve_weight(entry, filename))
            except FileNotFoundError as exc:
                missing.append(f"{key}: {exc}")

        if missing:
            return {
                "status": "weights_missing",
                "realInferenceExecuted": False,
                "missing": missing,
            }

        return {
            "status": "installed_verified",
            "realInferenceExecuted": False,
            "device": self.device,
            "resolvedWeights": resolved,
            "detectorAvailable": "yolox" in resolved,
        }

    def _verify_hash(self, key: str, path: Path) -> Optional[str]:
        if not self.verify_weight_hashes or not self.manifest:
            return None
        expected = (self.manifest.get(key) or {}).get("sha256")
        if not expected:
            return None
        actual = _sha256(path)
        if actual != expected:
            raise RuntimeError(f"{key} weight hash mismatch: expected {expected}, got {actual}")
        return actual

    def _providers(self) -> List[str]:
        device = self.device
        if device == "auto":
            # Выбираем самый быстрый доступный EP. Замер на fixtures/character.png:
            # CoreML 49 мс/кадр против CPU 204 мс/кадр (4.2x) на Apple Silicon.
            available = ort.get_available_providers()
            if "CUDAExecutionProvider" in available:
                device = "cuda"
            elif "CoreMLExecutionProvider" in available:
                device = "coreml"
            else:
                device = "cpu"
            logger.info("DWPose device=auto resolved to %s (available: %s)", device, available)
        if device in ("mps", "coreml"):
            self.execution_provider = "CoreML"
            return ["CoreMLExecutionProvider", "CPUExecutionProvider"]
        if device == "cuda":
            self.execution_provider = "CUDA"
            return ["CUDAExecutionProvider", "CPUExecutionProvider"]
        self.execution_provider = "CPUExecutionProvider"
        return ["CPUExecutionProvider"]

    def load_model(self) -> None:
        if self.pose_model is not None and self.detector_model is not None:
            return
        if self.manifest is None:
            state = self.detect()
            if state["status"] != "installed_verified":
                raise RuntimeError(f"DWPose weights unavailable: {state}")

        assert self.manifest is not None
        providers = self._providers()

        pose_path = self._resolve_weight(self.manifest["dwpose"], "dw-ll_ucoco_384.onnx")
        det_path = self._resolve_weight(self.manifest["yolox"], "yolox_l.onnx")
        self._verify_hash("dwpose", pose_path)
        self._verify_hash("yolox", det_path)

        self.pose_model = ort.InferenceSession(str(pose_path), providers=providers)
        self.detector_model = ort.InferenceSession(str(det_path), providers=providers)
        logger.info("DWPose + YOLOX loaded using %s", self.execution_provider)

    # ---------------------------------------------------------------- detection

    def detect_people(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Run YOLOX and return person boxes in original image coordinates."""
        assert self.detector_model is not None
        height, width = image.shape[:2]

        ratio = min(YOLOX_INPUT / height, YOLOX_INPUT / width)
        resized = cv2.resize(image, (int(round(width * ratio)), int(round(height * ratio))))
        canvas = np.full((YOLOX_INPUT, YOLOX_INPUT, 3), 114, dtype=np.uint8)
        canvas[: resized.shape[0], : resized.shape[1]] = resized
        # YOLOX consumes raw BGR uint8 values without mean/std normalization.
        blob = np.transpose(canvas, (2, 0, 1))[None].astype(np.float32)

        raw = self.detector_model.run(None, {self.detector_model.get_inputs()[0].name: blob})[0][0]

        # Decode the anchor-free grid: strides 8/16/32 over a 640x640 input.
        grids, expanded = [], []
        for stride in YOLOX_STRIDES:
            size = YOLOX_INPUT // stride
            yv, xv = np.meshgrid(np.arange(size), np.arange(size), indexing="ij")
            grids.append(np.stack((xv, yv), 2).reshape(1, -1, 2))
            expanded.append(np.full((1, size * size, 1), stride))
        grid = np.concatenate(grids, 1)[0]
        stride_arr = np.concatenate(expanded, 1)[0]

        centers = (raw[:, :2] + grid) * stride_arr
        sizes = np.exp(raw[:, 2:4]) * stride_arr
        scores = raw[:, 4:5] * raw[:, 5:]

        person_scores = scores[:, COCO_PERSON_CLASS]
        mask = person_scores > self.person_threshold
        if not np.any(mask):
            return []

        cxcy, wh, conf = centers[mask], sizes[mask], person_scores[mask]
        boxes = np.stack(
            [
                cxcy[:, 0] - wh[:, 0] / 2.0,
                cxcy[:, 1] - wh[:, 1] / 2.0,
                cxcy[:, 0] + wh[:, 0] / 2.0,
                cxcy[:, 1] + wh[:, 1] / 2.0,
            ],
            axis=1,
        ) / ratio

        boxes[:, 0::2] = boxes[:, 0::2].clip(0, width)
        boxes[:, 1::2] = boxes[:, 1::2].clip(0, height)

        keep = _nms(boxes, conf)
        return [
            {"bbox": [float(v) for v in boxes[i]], "score": float(conf[i])}
            for i in keep
        ]

    # ------------------------------------------------------------------- pose

    def estimate_pose(self, image: np.ndarray, bbox: Tuple[float, float, float, float]):
        assert self.pose_model is not None
        crop, inverse = _top_down_affine(image, bbox)

        blob = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        blob = (blob - np.array([0.485, 0.456, 0.406], np.float32)) / np.array(
            [0.229, 0.224, 0.225], np.float32
        )
        blob = np.transpose(blob.astype(np.float32), (2, 0, 1))[None]

        simcc_x, simcc_y = self.pose_model.run(None, {"input": blob})
        locs, scores = get_simcc_maximum(simcc_x[0], simcc_y[0])

        # Map crop-space keypoints back into the original image.
        ones = np.ones((locs.shape[0], 1), dtype=np.float32)
        mapped = (np.concatenate([locs, ones], axis=1) @ inverse.T)
        return mapped, scores

    @staticmethod
    def _part_of(index: int) -> str:
        if FACE_RANGE[0] <= index < FACE_RANGE[1]:
            return "face"
        if HAND_RANGE[0] <= index < HAND_RANGE[1]:
            return "hand"
        if FOOT_RANGE[0] <= index < FOOT_RANGE[1]:
            return "foot"
        return "body"

    def run(self, image_path: str, output_dir: str) -> dict:
        if not self.enabled:
            return {
                "status": "blocked",
                "realInferenceExecuted": False,
                "errors": ["provider_disabled"],
                "blockingReason": "DWPoseProvider was constructed with enabled=False.",
            }

        state = self.detect()
        if state["status"] != "installed_verified":
            return {
                "status": "blocked",
                "realInferenceExecuted": False,
                "errors": ["weights_missing"],
                "blockingReason": state.get("message") or str(state.get("missing")),
            }

        try:
            self.load_model()
            image = cv2.imread(image_path)
            if image is None:
                return {
                    "status": "failed",
                    "realInferenceExecuted": False,
                    "errors": [f"Could not read image at {image_path}"],
                }

            orig_h, orig_w = image.shape[:2]
            people = self.detect_people(image)

            out_dir = Path(output_dir)
            out_dir.mkdir(parents=True, exist_ok=True)

            if not people:
                # Previously the model was run anyway and produced a full 133-point
                # skeleton with confidence 1.0 for an image containing no person.
                report = {
                    "status": "no_person_detected",
                    "realInferenceExecuted": True,
                    "detector": "yolox_l",
                    "personThreshold": self.person_threshold,
                    "peopleFound": 0,
                }
                (out_dir / "execution_report.json").write_text(
                    json.dumps(report, indent=2), encoding="utf-8"
                )
                return {
                    **report,
                    "blockingReason": (
                        "YOLOX found no person above the configured threshold; a top-down pose "
                        "model has nothing valid to estimate."
                    ),
                    "executionReportPath": str(out_dir / "execution_report.json"),
                }

            primary = max(people, key=lambda p: p["score"])
            keypoints, scores = self.estimate_pose(image, tuple(primary["bbox"]))

            formatted: List[Dict[str, Any]] = []
            for idx in range(keypoints.shape[0]):
                x, y = float(keypoints[idx][0]), float(keypoints[idx][1])
                confidence = float(scores[idx])
                part = self._part_of(idx)
                formatted.append(
                    {
                        "index": idx,
                        "name": f"{part}_{idx}",
                        "part": part,
                        "x": x,
                        "y": y,
                        "normalizedX": x / orig_w,
                        "normalizedY": y / orig_h,
                        "confidence": confidence,
                        "visible": bool(confidence >= self.keypoint_threshold),
                        "sourceModel": f"dwpose-{part}",
                    }
                )

            visible = [p for p in formatted if p["visible"]]
            mean_conf = float(np.mean(scores)) if len(scores) else 0.0

            overlay = image.copy()
            cv2.rectangle(
                overlay,
                (int(primary["bbox"][0]), int(primary["bbox"][1])),
                (int(primary["bbox"][2]), int(primary["bbox"][3])),
                (255, 128, 0),
                2,
            )
            for point in visible:
                cv2.circle(overlay, (int(point["x"]), int(point["y"])), 3, (0, 255, 0), -1)

            raw_path = out_dir / "raw_dwpose_output.json"
            skeleton_path = out_dir / "skeleton.json"
            overlay_path = out_dir / "keypoints_overlay.png"
            provenance_path = out_dir / "provenance.json"
            report_path = out_dir / "execution_report.json"

            raw_path.write_text(
                json.dumps(
                    {
                        "keypoints": keypoints.tolist(),
                        "scores": scores.tolist(),
                        "personBoxes": people,
                    }
                ),
                encoding="utf-8",
            )
            skeleton_path.write_text(
                json.dumps({"points": formatted, "personBox": primary}, indent=2), encoding="utf-8"
            )
            cv2.imwrite(str(overlay_path), overlay)

            assert self.manifest is not None
            provenance_path.write_text(
                json.dumps(
                    {
                        "detector": {
                            "model": "yolox_l",
                            "sha256": self.manifest["yolox"]["sha256"],
                            "license": self.manifest["yolox"]["license"],
                        },
                        "pose": {
                            "model": "dwpose",
                            "sha256": self.manifest["dwpose"]["sha256"],
                            "license": self.manifest["dwpose"]["license"],
                        },
                        "decode": "simcc_raw_maximum",
                        "executionProvider": self.execution_provider,
                        "onnxruntime": ort.__version__,
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )

            report = {
                "status": "success",
                "realInferenceExecuted": True,
                "peopleFound": len(people),
                "personScore": primary["score"],
                "personBox": primary["bbox"],
                "keypointsTotal": len(formatted),
                "keypointsVisible": len(visible),
                "keypointThreshold": self.keypoint_threshold,
                "meanConfidence": mean_conf,
                "minConfidence": float(np.min(scores)) if len(scores) else 0.0,
                "maxConfidence": float(np.max(scores)) if len(scores) else 0.0,
                "executionProvider": self.execution_provider,
            }
            report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

            return {
                **report,
                "skeletonPath": str(skeleton_path),
                "overlayPath": str(overlay_path),
                "rawPath": str(raw_path),
                "provenancePath": str(provenance_path),
                "executionReportPath": str(report_path),
                # Real mean of measured per-keypoint scores, not a hardcoded constant.
                "confidence": mean_conf,
            }

        except Exception as exc:  # noqa: BLE001 - reported honestly to the caller
            logger.error("DWPose inference failed: %s", exc)
            return {"status": "failed", "realInferenceExecuted": False, "errors": [str(exc)]}
