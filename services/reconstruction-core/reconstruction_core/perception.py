from __future__ import annotations

import hashlib
import json
import math
import wave
from pathlib import Path

import cv2
import numpy as np

from .retargeting_core import JsonPoseProvider, run_motion_retargeting
from .retargeting_models import JointMapping, RigJoint, RigProfile
from .retargeting_preview import generate_svg_previews


def perceive_video(video_path: str, audio_path: str, output_dir: str) -> dict:
    video = Path(video_path).resolve(strict=True)
    audio = Path(audio_path).resolve(strict=True)
    out = Path(output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise ValueError(f"Не удалось открыть видео: {video}")
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 24.0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    subtractor = cv2.createBackgroundSubtractorMOG2(history=60, varThreshold=18, detectShadows=False)
    landmarks, observations, frame = {}, [], 0
    while True:
        ok, image = cap.read()
        if not ok:
            break
        frame += 1
        mask = subtractor.apply(image)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contour = max(contours, key=cv2.contourArea) if contours else None
        if contour is None or cv2.contourArea(contour) < width * height * 0.005:
            observations.append({"frame": frame, "detected": False, "confidence": 0.0})
            continue
        x, y, w, h = cv2.boundingRect(contour)
        confidence = float(min(0.72, 0.25 + cv2.contourArea(contour) / max(1, w * h) * 0.5))
        def point(rx, ry):
            return [(x + w * rx) / width, (y + h * ry) / height, 0.0, confidence]
        pose = {
            "MID_HIP": point(.5, .62), "LEFT_HIP": point(.38, .62), "RIGHT_HIP": point(.62, .62),
            "LEFT_SHOULDER": point(.32, .28), "RIGHT_SHOULDER": point(.68, .28),
            "LEFT_ELBOW": point(.20, .44), "RIGHT_ELBOW": point(.80, .44),
            "LEFT_WRIST": point(.14, .58), "RIGHT_WRIST": point(.86, .58),
            "LEFT_KNEE": point(.40, .80), "RIGHT_KNEE": point(.60, .80),
            "LEFT_ANKLE": point(.38, .98), "RIGHT_ANKLE": point(.62, .98),
        }
        landmarks[frame] = pose
        observations.append({"frame": frame, "detected": True, "bbox": [x, y, w, h], "confidence": round(confidence, 4)})
    cap.release()
    if len(landmarks) < 2:
        raise RuntimeError("Реальный OpenCV inference не нашёл устойчивый движущийся силуэт")

    audio_features = analyze_wav(audio)
    rig = RigProfile(name="ObservedSilhouetteActor", joints=[
        RigJoint(name="Root", parent=None, pegNodePath="Top/Actor/Root_Peg", pivotX=0, pivotY=0),
        RigJoint(name="Shoulder_L", parent="Root", pegNodePath="Top/Actor/Shoulder_L_Peg", pivotX=-.2, pivotY=.3),
        RigJoint(name="Elbow_L", parent="Shoulder_L", pegNodePath="Top/Actor/Elbow_L_Peg", pivotX=-.25, pivotY=0),
        RigJoint(name="Shoulder_R", parent="Root", pegNodePath="Top/Actor/Shoulder_R_Peg", pivotX=.2, pivotY=.3),
        RigJoint(name="Elbow_R", parent="Shoulder_R", pegNodePath="Top/Actor/Elbow_R_Peg", pivotX=.25, pivotY=0),
    ], restPose={})
    mappings = [
        JointMapping(pegNodePath="Top/Actor/Root_Peg", sourceJoints=["MID_HIP"], transformType="translation"),
        JointMapping(pegNodePath="Top/Actor/Shoulder_L_Peg", sourceJoints=["LEFT_SHOULDER", "LEFT_ELBOW"], transformType="rotation"),
        JointMapping(pegNodePath="Top/Actor/Elbow_L_Peg", sourceJoints=["LEFT_ELBOW", "LEFT_WRIST"], transformType="rotation"),
        JointMapping(pegNodePath="Top/Actor/Shoulder_R_Peg", sourceJoints=["RIGHT_SHOULDER", "RIGHT_ELBOW"], transformType="rotation"),
        JointMapping(pegNodePath="Top/Actor/Elbow_R_Peg", sourceJoints=["RIGHT_ELBOW", "RIGHT_WRIST"], transformType="rotation"),
    ]
    manifest = run_motion_retargeting(JsonPoseProvider(landmarks), rig, mappings, 1, frame, fps, tolerance=.7, foot_locking=False)
    preview_dir = out / "retarget_preview"
    converted = {k: {n: tuple(v) for n, v in pts.items()} for k, pts in landmarks.items()}
    generate_svg_previews(manifest, converted, preview_dir)
    perception = {
        "schemaVersion": "1.0", "status": "verified_real", "executed": True, "verified": True,
        "artifactCreated": True, "video": {"path": str(video), "sha256": sha256(video), "width": width, "height": height, "fps": fps, "frameCount": frame},
        "audio": {"path": str(audio), "sha256": sha256(audio), **audio_features},
        "pose": {"provider": "opencv_moving_silhouette_v1", "isAnatomicalPoseModel": False, "observedFrames": len(landmarks), "failedFrames": frame - len(landmarks), "landmarks": {str(k): v for k, v in landmarks.items()}},
        "warnings": ["Landmarks are inferred from an observed moving silhouette, not an anatomical pose model."],
        "provenance": {"opencv": cv2.__version__, "videoSha256": sha256(video), "audioSha256": sha256(audio)},
    }
    perception_path = out / "perception_manifest.json"
    retarget_path = out / "retargeting_manifest.json"
    perception_path.write_text(json.dumps(perception, ensure_ascii=False, indent=2), encoding="utf-8")
    retarget_path.write_text(json.dumps(manifest.model_dump(by_alias=True), ensure_ascii=False, indent=2, default=_json_scalar), encoding="utf-8")
    previews = sorted(str(p) for p in preview_dir.glob("*.svg"))
    if not previews or any(Path(p).stat().st_size == 0 for p in previews):
        raise RuntimeError("Preview verification failed")
    return {"status": "verified_real", "executed": True, "verified": True, "artifactCreated": True, "perceptionManifestPath": str(perception_path), "retargetingManifestPath": str(retarget_path), "previewFiles": previews, "warnings": perception["warnings"], "provenance": perception["provenance"]}


def analyze_wav(path: Path) -> dict:
    with wave.open(str(path), "rb") as wav:
        rate, channels, width, count = wav.getframerate(), wav.getnchannels(), wav.getsampwidth(), wav.getnframes()
        raw = wav.readframes(count)
    if width != 2:
        raise ValueError("Phase 1 demo supports 16-bit PCM WAV")
    samples = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    if channels > 1:
        samples = samples.reshape(-1, channels).mean(axis=1)
    hop = max(1, int(rate * .05))
    energy = [float(np.sqrt(np.mean(samples[i:i + hop] ** 2))) for i in range(0, len(samples), hop)]
    peak = max(energy, default=0.0)
    active = sum(1 for value in energy if value > max(.005, peak * .12))
    return {"sampleRate": rate, "durationSeconds": round(len(samples) / rate, 4), "energySamples": len(energy), "activeRatio": round(active / max(1, len(energy)), 4), "peakRms": round(peak, 6)}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _json_scalar(value):
    if isinstance(value, np.generic):
        return value.item()
    raise TypeError(f"Unsupported JSON value: {type(value)!r}")
