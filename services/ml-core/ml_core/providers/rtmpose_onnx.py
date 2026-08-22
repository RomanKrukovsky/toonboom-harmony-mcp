import cv2
import time
from typing import Any, Dict
from .base import BaseMLProvider
from .mediapipe_pose import MediaPipePoseProvider

class RTMPoseOnnxProvider(BaseMLProvider):
    def __init__(self, model_id: str = "rtmpose_m"):
        super().__init__(model_id)
        self.session = None

    def check_availability(self) -> bool:
        try:
            import onnxruntime as ort
            return True
        except ImportError:
            return False

    def load_model(self) -> bool:
        if self.loaded:
            return True
        try:
            import onnxruntime as ort
            from ..config import MODEL_ROOT
            
            model_path = MODEL_ROOT / "checkpoints" / "rtmpose-m.onnx"
            if not model_path.is_file():
                return False

            self.session = ort.InferenceSession(str(model_path), providers=ort.get_available_providers())
            self.loaded = True
            return True
        except Exception:
            return False

    def run_inference(self, inputs: Dict[str, Any], progress_callback: Any = None) -> Dict[str, Any]:
        # ЧЕСТНОСТЬ: реальный RTMPose SimCC-инференс в ml-core не реализован
        # (полная реализация с YOLOX-детекцией живёт в ml-runtime/providers/dwpose_provider.py).
        # Раньше этот метод молча подменял результат MediaPipe-провайдером даже при
        # загруженной ONNX-сессии — потребитель считал, что получил RTMPose.
        # Теперь fallback явно помечен в манифесте.
        backup = MediaPipePoseProvider()
        if backup.check_availability():
            backup.load_model()
        result = backup.run_inference(inputs, progress_callback)
        result["requestedModelId"] = self.model_id
        result["fallbackUsed"] = True
        result["fallbackReason"] = (
            "RTMPose ONNX inference is not implemented in ml-core; "
            "use ml-runtime DWPoseProvider for real SimCC decoding."
        )
        provenance = result.get("provenance")
        if isinstance(provenance, dict):
            provenance["requestedBackend"] = "rtmpose_onnx"
            provenance["fallbackBackend"] = provenance.get("backend")
        return result
