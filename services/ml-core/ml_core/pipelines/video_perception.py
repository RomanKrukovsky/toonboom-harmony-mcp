import time
import cv2
from pathlib import Path
from typing import Any, Dict, List, Optional
from ..config import verify_path_access
from ..providers.mediapipe_pose import MediaPipePoseProvider
from ..providers.sam2_provider import SAM2VideoSegmentationProvider
from ..providers.opencv_klt import OpenCVKLTPointTrackingProvider
from ..providers.whisper_provider import WhisperTranscriptionProvider
from ..providers.mfa_provider import MFAForcedAlignmentProvider
from ..providers.acoustic_viseme_provider import AcousticVisemeAlignmentProvider

def run_video_perception_pipeline(
    video_path_str: str,
    tasks: List[str],
    audio_path_str: Optional[str] = None,
    progress_callback: Any = None
) -> Dict[str, Any]:
    video_path = verify_path_access(video_path_str)
    audio_path = verify_path_access(audio_path_str) if audio_path_str else None

    # Load video properties
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path_str}")

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 24.0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frameCount = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 1)
    duration = frameCount / fps
    cap.release()

    warnings = []
    
    # Run active pipeline tasks
    pose_res = None
    if "pose" in tasks:
        pose_prov = MediaPipePoseProvider()
        pose_prov.load_model()
        pose_res = pose_prov.run_inference({"videoPath": str(video_path)})

    seg_res = None
    if "segmentation" in tasks:
        seg_prov = SAM2VideoSegmentationProvider()
        seg_prov.load_model()
        seg_res = seg_prov.run_inference({"videoPath": str(video_path)})

    track_res = None
    if "point_tracking" in tasks:
        track_prov = OpenCVKLTPointTrackingProvider()
        track_prov.load_model()
        # Query first nose or shoulder point from pose_res if available
        q_pts = []
        if pose_res and len(pose_res["poses"]) > 0:
            p_first = pose_res["poses"][0]
            # Track nose
            nose = p_first["landmarks"].get("NOSE")
            if nose:
                q_pts.append({
                    "pointId": "nose_track",
                    "x": nose["x"],
                    "y": nose["y"],
                    "frame": p_first["frame"]
                })
        else:
            # Default mock points to track
            q_pts.append({"pointId": "mid_track", "x": 0.5, "y": 0.5, "frame": 1})

        track_res = track_prov.run_inference({
            "videoPath": str(video_path),
            "queryPoints": q_pts
        })

    speech_res = None
    if "transcription" in tasks or "forced_alignment" in tasks:
        if audio_path:
            # Prefer real phonemic alignment when MFA is installed; otherwise use
            # acoustic viseme estimation. Never fabricate phonemes: fake labels do
            # not match any Preston Blair key and collapse lip-sync to a closed mouth.
            align_prov = MFAForcedAlignmentProvider()
            if align_prov.load_model():
                try:
                    speech_res = align_prov.run_inference({"audioPath": str(audio_path)})
                except (RuntimeError, NotImplementedError) as exc:
                    warnings.append(f"MFA alignment unavailable, using acoustics: {exc}")
                    align_prov = None
            else:
                align_prov = None

            if speech_res is None:
                acoustic = AcousticVisemeAlignmentProvider()
                if acoustic.load_model():
                    speech_res = acoustic.run_inference(
                        {"audioPath": str(audio_path), "frameRate": fps or 24.0}
                    )
                    warnings.append(
                        "Phoneme-level alignment unavailable; visemes were estimated "
                        "acoustically (see honestLimitations in the speech manifest)."
                    )
                else:
                    warnings.append(
                        "Neither MFA nor acoustic viseme estimation is available "
                        "(librosa/soundfile missing): no speech manifest produced."
                    )
        else:
            warnings.append("Audio tasks requested but no audioPath provided.")

    provenance = {
        "tool": "harmony-ml-core",
        "version": "0.1.0",
        "backend": "pipeline_master",
        "device": "cpu",
        "precision": "float32",
        "timestamp": str(time.time())
    }

    manifest = {
        "schemaVersion": "1.0",
        "videoPath": str(video_path),
        "audioPath": str(audio_path) if audio_path else None,
        "width": width,
        "height": height,
        "fps": fps,
        "frameCount": frameCount,
        "durationSeconds": duration,
        "pose": pose_res,
        "segmentation": seg_res,
        "pointTracking": track_res,
        "speech": speech_res,
        "warnings": warnings,
        "provenance": provenance
    }

    return manifest
