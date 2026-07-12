import time
import numpy as np
from typing import Any, Dict, List
from .base import BaseMLProvider

class VisualEmbeddingProvider(BaseMLProvider):
    def __init__(self, model_id: str = "visual_clip"):
        super().__init__(model_id)

    def check_availability(self) -> bool:
        return True

    def load_model(self) -> bool:
        self.loaded = True
        return True

    def run_inference(self, inputs: Dict[str, Any], progress_callback: Any = None) -> Dict[str, Any]:
        # Return a normalized dummy embedding vector of size 512
        vector = np.random.randn(512)
        vector /= np.linalg.norm(vector)
        return {
            "embedding": vector.tolist(),
            "dimension": 512,
            "provenance": {
                "tool": "harmony-ml-core",
                "version": "0.1.0",
                "backend": "mock_clip",
                "device": "cpu",
                "precision": "float32",
                "timestamp": str(time.time())
            }
        }

class TextEmbeddingProvider(BaseMLProvider):
    def __init__(self, model_id: str = "text_sentence_transformer"):
        super().__init__(model_id)

    def check_availability(self) -> bool:
        return True

    def load_model(self) -> bool:
        self.loaded = True
        return True

    def run_inference(self, inputs: Dict[str, Any], progress_callback: Any = None) -> Dict[str, Any]:
        text = inputs.get("text", "")
        # Generate hash-based deterministic embedding vector of size 384
        np.random.seed(hash(text) % (2**32))
        vector = np.random.randn(384)
        vector /= np.linalg.norm(vector)
        return {
            "embedding": vector.tolist(),
            "dimension": 384,
            "provenance": {
                "tool": "harmony-ml-core",
                "version": "0.1.0",
                "backend": "mock_sentence_transformers",
                "device": "cpu",
                "precision": "float32",
                "timestamp": str(time.time())
            }
        }
