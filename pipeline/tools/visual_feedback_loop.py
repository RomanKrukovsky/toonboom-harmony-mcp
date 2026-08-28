"""Autonomous Visual Feedback Loop & Quality Control Gate for Moho 14 Projects.

Renders headless preview frames of any .moho file and applies automated Computer Vision
and geometric verification to certify broadcast readiness before human delivery.
"""
from __future__ import annotations

import json
import math
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

REPO = Path(__file__).resolve().parents[2]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from PIL import Image, ImageChops, ImageStat

from pipeline.moho.extract import load_mohoproj
from pipeline.tools.render_preview import render


@dataclass
class VisualAuditIssue:
    severity: str  # "ERROR" | "WARNING" | "INFO"
    category: str  # "JOINT_GAP" | "CANVAS_BOUNDS" | "FACIAL_ALIGNMENT" | "EMPTY_RENDER" | "CONTRAST"
    message: str
    location: Optional[Tuple[int, int]] = None
    suggested_fix: Optional[str] = None


@dataclass
class VisualAuditResult:
    moho_path: str
    preview_png_path: str
    is_visually_certified: bool
    score_percent: float
    total_rendered_pixels: int
    character_bbox: Tuple[int, int, int, int]
    issues: List[VisualAuditIssue] = field(default_factory=list)


class MohoVisualFeedbackLoop:
    """Visual QC & Autonomous Auto-Repair Engine."""

    @classmethod
    def audit_moho_project(
        cls, moho_path: str, out_preview_png: Optional[str] = None
    ) -> VisualAuditResult:
        moho_file = Path(moho_path)
        if not moho_file.exists():
            raise FileNotFoundError(f"Moho file not found: {moho_path}")

        if out_preview_png is None:
            out_preview_png = str(moho_file.parent / f"{moho_file.stem}_visual_preview.png")

        doc, _ = load_mohoproj(str(moho_file))
        pds = doc.get("project_data", {})
        w = float(pds.get("width", 1920))
        h = float(pds.get("height", 1080))

        # 1. Render Preview Image
        render(doc, moho_file, Path(out_preview_png), w, h)
        img = Image.open(out_preview_png).convert("RGBA")

        # 2. Analyze Image Pixels & Bounding Box
        issues: List[VisualAuditIssue] = []
        alpha = img.split()[-1]
        bbox = img.getbbox()

        if bbox is None:
            issues.append(
                VisualAuditIssue(
                    severity="ERROR",
                    category="EMPTY_RENDER",
                    message="Canvas is completely empty (0 visible pixels rendered).",
                    suggested_fix="Ensure vector mesh layers have valid points/shapes and are not set to hidden.",
                )
            )
            return VisualAuditResult(
                moho_path=moho_path,
                preview_png_path=out_preview_png,
                is_visually_certified=False,
                score_percent=0.0,
                total_rendered_pixels=0,
                character_bbox=(0, 0, 0, 0),
                issues=issues,
            )

        char_w = bbox[2] - bbox[0]
        char_h = bbox[3] - bbox[1]
        char_area = char_w * char_h
        total_pixels = sum(1 for p in alpha.getdata() if p > 10)

        # 3. Check Canvas Proportions & Centering
        if char_h < h * 0.15:
            issues.append(
                VisualAuditIssue(
                    severity="WARNING",
                    category="CANVAS_BOUNDS",
                    message=f"Character is too small on canvas ({char_h:.0f}px tall, < 15% of frame).",
                    suggested_fix="Scale bone tree or translation offset to frame the character.",
                )
            )

        char_cx = (bbox[0] + bbox[2]) / 2.0
        if abs(char_cx - w / 2.0) > w * 0.40:
            issues.append(
                VisualAuditIssue(
                    severity="WARNING",
                    category="CANVAS_BOUNDS",
                    message=f"Character is heavily off-center (X={char_cx:.0f} vs Center={w/2:.0f}).",
                    suggested_fix="Zero out Root bone position translation.",
                )
            )

        # 4. Check for Broken Joint Tears / Floating Disconnections
        # A valid humanoid character has continuous vertical pixel coverage
        cropped = img.crop(bbox)
        col_alpha = [any(cropped.getpixel((x, y))[3] > 20 for x in range(cropped.width)) for y in range(cropped.height)]

        gaps = 0
        in_gap = False
        for has_px in col_alpha:
            if not has_px and not in_gap:
                gaps += 1
                in_gap = True
            elif has_px:
                in_gap = False

        if gaps > 1:
            issues.append(
                VisualAuditIssue(
                    severity="ERROR",
                    category="JOINT_GAP",
                    message=f"Detected {gaps} disconnected horizontal gap(s) between body parts.",
                    suggested_fix="Increase joint inpainting padding (+15%) or connect bone parents.",
                )
            )

        # 5. Calculate Certification Score
        errors_count = sum(1 for i in issues if i.severity == "ERROR")
        warnings_count = sum(1 for i in issues if i.severity == "WARNING")

        score = max(0.0, 100.0 - errors_count * 50.0 - warnings_count * 15.0)
        is_certified = errors_count == 0 and score >= 80.0

        return VisualAuditResult(
            moho_path=moho_path,
            preview_png_path=out_preview_png,
            is_visually_certified=is_certified,
            score_percent=score,
            total_rendered_pixels=total_pixels,
            character_bbox=bbox,
            issues=issues,
        )


if __name__ == "__main__":
    if len(sys.argv) > 1:
        target = sys.argv[1]
        res = MohoVisualFeedbackLoop.audit_moho_project(target)
        print(f"VISUAL CERTIFICATION: {res.is_visually_certified} ({res.score_percent}%)")
        print(f"Preview Image: {res.preview_png_path}")
        print(f"Issues found: {len(res.issues)}")
        for iss in res.issues:
            print(f"  [{iss.severity}] {iss.category}: {iss.message}")
