from __future__ import annotations

import os
import math
import numpy as np
import cv2
from typing import List, Tuple, Dict, Any, Optional

from .pir_models import (
    DrawingStrokePIR,
    BezierSegmentPIR,
    Point2DPIR,
    WidthPointPIR,
    DrawingLayerPIR,
    FillRegionPIR,
    CharacterDrawingPIR,
    CoordinateTransformationPIR,
    QualityMetricsPIR,
    PaletteItemPIR,
    ColorDefinitionPIR,
)


def zhang_suen_thinning(binary_img: np.ndarray) -> np.ndarray:
    """
    Zhang-Suen skeletonization algorithm for 1-pixel wide centerline extraction.
    """
    img = (binary_img > 0).astype(np.uint8)
    prev = np.zeros_like(img)
    
    while True:
        # Sub-iteration 1
        deletion = np.zeros_like(img)
        rows, cols = img.shape
        for r in range(1, rows - 1):
            for c in range(1, cols - 1):
                if img[r, c] == 0:
                    continue
                p2, p3, p4 = img[r-1, c], img[r-1, c+1], img[r, c+1]
                p5, p6, p7 = img[r+1, c+1], img[r+1, c], img[r+1, c-1]
                p8, p9 = img[r, c-1], img[r-1, c-1]
                
                neighbors = [p2, p3, p4, p5, p6, p7, p8, p9]
                b = sum(neighbors)
                if 2 <= b <= 6:
                    transitions = 0
                    for i in range(8):
                        if neighbors[i] == 0 and neighbors[(i + 1) % 8] == 1:
                            transitions += 1
                    if transitions == 1:
                        if p2 * p4 * p6 == 0 and p4 * p6 * p8 == 0:
                            deletion[r, c] = 1
        img[deletion == 1] = 0

        # Sub-iteration 2
        deletion = np.zeros_like(img)
        for r in range(1, rows - 1):
            for c in range(1, cols - 1):
                if img[r, c] == 0:
                    continue
                p2, p3, p4 = img[r-1, c], img[r-1, c+1], img[r, c+1]
                p5, p6, p7 = img[r+1, c+1], img[r+1, c], img[r+1, c-1]
                p8, p9 = img[r, c-1], img[r-1, c-1]
                
                neighbors = [p2, p3, p4, p5, p6, p7, p8, p9]
                b = sum(neighbors)
                if 2 <= b <= 6:
                    transitions = 0
                    for i in range(8):
                        if neighbors[i] == 0 and neighbors[(i + 1) % 8] == 1:
                            transitions += 1
                    if transitions == 1:
                        if p2 * p4 * p8 == 0 and p2 * p6 * p8 == 0:
                            deletion[r, c] = 1
        img[deletion == 1] = 0

        if np.array_equal(img, prev):
            break
        prev = img.copy()

    return (img * 255).astype(np.uint8)


def fit_cubic_bezier_segment(pts: np.ndarray) -> BezierSegmentPIR:
    """
    Fits a cubic Bezier curve to an ordered sequence of 2D points [(x, y), ...].
    """
    n = len(pts)
    p0 = Point2DPIR(x=float(pts[0][0]), y=float(pts[0][1]))
    p3 = Point2DPIR(x=float(pts[-1][0]), y=float(pts[-1][1]))
    
    if n <= 2:
        # Linear approximation
        p1 = Point2DPIR(x=p0.x + (p3.x - p0.x) / 3.0, y=p0.y + (p3.y - p0.y) / 3.0)
        p2 = Point2DPIR(x=p0.x + 2 * (p3.x - p0.x) / 3.0, y=p0.y + 2 * (p3.y - p0.y) / 3.0)
        return BezierSegmentPIR(startPoint=p0, endPoint=p3, controlPoint1=p1, controlPoint2=p2, isCorner=False)

    # Tangent vectors
    t1 = pts[1] - pts[0]
    t2 = pts[-1] - pts[-2]
    norm1 = np.linalg.norm(t1)
    norm2 = np.linalg.norm(t2)

    if norm1 > 0:
        t1 = t1 / norm1
    else:
        t1 = np.array([1.0, 0.0])

    if norm2 > 0:
        t2 = t2 / norm2
    else:
        t2 = np.array([1.0, 0.0])

    dist = np.linalg.norm(pts[-1] - pts[0]) / 3.0
    c1 = pts[0] + t1 * dist
    c2 = pts[-1] - t2 * dist

    return BezierSegmentPIR(
        startPoint=p0,
        endPoint=p3,
        controlPoint1=Point2DPIR(x=float(c1[0]), y=float(c1[1])),
        controlPoint2=Point2DPIR(x=float(c2[0]), y=float(c2[1])),
        isCorner=False,
    )


