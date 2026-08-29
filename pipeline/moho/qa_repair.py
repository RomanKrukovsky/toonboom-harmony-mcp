"""Measured visual QA and deterministic repairs for Moho projects."""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from PIL import Image

from ..pir.schema import Bone, Channel, Rig
from ..tools.moho_readiness import diagnostic_differences
from .emit import emit
from .extract import extract_from_file


INTERP = {
    "im": 1, "v1": -1.0, "v2": -1.0,
    "in": 1, "h": 0, "s": False, "t": 0,
}


@dataclass
class QADefect:
    issue_type: str
    frame: int
    severity: str
    description: str
    layer_id: Optional[str] = None
    bone_id: Optional[str] = None
    meta: Optional[dict[str, Any]] = None


def _frame_metrics(path: str) -> dict[str, Any]:
    with Image.open(path) as source:
        image = source.convert("RGB")
    background = image.getpixel((0, 0))
    foreground = [
        max(
            abs(channel - background[index])
            for index, channel in enumerate(pixel)
        ) > 12
        for pixel in image.get_flattened_data()
    ]
    mask = Image.new("1", image.size)
    mask.putdata(foreground)
    bounds = mask.getbbox()
    if bounds is None:
        return {
            "fraction": 0.0, "bounds": None,
            "centroid": (0.5, 0.5), "width": image.width, "height": image.height,
        }
    total = sum(foreground)
    x_sum = 0
    y_sum = 0
    for index, is_foreground in enumerate(foreground):
        if is_foreground:
            x_sum += index % image.width
            y_sum += index // image.width
    return {
        "fraction": total / float(image.width * image.height),
        "bounds": bounds,
        "centroid": (
            x_sum / float(total * image.width),
            y_sum / float(total * image.height),
        ),
        "width": image.width,
        "height": image.height,
    }


def _has_meaningful_keys(bone: Optional[Bone]) -> bool:
    if bone is None or bone.angle_channel is None:
        return False
    positive_values = [
        value for frame, value in zip(bone.angle_channel.when, bone.angle_channel.val)
        if int(frame) > 0
    ]
    return len(positive_values) >= 2 and len({round(float(value), 6) for value in positive_values}) >= 2


def _dial_value(bone: Bone, index: int, fallback: float) -> float:
    for action in bone.dial_actions or []:
        values = (action.get("pose") or {}).get("val", [])
        if index < len(values):
            return float(values[index])
    return fallback


def _merge_angle_keys(bone: Bone, values: dict[int, float]) -> None:
    existing_when = list(bone.angle_channel.when) if bone.angle_channel else [0]
    existing_val = list(bone.angle_channel.val) if bone.angle_channel else [bone.angle]
    pairs = {int(frame): float(value) for frame, value in zip(existing_when, existing_val)}
    pairs.update(values)
    sorted_pairs = sorted(pairs.items())
    bone.angle_channel = Channel(
        type="Val",
        when=[pair[0] for pair in sorted_pairs],
        val=[pair[1] for pair in sorted_pairs],
        interp=[dict(INTERP) for _ in sorted_pairs],
    )


