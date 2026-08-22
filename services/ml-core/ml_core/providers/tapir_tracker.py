"""TAPIR point tracking — not implemented.

TAPIR (Tracking Any Point with per-frame Initialization and temporal Refinement)
has no inference implementation here: there is no checkpoint, no model code and
no weights entry in the registry.

Two honesty fixes over the previous version:

  * ``check_availability()`` used to return True whenever ``torch`` imported,
    while ``load_model()`` was hardcoded to False. An orchestrator that trusts
    availability would therefore select a provider that can never run.
  * ``run_inference()`` silently delegated to the KLT tracker and returned its
    result under ``modelId="tapir"``, so callers believed they had TAPIR-quality
    tracks when they actually had Lucas-Kanade optical flow.

Callers wanting the working classical tracker should request
``OpenCVKLTPointTrackingProvider`` explicitly.
"""

from typing import Any, Dict

from .base import BaseMLProvider


class TAPIRPointTrackingProvider(BaseMLProvider):
    def __init__(self, model_id: str = "tapir"):
        super().__init__(model_id)

    def check_availability(self) -> bool:
        # No implementation and no weights: availability must reflect that this
        # provider cannot produce a TAPIR result, regardless of torch.
        return False

    def load_model(self) -> bool:
        return False

    def run_inference(
        self, inputs: Dict[str, Any], progress_callback: Any = None
    ) -> Dict[str, Any]:
        raise NotImplementedError(
            "[NOT_IMPLEMENTED] TAPIR point tracking is not implemented: no model "
            "code and no checkpoint are present. Previously this silently returned "
            "OpenCV KLT results labelled as TAPIR. For classical point tracking use "
            "OpenCVKLTPointTrackingProvider (modelId='opencv_klt'), which reports "
            "its own backend honestly."
        )