class LegalGate:
    """
    Legal and License Gate for ML models and third-party code providers.
    """
    @staticmethod
    def check_provider_allowed(provider_name: str) -> Tuple[bool, str]:
        if provider_name == "classical_fallback":
            return True, "MIT/Internal classical algorithm - fully compliant."
        
        is_commercial_build = os.environ.get("COMMERCIAL_BUILD", "true").lower() == "true"
        
        if provider_name == "jostc":
            # JoSTC check
            weights_license = os.environ.get("JOSTC_WEIGHTS_LICENSE", "NON_COMMERCIAL_RESEARCH")
            if is_commercial_build and weights_license != "COMMERCIAL_ALLOWED":
                return False, "JoSTC provider blocked by Legal Gate: non-commercial weights license under COMMERCIAL_BUILD."
            return True, "JoSTC provider verified."

        return False, f"Provider {provider_name} not registered in Legal Gate."


class ClassicalStrokeExtractor:
    """
    Deterministic classical stroke extractor using skeletonization, distance transform, and Bezier fitting.
    """

    def extract_strokes(
        self,
        binary_lineart: np.ndarray,
        dist_transform: np.ndarray,
        img_width: int,
        img_height: int,
        target_mode: str = "pencil"
    ) -> List[DrawingStrokePIR]:
        skeleton = zhang_suen_thinning(binary_lineart)
        
        # Find contours of skeleton segments
        contours, _ = cv2.findContours(skeleton, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
        strokes: List[DrawingStrokePIR] = []

        stroke_idx = 0
        for cnt in contours:
            pts = cnt.reshape(-1, 2)
            if len(pts) < 2:
                continue

            # Normalize coordinates to 0..1
            norm_pts = pts.astype(np.float64) / np.array([img_width, img_height])
            
            # Subdivide into Bezier segments
            max_seg_pts = 16
            segments: List[BezierSegmentPIR] = []
            anchors: List[Point2DPIR] = []
            width_profile: List[WidthPointPIR] = []

            total_pts = len(pts)
            for i in range(0, total_pts - 1, max_seg_pts - 1):
                chunk = norm_pts[i : i + max_seg_pts]
                if len(chunk) < 2:
                    continue
                seg = fit_cubic_bezier_segment(chunk)
                segments.append(seg)

                # Width profile sampling
                px, py = pts[min(i, total_pts - 1)]
                thickness = float(dist_transform[py, px]) * 2.0
                rel_pos = float(i) / max(1, total_pts - 1)
                width_profile.append(WidthPointPIR(position=rel_pos, thickness=thickness))

            if not segments:
                continue

            stroke_idx += 1
            anchors = [seg.start_point for seg in segments] + [segments[-1].end_point]
            control_handles = [seg.control_point1 for seg in segments] + [seg.control_point2 for seg in segments]
            corner_flags = [seg.is_corner for seg in segments]

            avg_thickness = float(np.mean([w.thickness for w in width_profile])) if width_profile else 2.0

            stroke = DrawingStrokePIR(
                strokeId=f"stroke_{stroke_idx:04d}",
                resultType=target_mode,
                artLayer="line",
                semanticGroup="outline",
                openOrClosed="open",
                segments=segments,
                anchors=anchors,
                controlHandles=control_handles,
                cornerFlags=corner_flags,
                baseThickness=max(1.0, avg_thickness),
                widthProfile=width_profile,
                lineCap="round",
                lineJoin="round",
                colourId="color_black",
                paletteId="default_palette",
                confidence=0.95,
                sourceProvider="classical_fallback",
                assumptions=["Deterministic skeletonization line art"],
                requiresHumanReview=False,
            )
            strokes.append(stroke)

        return strokes
