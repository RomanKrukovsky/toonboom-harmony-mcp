from __future__ import annotations

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional

from .pir_models import (
    CharacterDrawingPIR,
    DrawingLayerPIR,
    CoordinateTransformationPIR,
    AxisOrientation,
)
from .vector_preprocessing import preprocess_image
from .stroke_extractor import ClassicalStrokeExtractor, LegalGate
from .vector_cleanup import cleanup_strokes
from .palette_reconstruction import reconstruct_palette


def run_native_vectorization(
    image_path: str,
    character_id: str = "char_01",
    drawing_name: str = "drawing_1",
    vectorization_mode: str = "black_and_white_lineart",
    target_mode: str = "pencil",
    quality_preset: str = "production",
    palette_mode: str = "create_new_palette",
    provider: str = "classical_fallback",
    max_control_points_per_stroke: int = 50,
    minimum_stroke_length: float = 0.01
) -> Tuple[CharacterDrawingPIR, Dict[str, Any]]:
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found at {image_path}")

    image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError(f"Could not load image: {image_path}")

    height, width = image.shape[:2]

    # Legal Gate Check
    allowed, legal_reason = LegalGate.check_provider_allowed(provider)
    if not allowed:
        raise PermissionError(legal_reason)

    # 1. Preprocessing
    binary_or_rgb, alpha, prep_report = preprocess_image(
        image, mode=vectorization_mode
    )

    # Compute distance transform for thickness estimation
    if vectorization_mode == "black_and_white_lineart":
        dist_transform = cv2.distanceTransform(binary_or_rgb, cv2.DIST_L2, 5)
    else:
        gray = cv2.cvtColor(image[:, :, :3], cv2.COLOR_BGR2GRAY)
        _, inv = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
        dist_transform = cv2.distanceTransform(inv, cv2.DIST_L2, 5)

    # 2. Palette Reconstruction
    palette, pal_report = reconstruct_palette(image, mode=palette_mode)

    # 3. Stroke Extraction
    extractor = ClassicalStrokeExtractor()
    raw_strokes = extractor.extract_strokes(
        binary_or_rgb if vectorization_mode == "black_and_white_lineart" else (alpha > 128).astype(np.uint8) * 255,
        dist_transform,
        img_width=width,
        img_height=height,
        target_mode=target_mode
    )

    # 4. Vector Cleanup
    cleaned_strokes, metrics = cleanup_strokes(
        raw_strokes,
        preset_name=quality_preset,
        custom_min_length=minimum_stroke_length,
        max_control_points_per_stroke=max_control_points_per_stroke
    )

    # 5. Build PIR Output
    transform = CoordinateTransformationPIR(
        sourceWidth=float(width),
        sourceHeight=float(height),
        coordinateSystem="normalized",
        transformMatrix=[1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0],
        scale=1.0,
        axisOrientation=AxisOrientation(x="right", y="up")
    )

    layer_line = DrawingLayerPIR(
        layerId="layer_outline",
        name="Outline",
        semanticGroup="outline",
        artLayer="line",
        strokes=cleaned_strokes,
        fillRegions=[]
    )

    pir = CharacterDrawingPIR(
        pirVersion="1.0.0",
        characterId=character_id,
        drawingName=drawing_name,
        frame=1,
        coordinateTransform=transform,
        layers=[layer_line],
        unassignedStrokes=[],
        unassignedFills=[],
        palette=palette,
        qualityMetrics=metrics
    )

    pir.deterministic_hash = pir.compute_hash()

    summary_report = {
        "imagePath": image_path,
        "width": width,
        "height": height,
        "provider": provider,
        "legalMessage": legal_reason,
        "qualityMetrics": metrics.model_dump(by_alias=True),
        "deterministicHash": pir.deterministic_hash,
        "preprocessingReport": prep_report,
        "paletteReport": pal_report
    }

    return pir, summary_report
