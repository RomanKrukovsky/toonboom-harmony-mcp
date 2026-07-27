from __future__ import annotations

import math
import numpy as np
from typing import List, Tuple, Dict, Any

from .pir_models import DrawingStrokePIR, BezierSegmentPIR, Point2DPIR, QualityMetricsPIR


PRESETS = {
    "draft": {"min_length": 0.005, "max_points": 20, "max_error": 0.05},
    "production": {"min_length": 0.015, "max_points": 50, "max_error": 0.02},
    "archival": {"min_length": 0.025, "max_points": 100, "max_error": 0.008},
}


def compute_stroke_length(stroke: DrawingStrokePIR) -> float:
    total_len = 0.0
    for seg in stroke.segments:
        dx = seg.end_point.x - seg.start_point.x
        dy = seg.end_point.y - seg.start_point.y
        total_len += math.sqrt(dx * dx + dy * dy)
    return total_len


def compute_rms_error(stroke: DrawingStrokePIR) -> float:
    """
    Computes RMS geometric deviation of Bezier control points relative to chord line.
    """
    if not stroke.segments:
        return 0.0

    errors = []
    for seg in stroke.segments:
        # Distance from C1 and C2 to line (P0 - P3)
        p0 = np.array([seg.start_point.x, seg.start_point.y])
        p3 = np.array([seg.end_point.x, seg.end_point.y])
        c1 = np.array([seg.control_point1.x, seg.control_point1.y])
        c2 = np.array([seg.control_point2.x, seg.control_point2.y])

        line_vec = p3 - p0
        line_len = np.linalg.norm(line_vec)
        if line_len < 1e-6:
            errors.append(0.0)
            continue

        unit_line = line_vec / line_len
        # Perpendicular distance
        d1 = np.linalg.norm(c1 - p0 - np.dot(c1 - p0, unit_line) * unit_line)
        d2 = np.linalg.norm(c2 - p0 - np.dot(c2 - p0, unit_line) * unit_line)
        errors.extend([d1, d2])

    return float(np.sqrt(np.mean(np.square(errors)))) if errors else 0.0


def cleanup_strokes(
    strokes: List[DrawingStrokePIR],
    preset_name: str = "production",
    custom_min_length: float = 0.01,
    max_control_points_per_stroke: int = 50
) -> Tuple[List[DrawingStrokePIR], QualityMetricsPIR]:
    preset = PRESETS.get(preset_name, PRESETS["production"])
    min_len = max(custom_min_length, preset["min_length"])
    max_pts = min(max_control_points_per_stroke, preset["max_points"])
    max_err = preset["max_error"]

    cleaned: List[DrawingStrokePIR] = []
    human_review_count = 0
    total_error_sum = 0.0
    total_ctrl_points = 0

    for stroke in strokes:
        length = compute_stroke_length(stroke)
        if length < min_len:
            continue

        rms_err = compute_rms_error(stroke)
        total_error_sum += rms_err

        # Check control points count limit
        num_ctrl = len(stroke.control_handles)
        total_ctrl_points += num_ctrl

        requires_review = stroke.requires_human_review or (rms_err > max_err) or (num_ctrl > max_pts)
        if requires_review:
            human_review_count += 1

        # Create updated stroke with verified metrics
        updated = stroke.model_copy(
            update={
                "confidence": max(0.1, 1.0 - (rms_err / max_err) * 0.5),
                "requiresHumanReview": requires_review,
            }
        )
        cleaned.append(updated)

    total_strokes = len(cleaned)
    avg_ctrl = total_ctrl_points / max(1, total_strokes)
    avg_rms = total_error_sum / max(1, total_strokes)
    acceptance_rate = (total_strokes - human_review_count) / max(1, total_strokes)

    metrics = QualityMetricsPIR(
        totalStrokes=total_strokes,
        totalFills=0,
        averageControlPointsPerStroke=avg_ctrl,
        rmsGeometricError=avg_rms,
        firstPassAcceptanceRate=acceptance_rate,
        requiresHumanReviewCount=human_review_count,
    )

    return cleaned, metrics
