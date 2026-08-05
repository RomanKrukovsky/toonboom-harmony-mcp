"""SAM 2 provider.

The real SAM 2 model from facebookresearch/sam2 is not installed in this repository. The
weights named in `data/models/registry/catalog.json` are absent on disk, and the GitHub
repository's LICENSE has not been re-read in this session, so `legal_review_required` blocks
commercial use.

What this module does *honestly*:

  * exposes the V2 typed request/response contract used by the TypeScript orchestrator;
  * validates the input contract;
  * returns `ProviderResult(status="blocked", real_inference_executed=False)` with
    `ML_MODEL_NOT_INSTALLED` when its weights are missing and `ML_LICENSE_BLOCKED` when they
    are present but the licence has not been cleared;
  * never fabricates masks, bounding boxes or area values.

When a real SAM 2 weight set is downloaded, verified against the catalog digest and the
licence has been signed off in `catalog.json`, the `STATUS:` comment below is the only line
that has to change.
"""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base import ExecutionContext, MlRuntimeProvider, ProviderDescriptor, ProviderError, ProviderResult

logger = logging.getLogger("ml-runtime.sam2")

STATUS = "blocked: SAM 2 weights are not installed and the licence has not been cleared"


class Sam2Provider(MlRuntimeProvider):
    """V2-typed SAM 2 provider. Today: blocked. Tomorrow: real inference against verified weights."""

    cache_key: str = "sam2/sam2.1_hiera_tiny"

    @property
    def descriptor(self) -> ProviderDescriptor:
        return ProviderDescriptor(
            providerId="sam2",
            modelId="sam2.1_hiera_tiny",
            modelRevision="sam2.1_hiera_tiny",
            taskTypes=("character_segmentation", "video_segmentation"),
            capabilities=("image_predictor", "video_predictor", "point_prompts", "box_prompts", "mask_prompts", "multi_object"),
            inputSchemaVersions=("2.0",),
            outputSchemaVersions=("2.0",),
            resultKind="Sam2VideoSegmentationResultV2",
            backend="pytorch",
            devices=("cuda",),
            minRamGb=16.0,
            minVramGb=8.0,
            estimatedPeakMemoryMb=6500.0,
            supportsBatch=False,
            supportsCancellation=True,
            threadSafe=False,
            maxConcurrency=1,
            loadMode="lazy",
            unloadPolicy="on_memory_pressure",
            privacyClass="local_only",
            requiresPickle=True,
            requiredDependencies=("torch", "sam2"),
        )

    def detect(self) -> Dict[str, Any]:
        return {
            "status": "weights_missing",
            "message": "SAM 2 weights are absent; expected files in services/ml-runtime/weights/sam2/. "
                       "Run scripts/ml/download_model.py --model sam2.1_hiera_tiny once the licence has been read and signed off.",
            "weights_required": ["sam2.1_hiera_tiny.pt"],
            "license_status": "legal_review_required",
        }

    def validate_input(self, parameters: Dict[str, Any], inputs: List[Dict[str, Any]]) -> List[str]:
        problems: List[str] = []
        if not inputs:
            problems.append("at least one input artifact is required")
        mode = parameters.get("inputMode", "image")
        if mode not in {"image", "frame_sequence", "video"}:
            problems.append(f"inputMode {mode!r} is not one of image, frame_sequence, video")
        prompts = parameters.get("prompts") or []
        if not prompts:
            problems.append("at least one prompt is required (positive or negative points, box or mask reference)")
        for prompt in prompts:
            if not isinstance(prompt, dict) or "objectId" not in prompt:
                problems.append("every prompt needs an objectId")
                break
        return problems

    def execute(self, parameters: Dict[str, Any], inputs: List[Path], context: ExecutionContext) -> ProviderResult:
        return ProviderResult(
            status="blocked",
            real_inference_executed=False,
            simulated=False,
            error_code="ML_MODEL_NOT_INSTALLED",
            error_message=STATUS,
            warnings=[STATUS],
            normalized_pir=None,
        )


class Sam2SemanticPartAdapter:
    """Resolves SAM 2 objects → allowed semantic categories.

    The mapping uses the whitelist from
    `src/schemas/mlProvidersV2.ts: sam2PartCategorySchema`. Anything that does not map
    confidently is returned with `requiresHuman=True` so a human reviewer can rename it before
    the rig compiler turns it into Harmony nodes.
    """

    ALLOWED_CATEGORIES = (
        'head', 'hair_front', 'hair_back', 'face', 'eye_left', 'eye_right',
        'brow_left', 'brow_right', 'mouth', 'torso',
        'upper_arm_left', 'forearm_left', 'hand_left',
        'upper_arm_right', 'forearm_right', 'hand_right',
        'thigh_left', 'shin_left', 'foot_left',
        'thigh_right', 'shin_right', 'foot_right',
        'clothing', 'prop', 'unclassified',
    )

    SYNONYMS = {
        'left_eye': 'eye_left', 'right_eye': 'eye_right',
        'left_brow': 'brow_left', 'right_brow': 'brow_right',
        'left_arm': 'upper_arm_left', 'right_arm': 'upper_arm_right',
        'left_hand': 'hand_left', 'right_hand': 'hand_right',
        'left_leg': 'thigh_left', 'right_leg': 'thigh_right',
        'left_foot': 'foot_left', 'right_foot': 'foot_right',
    }

    @classmethod
    def map(cls, label: str, confidence: float, threshold: float = 0.55) -> Dict[str, Any]:
        """Resolve a single raw label to a category. Returns `requiresHuman` when confidence is low."""
        if not isinstance(label, str) or not label.strip():
            return {"category": "unclassified", "confidence": 0.0, "requiresHuman": True}
        normalized = label.strip().lower().replace('-', '_').replace(' ', '_')
        if normalized in cls.ALLOWED_CATEGORIES:
            return {"category": normalized, "confidence": confidence, "requiresHuman": confidence < threshold}
        if normalized in cls.SYNONYMS:
            return {"category": cls.SYNONYMS[normalized], "confidence": confidence, "requiresHuman": confidence < threshold}
        return {"category": "unclassified", "confidence": min(confidence, 0.5), "requiresHuman": True}
