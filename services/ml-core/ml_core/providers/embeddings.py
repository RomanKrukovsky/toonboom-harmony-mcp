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
        # ЧЕСТНОСТЬ: реальная CLIP-модель не подключена. Раньше здесь возвращался
        # НЕдетерминированный np.random-вектор под видом эмбеддинга — два вызова
        # на одном изображении давали разные векторы, что ломает любой поиск по
        # похожести. Возвращаем детерминированный вектор от содержимого файла
        # (пригоден только для exact-match дедупликации) и явно помечаем статус.
        image_path = inputs.get("imagePath", "")
        seed_source = ""
        try:
            from pathlib import Path
            import hashlib
            seed_source = hashlib.sha256(Path(image_path).read_bytes()).hexdigest() if image_path else ""
        except OSError:
            seed_source = str(image_path)
        rng = np.random.default_rng(int(seed_source[:16] or "0", 16) if seed_source else 0)
        vector = rng.standard_normal(512)
        vector /= np.linalg.norm(vector)
        return {
            "embedding": vector.tolist(),
            "dimension": 512,
            "status": "degraded_hash_embedding",
            "realInferenceExecuted": False,
            "usableFor": ["exact_duplicate_detection"],
            "notUsableFor": ["semantic_similarity", "style_matching"],
            "provenance": {
                "tool": "harmony-ml-core",
                "version": "0.1.0",
                "backend": "content_hash_prng_no_clip",
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
        # ЧЕСТНОСТЬ: sentence-transformers не подключён. Хэш-вектор детерминирован,
        # но НЕ несёт семантики ("кот" и "кошка" не будут близки). Помечаем явно.
        # hash() рандомизируется между процессами (PYTHONHASHSEED) — используем
        # стабильный sha256, чтобы вектор был воспроизводим между запусками.
        import hashlib
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:16], 16)
        rng = np.random.default_rng(seed)
        vector = rng.standard_normal(384)
        vector /= np.linalg.norm(vector)
        return {
            "embedding": vector.tolist(),
            "dimension": 384,
            "status": "degraded_hash_embedding",
            "realInferenceExecuted": False,
            "usableFor": ["exact_text_deduplication"],
            "notUsableFor": ["semantic_similarity", "search_ranking"],
            "provenance": {
                "tool": "harmony-ml-core",
                "version": "0.1.0",
                "backend": "sha256_prng_no_sentence_transformers",
                "device": "cpu",
                "precision": "float32",
                "timestamp": str(time.time())
            }
        }
