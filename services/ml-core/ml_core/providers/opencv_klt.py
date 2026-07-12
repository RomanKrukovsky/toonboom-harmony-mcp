import cv2
import time
import numpy as np
from typing import Any, Dict, List
from .base import BaseMLProvider

class OpenCVKLTPointTrackingProvider(BaseMLProvider):
    def __init__(self, model_id: str = "opencv_klt"):
        super().__init__(model_id)

    def check_availability(self) -> bool:
        return True

    def load_model(self) -> bool:
        self.loaded = True
        return True

    def run_inference(self, inputs: Dict[str, Any], progress_callback: Any = None) -> Dict[str, Any]:
        video_path = inputs["videoPath"]
        query_points = inputs.get("queryPoints", [])  # list of dicts: {"pointId": str, "x": float, "y": float, "frame": int}
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")

        fps = float(cap.get(cv2.CAP_PROP_FPS) or 24.0)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frameCount = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 1)

        # Pre-load all frames to enable back-tracking or multi-point KLT
        frames = []
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
        cap.release()

        # Group query points by start frame
        queries_by_frame = {}
        for pt in query_points:
            f = pt["frame"]
            queries_by_frame.setdefault(f, []).append(pt)

        # Tracked results: list of {"frame": int, "points": [{"pointId": str, "x": float, "y": float, "visible": bool, "confidence": float}]}
        frames_results = []

        # Simple KLT tracker implementation
        lk_params = dict(winSize=(15, 15), maxLevel=2,
                         criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 10, 0.03))

        # Active trackers: Dict[pointId, {"x": float, "y": float, "last_frame": int}]
        active_points = {}

        for frame_idx in range(1, len(frames) + 1):
            if progress_callback:
                progress_callback(frame_idx / len(frames))

            gray_frame = frames[frame_idx - 1]

            # Add new query points starting at this frame
            if frame_idx in queries_by_frame:
                for pt in queries_by_frame[frame_idx]:
                    active_points[pt["pointId"]] = {
                        "x": pt["x"] * width,
                        "y": pt["y"] * height,
                        "last_frame": frame_idx
                    }

            points_in_frame = []

            if active_points:
                # Prepare points for cv2.calcOpticalFlowPyrLK
                point_ids = list(active_points.keys())
                prev_pts = np.float32([[active_points[pid]["x"], active_points[pid]["y"]] for pid in point_ids]).reshape(-1, 1, 2)
                
                # Check if we have a previous frame to track from
                if frame_idx > 1 and len(frames) >= frame_idx:
                    prev_gray = frames[frame_idx - 2]
                    next_pts, status, err = cv2.calcOpticalFlowPyrLK(prev_gray, gray_frame, prev_pts, None, **lk_params)
                    
                    for i, pid in enumerate(point_ids):
                        stat = status[i][0]
                        nx, ny = next_pts[i][0]
                        visible = bool(stat == 1 and 0 <= nx <= width and 0 <= ny <= height)
                        confidence = 1.0 if visible else 0.0
                        
                        if visible:
                            active_points[pid]["x"] = nx
                            active_points[pid]["y"] = ny
                            active_points[pid]["last_frame"] = frame_idx
                        
                        points_in_frame.append({
                            "pointId": pid,
                            "x": float(nx / width),
                            "y": float(ny / height),
                            "visible": visible,
                            "confidence": confidence
                        })
                else:
                    # First frame of active points
                    for pid in point_ids:
                        points_in_frame.append({
                            "pointId": pid,
                            "x": float(active_points[pid]["x"] / width),
                            "y": float(active_points[pid]["y"] / height),
                            "visible": True,
                            "confidence": 1.0
                        })

            frames_results.append({
                "frame": frame_idx,
                "points": points_in_frame
            })

        provenance = {
            "tool": "harmony-ml-core",
            "version": "0.1.0",
            "backend": "opencv_klt",
            "device": "cpu",
            "precision": "float32",
            "timestamp": str(time.time())
        }

        return {
            "schemaVersion": "1.0",
            "modelId": self.model_id,
            "points": frames_results,
            "provenance": provenance
        }
