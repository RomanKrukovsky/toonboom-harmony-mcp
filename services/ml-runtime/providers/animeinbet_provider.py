"""
AnimeInbet generative inbetweening provider.

STATUS: NOT IMPLEMENTED. No model is wired up and no weights are shipped.

The previous version of this file advertised itself as working. `generate_inbetweens`
returned an InbetweenPIR containing paths like `/tmp/animeinbet_output/inbetween_0001.png`
with a hardcoded `confidence: 0.95`. Those files were never written by anything — the
provider fabricated filenames for images that did not exist, and a downstream consumer
reading the PIR would have treated them as produced frames.

Rather than delete the contract, this module now fails honestly: every entry point
returns `status: "not_implemented"` with `realInferenceExecuted: False` and a blocking
reason. When a real AnimeInbet (or replacement) model is integrated, implement `run()`
and flip the capability registry entry from `not_implemented` to a verified level with
evidence paths.

See docs/capability_registry.json -> capability "inbetweening.generative".
"""

from __future__ import annotations

from typing import Any, Dict

BLOCKING_REASON = (
    "AnimeInbet is not integrated: no model implementation and no weights are present. "
    "The previous implementation returned fabricated /tmp/*.png paths for frames that were "
    "never generated."
)


class AnimeInbetProvider:
    """Placeholder that refuses to produce results instead of inventing them."""

    def __init__(self, model_dir: str = "weights/animeinbet"):
        self.model_dir = model_dir
        self.is_loaded = False

    def detect(self) -> Dict[str, Any]:
        return {
            "status": "not_implemented",
            "realInferenceExecuted": False,
            "provider": "animeinbet",
            "blockingReason": BLOCKING_REASON,
        }

    def load_model(self) -> None:
        raise NotImplementedError(BLOCKING_REASON)

    def generate_inbetweens(self, frame_a_path: str, frame_b_path: str, count: int = 3) -> Dict[str, Any]:
        """
        Returns a blocked result. It deliberately does NOT return an InbetweenPIR, so that a
        caller cannot mistake a placeholder for generated frames.
        """
        return {
            "status": "not_implemented",
            "realInferenceExecuted": False,
            "provider": "animeinbet",
            "requestedCount": count,
            "sourceKeyframes": [frame_a_path, frame_b_path],
            "inbetweens": [],
            "artifactCreated": False,
            "blockingReason": BLOCKING_REASON,
        }

    # Alias used by the ml-runtime dispatcher.
    def run(self, *args: Any, **kwargs: Any) -> Dict[str, Any]:
        return {
            "status": "not_implemented",
            "realInferenceExecuted": False,
            "provider": "animeinbet",
            "artifactCreated": False,
            "blockingReason": BLOCKING_REASON,
        }
