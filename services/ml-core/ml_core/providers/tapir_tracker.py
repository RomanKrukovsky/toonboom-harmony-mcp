import time
from typing import Any, Dict
from .base import BaseMLProvider
from .opencv_klt import OpenCVKLTPointTrackingProvider

class TAPIRPointTrackingProvider(BaseMLProvider):
    def __init__(self, model_id: str = "tapir"):
        super().__init__(model_id)

    def check_availability(self) -> bool:
        try:
            import torch
            return True
        except ImportError:
            return False

    def load_model(self) -> bool:
        # Load TAPIR model check
        return False

    def run_inference(self, inputs: Dict[str, Any], progress_callback: Any = None) -> Dict[str, Any]:
        # Fall back to KLT tracker for robustness if not fully configured with checkpoint weights
        klt = OpenCVKLTPointTrackingProvider()
        klt.load_model()
        return klt.run_inference(inputs, progress_callback)
