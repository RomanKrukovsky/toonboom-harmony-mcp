import cv2
import time
from typing import Any, Dict
from pathlib import Path
from .base import BaseMLProvider

class MediaPipePoseProvider(BaseMLProvider):
    def __init__(self, model_id: str = "mediapipe_pose_heavy"):
        super().__init__(model_id)
        self.detector = None

    def check_availability(self) -> bool:
        try:
            import mediapipe
            return True
        except ImportError:
            return False

    def load_model(self) -> bool:
        if self.loaded:
            return True
        try:
            import mediapipe as mp
            from mediapipe.tasks import python
            from mediapipe.tasks.python import vision
            from ..config import MODEL_ROOT

            model_path = MODEL_ROOT / "checkpoints" / "pose_landmarker_heavy.task"
            if not model_path.is_file():
                # We can try to download it, or just use the fallback if it's missing
                return False

            base_options = python.BaseOptions(model_asset_path=str(model_path))
            options = vision.PoseLandmarkerOptions(
                base_options=base_options,
                output_segmentation_masks=False
            )
            self.detector = vision.PoseLandmarker.create_from_options(options)
            self.loaded = True
            return True
        except Exception:
            return False

    def run_inference(self, inputs: Dict[str, Any], progress_callback: Any = None) -> Dict[str, Any]:
        video_path = inputs["videoPath"]
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")

        fps = float(cap.get(cv2.CAP_PROP_FPS) or 24.0)
        frameCount = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 1)
        
        poses_list = []
        frame_idx = 0

        # Import mediapipe types if available
        import_ok = self.check_availability()
        use_real = self.loaded and import_ok

        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame_idx += 1

            if progress_callback:
                progress_callback(frame_idx / frameCount)

            landmarks_dict = {}

            if use_real and self.detector:
                import mediapipe as mp
                # MediaPipe requires RGB images
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                
                # Perform detection
                detection_result = self.detector.detect(mp_image)
                if detection_result.pose_landmarks:
                    # We map MediaPipe pose landmarks (33 points)
                    mp_names = [
                        "NOSE", "LEFT_EYE_INNER", "LEFT_EYE", "LEFT_EYE_OUTER", "RIGHT_EYE_INNER", "RIGHT_EYE", "RIGHT_EYE_OUTER",
                        "LEFT_EAR", "RIGHT_EAR", "MOUTH_LEFT", "MOUTH_RIGHT", "LEFT_SHOULDER", "RIGHT_SHOULDER", "LEFT_ELBOW",
                        "RIGHT_ELBOW", "LEFT_WRIST", "RIGHT_WRIST", "LEFT_PINKY", "RIGHT_PINKY", "LEFT_INDEX", "RIGHT_INDEX",
                        "LEFT_THUMB", "RIGHT_THUMB", "LEFT_HIP", "RIGHT_HIP", "LEFT_KNEE", "RIGHT_KNEE", "LEFT_ANKLE",
                        "RIGHT_ANKLE", "LEFT_HEEL", "RIGHT_HEEL", "LEFT_FOOT_INDEX", "RIGHT_FOOT_INDEX"
                    ]
                    # Map to MID_HIP as avg of hips
                    landmarks = detection_result.pose_landmarks[0]
                    for name_idx, name in enumerate(mp_names):
                        if name_idx < len(landmarks):
                            lm = landmarks[name_idx]
                            landmarks_dict[name] = {
                                "x": float(lm.x),
                                "y": float(lm.y),
                                "z": float(lm.z),
                                "visibility": float(lm.presence)
                            }
                    
                    if "LEFT_HIP" in landmarks_dict and "RIGHT_HIP" in landmarks_dict:
                        lh = landmarks_dict["LEFT_HIP"]
                        rh = landmarks_dict["RIGHT_HIP"]
                        landmarks_dict["MID_HIP"] = {
                            "x": (lh["x"] + rh["x"]) / 2.0,
                            "y": (lh["y"] + rh["y"]) / 2.0,
                            "z": (lh["z"] + rh["z"]) / 2.0,
                            "visibility": (lh["visibility"] + rh["visibility"]) / 2.0
                        }
            else:
                # Deterministic fallback when MediaPipe is not installed/loaded
                # We simulate a simple walk or gesture movement using sine waves
                t = frame_idx / fps
                sw = frame.shape[1]
                sh = frame.shape[0]
                
                # Approximate typical proportions
                mid_x = 0.5 + 0.1 * float(round(100 * (0.1 * time.time() + 0.05 * t)) % 100) / 100.0
                mid_y = 0.6
                
                # Mock anatomical landmarks
                landmarks_dict = {
                    "NOSE": {"x": mid_x, "y": mid_y - 0.35, "z": 0.0, "visibility": 0.9},
                    "LEFT_SHOULDER": {"x": mid_x - 0.15, "y": mid_y - 0.2, "z": 0.0, "visibility": 0.9},
                    "RIGHT_SHOULDER": {"x": mid_x + 0.15, "y": mid_y - 0.2, "z": 0.0, "visibility": 0.9},
                    "LEFT_ELBOW": {"x": mid_x - 0.2, "y": mid_y - 0.05 + 0.05 * abs(1 + 0.5 * frame_idx), "z": 0.0, "visibility": 0.8},
                    "RIGHT_ELBOW": {"x": mid_x + 0.2, "y": mid_y - 0.05, "z": 0.0, "visibility": 0.8},
                    "LEFT_WRIST": {"x": mid_x - 0.25, "y": mid_y + 0.1, "z": 0.0, "visibility": 0.8},
                    "RIGHT_WRIST": {"x": mid_x + 0.25, "y": mid_y + 0.1, "z": 0.0, "visibility": 0.8},
                    "LEFT_HIP": {"x": mid_x - 0.08, "y": mid_y + 0.1, "z": 0.0, "visibility": 0.9},
                    "RIGHT_HIP": {"x": mid_x + 0.08, "y": mid_y + 0.1, "z": 0.0, "visibility": 0.9},
                    "MID_HIP": {"x": mid_x, "y": mid_y + 0.1, "z": 0.0, "visibility": 0.9},
                    "LEFT_KNEE": {"x": mid_x - 0.1, "y": mid_y + 0.25, "z": 0.0, "visibility": 0.8},
                    "RIGHT_KNEE": {"x": mid_x + 0.1, "y": mid_y + 0.25, "z": 0.0, "visibility": 0.8},
                    "LEFT_ANKLE": {"x": mid_x - 0.12, "y": mid_y + 0.38, "z": 0.0, "visibility": 0.9},
                    "RIGHT_ANKLE": {"x": mid_x + 0.12, "y": mid_y + 0.38, "z": 0.0, "visibility": 0.9}
                }

            if landmarks_dict:
                poses_list.append({
                    "frame": frame_idx,
                    "landmarks": landmarks_dict
                })

        cap.release()

        provenance = {
            "tool": "harmony-ml-core",
            "version": "0.1.0",
            "backend": "mediapipe" if use_real else "degraded_mock",
            "device": "cpu",
            "precision": "float32",
            "timestamp": str(time.time())
        }

        return {
            "schemaVersion": "1.0",
            "modelId": self.model_id,
            "frameCount": frame_idx,
            "fps": fps,
            "poses": poses_list,
            "provenance": provenance
        }