class MohoVisualQARepairEngine:
    """Audit measurable defects and apply only deterministic, verifiable fixes."""

    def __init__(self, project_path: str, max_passes: int = 5):
        self.project_path = str(Path(project_path).resolve())
        self.max_passes = max_passes
        self.current_pass = 0
        self.defects: list[QADefect] = []
        self.repair_log: list[dict[str, Any]] = []

    def _load_rig(self) -> tuple[Optional[Rig], list[QADefect]]:
        if not Path(self.project_path).is_file():
            return None, [QADefect(
                "native_corruption", 0, "critical",
                f"Project does not exist: {self.project_path}",
            )]
        try:
            return extract_from_file(self.project_path), []
        except (OSError, ValueError, KeyError) as error:
            return None, [QADefect(
                "native_corruption", 0, "critical", f"Unreadable Moho project: {error}",
            )]

    def audit_project_and_frames(
        self,
        frames_data: Optional[list[dict[str, Any]]] = None,
        rendered_frames: Optional[list[str]] = None,
        frame_numbers: Optional[list[int]] = None,
    ) -> list[QADefect]:
        defects: list[QADefect] = []
        rig, load_defects = self._load_rig()
        defects.extend(load_defects)
        if rig is not None:
            for bone in rig.bones:
                if bone.is_dial and bone.strength > 0.0:
                    defects.append(QADefect(
                        "control_bones_visible", 0, "high",
                        f"Control '{bone.id}' deforms artwork with strength {bone.strength}",
                        bone_id=bone.id,
                    ))
            eyes = rig.bone_by_id("Eyes Switch")
            mouth = rig.bone_by_id("Mouth Switch")
            if not _has_meaningful_keys(eyes):
                defects.append(QADefect(
                    "missing_blink", 24, "medium", "Eyes Switch has no open/closed animation",
                    bone_id="Eyes Switch",
                ))
            if not _has_meaningful_keys(mouth):
                defects.append(QADefect(
                    "frozen_mouth", 36, "medium", "Mouth Switch has no changing phoneme keys",
                    bone_id="Mouth Switch",
                ))
            visible_meshes = [
                part for part in rig.walk_parts() if part.type == "mesh" and part.visible
            ]
            if not visible_meshes:
                defects.append(QADefect(
                    "all_meshes_hidden", 0, "critical", "Every mesh layer is hidden",
                ))

        paths = rendered_frames or []
        numbers = frame_numbers or list(range(1, len(paths) + 1))
        measured: list[dict[str, Any]] = []
        for frame, path in zip(numbers, paths):
            try:
                metrics = _frame_metrics(path)
            except (OSError, ValueError) as error:
                defects.append(QADefect(
                    "invalid_render", frame, "critical", f"Cannot inspect rendered frame: {error}",
                ))
                continue
            measured.append(metrics)
            if metrics["fraction"] < 0.005:
                defects.append(QADefect(
                    "empty_frame", frame, "critical", "Character occupies less than 0.5% of frame",
                    meta=metrics,
                ))
            bounds = metrics["bounds"]
            if bounds is not None:
                width = metrics["width"]
                height = metrics["height"]
                if bounds[0] <= 1 or bounds[1] <= 1 or bounds[2] >= width - 1:
                    defects.append(QADefect(
                        "character_clipping", frame, "high", "Character silhouette touches frame edge",
                        meta=metrics,
                    ))

        for index in range(1, len(measured)):
            previous = measured[index - 1]
            current = measured[index]
            frame = numbers[index]
            previous_area = previous["fraction"]
            current_area = current["fraction"]
            if previous_area > 0 and (current_area / previous_area > 1.8 or current_area / previous_area < 0.55):
                defects.append(QADefect(
                    "silhouette_explosion", frame, "high", "Silhouette area changes beyond safe limits",
                ))
            distance = math.dist(previous["centroid"], current["centroid"])
            if distance > 0.35:
                defects.append(QADefect(
                    "position_jump", frame, "high", "Character centroid jumps more than 35% of frame",
                ))

        if len(paths) >= 2:
            differences = diagnostic_differences(paths)
            average_area = sum(item["fraction"] for item in measured) / max(1, len(measured))
            threshold = max(0.001, average_area * 0.01)
            if differences and max(differences) < threshold:
                defects.append(QADefect(
                    "frozen_animation", numbers[-1], "high",
                    f"Rendered frames do not change enough: {differences}",
                ))

        for frame in frames_data or []:
            frame_number = int(frame.get("frame_number", 0))
            if frame.get("missing_blink"):
                defects.append(QADefect("missing_blink", frame_number, "medium", "Missing blink"))
            if frame.get("frozen_mouth"):
                defects.append(QADefect("frozen_mouth", frame_number, "medium", "Frozen mouth"))
        self.defects = defects
        return defects

    def apply_fixes_to_project(self, defects: list[QADefect]) -> int:
        rig, load_defects = self._load_rig()
        if rig is None or load_defects:
            return 0
        applied = 0
        bone_map = {bone.id: bone for bone in rig.bones}
        repaired_types: set[tuple[str, Optional[str]]] = set()
        for defect in defects:
            identity = (defect.issue_type, defect.bone_id)
            if identity in repaired_types:
                continue
            action: Optional[str] = None
            if defect.issue_type == "control_bones_visible":
                bone = bone_map.get(defect.bone_id or "")
                if bone is not None and bone.strength != 0.0:
                    bone.strength = 0.0
                    bone.shy = True
                    action = f"Set '{bone.id}' strength to 0 and enabled shy"
            elif defect.issue_type == "missing_blink":
                eyes = bone_map.get("Eyes Switch")
                if eyes is not None:
                    _merge_angle_keys(eyes, {
                        24: _dial_value(eyes, 1, eyes.angle + math.radians(15)),
                        26: _dial_value(eyes, 0, eyes.angle),
                    })
                    action = "Inserted closed/open Eyes Switch keys at frames 24 and 26"
            elif defect.issue_type == "frozen_mouth":
                mouth = bone_map.get("Mouth Switch")
                if mouth is not None:
                    _merge_angle_keys(mouth, {
                        36: _dial_value(mouth, 1, mouth.angle + math.radians(20)),
                        40: _dial_value(mouth, 0, mouth.angle),
                    })
                    action = "Inserted A/rest Mouth Switch keys at frames 36 and 40"
            elif defect.issue_type == "all_meshes_hidden":
                hidden = [part for part in rig.walk_parts() if part.type == "mesh" and not part.visible]
                if hidden:
                    for part in hidden:
                        part.visible = True
                    action = f"Restored visibility for {len(hidden)} mesh layers"
            if action is not None:
                repaired_types.add(identity)
                applied += 1
                self.repair_log.append({
                    "pass": self.current_pass,
                    "issue": defect.issue_type,
                    "frame": defect.frame,
                    "action": action,
                })
        if applied:
            emit(rig, self.project_path)
        return applied
